import anthropic
import json
import os
from typing import AsyncGenerator

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def stream_dispute_letter(
    flagged_items: list, hospital_name: str
) -> AsyncGenerator[dict, None]:
    """
    Stream a dispute letter with extended thinking.
    Yields dicts: {"type": "thinking", "text": ...} or {"type": "text", "text": ...}
    """
    total_overcharge = sum(item.get("potential_savings", 0) for item in flagged_items)

    prompt = f"""Draft a formal medical billing dispute letter for a patient.

Hospital: {hospital_name}
Total potential overcharge: ${total_overcharge:.2f}
Flagged items:
{json.dumps(flagged_items, indent=2)}

Requirements:
- Address to: Billing Department, {hospital_name}
- CC: State Insurance Commissioner and CFPB
- For each flagged item: state the charge, the Medicare benchmark, the multiple, and cite the CMS Medicare Physician Fee Schedule
- Professional but firm tone
- Request written response within 30 days
- State that failure to respond will result in complaints filed with the State Insurance Commissioner and CMS
- Sign off as "Patient (Name Withheld)"

Write the complete letter, ready to send."""

    in_thinking = False
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        thinking={"type": "enabled", "budget_tokens": 5000},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for event in stream:
            if not hasattr(event, "type"):
                continue

            if event.type == "content_block_start":
                block = event.content_block
                in_thinking = block.type == "thinking"

            elif event.type == "content_block_delta":
                delta = event.delta
                if in_thinking and hasattr(delta, "thinking"):
                    yield {"type": "thinking", "text": delta.thinking}
                elif not in_thinking and hasattr(delta, "text"):
                    yield {"type": "text", "text": delta.text}

            elif event.type == "content_block_stop":
                in_thinking = False
