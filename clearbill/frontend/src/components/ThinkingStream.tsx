interface ThinkingStreamProps {
  text: string
  isActive: boolean
}

export function ThinkingStream({ text, isActive }: ThinkingStreamProps) {
  if (!text && !isActive) return null

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderLeft: "3px solid var(--purple)",
      borderRadius: "8px",
      padding: "12px 14px",
      animation: "fadeIn 0.3s",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "8px",
      }}>
        <span style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "var(--purple)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Claude's reasoning
        </span>
        {isActive && (
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--purple)",
            display: "inline-block",
            animation: "blink 1s infinite",
          }} />
        )}
      </div>
      <div style={{
        fontSize: "12px",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        maxHeight: "200px",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
      }}>
        {text}
      </div>
    </div>
  )
}
