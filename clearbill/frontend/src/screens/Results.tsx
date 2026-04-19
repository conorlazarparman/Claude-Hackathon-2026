import { useState, useEffect, useRef } from "react"
import { FlaggedItemsTable } from "../components/FlaggedItemsTable"
import { ThinkingStream } from "../components/ThinkingStream"
import { streamLetter } from "../lib/api"

interface ResultsProps {
  auditData: any
  onStartCoach: () => void
}

export function Results({ auditData, onStartCoach }: ResultsProps) {
  const [letterText, setLetterText] = useState("")
  const [thinkingText, setThinkingText] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [letterDone, setLetterDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const started = useRef(false)

  const flaggedItems = (auditData?.line_items || []).filter((i: any) => i.is_flagged)
  const totalSavings = flaggedItems.reduce(
    (sum: number, i: any) => sum + (i.potential_savings || 0),
    0
  )

  useEffect(() => {
    if (started.current || flaggedItems.length === 0) return
    started.current = true

    async function run() {
      setIsThinking(true)
      try {
        for await (const event of streamLetter(flaggedItems, auditData.hospital_name || "Hospital")) {
          if (event.type === "thinking") {
            setThinkingText((t) => t + event.text)
          } else if (event.type === "text") {
            setIsThinking(false)
            setLetterText((t) => t + event.text)
          } else if (event.type === "done") {
            setIsThinking(false)
            setLetterDone(true)
          }
        }
      } catch (e) {
        setIsThinking(false)
        setLetterDone(true)
      }
    }
    run()
  }, [])

  const copyLetter = () => {
    navigator.clipboard.writeText(letterText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
      padding: "16px",
      minHeight: "100vh",
    }}>
      {/* Left: audit findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
            Audit results
          </div>
          <div style={{ fontSize: "40px", fontWeight: 600, color: "var(--red)", letterSpacing: "-1px", lineHeight: 1 }}>
            ${totalSavings.toFixed(2)}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "20px" }}>
            potential overcharges found
          </div>

          <FlaggedItemsTable items={flaggedItems} />
        </div>

        {flaggedItems.length > 0 && (
          <button
            onClick={onStartCoach}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--purple)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Start call coaching →
          </button>
        )}
      </div>

      {/* Right: dispute letter */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        overflowY: "auto",
      }}>
        {thinkingText && (
          <ThinkingStream text={thinkingText} isActive={isThinking} />
        )}

        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
          flex: 1,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Dispute letter
            </div>
            {letterDone && (
              <button
                onClick={copyLetter}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  background: copied ? "var(--green)" : "var(--border)",
                  color: "var(--text)",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>

          {flaggedItems.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              No overcharges found — no dispute letter needed.
            </div>
          ) : letterText ? (
            <pre style={{
              fontSize: "12px",
              lineHeight: 1.7,
              color: "var(--text)",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
            }}>
              {letterText}
              {!letterDone && <span style={{ animation: "blink 0.8s infinite", opacity: 0.6 }}>▋</span>}
            </pre>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", animation: "blink 1.4s infinite" }}>
              Generating dispute letter...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
