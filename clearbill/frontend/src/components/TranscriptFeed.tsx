import { useEffect, useRef } from "react"

interface Utterance {
  speaker: string
  text: string
}

interface TranscriptFeedProps {
  transcript: Utterance[]
}

export function TranscriptFeed({ transcript }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  if (transcript.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-tertiary)",
        fontSize: "13px",
      }}>
        Transcript will appear here
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
      {transcript.map((u, i) => (
        <div key={i} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: u.speaker === "patient" ? "flex-end" : "flex-start",
        }}>
          <div style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            marginBottom: "3px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {u.speaker === "patient" ? "You" : "Rep"}
          </div>
          <div style={{
            maxWidth: "85%",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            lineHeight: 1.5,
            background: u.speaker === "patient" ? "var(--purple-dim)" : "var(--bg-card)",
            border: `1px solid ${u.speaker === "patient" ? "var(--purple)" : "var(--border)"}`,
            color: "var(--text)",
          }}>
            {u.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
