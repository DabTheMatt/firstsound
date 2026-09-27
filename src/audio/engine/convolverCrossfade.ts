import { setAudioParamNow, setSmoothedAudioParam, SMOOTH_GAIN_SEC } from './paramSmooth'

/**
 * Two convolvers crossfaded by the shared gain profile.
 * The idle leg stays at gain 0 so the next impulse can be written in silence.
 * A second assign at the same timestamp overwrites that idle buffer instead of
 * starting another fade. After the fade only one leg is audible.
 */
export type ConvolverPair = {
  input: GainNode
  output: GainNode
  a: ConvolverNode
  b: ConvolverNode
  gainA: GainNode
  gainB: GainNode
  live: 0 | 1
  swapAt: number
}

export function createConvolverPair(ctx: BaseAudioContext, normalize = false): ConvolverPair {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const a = ctx.createConvolver()
  const b = ctx.createConvolver()
  a.normalize = normalize
  b.normalize = normalize
  const gainA = ctx.createGain()
  const gainB = ctx.createGain()
  gainA.gain.value = 1
  gainB.gain.value = 0
  input.connect(a)
  a.connect(gainA)
  gainA.connect(output)
  input.connect(b)
  b.connect(gainB)
  gainB.connect(output)
  return { input, output, a, b, gainA, gainB, live: 0, swapAt: -1 }
}

export function convolverHasBuffer(pair: ConvolverPair): boolean {
  return Boolean((pair.live === 0 ? pair.a : pair.b).buffer)
}

export function setConvolverPairBuffer(pair: ConvolverPair, buffer: AudioBuffer, now: number): void {
  const t = Math.max(0, Number.isFinite(now) ? now : 0)
  const liveNode = pair.live === 0 ? pair.a : pair.b
  const liveGain = pair.live === 0 ? pair.gainA : pair.gainB
  const nextNode = pair.live === 0 ? pair.b : pair.a
  const nextGain = pair.live === 0 ? pair.gainB : pair.gainA
  if (!liveNode.buffer) {
    liveNode.buffer = buffer
    setAudioParamNow(liveGain.gain, 1, t)
    setAudioParamNow(nextGain.gain, 0, t)
    return
  }
  if (liveNode.buffer === buffer) return
  // Same gesture time: the idle leg is not audible yet, so replace its impulse.
  if (pair.swapAt >= 0 && Math.abs(t - pair.swapAt) <= 1e-4) {
    nextNode.buffer = buffer
    return
  }
  // A fade is still in progress. Dropping the buffer onto either leg clicks.
  // The next call after the fade (the debounced impulse rebuild, or the next
  // parameter tick) writes the silent leg.
  if (pair.swapAt >= 0 && t < pair.swapAt + SMOOTH_GAIN_SEC) return
  nextNode.buffer = buffer
  setSmoothedAudioParam(nextGain.gain, 1, t, 'gain')
  setSmoothedAudioParam(liveGain.gain, 0, t, 'gain')
  pair.live = pair.live === 0 ? 1 : 0
  pair.swapAt = t
}
