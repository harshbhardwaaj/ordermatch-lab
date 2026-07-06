"""Real order extraction via the OpenAI API (T115/T116), replacing the
client-side timer simulation. Structured Outputs (strict JSON schema)
guarantee well-typed line items instead of parsing freeform text by hand.
See clarifications.md §7 (approach) and §8 (OpenAI, not Claude).
"""

from __future__ import annotations

import json

from django.conf import settings
from django.utils import timezone
from openai import OpenAI, OpenAIError

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
        "clear unit. attributes should capture any product specifics "
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
        raise ExtractionError("Pasted order text is empty.")
    if len(text) > MAX_PASTED_TEXT_LENGTH:
        raise ExtractionError(
            f"Pasted order text is too long ({len(text)} characters, "
            f"max {MAX_PASTED_TEXT_LENGTH})."
        )
    if not settings.OPENAI_API_KEY:
        raise ExtractionError("OPENAI_API_KEY is not configured on the backend.")

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
    except OpenAIError as exc:
        raise ExtractionError(f"Extraction call failed: {exc}") from exc

    try:
        parsed = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        raise ExtractionError("Extraction returned a malformed response.") from exc

    if not parsed.get("line_items"):
        raise ExtractionError("No line items could be extracted from that text.")

    return parsed
