import { useEffect, useRef } from "react"

interface Utterance {
  speaker: string
  text: string
}

interface TranscriptFeedProps {
  transcript: Utterance[]
  interim?: { speaker: string; text: string } | null
}

function Bubble({ speaker, text, faded }: { speaker: string; text: string; faded?: boolean }) {
  const isPatient = speaker === "patient"
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isPatient ? "flex-end" : "flex-start",
      opacity: faded ? 0.45 : 1,
      transition: "opacity 0.15s",
    }}>
      <div style={{
        fontSize: "10px",
        color: "var(--text-tertiary)",
        marginBottom: "3px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {isPatient ? "You" : "Rep"}
      </div>
      <div style={{
        maxWidth: "85%",
        padding: "8px 12px",
        borderRadius: "10px",
        fontSize: "13px",
        lineHeight: 1.5,
        fontStyle: faded ? "italic" : "normal",
        background: isPatient ? "var(--purple-dim)" : "var(--bg-card)",
        border: `1px solid ${isPatient ? "var(--purple)" : "var(--border)"}`,
        color: "var(--text)",
      }}>
        {text}
        {faded && <span style={{ animation: "blink 0.8s infinite", opacity: 0.6, marginLeft: "2px" }}>▋</span>}
      </div>
    </div>
  )
}

export function TranscriptFeed({ transcript, interim }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript, interim])

  if (transcript.length === 0 && !interim) {
    return (
      <div style={{
        flex: 1,
        minHeight: 0,
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
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
      {transcript.map((u, i) => (
        <Bubble key={i} speaker={u.speaker} text={u.text} />
      ))}
      {interim && (
        <Bubble speaker={interim.speaker} text={interim.text} faded />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
