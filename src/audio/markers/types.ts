/** Named position on one loaded recording. Identity is `id`, not array index. */
export type AudioMarker = {
  id: string
  timeSeconds: number
  name: string
  description?: string
}

export type MarkerSource = {
  id: string
  fileName: string
  sampleRate: number
  duration: number
}

export type MarkerDocument = {
  source: MarkerSource
  markers: AudioMarker[]
}
