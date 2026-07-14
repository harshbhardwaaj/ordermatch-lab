"""Real order extraction via the OpenAI API (T115/T116), replacing the
client-side timer simulation. Structured Outputs (strict JSON schema)
guarantee well-typed line items instead of parsing freeform text by hand.
See clarifications.md §7 (approach) and §8 (OpenAI, not Claude).
"""

from __future__ import annotations

import json
import logging

from django.conf import settings
from django.utils import timezone
from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)

MODEL = "gpt-5.4-mini"
MAX_PASTED_TEXT_LENGTH = 8000

UNIT_CODES = ["pcs", "ea", "m", "mm", "cm", "kg", "g", "l", "set", "box", "pack", "unknown"]


class ExtractionError(Exception):
    """Raised when input validation fails or the OpenAI call fails/returns
    something unusable. Callers must surface this as a clear error before
    any order is created (T124), never as a silently empty or partial one.
    """


_LINE_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "original_text": {"type": "string"},
        "description": {"type": "string"},
        "quantity": {"type": ["number", "null"]},
        "unit": {"type": "string", "enum": UNIT_CODES},
        "customer_part_number": {"type": ["string", "null"]},
        "requested_sku": {"type": ["string", "null"]},
        "attributes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "value": {"type": "string"},
                },
                "required": ["name", "value"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "original_text",
        "description",
        "quantity",
        "unit",
        "customer_part_number",
        "requested_sku",
        "attributes",
    ],
    "additionalProperties": False,
}

_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "customer_name": {"type": ["string", "null"]},
        "customer_reference": {"type": ["string", "null"]},
        "requested_delivery_date": {"type": ["string", "null"]},
        "delivery_location": {"type": ["string", "null"]},
        "currency": {"type": ["string", "null"]},
        "line_items": {"type": "array", "items": _LINE_ITEM_SCHEMA},
    },
    "required": [
        "customer_name",
        "customer_reference",
        "requested_delivery_date",
        "delivery_location",
        "currency",
        "line_items",
    ],
    "additionalProperties": False,
}

def _system_prompt() -> str:
    today = timezone.now().date().isoformat()
    return (
        "You extract structured purchase order data from raw, informal B2B "
        "order text (emails, pasted notes). Extract every distinct line item "
        "requested. Keep original_text as the exact source phrase for that "
        "line. Use null for any field that is not stated or not confidently "
        "inferable; do not guess a customer part number, SKU, or quantity "
        "that is not actually present in the text. unit must be one of the "
        "given enum values; use \"unknown\" if a quantity is given with no "
        "clear unit. "
        # Language is normalized here, at the door, and nowhere else. The
        # catalog is in English; customers write German. Leaving the German
        # word in `description` meant retrieval had to bridge the languages
        # itself, and it could not reliably: "Sechskantschraube" embedded
        # closer to countersunk and socket-cap screws than to hex bolts, so the
        # right SKU never even reached the shortlist and nothing downstream
        # could recover it. One canonical language in, one language to match
        # against.
        "description must be the product, written in ENGLISH, using the "
        "standard industry term a distributor's catalog would use: "
        "\"Sechskantschraube\" is \"hex bolt\", \"Kugellager\" is \"ball "
        "bearing\", \"Zylinderschraube\" is \"socket cap screw\", "
        "\"Dichtring\" is \"O-ring\", \"Absperrhahn\" is \"ball valve\", "
        "\"Gewindestange\" is \"threaded rod\", \"Edelstahl\" is \"stainless "
        "steel\". Translate the product term itself; do not translate or "
        "alter original_text, which stays exactly as the customer wrote it. "
        "attributes should capture any product specifics "
        "mentioned (thread size, length, material, standard, diameter, etc.) "
        "as name/value pairs, using the terms from the source text rather "
        f"than inventing standardized ones. Today's date is {today}. "
        "requested_delivery_date must be a concrete calendar date in "
        "YYYY-MM-DD format if one can be determined, including resolving a "
        "relative phrase like \"next Friday\" or \"in two weeks\" against "
        "today's date; use null rather than a vague phrase if no concrete "
        "date can be determined."
    )


def extract_order(pasted_text: str) -> dict:
    text = (pasted_text or "").strip()
    if not text:
        raise ExtractionError("Paste in an order before reviewing it.")
    if len(text) > MAX_PASTED_TEXT_LENGTH:
        raise ExtractionError(
            f"That's too much text to read at once ({len(text)} characters, "
            f"max {MAX_PASTED_TEXT_LENGTH}). Trim it down and try again."
        )
    if not settings.OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is not configured; cannot run extraction.")
        raise ExtractionError("Order reading isn't set up on this server yet.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _system_prompt()},
                {"role": "user", "content": text},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "order_extraction",
                    "schema": _EXTRACTION_SCHEMA,
                    "strict": True,
                },
            },
        )
    except OpenAIError:
        # The real exception (timeout, rate limit, connection error, etc.)
        # is logged server-side for debugging, never shown to the reviewer
        # verbatim: raw SDK error text reads as an unpolished crash, not a
        # real product's error state.
        logger.exception("OpenAI extraction call failed.")
        raise ExtractionError(
            "Couldn't reach the order-reading service just now. Please try again in a moment."
        ) from None

    try:
        parsed = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError, IndexError, AttributeError):
        logger.exception("OpenAI extraction returned an unparseable response.")
        raise ExtractionError(
            "Got an unreadable response while reading that order. Please try again."
        ) from None

    if not parsed.get("line_items"):
        raise ExtractionError(
            "Couldn't find any order details in that text. Try pasting something "
            "like a product, quantity, and unit (for example, \"50 pcs of M8 bolts\")."
        )

    return parsed
