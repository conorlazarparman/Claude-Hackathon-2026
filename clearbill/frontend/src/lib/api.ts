const BASE = "http://localhost:8000"

export async function extractBill(file: File): Promise<any> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/audit/extract`, { method: "POST", body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function analyzeBill(lineItems: any[], hospitalNpi?: string): Promise<any> {
  const res = await fetch(`${BASE}/api/audit/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line_items: lineItems, hospital_npi: hospitalNpi }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export type LetterEvent =
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "done" }

export async function* streamLetter(
  flaggedItems: any[],
  hospitalName: string
): AsyncGenerator<LetterEvent> {
  const res = await fetch(`${BASE}/api/audit/letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flagged_items: flaggedItems, hospital_name: hospitalName }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const raw = line.slice(6).trim()
      if (raw === "[DONE]") {
        yield { type: "done" }
        return
      }
      try {
        const event = JSON.parse(raw)
        yield event as LetterEvent
      } catch {}
    }
  }
}
