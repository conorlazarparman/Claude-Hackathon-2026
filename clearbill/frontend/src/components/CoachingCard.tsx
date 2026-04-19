import { useEffect } from "react"

interface CoachingCardProps {
  text: string
  isStreaming: boolean
  onDismiss: () => void
}

export function CoachingCard({ text, isStreaming, onDismiss }: CoachingCardProps) {
  useEffect(() => {
    if (!isStreaming && text) {
      const timer = setTimeout(onDismiss, 20000)
      return () => clearTimeout(timer)
    }
  }, [isStreaming, text])

  if (!text) return null

  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "90%",
      maxWidth: "600px",
      background: "#1a1a20",
      border: "2px solid var(--purple)",
      borderRadius: "12px",
      padding: "16px 20px",
      zIndex: 100,
      animation: "slideUp 0.2s ease-out",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        fontSize: "10px",
        fontWeight: 600,
        color: "var(--purple)",
        marginBottom: "8px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        Say this
      </div>
      <div style={{
        fontSize: "17px",
        lineHeight: 1.5,
        color: "var(--text)",
        fontWeight: 500,
      }}>
        {text}
        {isStreaming && (
          <span style={{ opacity: 0.4, animation: "blink 0.8s infinite" }}>▋</span>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{
          marginTop: "12px",
          fontSize: "11px",
          color: "var(--text-tertiary)",
          background: "none",
          border: "none",
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
