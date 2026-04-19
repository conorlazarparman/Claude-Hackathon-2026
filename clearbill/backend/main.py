from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from dotenv import load_dotenv

load_dotenv()

from audit.extractor import extract_bill
from audit.cpt_lookup import lookup_cpt_codes
from audit.anomaly_scorer import score_anomalies
from audit.letter_writer import stream_dispute_letter
from coach.tactic_detector import detect_tactic
from coach.response_generator import stream_coaching_response
from coach.call_state import CallState

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

active_calls: dict[str, CallState] = {}


@app.post("/api/audit/extract")
async def extract(file: UploadFile = File(...)):
    contents = await file.read()
    result = await extract_bill(contents, file.content_type)
    return result


@app.post("/api/audit/analyze")
async def analyze(data: dict):
    """Lookup CPT codes + score anomalies in one call."""
    line_items = data["line_items"]
    hospital_npi = data.get("hospital_npi")
    matched = await lookup_cpt_codes(line_items)
    scored = await score_anomalies(matched)
    return {"line_items": scored}


@app.post("/api/audit/letter")
async def letter(data: dict):
    async def generate():
        async for event in stream_dispute_letter(
            data["flagged_items"], data["hospital_name"]
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.websocket("/ws/coach/{session_id}")
async def coach_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    init_data = await websocket.receive_json()
    call_state = CallState(audit_results=init_data.get("audit_results", {}))
    active_calls[session_id] = call_state

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "transcript_chunk":
                utterance = data["text"]
                speaker = data["speaker"]

                call_state.add_utterance(speaker, utterance)

                if speaker != "rep":
                    continue

                tactic = await detect_tactic(
                    recent_transcript=call_state.get_recent_turns(n=3),
                    audit_context=call_state.audit_summary(),
                )

                if tactic["score"] < 6 and not tactic["urgency_override"]:
                    continue

                if not call_state.should_coach_now():
                    call_state.queue_pending(tactic)
                    continue

                coaching_chunks = []
                async for chunk in stream_coaching_response(
                    tactic=tactic, call_state=call_state
                ):
                    coaching_chunks.append(chunk)
                    await websocket.send_json({"type": "coaching_chunk", "chunk": chunk})

                full_response = "".join(coaching_chunks)
                call_state.record_coached(tactic, full_response)
                await websocket.send_json({"type": "coaching_done"})

            elif data["type"] == "call_ended":
                active_calls.pop(session_id, None)
                break

    except WebSocketDisconnect:
        active_calls.pop(session_id, None)
    except Exception as e:
        print(f"WebSocket error: {e}")
        active_calls.pop(session_id, None)
