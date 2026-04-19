interface Step {
  label: string
  status: "pending" | "active" | "done"
}

interface ProcessingProps {
  steps: Step[]
  thinking: string
}

export function Processing({ steps, thinking }: ProcessingProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      gap: "32px",
    }}>
      <div style={{ fontSize: "18px", fontWeight: 500 }}>Analyzing your bill</div>

      {/* Pipeline steps */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        maxWidth: "400px",
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            background: "var(--bg-card)",
            borderRadius: "8px",
            border: `1px solid ${step.status === "active" ? "var(--purple)" : "var(--border)"}`,
            opacity: step.status === "pending" ? 0.4 : 1,
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: "16px", minWidth: "20px" }}>
              {step.status === "done" ? "✓" : step.status === "active" ? "⋯" : "○"}
            </span>
            <span style={{
              fontSize: "13px",
              color: step.status === "active" ? "var(--text)" : "var(--text-secondary)",
              animation: step.status === "active" ? "blink 1.4s infinite" : "none",
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Extended thinking stream */}
      {thinking && (
        <div style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "14px 16px",
          animation: "fadeIn 0.3s",
        }}>
          <div style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--purple)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            Claude is thinking
          </div>
          <div style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxHeight: "160px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}>
            {thinking}
          </div>
        </div>
      )}
    </div>
  )
}
