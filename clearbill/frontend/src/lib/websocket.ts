const WS_BASE = "ws://localhost:8000"

export type CoachMessage =
  | { type: "coaching_chunk"; chunk: string }
  | { type: "coaching_done" }
  | { type: "transcript_update"; speaker: string; text: string }

export class CoachSocket {
  private ws: WebSocket
  onMessage: (msg: CoachMessage) => void = () => {}
  onOpen: () => void = () => {}

  constructor(sessionId: string) {
    this.ws = new WebSocket(`${WS_BASE}/ws/coach/${sessionId}`)
    this.ws.onopen = () => this.onOpen()
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.onMessage(data)
      } catch {}
    }
  }

  init(auditResults: any) {
    this.ws.send(JSON.stringify({ type: "init", audit_results: auditResults }))
  }

  sendRepUtterance(text: string) {
    this.ws.send(JSON.stringify({ type: "transcript_chunk", text, speaker: "rep" }))
  }

  sendPatientUtterance(text: string) {
    this.ws.send(JSON.stringify({ type: "transcript_chunk", text, speaker: "patient" }))
  }

  end() {
    this.ws.send(JSON.stringify({ type: "call_ended" }))
  }

  close() {
    this.ws.close()
  }
}
