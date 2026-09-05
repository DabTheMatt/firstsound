import { describe, expect, it } from 'vitest'
import { detectTransients, estimateTempo } from './transients'
import { addTap, bpmFromTaps, emptyTapTempo } from './tapTempo'

function clickTrain(sampleRate: number, durationSec: number, intervalSec: number, startSec = 0.08): Float32Array {
  const n = Math.floor(durationSec * sampleRate)
  const out = new Float32Array(n)
  const click = Math.max(4, Math.floor(sampleRate * 0.003))
  for (let t = startSec; t < durationSec - 0.05; t += intervalSec) {
    const i0 = Math.floor(t * sampleRate)
    for (let k = 0; k < click && i0 + k < n; k++) {
      out[i0 + k] = Math.exp(-k / (click * 0.25))
    }
  }
  return out
}

describe('detectTransients', () => {
  it('finds regularly spaced clicks', () => {
    const sr = 8000
    const samples = clickTrain(sr, 4, 0.5)
    const times = detectTransients(samples, sr)
    expect(times.length).toBeGreaterThanOrEqual(6)
    const gaps: number[] = []
    for (let i = 1; i < times.length; i++) gaps.push((times[i] ?? 0) - (times[i - 1] ?? 0))
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    expect(mean).toBeGreaterThan(0.42)
    expect(mean).toBeLessThan(0.58)
  })

  it('returns nothing for silence', () => {
    expect(detectTransients(new Float32Array(8000), 8000)).toEqual([])
  })
})

describe('estimateTempo', () => {
  it('guesses 120 BPM from quarter-note clicks', () => {
    const sr = 8000
    const samples = clickTrain(sr, 8, 0.5)
    const guess = estimateTempo(samples, sr)
    expect(guess).not.toBeNull()
    expect(guess!.bpm).toBeGreaterThanOrEqual(115)
    expect(guess!.bpm).toBeLessThanOrEqual(125)
    expect(guess!.transients.length).toBeGreaterThan(8)
  })

  it('guesses 90 BPM from slower clicks', () => {
    const sr = 8000
    const samples = clickTrain(sr, 8, 60 / 90)
    const guess = estimateTempo(samples, sr)
    expect(guess).not.toBeNull()
    expect(guess!.bpm).toBeGreaterThanOrEqual(85)
    expect(guess!.bpm).toBeLessThanOrEqual(95)
  })
})

describe('tapTempo', () => {
  it('averages inter-tap intervals into BPM', () => {
    expect(bpmFromTaps([0, 0.5, 1, 1.5])).toBeCloseTo(120, 0)
  })

  it('resets after a long gap', () => {
    let state = emptyTapTempo()
    const first = addTap(state, 0)
    const second = addTap(first.state, 0.5)
    expect(second.bpm).toBeCloseTo(120, 0)
    const reset = addTap(second.state, 5)
    expect(reset.state.times).toEqual([5])
    expect(reset.bpm).toBeNull()
  })

  it('ignores a double-click bounce', () => {
    const first = addTap(emptyTapTempo(), 1)
    const bounce = addTap(first.state, 1.1)
    expect(bounce.state.times).toEqual([1])
  })
})
