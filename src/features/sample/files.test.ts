import { describe, expect, it } from 'vitest'
import { parsePreset, AUDIO_FILE_ACCEPT } from './files'

describe('parsePreset', () => {
  it('accepts a v1 field preset', () => {
    const preset = parsePreset({
      instrument: 'field',
      version: 1,
      loop: true,
      engineMode: 'grain',
      params: { speed: 1 },
    })
    expect(preset?.instrument).toBe('field')
    expect(preset?.engineMode).toBe('grain')
  })

  it('rejects other shapes', () => {
    expect(parsePreset(null)).toBeNull()
    expect(parsePreset({ instrument: 'other', version: 1, params: {} })).toBeNull()
  })
})

describe('AUDIO_FILE_ACCEPT', () => {
  it('lists formats Safari on iOS can typically decode', () => {
    expect(AUDIO_FILE_ACCEPT).toContain('.wav')
    expect(AUDIO_FILE_ACCEPT).toContain('.m4a')
    expect(AUDIO_FILE_ACCEPT).toContain('.caf')
  })
})
