import { describe, expect, it } from 'vitest'
import { timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'

describe('timeDomainToDb', () => {
  it('puts a full-scale sine on the matching bin for every tap', () => {
    const n = 1024
    const bin = 16
    const time = new Float32Array(n)
    for (let i = 0; i < n; i++) time[i] = Math.sin((2 * Math.PI * bin * i) / n)
    const scratch = (): SpectrumFftScratch => ({ window: null, real: null, imag: null })
    const before = new Float32Array(n / 2)
    const after = new Float32Array(n / 2)
    timeDomainToDb(time, before, scratch())
    timeDomainToDb(time, after, scratch())
    let peak = 0
    for (let i = 1; i < before.length; i++) if ((before[i] ?? -100) > (before[peak] ?? -100)) peak = i
    expect(peak).toBe(bin)
    expect(before[bin]).toBeGreaterThan(-6)
    expect(after[bin]).toBeCloseTo(before[bin] ?? 0, 5)
    for (let i = 0; i < before.length; i++) expect(after[i]).toBeCloseTo(before[i] ?? 0, 5)
  })
})
