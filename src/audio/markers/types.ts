import type { TrackColorId } from '../mix/tracks'

/** Named position on one loaded recording. Identity is `id`, not array index. */
export type AudioMarker = {
  id: string
  timeSeconds: number
  name: string
  description?: string
  /** Absent keeps the default ink. A value is one swatch from the track palette. */
  color?: TrackColorId
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
