import { useRef, useState } from "react"

interface UploadProps {
  onFile: (files: File | File[]) => void
  error?: string | null
}

export function Upload({ onFile, error }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (fileList: FileList | null) => {
    if (!fileList) return
    const valid = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    )
    if (valid.length === 0) return
    onFile(valid.length === 1 ? valid[0] : valid)
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      gap: "16px",
    }}>
      <div style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px" }}>
        ClearBill
      </div>
      <div style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "8px" }}>
        Upload a medical bill to check for overcharges
      </div>

      {error && (
        <div style={{
          width: "100%",
          maxWidth: "480px",
          background: "rgba(220,38,38,0.1)",
          border: "1px solid rgba(220,38,38,0.4)",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "13px",
          color: "#ef4444",
        }}>
          {error}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handle(e.dataTransfer.files)
        }}
        style={{
          width: "100%",
          maxWidth: "480px",
          border: `2px dashed ${dragging ? "var(--purple)" : "var(--border)"}`,
          borderRadius: "12px",
          padding: "48px 32px",
          textAlign: "center",
          cursor: "pointer",
          transition: "border-color 0.15s",
          background: dragging ? "rgba(127,119,221,0.05)" : "var(--bg-card)",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>📄</div>
        <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "6px" }}>
          Drop your bill here
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
          JPG, PNG, PDF — photos or scans, multiple files supported
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files)}
      />

      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: "12px 24px",
          background: "var(--purple)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        Choose file
      </button>
    </div>
  )
}
