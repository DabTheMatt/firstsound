import { applyFades, type FadeCurve } from './fades'
import { reverseChannel } from './buffers'
import { dbToGain } from '../parameters/mapping'

export type RenderEdit = {
  start: number
  end: number
  reverse: boolean
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  /** Extra linear gain (peak-normalize, trim gain, etc). */
  gain: number
}

/**
 * Copy a region out of a buffer and apply non-destructive edits. Used by
 * Use As Sample / Export so preview and bounce share one processing path.
 */
export function renderRegion(
  source: AudioBuffer,
  ctx: BaseAudioContext,
  edit: RenderEdit,
): AudioBuffer {
  const sr = source.sampleRate
  const start = Math.min(Math.max(0, Math.floor(edit.start * sr)), source.length)
  const end = Math.min(source.length, Math.max(start + 1, Math.floor(edit.end * sr)))
  const length = Math.max(1, end - start)
  const out = ctx.createBuffer(source.numberOfChannels, length, sr)
  const gain = Number.isFinite(edit.gain) ? edit.gain : 1
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const slice = source.getChannelData(ch).slice(start, end)
    if (edit.reverse) slice.set(reverseChannel(slice))
    if (gain !== 1) {
      for (let i = 0; i < slice.length; i++) slice[i] = (slice[i] ?? 0) * gain
    }
    applyFades(slice, sr, edit.fadeIn, edit.fadeOut, edit.fadeCurve)
    out.getChannelData(ch).set(slice)
  }
  return out
}

export function peakOfBuffer(buffer: AudioBuffer, start: number, end: number): number {
  const sr = buffer.sampleRate
  const s = Math.min(Math.max(0, Math.floor(start * sr)), buffer.length)
  const e = Math.min(buffer.length, Math.max(s + 1, Math.floor(end * sr)))
  let peak = 0
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = s; i < e; i++) {
      const a = Math.abs(data[i] ?? 0)
      if (a > peak) peak = a
    }
  }
  return peak
}

/** Linear gain that puts `peak` at `targetDb` (default −1 dBFS). */
export function peakNormalizeGain(peak: number, targetDb = -1): number {
  if (!(peak > 0)) return 1
  return dbToGain(targetDb) / peak
}
