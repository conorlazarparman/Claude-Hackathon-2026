const BASE = "http://localhost:8000"

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 4 * 1024 * 1024) return file
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxW = 1800
      const scale = img.width > maxW ? maxW / img.width : 1
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name, { type: "image/jpeg" })),
        "image/jpeg",
        0.8
      )
    }
    img.src = url
  })
}

async function extractSingle(file: File): Promise<any> {
  const prepared = await compressImage(file)
  const form = new FormData()
  form.append("file", prepared)
  const res = await fetch(`${BASE}/api/audit/extract`, { method: "POST", body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function extractBill(files: File | File[]): Promise<any> {
  const arr = Array.isArray(files) ? files : [files]
  if (arr.length === 1) return extractSingle(arr[0])
  const results = await Promise.all(arr.map(extractSingle))
  const merged: any = {}
  for (const r of results) {
    for (const key of ["patient_name", "hospital_name", "hospital_npi", "account_number", "service_date"]) {
      if (!merged[key] && r[key]) merged[key] = r[key]
    }
  }
  let idCounter = 1
  merged.line_items = results.flatMap((r) =>
    (r.line_items ?? []).map((item: any) => ({ ...item, id: String(idCounter++) }))
  )
  merged.total_billed = results.reduce((sum, r) => sum + (r.total_billed ?? 0), 0)
  merged.total_patient_owes = results.reduce((sum, r) => sum + (r.total_patient_owes ?? 0), 0)
  return merged
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
