import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CallState:
    audit_results: dict
    transcript: list = field(default_factory=list)
    tactics_used: list = field(default_factory=list)
    counters_delivered: list = field(default_factory=list)
    last_coached_at: float = field(default_factory=lambda: 0.0)
    pending_thought: Optional[dict] = None

    leverage_remaining: list = field(
        default_factory=lambda: [
            "chargemaster_violation",
            "state_commissioner_threat",
            "cfpb_complaint",
            "small_claims_mention",
        ]
    )

    def add_utterance(self, speaker: str, text: str):
        self.transcript.append({"speaker": speaker, "text": text, "ts": time.time()})

    def get_recent_turns(self, n: int = 3) -> str:
        recent = self.transcript[-(n * 2):]
        return "\n".join(
            f"{u['speaker'].upper()}: {u['text']}" for u in recent
        )

    def should_coach_now(self) -> bool:
        if time.time() - self.last_coached_at < 15:
            return False
        if self.transcript and self.transcript[-1]["speaker"] == "patient":
            return False
        return True

    def record_coached(self, tactic: dict, response: str):
        self.last_coached_at = time.time()
        self.counters_delivered.append(
            {"tactic": tactic["tactic"], "response": response, "ts": time.time()}
        )
        self.tactics_used.append(tactic["tactic"])

    def queue_pending(self, tactic: dict):
        self.pending_thought = tactic

    def pop_leverage(self) -> Optional[str]:
        if self.leverage_remaining:
            return self.leverage_remaining.pop(0)
        return None

    def audit_summary(self) -> str:
        flagged = [
            item
            for item in self.audit_results.get("line_items", [])
            if item.get("is_flagged")
        ]
        lines = []
        for item in flagged:
            for flag in item.get("flags", []):
                lines.append(
                    f"- {item['description']} (CPT {item.get('cpt_code_matched')}): "
                    f"billed ${item['billed_amount']}, {flag['label']}, "
                    f"potential savings ${flag['delta']} — {flag['law']}"
                )
        return "\n".join(lines) if lines else "No specific overcharges identified."
