/** Non-destructive sample-preparation document. Times are seconds on the source buffer. */

export type FadeCurveId = 'linear' | 'equalPower' | 'exponential' | 'sCurve'

export const FADE_CURVES: { id: FadeCurveId; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'equalPower', label: 'Smooth' },
  { id: 'exponential', label: 'Exponential' },
  { id: 'sCurve', label: 'S-Curve' },
]

export type ChannelMode = 'original' | 'mono' | 'left' | 'right' | 'swap'

export const CHANNEL_MODES: { id: ChannelMode; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'mono', label: 'Mono' },
  { id: 'left', label: 'Left only' },
  { id: 'right', label: 'Right only' },
  { id: 'swap', label: 'Swap L/R' },
]

export type WavBitDepth = 16 | 24 | 32

export type SamplePrepState = {
  /** Active crop window on the source. The main waveform shows this range. */
  windowStart: number
  windowEnd: number
  selectionStart: number
  selectionEnd: number
  reverse: boolean
  gainDb: number
  normalize: boolean
  normalizeTargetDbfs: number
  removeDc: boolean
  invertL: boolean
  invertR: boolean
  channelMode: ChannelMode
  fadeInEnabled: boolean
  fadeOutEnabled: boolean
  fadeInSec: number
  fadeOutSec: number
  fadeInCurve: FadeCurveId
  fadeOutCurve: FadeCurveId
  /** 0..1 curvature control (0.5 = the named curve’s default shape). */
  fadeInBend: number
  fadeOutBend: number
  fadeAuto: boolean
  autoSnapZero: boolean
  /** Optional name for this crop inside a shared source recording. */
  clipName: string
}

export type Pcm = {
  sampleRate: number
  channels: Float32Array[]
}

export type RenderOptions = {
  applyFades: boolean
  applyGain: boolean
  applyReverse: boolean
  applyNormalize: boolean
  applyDc: boolean
  applyChannels: boolean
  sampleRate: number | 'original'
}

export type ExportSettings = {
  name: string
  sampleRate: number | 'original'
  bitDepth: WavBitDepth
  applyFades: boolean
  applyGain: boolean
  applyReverse: boolean
  applyNormalize: boolean
}

export const DEFAULT_NORMALIZE_DBFS = -1
export const DEFAULT_PROTECTIVE_FADE_SEC = 0.01
export const PREP_MIN_REGION = 0.005
export const ZERO_SEARCH_SEC = 0.08
export const ZERO_WARN_SEC = 0.04
