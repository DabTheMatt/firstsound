/** Kellet-style pink noise, unit-ish peak, stereo-decorrelated per channel. */
export function fillPinkNoise(data: Float32Array, seed = 1): void {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  let s = seed >>> 0 || 1
  for (let i = 0; i < data.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    const white = (s / 0xffffffff) * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    data[i] = pink * 0.11
  }
}

export function createPinkNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.max(ctx.sampleRate, Math.floor(seconds * ctx.sampleRate))
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  fillPinkNoise(buffer.getChannelData(0), 1)
  fillPinkNoise(buffer.getChannelData(1), 0x9e3779b9)
  return buffer
}
