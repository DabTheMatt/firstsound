import { describe, expect, it } from 'vitest'
import { formatFrequencyLandmark, frequencyLandmark } from './freqLandmarks'

describe('frequency landmarks', () => {
  it('puts kick boom well below the voice band', () => {
    expect(frequencyLandmark(90)?.id).toBe('kick')
    expect(frequencyLandmark(1000)?.id).toBe('voice')
    expect(formatFrequencyLandmark(1000)).toMatch(/Voice/)
    expect(formatFrequencyLandmark(90)).toMatch(/Kick boom/)
    expect(formatFrequencyLandmark(1000)).not.toMatch(/Kick boom/)
  })

  it('names snare crack and air from the same chart', () => {
    expect(frequencyLandmark(3200)?.id).toBe('crack')
    expect(formatFrequencyLandmark(3200)).toMatch(/snare crack/)
    expect(frequencyLandmark(10000)?.id).toBe('sibilance')
    expect(frequencyLandmark(16000)?.id).toBe('air')
  })

  it('covers the plot edges and ignores a bad frequency', () => {
    expect(frequencyLandmark(20)?.id).toBe('sub')
    expect(frequencyLandmark(24000)?.id).toBe('air')
    expect(frequencyLandmark(0)).toBeNull()
    expect(frequencyLandmark(Number.NaN)).toBeNull()
  })
})
