"""The agent that writes a customer's context.md.

It reads the raw correction log and writes a short markdown brief: what this
customer means by the words they use, which grade they actually want, what to
never quote them. The matcher then gets that brief as context instead of a
growing pile of examples.

The reason this is an agent and not a template: the interesting content is not
"they picked A4 once", it is "they build for coastal sites, so they want marine
grade and zinc is never acceptable" — a rule inferred from several corrections
that then generalizes to line items nobody has seen yet. A template can restate
the log. Only a model can generalize it, and generalizing it is the entire
point.

Cost is the reason it is a *file* rather than the log itself. The log grows
forever; the file is rewritten each time and capped at TARGET_TOKENS, so the
prompt cost of knowing a customer well stays flat whether they have made three
corrections or three hundred. Choosing what to keep is the job.

If there is no API key, a deterministic renderer produces a plainer file from
the same data — worse writing, same shape, and the demo still runs.
"""

from __future__ import annotations

import json

from django.conf import settings
from openai import OpenAI, OpenAIError

from .models import CustomerContextFile, CustomerCorrection

MODEL = "gpt-5.4-mini"

# The whole point of compacting. A brief the matcher reads on every order has to
# stay small, or the memory becomes the cost problem it was meant to solve.
TARGET_TOKENS = 400

_SYSTEM_PROMPT = (
    "You maintain a short markdown brief about one customer of an industrial "
    "distributor, for an AI that matches their order text to catalog SKUs.\n\n"
    "You are given that customer's correction log: line items where a human "
    "reviewer overruled the AI's suggested SKU, and what they chose instead.\n\n"
    "Write the brief that would have prevented those mistakes.\n\n"
    "Rules:\n"
    "- Infer the *rule behind* the corrections, do not list them. 'They chose "
    "A4 over A2 three times' is the evidence; 'they want marine-grade "
    "stainless, likely coastal work, never quote zinc' is the brief.\n"
    "- Only claim what the corrections support. If two corrections disagree, "
    "say the preference is unclear rather than inventing a reason. Never "
    "invent an industry, a location, or a motive that is not evidenced.\n"
    "- Be specific and useful to a matcher: name the words this customer uses "
    "and the SKUs or grades those words should resolve to.\n"
    f"- Stay under roughly {TARGET_TOKENS} tokens. Cut the least useful line "
    "rather than run long.\n"
    "- Output markdown only. No preamble, no code fences.\n\n"
    "Structure:\n"
    "# <Customer name>\n"
    "## What they mean\n"
    "(their vocabulary, mapped to what it resolves to)\n"
    "## Preferences\n"
    "(grade, material, price posture, anything a reviewer keeps enforcing)\n"
    "## Never\n"
    "(what to stop suggesting them, and why)\n"
)


def _corrections_for(session_id: str, customer_key: str) -> list[CustomerCorrection]:
    return list(
        CustomerCorrection.objects.filter(
            demo_session_id=session_id, customer_key=customer_key
        ).order_by("-created_at")[:60]
    )


def _fallback_markdown(customer_name: str, corrections: list[CustomerCorrection]) -> str:
    """No API key: a plainer file, built by hand from the same log.

    Deliberately not silently empty. A demo without an OpenAI key should still
    show a real context file, just an unpolished one.
    """
    overrules = [c for c in corrections if c.was_correction and c.chosen_sku]
    lines = [f"# {customer_name}", "", "## What they mean", ""]
    if not overrules:
        lines.append("_No corrections yet. Nothing has been learned about this customer._")
        return "\n".join(lines)

    for correction in overrules[:8]:
        lines.append(
            f'- When they write "{correction.request_text.strip()}", '
            f"they mean `{correction.chosen_sku}` "
            f"(the matcher suggested `{correction.suggested_sku}`)."
        )

    rejected = {c.suggested_sku for c in overrules if c.suggested_sku}
    if rejected:
        lines += ["", "## Never", ""]
        for sku in sorted(rejected)[:6]:
            lines.append(f"- Stop proposing `{sku}`. It has been overruled here.")

    return "\n".join(lines)


def build_context_file(session_id: str, customer_key: str, customer_name: str) -> CustomerContextFile:
    """(Re)writes this customer's context.md from their correction log."""
    corrections = _corrections_for(session_id, customer_key)

    payload = [
        {
            "customer_wrote": c.request_text,
            "ai_suggested": c.suggested_sku,
            "human_chose": c.chosen_sku or c.custom_label,
            "ai_was_right": not c.was_correction,
        }
        for c in corrections
    ]

    content = ""
    generated_by = "fallback"

    if settings.OPENAI_API_KEY and payload:
        client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=60.0)
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": json.dumps(
                            {"customer_name": customer_name, "correction_log": payload}
                        ),
                    },
                ],
            )
            content = (response.choices[0].message.content or "").strip()
            generated_by = "agent"
        except (OpenAIError, IndexError, AttributeError):
            # A failed rebuild must never destroy the existing file. Fall through
            # to the deterministic renderer instead of writing an empty one.
            content = ""

    if not content:
        content = _fallback_markdown(customer_name, corrections)
        generated_by = "fallback"

    context_file, _ = CustomerContextFile.objects.update_or_create(
        demo_session_id=session_id,
        customer_key=customer_key,
        defaults={
            "customer_name": customer_name,
            "content": content,
            # Corrections, not decisions. The brief is only ever rebuilt when a
            # reviewer overrules the AI, so counting confirmations here made the
            # UI think the file was out of date the moment somebody accepted a
            # top pick that was already right.
            "built_from_corrections": sum(1 for c in corrections if c.was_correction),
            "generated_by": generated_by,
            "edited_by_human": False,
        },
    )
    return context_file


def get_context_file(session_id: str, customer_key: str) -> CustomerContextFile | None:
    return CustomerContextFile.objects.filter(
        demo_session_id=session_id, customer_key=customer_key
    ).first()
