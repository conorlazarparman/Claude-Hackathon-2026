import anthropic
import os
from typing import AsyncGenerator
from .call_state import CallState

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

COUNTER_SCRIPTS = {
    "DEFLECT": "Challenge with specific published Medicare rates — they can't argue with CMS data",
    "AUTHORITY": "Redirect to patient rights and hospital price transparency law (45 CFR §180.50)",
    "CONFUSION": "Simplify and anchor to one specific dollar amount and Medicare multiple",
    "URGENCY": "Defuse with legal rights — collections cannot proceed while a formal dispute is open",
    "SYMPATHY_TRAP": "Acknowledge briefly, then pivot immediately to the specific overcharge evidence",
    "DENIAL": "Present the Medicare rate evidence — a specific number is inarguable",
    "STALL": "Set a specific 48-hour deadline and name the next escalation step (State Commissioner)",
}


async def stream_coaching_response(
    tactic: dict, call_state: CallState
) -> AsyncGenerator[str, None]:
    """Stream a coaching card to the patient using extended thinking."""
    leverage = call_state.pop_leverage()
    already_said = [c["tactic"] for c in call_state.counters_delivered[-3:]]

    prompt = f"""You are coaching a patient during a live phone call with a hospital billing department.

The billing rep just used the {tactic['tactic']} tactic.
Their exact words: "{tactic.get('quote', '')}"

The patient's audit findings (their leverage):
{call_state.audit_summary()}

Tactics the rep has already used: {call_state.tactics_used}
Counters already given to patient: {already_said}
Next leverage card to deploy (if appropriate): {leverage}

Strategy for {tactic['tactic']}: {COUNTER_SCRIPTS.get(tactic['tactic'], 'Address the tactic directly with facts')}

Give the patient EXACTLY what to say.
Rules:
- Maximum 2 sentences
- Plain language, no jargon
- Cite one specific number or statute from their audit findings
- Calm, factual, confident — not emotional or aggressive
- End with a question that forces the rep to commit to something specific
- Output ONLY the words for the patient to say. Nothing else — no preamble, no explanation."""

    in_thinking = False
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        thinking={"type": "enabled", "budget_tokens": 3000},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for event in stream:
            if not hasattr(event, "type"):
                continue

            if event.type == "content_block_start":
                in_thinking = event.content_block.type == "thinking"

            elif event.type == "content_block_delta":
                delta = event.delta
                if not in_thinking and hasattr(delta, "text"):
                    yield delta.text

            elif event.type == "content_block_stop":
                in_thinking = False
