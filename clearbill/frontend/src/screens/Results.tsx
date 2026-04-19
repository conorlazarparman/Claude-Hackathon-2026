import { useState, useEffect, useRef } from "react"
import { CallCoach } from "./CallCoach"
import { streamLetter } from "../lib/api"

interface ResultsProps {
  auditData: any
  sessionId: string
}

export function Results({ auditData, sessionId }: ResultsProps) {
  const [tab, setTab] = useState<"coach" | "letter">("coach")
  const [letterText, setLetterText] = useState("")
  const [letterDone, setLetterDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const started = useRef(false)

  const flaggedItems = (auditData?.line_items || []).filter((i: any) => i.is_flagged)

  useEffect(() => {
    if (started.current || flaggedItems.length === 0) return
    started.current = true
    async function run() {
      try {
        for await (const event of streamLetter(flaggedItems, auditData.hospital_name || "Hospital")) {
          if (event.type === "text") setLetterText((t) => t + event.text)
          else if (event.type === "done") setLetterDone(true)
        }
      } catch {
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: "4px",
        padding: "10px 16px 0",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        flexShrink: 0,
      }}>
        {(["coach", "letter"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 500,
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--purple)" : "2px solid transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {t === "coach" ? "Call Coach" : "Dispute Letter"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "coach" && (
          <CallCoach auditResults={auditData} sessionId={sessionId} />
        )}

        {tab === "letter" && (
          <div style={{
            height: "100%",
            padding: "24px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
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
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
              flex: 1,
            }}>
              {flaggedItems.length === 0 ? (
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  No overcharges found — no dispute letter needed.
                </div>
              ) : letterText ? (
                <pre style={{
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  margin: 0,
                }}>
                  {letterText}
                  {!letterDone && <span style={{ animation: "blink 0.8s infinite", opacity: 0.6 }}>▋</span>}
                </pre>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", animation: "blink 1.4s infinite" }}>
                  Generating dispute letter…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
