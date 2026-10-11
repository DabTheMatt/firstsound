import { regionFadeGain, type FadeCurve } from './fades'

/**
 * Copy of one loop pass with the waveform fades baked into the samples.
 * A native buffer loop then restarts at silence instead of joining two
 * full-scale samples. The first and last frames sit on the region edges,
 * so a fade that is visible on the wave is exactly what the seam plays.
 */
export function renderFadedRegion(
  channels: ArrayLike<number>[],
  sampleRate: number,
  loopStartSec: number,
  loopEndSec: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
  reverse = false,
): Float32Array[] | null {
  const sr = sampleRate > 0 ? sampleRate : 48000
  const length = channels[0]?.length ?? 0
  if (length < 2) return null
  const fadeIn = Math.max(0, fadeInSec)
  const fadeOut = Math.max(0, fadeOutSec)
  if (fadeIn < 0.0005 && fadeOut < 0.0005) return null
  const start = Math.max(0, Math.min(length - 2, Math.floor(Math.max(0, loopStartSec) * sr)))
  const end = Math.max(start + 2, Math.min(length, Math.ceil(Math.max(loopStartSec, loopEndSec) * sr)))
  const frames = end - start
  if (frames < 2) return null
  const span = frames / sr
  const last = frames - 1
  return channels.map((channel) => {
    const rendered = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      const t = i / last
      const rel = (reverse ? 1 - t : t) * span
      const gain = regionFadeGain(rel, span, fadeIn, fadeOut, curve, fadeInBend, fadeOutBend)
      rendered[i] = (channel[start + i] ?? 0) * gain
    }
    return rendered
  })
}
