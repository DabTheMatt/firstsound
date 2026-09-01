import { describe, expect, it } from 'vitest'
import { decimateWave, samplesToAppend, scrollWave } from './waveScroll'

describe('samplesToAppend', () => {
  it('scales with elapsed time and width', () => {
    expect(samplesToAppend(0.06, 120, 0.12)).toBe(60)
    expect(samplesToAppend(0, 160, 0.12)).toBe(1)
  })
})

describe('decimateWave', () => {
  it('keeps endpoints and signed polarity', () => {
    const samples = new Float32Array([-1, 0, 0.5, 1])
    const out = new Float32Array(2)
    decimateWave(samples, 2, out)
    expect(out[0]).toBe(-1)
    expect(out[1]).toBe(1)
  })
})

describe('scrollWave', () => {
  it('appends on the right and drops the oldest samples', () => {
    const history = new Float32Array([1, 2, 3, 4])
    scrollWave(history, new Float32Array([8, 9]))
    expect([...history]).toEqual([3, 4, 8, 9])
  })

  it('replaces the whole buffer when incoming is longer', () => {
    const history = new Float32Array([1, 2])
    scrollWave(history, new Float32Array([5, 6, 7]))
    expect([...history]).toEqual([6, 7])
  })
})
