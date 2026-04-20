# ClearBill
### AI-powered medical bill auditor and live call coach

> "We audited your bill. Now we're staying on the call with you."

Built at the Anthropic Claude Hackathon 2026 — Theme: *Machines of Loving Grace*

---

## What it does

Medical billing in the United States is deliberately opaque. 80% of bills contain errors. Most people — especially those least able to afford it — never fight back because they don't know how.

ClearBill does two things:

**1. Audits your bill**
Upload a photo or PDF of any medical bill. Claude Vision extracts every line item, ML matches them to canonical CPT codes using semantic embeddings, and each charge is scored against three benchmarks: the hospital's own legally-published chargemaster rate, Medicare reference rates, and regional averages. Potential overcharges are flagged with a visible reasoning chain and a ready-to-send dispute letter.

**2. Coaches you through the call**
When you call the hospital billing department to dispute, ClearBill listens in real time, detects the billing rep's tactics, and silently feeds you exactly what to say next — grounded in your specific audit findings, citing the exact statute.

---

## Demo

1. Upload a medical bill (photo or PDF)
2. Watch the audit pipeline run live — extraction, CPT matching, anomaly scoring
3. See flagged overcharges with dollar amounts and legal citations
4. Copy the generated dispute letter
5. Switch to Call Coach mode — type what the rep says, get coached on what to say back

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI |
| Bill extraction | Claude Vision (Sonnet 4.6) |
| CPT code matching | sentence-transformers + FAISS |
| Anomaly scoring | Statistical comparison vs CMS Medicare rates |
| Dispute letter | Claude Sonnet + Extended Thinking |
| Tactic detection | Claude Haiku (~150ms latency) |
| Call coaching | Claude Sonnet + stateful WebSocket context |
| Real-time comms | WebSockets |
| Pricing data | CMS Medicare Physician Fee Schedule |

---

## Claude API Features Used

- **Claude Vision** — extracts structured data from any bill format in a single API call
- **Extended Thinking** — surfaces the full reasoning chain behind every flag, making the logic transparent and auditable
- **Streaming** — all Claude responses stream live to the UI, making the pipeline visible during the demo
- **Multi-model routing** — Haiku for real-time tactic detection, Sonnet for deep reasoning
- **Stateful context management** — the call coach holds the full audit findings, call history, tactics used, and leverage cards remaining across every WebSocket message

---

## How the ML works

**CPT Code Matching**
Medical bills use inconsistent, obfuscated language. "Emergency Department Visit — High Complexity" and "ED E&M Level 5" are the same procedure billed differently at every hospital. We embed each line item description using `all-MiniLM-L6-v2` and run cosine similarity search against a FAISS index of pre-embedded CMS procedure descriptions to find the canonical CPT code. String matching fails here — semantic embedding succeeds.

**Anomaly Scoring**
For each matched CPT code, three comparisons are made:
- **vs. hospital's own chargemaster** — billing above published rate is illegal under 45 CFR §180.50
- **vs. Medicare reference rate** — flags charges above 2× the federal benchmark
- **vs. regional average** — flags charges above the 90th percentile for the zip code

**Tactic Detection**
During live calls, every rep utterance is classified against a taxonomy of known billing department tactics (DEFLECT, AUTHORITY, CONFUSION, URGENCY, SYMPATHY_TRAP, DENIAL, STALL) using Claude Haiku. A score threshold gates the coaching pipeline — below 6/10, Claude stays silent.

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key

### Backend

```bash
cd clearbill/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Build the CPT index (run once):
```bash
cd clearbill
python scripts/build_hardcoded_index.py
```

Start the server:
```bash
cd backend
uvicorn main:app --reload
```

### Frontend

```bash
cd clearbill/frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:8000`.

---

## Project Structure

```
clearbill/
├── backend/
│   ├── main.py                    # FastAPI app, all routes + WebSocket
│   ├── audit/
│   │   ├── extractor.py           # Claude Vision → structured JSON
│   │   ├── cpt_matcher.py         # FAISS semantic search
│   │   ├── anomaly_scorer.py      # 3-benchmark scoring
│   │   └── letter_writer.py       # Dispute letter with extended thinking
│   └── coach/
│       ├── tactic_detector.py     # Haiku tactic classifier
│       ├── response_generator.py  # Sonnet coaching response
│       └── call_state.py          # Stateful call context manager
├── frontend/
│   └── src/
│       ├── screens/
│       │   ├── Upload.tsx
│       │   ├── Results.tsx        # Audit dashboard
│       │   └── CallCoach.tsx      # Live call coaching UI
│       └── components/
│           ├── CoachingCard.tsx   # Real-time coaching overlay
│           └── TranscriptFeed.tsx
└── scripts/
    └── build_hardcoded_index.py   # Builds FAISS CPT index
```

---

## Ethical Considerations

- **Patient autonomy preserved** — ClearBill never takes action on the patient's behalf. It surfaces information and drafts language. The patient decides whether to dispute, what to send, and when to escalate.
- **Transparency over black-box verdicts** — every flag includes the full reasoning chain from extended thinking. Patients can disagree with Claude's reasoning. The model is an advisor, not an authority.
- **Epistemic honesty** — every finding is framed as a potential anomaly, not confirmed fraud. The dispute letter includes a disclaimer recommending professional legal advice.
- **Grounded in real law** — every counter-argument cites specific federal statutes (45 CFR §180.50, the No Surprises Act) and the patient's actual bill. Nothing is fabricated.

---

## The Problem We're Solving

- 80M Americans receive a medical bill annually
- 80% of bills contain errors
- $100B+ in annual billing errors, most unpaid
- Hospital billing departments run the same playbook every day — patients never have
- 44M Americans living below the poverty line have no access to patient advocates or attorneys

ClearBill gives anyone the same fighting chance.

---

## Team

Built at the Anthropic Claude Hackathon 2026
- Conor Lazar-Parman
- Daniel Kim
