import { describe, expect, it } from 'vitest'
import { timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'
import { demoDurationSeconds, demoSampleName, renderDemoSample } from './demoSample'

function bandEnergy(channel: Float32Array, sr: number, loHz: number, hiHz: number): number {
  const n = 4096
  const scratch: SpectrumFftScratch = { window: null, real: null, imag: null }
  const db = new Float32Array(n / 2)
  let power = 0
  let frames = 0
  for (let pos = 0; pos + n <= channel.length; pos += n * 4) {
    timeDomainToDb(channel.subarray(pos, pos + n), db, scratch)
    let frame = 0
    for (let bin = 1; bin < db.length; bin++) {
      const hz = (bin * sr) / n
      if (hz < loHz || hz >= hiHz) continue
      const mag = 10 ** ((db[bin] ?? -100) / 20)
      frame += mag * mag
    }
    power += frame
    frames++
  }
  return power / Math.max(1, frames)
}

function windowRms(channel: Float32Array, start: number, end: number): number {
  let sum = 0
  let count = 0
  for (let i = start; i < end; i += 8) {
    const s = channel[i] ?? 0
    sum += s * s
    count++
  }
  return Math.sqrt(sum / Math.max(1, count))
}

function peakOf(demo: { left: Float32Array; right: Float32Array }): number {
  let peak = 0
  for (let i = 0; i < demo.left.length; i += 4) {
    peak = Math.max(peak, Math.abs(demo.left[i] ?? 0), Math.abs(demo.right[i] ?? 0))
  }
  return peak
}

describe('renderDemoSample', () => {
  const sr = 22050

  it('lasts between 12 and 24 seconds and names the buffer from the seed', () => {
    const seed = 482
    const demo = renderDemoSample(sr, seed)
    const seconds = demo.left.length / sr
    expect(demo.sampleRate).toBe(sr)
    expect(demo.right.length).toBe(demo.left.length)
    expect(seconds).toBeGreaterThanOrEqual(12)
    expect(seconds).toBeLessThanOrEqual(24)
    expect(demoDurationSeconds(seed)).toBeCloseTo(seconds, 2)
    expect(demoSampleName(seed)).toBe('FIELD Texture 582')
  })

  it('is deterministic per seed and different across seeds', () => {
    const a = renderDemoSample(sr, 11)
    const b = renderDemoSample(sr, 11)
    const c = renderDemoSample(sr, 99)
    expect(b.left[4000]).toBe(a.left[4000])
    expect(b.right[9000]).toBe(a.right[9000])
    expect(c.left.length === a.left.length && c.left[4000] === a.left[4000]).toBe(false)
    expect(demoSampleName(11)).not.toBe(demoSampleName(99))
  })

  it('is stereo, peaked near -6 dBFS, and not a flat noise block', () => {
    const demo = renderDemoSample(sr, 2048)
    let diff = 0
    for (let i = 0; i < demo.left.length; i += 17) diff += Math.abs((demo.left[i] ?? 0) - (demo.right[i] ?? 0))
    expect(diff).toBeGreaterThan(1)
    const peak = peakOf(demo)
    expect(peak).toBeGreaterThan(0.4)
    expect(peak).toBeLessThan(0.62)
    const mono = new Float32Array(demo.left.length)
    for (let i = 0; i < mono.length; i++) mono[i] = ((demo.left[i] ?? 0) + (demo.right[i] ?? 0)) * 0.5
    expect(bandEnergy(mono, sr, 40, 180)).toBeGreaterThan(1e-6)
    expect(bandEnergy(mono, sr, 250, 2000)).toBeGreaterThan(1e-6)
    expect(bandEnergy(mono, sr, 2000, 10000)).toBeGreaterThan(1e-8)
    const slice = Math.floor(mono.length / 8)
    let quiet = Number.POSITIVE_INFINITY
    let loud = 0
    for (let w = 0; w < 8; w++) {
      const rms = windowRms(mono, w * slice, (w + 1) * slice)
      quiet = Math.min(quiet, rms)
      loud = Math.max(loud, rms)
    }
    expect(loud).toBeGreaterThan(quiet * 3)
  })
})
