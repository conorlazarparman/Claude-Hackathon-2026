import { useEffect, useRef, useState } from "react"
import { TranscriptFeed } from "../components/TranscriptFeed"
import { CoachSocket } from "../lib/websocket"
import { DeepgramCapture } from "../lib/audio"

const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string

interface CallCoachProps {
  auditResults: any
  sessionId: string
}

export function CallCoach({ auditResults, sessionId }: CallCoachProps) {
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([])
  const [interimText, setInterimText] = useState<{ speaker: string; text: string } | null>(null)
  const [coachingMessages, setCoachingMessages] = useState<Array<{ text: string; streaming: boolean }>>([])
  const [isCoachingStreaming, setIsCoachingStreaming] = useState(false)
  const [callPhase, setCallPhase] = useState<"idle" | "active" | "ended">("idle")
  const [micError, setMicError] = useState<string | null>(null)
  const wsRef = useRef<CoachSocket | null>(null)
  const captureRef = useRef<DeepgramCapture | null>(null)

  const flaggedItems = auditResults?.line_items?.filter((i: any) => i.is_flagged) || []
  const totalSavings = flaggedItems.reduce(
    (sum: number, i: any) => sum + (i.potential_savings || 0),
    0
  )

  const startCall = async () => {
    setMicError(null)

    // Connect coach WebSocket first
    const socket = new CoachSocket(sessionId)
    wsRef.current = socket

    socket.onOpen = () => socket.init(auditResults)
    socket.onMessage = (data) => {
      if (data.type === "coaching_chunk") {
        setIsCoachingStreaming(true)
        setCoachingMessages((msgs) => {
          if (msgs.length > 0 && msgs[0].streaming) {
            return [{ ...msgs[0], text: msgs[0].text + data.chunk }, ...msgs.slice(1)]
          }
          return [{ text: data.chunk, streaming: true }, ...msgs]
        })
      } else if (data.type === "coaching_done") {
        setIsCoachingStreaming(false)
        setCoachingMessages((msgs) =>
          msgs.length > 0 ? [{ ...msgs[0], streaming: false }, ...msgs.slice(1)] : msgs
        )
      } else if (data.type === "transcript_update") {
        setTranscript((t) => [...t, { speaker: data.speaker, text: data.text }])
      }
    }

    // Start Deepgram audio capture
    const capture = new DeepgramCapture(DEEPGRAM_KEY)
    captureRef.current = capture

    capture.onError = (msg) => setMicError(msg)

    capture.onUtterance = ({ speaker, text, isFinal }) => {
      if (!isFinal) {
        setInterimText({ speaker, text })
        return
      }
      setInterimText(null)
      setTranscript((t) => [...t, { speaker, text }])

      if (speaker === "rep") {
        wsRef.current?.sendRepUtterance(text)
      } else {
        wsRef.current?.sendPatientUtterance(text)
      }
    }

    try {
      await capture.start()
      setCallPhase("active")
    } catch (e: any) {
      setMicError(e.message ?? "Microphone access denied")
    }
  }

  const flipSpeakers = () => captureRef.current?.flipSpeakers()

  const endCall = () => {
    captureRef.current?.stop()
    wsRef.current?.end()
    wsRef.current?.close()
    setInterimText(null)
    setCallPhase("ended")
  }

  useEffect(() => {
    return () => {
      captureRef.current?.stop()
      wsRef.current?.close()
    }
  }, [])

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "280px 1fr 1fr",
      gap: "16px",
      height: "100%",
      padding: "16px",
      boxSizing: "border-box",
    }}>
      {/* Left: evidence panel */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        overflow: "hidden",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
          Your evidence
        </div>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--red)", letterSpacing: "-1px" }}>
            ${totalSavings.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>potential overcharges</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {flaggedItems.map((item: any, i: number) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
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
      </div>

      {/* Middle: transcript + controls */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Live transcript
          </div>
          {callPhase === "active" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--red)",
                display: "inline-block",
                animation: "blink 1.2s infinite",
              }} />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Listening</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <TranscriptFeed transcript={transcript} interim={interimText} />
        </div>

        {micError && (
          <div style={{
            fontSize: "12px",
            color: "var(--red)",
            padding: "8px 10px",
            background: "rgba(224,82,82,0.08)",
            borderRadius: "6px",
            flexShrink: 0,
          }}>
            {micError}
          </div>
        )}

        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
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
              Start listening
            </button>
          )}

          {callPhase === "active" && (
            <>
              <button
                onClick={flipSpeakers}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "7px",
                  fontSize: "12px",
                }}
              >
                Flip speakers (if patient/rep are swapped)
              </button>
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
              Call ended
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Coach panel */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI Coach
          </div>
          {isCoachingStreaming && (
            <span style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "var(--purple)",
              display: "inline-block",
              animation: "blink 1.2s infinite",
            }} />
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {coachingMessages.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Listening for billing tactics…
            </div>
          ) : (
            coachingMessages.map((msg, i) => (
              <div key={i} style={{
                padding: "12px",
                background: i === 0 ? "rgba(127,119,221,0.08)" : "var(--bg)",
                borderRadius: "8px",
                border: `1px solid ${i === 0 ? "var(--purple)" : "var(--border)"}`,
                fontSize: "13px",
                lineHeight: "1.6",
                color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                flexShrink: 0,
              }}>
                {msg.text}
                {msg.streaming && (
                  <span style={{ animation: "blink 1s infinite", opacity: 0.6, marginLeft: "1px" }}>▌</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
