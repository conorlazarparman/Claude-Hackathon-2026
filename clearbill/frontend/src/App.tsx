import { useState } from "react"
import { Upload } from "./screens/Upload"
import { Processing } from "./screens/Processing"
import { Results } from "./screens/Results"
import { CallCoach } from "./screens/CallCoach"
import { extractBill, analyzeBill } from "./lib/api"

type Screen = "upload" | "processing" | "results" | "coach"

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

function App() {
  const [screen, setScreen] = useState<Screen>("upload")
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [thinkingText, setThinkingText] = useState("")
  const [auditData, setAuditData] = useState<any>(null)
  const [sessionId] = useState(() => Math.random().toString(36).slice(2))

  const setStep = (i: number, status: Step["status"]) => {
    setSteps((prev) =>
      prev.map((s, j) => (j === i ? { ...s, status } : s))
    )
  }

  const handleFile = async (file: File) => {
    setScreen("processing")
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })))

    try {
      // Step 1: Extract
      setStep(0, "active")
      const extracted = await extractBill(file)
      setStep(0, "done")

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
      alert("Error processing bill. Check that the backend is running.")
      setScreen("upload")
    }
  }

  if (screen === "upload") {
    return <Upload onFile={handleFile} />
  }

  if (screen === "processing") {
    return <Processing steps={steps} thinking={thinkingText} />
  }

  if (screen === "results" && auditData) {
    return (
      <Results
        auditData={auditData}
        onStartCoach={() => setScreen("coach")}
      />
    )
  }

  if (screen === "coach" && auditData) {
    return <CallCoach auditResults={auditData} sessionId={sessionId} />
  }

  return null
}

export default App
