# ClearBill

ClearBill is an AI-powered medical billing audit tool that helps patients identify overcharges in hospital bills and dispute them. Upload a bill, see exactly what was overbilled against Medicare rates, get a formal dispute letter, and receive real-time coaching during your call with the billing department.

This was built by Daniel Kim and Conor Parman for the 2026 SoCal Claude Hackathon, a 1-day hackathon with 100 students from UCLA, USC, and CalTech. 

---

## What it does

**1. Bill extraction** — Upload a photo or PDF of your medical bill. Claude Vision reads every line item, including CPT codes, descriptions, and amounts.

**2. Overcharge detection** — Each charge is benchmarked against the CMS Medicare Physician Fee Schedule (7,800+ CPT codes). Items billed 2× or more over the standard rate are flagged with estimated savings.

**3. Dispute letter** — A formal dispute letter is generated citing your specific overcharges and the applicable CMS regulation.

**4. Live call coach** — During a call with your hospital's billing department, the app transcribes the conversation in real time, detects pressure tactics (deflection, urgency, authority claims), and suggests responses.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite |
| Backend | FastAPI, Python |
| AI | Claude Sonnet 4.6 (vision, letter, coaching), Claude Haiku 4.5 (tactic detection) |
| Transcription | Deepgram WebSocket API |
| Rate data | CMS Medicare Physician Fee Schedule 2024 |

---

## Project structure

```
clearbill/
├── backend/
│   ├── main.py                  # FastAPI app — audit + coaching routes
│   ├── requirements.txt
│   ├── audit/
│   │   ├── extractor.py         # Claude Vision bill parsing
│   │   ├── cpt_lookup.py        # CPT code → Medicare rate lookup
│   │   ├── anomaly_scorer.py    # Flag items >2× Medicare rate
│   │   ├── letter_writer.py     # Dispute letter streaming
│   │   └── data/
│   │       └── cms_rates.csv    # 7,835 CPT codes with facility rates
│   └── coach/
│       ├── call_state.py        # WebSocket session state
│       ├── tactic_detector.py   # Haiku: classify billing rep tactics
│       └── response_generator.py # Sonnet: coaching suggestions
└── frontend/
    └── src/
        ├── App.tsx              # Screen orchestrator
        ├── screens/
        │   ├── Upload.tsx       # File upload (drag-and-drop, multi-file)
        │   ├── Processing.tsx   # Step progress display
        │   ├── Results.tsx      # Flagged items + dispute letter tabs
        │   └── CallCoach.tsx    # Live coaching interface
        └── lib/
            ├── api.ts           # HTTP API calls + image compression
            ├── websocket.ts     # WebSocket client
            └── audio.ts        # Deepgram audio capture + diarization
```

---

## Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- [Anthropic API key](https://console.anthropic.com)
- [Deepgram API key](https://console.deepgram.com) (required for call coach)

### Backend

```bash
cd clearbill/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `clearbill/backend/.env`:
```
ANTHROPIC_API_KEY=your_key_here
```

Start the server:
```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd clearbill/frontend
npm install
```

Create `clearbill/frontend/.env`:
```
VITE_DEEPGRAM_API_KEY=your_key_here
```

Start the dev server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audit/extract` | Upload bill image or PDF → extract line items |
| `POST` | `/api/audit/analyze` | Enrich line items with CPT codes + flag overcharges |
| `POST` | `/api/audit/letter` | Stream a formal dispute letter (SSE) |
| `WS` | `/ws/coach/{session_id}` | Real-time call coaching via WebSocket |

---

## How the audit works

1. Claude Vision reads the bill and returns structured JSON (patient info, line items, amounts).
2. Each line item's CPT code is matched against `cms_rates.csv` — the 2024 CMS Medicare Physician Fee Schedule.
3. Items billed more than 2× the Medicare facility rate are flagged. Items over 5× are marked high severity.
4. The dispute letter cites the CMS rate for each flagged item and references the Medicare Physician Fee Schedule by name.

---

## Notes

- The CMS rates dataset (`backend/audit/data/cms_rates.csv`) was generated from the CMS 2024 Medicare Physician Fee Schedule using `scripts/download_cms.py`. It does not need to be regenerated.
- Multi-page bills can be uploaded as separate photos — the frontend sends each image to the backend in parallel and merges the results.
- Images over 4 MB are compressed to 1800px wide at 80% JPEG quality before upload.
