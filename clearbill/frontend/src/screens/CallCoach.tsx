import { useEffect, useRef, useState } from "react"
import { CoachingCard } from "../components/CoachingCard"
import { TranscriptFeed } from "../components/TranscriptFeed"
import { CoachSocket } from "../lib/websocket"

interface CallCoachProps {
  auditResults: any
  sessionId: string
}

export function CallCoach({ auditResults, sessionId }: CallCoachProps) {
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([])
  const [coachingText, setCoachingText] = useState("")
  const [isCoachingStreaming, setIsCoachingStreaming] = useState(false)
  const [callPhase, setCallPhase] = useState<"idle" | "active" | "ended">("idle")
  const [repInput, setRepInput] = useState("")
  const wsRef = useRef<CoachSocket | null>(null)

  const flaggedItems = auditResults?.line_items?.filter((i: any) => i.is_flagged) || []
  const totalSavings = flaggedItems.reduce(
    (sum: number, i: any) => sum + (i.potential_savings || 0),
    0
  )

  const startCall = () => {
    const socket = new CoachSocket(sessionId)
    wsRef.current = socket

    socket.onOpen = () => {
      socket.init(auditResults)
      setCallPhase("active")
    }

    socket.onMessage = (data) => {
      if (data.type === "coaching_chunk") {
        setIsCoachingStreaming(true)
        setCoachingText((t) => t + data.chunk)
      } else if (data.type === "coaching_done") {
        setIsCoachingStreaming(false)
      } else if (data.type === "transcript_update") {
        setTranscript((t) => [...t, { speaker: data.speaker, text: data.text }])
      }
    }
  }

  const sendRepLine = () => {
    if (!repInput.trim() || !wsRef.current) return
    const text = repInput.trim()
    setTranscript((t) => [...t, { speaker: "rep", text }])
    wsRef.current.sendRepUtterance(text)
    setRepInput("")
    setCoachingText("")
  }

  const endCall = () => {
    wsRef.current?.end()
    wsRef.current?.close()
    setCallPhase("ended")
  }

  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
      height: "100vh",
      padding: "16px",
      position: "relative",
    }}>
      {/* Left: evidence panel */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Your evidence
        </div>
        <div>
          <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--red)", letterSpacing: "-1px" }}>
            ${totalSavings.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>potential overcharges</div>
        </div>

        {flaggedItems.map((item: any, i: number) => (
          <div key={i} style={{
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
              {item.description}
            </div>
            {item.flags.map((flag: any, j: number) => (
              <div key={j} style={{
                fontSize: "12px",
                color: flag.type === "CRITICAL" ? "var(--red)" : "var(--amber)",
              }}>
                {flag.label} — save ${flag.delta?.toFixed(2)}
              </div>
            ))}
            {item.flags[0]?.law && (
              <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                {item.flags[0].law}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: transcript + input */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Live transcript
        </div>

        <TranscriptFeed transcript={transcript} />

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {callPhase === "idle" && (
            <button
              onClick={startCall}
              style={{
                width: "100%",
                padding: "13px",
                background: "var(--green)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Start call recording
            </button>
          )}

          {callPhase === "active" && (
            <>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={repInput}
                  onChange={(e) => setRepInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendRepLine()}
                  placeholder="Type what the rep just said..."
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "7px",
                    color: "var(--text)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={sendRepLine}
                  style={{
                    padding: "10px 16px",
                    background: "var(--purple)",
                    color: "white",
                    border: "none",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Send
                </button>
              </div>
              <button
                onClick={endCall}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "transparent",
                  color: "var(--red)",
                  border: "1px solid var(--red-dim)",
                  borderRadius: "7px",
                  fontSize: "13px",
                }}
              >
                End call
              </button>
            </>
          )}

          {callPhase === "ended" && (
            <div style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--text-secondary)",
              padding: "12px",
            }}>
              Call ended — dispute summary saved
            </div>
          )}
        </div>
      </div>

      <CoachingCard
        text={coachingText}
        isStreaming={isCoachingStreaming}
        onDismiss={() => setCoachingText("")}
      />
    </div>
  )
}
