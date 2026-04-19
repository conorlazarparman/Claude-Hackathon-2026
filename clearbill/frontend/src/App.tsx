import { useState } from "react"
import { Upload } from "./screens/Upload"
import { Processing } from "./screens/Processing"
import { Results } from "./screens/Results"
import { extractBill, analyzeBill } from "./lib/api"

type Screen = "upload" | "processing" | "results"

interface Step {
  label: string
  status: "pending" | "active" | "done"
}

const INITIAL_STEPS: Step[] = [
  { label: "Reading bill with Claude Vision", status: "pending" },
  { label: "Looking up CPT codes", status: "pending" },
  { label: "Scoring against Medicare rates", status: "pending" },
  { label: "Generating dispute letter", status: "pending" },
]

function isBadExtraction(data: any): boolean {
  if (!data.line_items || data.line_items.length === 0) return true
  return data.line_items.every((item: any) => !item.billed_amount || item.billed_amount === 0)
}

function App() {
  const [screen, setScreen] = useState<Screen>("upload")
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [thinkingText, setThinkingText] = useState("")
  const [auditData, setAuditData] = useState<any>(null)
  const [sessionId] = useState(() => Math.random().toString(36).slice(2))
  const [uploadError, setUploadError] = useState<string | null>(null)

  const setStep = (i: number, status: Step["status"]) => {
    setSteps((prev) =>
      prev.map((s, j) => (j === i ? { ...s, status } : s))
    )
  }

  const handleFile = async (files: File | File[]) => {
    setUploadError(null)
    setScreen("processing")
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })))

    try {
      // Step 1: Extract
      setStep(0, "active")
      const extracted = await extractBill(Array.isArray(files) ? files : [files])
      setStep(0, "done")

      if (isBadExtraction(extracted)) {
        setUploadError("Couldn't read charges from this image. Try a clearer photo with better lighting, or upload the PDF version.")
        setScreen("upload")
        return
      }

      // Step 2 + 3: Analyze (lookup + score merged)
      setStep(1, "active")
      setStep(2, "active")
      const analyzed = await analyzeBill(extracted.line_items, extracted.hospital_npi)
      setStep(1, "done")
      setStep(2, "done")

      // Step 4: Letter (starts streaming in Results screen)
      setStep(3, "active")

      const fullData = { ...extracted, line_items: analyzed.line_items }
      setAuditData(fullData)
      setScreen("results")
    } catch (e) {
      console.error(e)
      setUploadError("Error processing bill. Check that the backend is running.")
      setScreen("upload")
    }
  }

  if (screen === "upload") {
    return <Upload onFile={handleFile} error={uploadError} />
  }

  if (screen === "processing") {
    return <Processing steps={steps} thinking={thinkingText} />
  }

  if (screen === "results" && auditData) {
    return <Results auditData={auditData} sessionId={sessionId} />
  }

  return null
}

export default App
