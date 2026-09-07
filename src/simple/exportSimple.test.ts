import { describe, expect, it } from 'vitest'
import { formatSimpleSeconds, mixPcmToMono, prepareSimpleExportPcm, simpleExportFilename } from './exportSimple'

describe('simple export helpers', () => {
  it('formats length for Polish with a comma', () => {
    expect(formatSimpleSeconds(4.8, 'pl')).toBe('4,8')
    expect(formatSimpleSeconds(4.8, 'en')).toBe('4.8')
  })

  it('mixes stereo to mono and names the file', () => {
    const pcm = {
      sampleRate: 44100,
      channels: [new Float32Array([1, 0]), new Float32Array([-1, 0])],
    }
    expect(mixPcmToMono(pcm).channels[0]?.[0]).toBeCloseTo(0)
    expect(simpleExportFilename('take.wav', 'mp3')).toBe('take.mp3')
    const down = prepareSimpleExportPcm(pcm, {
      name: 'x',
      format: 'wav',
      sampleRate: 22050,
      bitDepth: 16,
      mono: true,
    })
    expect(down.sampleRate).toBe(22050)
    expect(down.channels).toHaveLength(1)
  })
})
