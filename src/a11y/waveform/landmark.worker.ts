import { detectLandmarks, type DetectedLandmark } from './detect'

type Request = {
  mono: Float32Array
  sampleRate: number
}

type Response = {
  marks: DetectedLandmark[]
}

self.onmessage = (event: MessageEvent<Request>) => {
  const { mono, sampleRate } = event.data
  void detectLandmarks([mono], sampleRate).then((marks) => {
    const response: Response = { marks }
    self.postMessage(response)
  })
}
