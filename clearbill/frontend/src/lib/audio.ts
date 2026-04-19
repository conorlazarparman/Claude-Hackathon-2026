export type DiarizedUtterance = {
  speaker: "patient" | "rep"
  text: string
  isFinal: boolean
}

export class DeepgramCapture {
  private ws: WebSocket
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private speakerMap: Record<number, "patient" | "rep"> = { 0: "patient", 1: "rep" }

  onUtterance: (u: DiarizedUtterance) => void = () => {}
  onError: (msg: string) => void = () => {}
  onReady: () => void = () => {}

  constructor(apiKey: string) {
    const params = new URLSearchParams({
      model: "nova-2",
      diarize: "true",
      punctuate: "true",
      interim_results: "true",
      utterance_end_ms: "1000",
      vad_events: "true",
      smart_format: "true",
    })
    this.ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      ["token", apiKey]
    )
    this.ws.onopen = () => this.onReady()
    this.ws.onmessage = (e) => this._handleMessage(e)
    this.ws.onerror = () => this.onError("Deepgram connection failed — check your API key")
    this.ws.onclose = (e) => {
      if (e.code !== 1000) this.onError(`Deepgram disconnected (${e.code})`)
    }
  }

  private _handleMessage(e: MessageEvent) {
    let data: any
    try {
      data = JSON.parse(e.data)
    } catch {
      return
    }
    if (data.type !== "Results") return

    const alt = data.channel?.alternatives?.[0]
    if (!alt?.transcript?.trim()) return

    // Determine dominant speaker from word-level tags
    const words: Array<{ speaker: number }> = alt.words ?? []
    const counts: Record<number, number> = {}
    for (const w of words) {
      counts[w.speaker] = (counts[w.speaker] ?? 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))
    const dominantSpeaker = sorted.length > 0 ? Number(sorted[0][0]) : 0

    this.onUtterance({
      speaker: this.speakerMap[dominantSpeaker] ?? "rep",
      text: alt.transcript,
      isFinal: !!data.speech_final,
    })
  }

  flipSpeakers() {
    this.speakerMap = {
      0: this.speakerMap[0] === "patient" ? "rep" : "patient",
      1: this.speakerMap[1] === "patient" ? "rep" : "patient",
    }
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }
      this.ws.onopen = () => { this.onReady(); resolve() }
      this.ws.onerror = () => reject(new Error("Deepgram connection failed"))
    })

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: "audio/webm;codecs=opus",
    })
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(e.data)
      }
    }
    this.mediaRecorder.start(250)
  }

  stop() {
    this.mediaRecorder?.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }))
      this.ws.close(1000)
    }
  }
}
