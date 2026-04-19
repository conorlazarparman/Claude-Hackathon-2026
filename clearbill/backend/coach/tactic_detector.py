import anthropic
import json
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def detect_tactic(recent_transcript: str, audit_context: str) -> dict:
    """
    Fast Haiku call to classify billing rep tactics.
    Returns tactic type, score, and urgency override flag.
    """
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[
            {
                "role": "user",
                "content": f"""Analyze the last thing the billing rep said in this medical billing dispute call.

Recent transcript:
{recent_transcript}

Audit findings (patient's leverage):
{audit_context}

Tactics to detect:
- DEFLECT: "that's standard rate", "nothing we can do", "that's just how it works"
- AUTHORITY: "doctor ordered it", "insurance determines that", "our policy requires"
- CONFUSION: introducing jargon, complexity, codes to overwhelm
- URGENCY: collections threat, credit report threat, deadline pressure
- SYMPATHY_TRAP: "I understand your frustration but..." (acknowledges then dismisses)
- DENIAL: disputes the overcharge exists at all
- STALL: "I need to transfer you", "let me look into that" (indefinite delay)

Return ONLY valid JSON, no markdown:
{{
  "tactic": "DEFLECT|AUTHORITY|CONFUSION|URGENCY|SYMPATHY_TRAP|DENIAL|STALL|null",
  "score": 0-10,
  "quote": "the exact phrase that triggered this",
  "urgency_override": true/false,
  "reasoning": "one sentence"
}}

urgency_override = true only for URGENCY tactic (collections/credit threats).""",
            }
        ],
    )

    try:
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return {"tactic": None, "score": 0, "urgency_override": False, "quote": ""}
