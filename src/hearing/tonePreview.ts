/**
 * A short sine at the detected frequency.
 * It uses the engine's AudioContext and connects to that destination,
 * not the instrument mix, so the mix gain cannot raise it.
 * The ear is most sensitive around 2–5 kHz, and highs are easy to overdo,
 * so those bands are much quieter. A limiter is the second cap.
 */

const ABSOLUTE_PEAK = 0.045

let active: { stop: () => void } | null = null

/** Linear peak before the limiter. Never above ABSOLUTE_PEAK, and lower as frequency rises. */
export function previewPeakForHz(hz: number): number {
  if (!Number.isFinite(hz) || hz <= 0) return 0
  const f = Math.min(14000, Math.max(40, hz))
  let gain = ABSOLUTE_PEAK
  if (f < 180) gain *= 0.7
  if (f > 1000) gain *= (1000 / f) ** 0.85
  const sensitive = Math.exp(-((Math.log(f / 3200) / Math.log(2)) ** 2) / 0.8)
  gain *= 1 - 0.45 * sensitive
  return Math.min(ABSOLUTE_PEAK, Math.max(0.0015, gain))
}

/**
 * Play a faded sine on the engine context.
 * A second AudioContext stays silent once FIELD already owns the output,
 * so the preview must use the context that is already running.
 * It still connects straight to that context's destination, not the mix.
 */
export function previewDetectedTone(hz: number, context: AudioContext | null): void {
  if (!context || typeof window === 'undefined') return
  const peak = previewPeakForHz(hz)
  if (!(peak > 0)) return
  const start = () => startPreview(context, hz, peak)
  if (context.state === 'running') start()
  else void context.resume().then(start).catch(() => undefined)
}

function startPreview(ctx: AudioContext, hz: number, peak: number): void {
  const frequency = Math.min(14000, Math.max(40, hz))
  active?.stop()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -30
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.08
  osc.type = 'sine'
  osc.frequency.value = frequency
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peak, now + 0.02)
  gain.gain.setValueAtTime(peak, now + 0.28)
  gain.gain.linearRampToValueAtTime(0, now + 0.42)
  osc.connect(gain)
  gain.connect(limiter)
  limiter.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.46)
  const stop = () => {
    try {
      const at = ctx.currentTime
      gain.gain.cancelScheduledValues(at)
      gain.gain.setValueAtTime(0, at)
      osc.stop(at + 0.04)
    } catch {
      /* already stopped */
    }
  }
  active = { stop }
  osc.onended = () => {
    if (active?.stop === stop) active = null
  }
}
