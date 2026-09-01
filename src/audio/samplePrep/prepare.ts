export type SilenceProposal = {
  startSec: number
  endSec: number
  leadingSec: number
  trailingSec: number
}

/**
 * Propose trimming leading/trailing material below `threshold` (linear amplitude).
 * Does not mutate audio — the UI should show markers and wait for confirm.
 */
export function detectSilence(
  channels: Float32Array[],
  sampleRate: number,
  threshold = 0.003,
  minKeepSec = 0.05,
): SilenceProposal | null {
  const len = channels[0]?.length ?? 0
  if (len < 8 || sampleRate <= 0) return null

  const loud = (i: number) => {
    for (const ch of channels) {
      if (Math.abs(ch[i] ?? 0) >= threshold) return true
    }
    return false
  }

  let start = 0
  while (start < len && !loud(start)) start++
  let end = len - 1
  while (end > start && !loud(end)) end--

  const minKeep = Math.floor(minKeepSec * sampleRate)
  if (end - start < minKeep) return null

  const startSec = start / sampleRate
  const endSec = (end + 1) / sampleRate
  const duration = len / sampleRate
  if (startSec < 0.005 && duration - endSec < 0.005) return null

  return {
    startSec,
    endSec,
    leadingSec: startSec,
    trailingSec: Math.max(0, duration - endSec),
  }
}

export function removeDc(channels: Float32Array[]): Float32Array[] {
  return channels.map((ch) => {
    let sum = 0
    for (let i = 0; i < ch.length; i++) sum += ch[i] ?? 0
    const mean = ch.length ? sum / ch.length : 0
    const out = new Float32Array(ch.length)
    for (let i = 0; i < ch.length; i++) out[i] = (ch[i] ?? 0) - mean
    return out
  })
}

export function peakAmplitude(channels: Float32Array[]): number {
  let peak = 0
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i] ?? 0)
      if (a > peak) peak = a
    }
  }
  return peak
}

export function applyGain(channels: Float32Array[], linear: number): Float32Array[] {
  return channels.map((ch) => {
    const out = new Float32Array(ch.length)
    for (let i = 0; i < ch.length; i++) out[i] = (ch[i] ?? 0) * linear
    return out
  })
}

export function invertChannel(ch: Float32Array): Float32Array {
  const out = new Float32Array(ch.length)
  for (let i = 0; i < ch.length; i++) out[i] = -(ch[i] ?? 0)
  return out
}

export function mixToMonoChannels(channels: Float32Array[]): Float32Array[] {
  if (channels.length <= 1) return channels.map((ch) => new Float32Array(ch))
  const len = channels[0]?.length ?? 0
  const out = new Float32Array(len)
  const n = channels.length
  for (let i = 0; i < len; i++) {
    let s = 0
    for (const ch of channels) s += ch[i] ?? 0
    out[i] = s / n
  }
  return [out]
}
