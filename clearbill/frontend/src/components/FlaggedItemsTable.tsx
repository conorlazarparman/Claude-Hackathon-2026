interface FlaggedItem {
  description: string
  cpt_code_matched: string | null
  billed_amount: number
  medicare_rate: number | null
  flags: Array<{ type: string; label: string; delta: number; law: string }>
  potential_savings: number
}

interface FlaggedItemsTableProps {
  items: FlaggedItem[]
}

const FLAG_COLORS: Record<string, string> = {
  CRITICAL: "var(--red)",
  ELEVATED: "var(--amber)",
  REVIEW: "var(--text-secondary)",
}

export function FlaggedItemsTable({ items }: FlaggedItemsTableProps) {
  if (items.length === 0) {
    return (
      <div style={{ color: "var(--text-secondary)", fontSize: "13px", padding: "16px 0" }}>
        No flagged items found. Your bill looks clean.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                {item.description}
              </div>
              {item.cpt_code_matched && (
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                  CPT {item.cpt_code_matched}
                </div>
              )}
              {item.flags.map((flag, j) => (
                <div key={j} style={{ marginBottom: "2px" }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: FLAG_COLORS[flag.type] || "var(--text-secondary)",
                  }}>
                    {flag.type}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "6px" }}>
                    {flag.label}
                  </span>
                  {flag.law && (
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                      {flag.law}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Billed: ${item.billed_amount.toFixed(2)}
              </div>
              {item.medicare_rate != null && (
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Medicare: ${item.medicare_rate.toFixed(2)}
                </div>
              )}
              {item.potential_savings > 0 && (
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--red)", marginTop: "4px" }}>
                  −${item.potential_savings.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
