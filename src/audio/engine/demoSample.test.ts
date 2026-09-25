import { describe, expect, it } from 'vitest'
import { timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'
import { DEMO_SAMPLE_SECONDS, DEMO_SECTION_SECONDS, renderDemoSample } from './demoSample'

function bandPower(channel: Float32Array, sr: number, section: number, loHz: number, hiHz: number): number {
  const n = 4096
  const scratch: SpectrumFftScratch = { window: null, real: null, imag: null }
  const db = new Float32Array(n / 2)
  const start = Math.floor((section * DEMO_SECTION_SECONDS + 0.12) * sr)
  const end = Math.floor(((section + 1) * DEMO_SECTION_SECONDS - 0.12) * sr)
  let power = 0
  let frames = 0
  for (let pos = start; pos + n <= end; pos += n) {
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

function db(power: number): number {
  return 10 * Math.log10(Math.max(power, 1e-12))
}

describe('renderDemoSample', () => {
  const sr = 44100
  const demo = renderDemoSample(sr)

  it('is a short stereo clip with four equal sections', () => {
    expect(demo.sampleRate).toBe(sr)
    expect(demo.left.length).toBe(Math.floor(DEMO_SAMPLE_SECONDS * sr))
    expect(demo.right.length).toBe(demo.left.length)
    expect(DEMO_SAMPLE_SECONDS / DEMO_SECTION_SECONDS).toBe(4)
  })

  it('is deterministic and uses both channels', () => {
    const again = renderDemoSample(sr)
    expect(again.left[1000]).toBe(demo.left[1000])
    expect(again.right[8000]).toBe(demo.right[8000])
    let diff = 0
    for (let i = 0; i < demo.left.length; i += 17) diff += Math.abs((demo.left[i] ?? 0) - (demo.right[i] ?? 0))
    expect(diff).toBeGreaterThan(1)
  })

  it('peaks in a musical range without clipping', () => {
    let peak = 0
    for (let i = 0; i < demo.left.length; i++) {
      peak = Math.max(peak, Math.abs(demo.left[i] ?? 0), Math.abs(demo.right[i] ?? 0))
    }
    expect(peak).toBeGreaterThan(0.7)
    expect(peak).toBeLessThanOrEqual(0.82 + 1e-4)
  })

  it('separates bass, mid, bright, and full-spectrum sections', () => {
    const mono = new Float32Array(demo.left.length)
    for (let i = 0; i < mono.length; i++) mono[i] = ((demo.left[i] ?? 0) + (demo.right[i] ?? 0)) * 0.5
    const bands = [0, 1, 2, 3].map((section) => ({
      low: bandPower(mono, sr, section, 35, 180),
      mid: bandPower(mono, sr, section, 250, 1400),
      high: bandPower(mono, sr, section, 2000, 12000),
    }))
    const bass = bands[0]!
    const mid = bands[1]!
    const bright = bands[2]!
    const full = bands[3]!

    expect(db(bass.low) - db(bass.mid)).toBeGreaterThan(8)
    expect(db(bass.low) - db(bass.high)).toBeGreaterThan(12)
    expect(db(mid.mid) - db(mid.low)).toBeGreaterThan(8)
    expect(db(mid.mid) - db(mid.high)).toBeGreaterThan(8)
    expect(db(bright.high) - db(bright.low)).toBeGreaterThan(10)
    expect(db(bright.high) - db(bright.mid)).toBeGreaterThan(6)

    const fullPeak = Math.max(full.low, full.mid, full.high)
    expect(db(fullPeak) - db(full.low)).toBeLessThan(14)
    expect(db(fullPeak) - db(full.mid)).toBeLessThan(14)
    expect(db(fullPeak) - db(full.high)).toBeLessThan(14)
  })
})
