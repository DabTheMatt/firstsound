import { describe, expect, it } from 'vitest'
import { micAccessMessage } from './micAccess'

describe('micAccessMessage', () => {
  it('explains permission denials for iPhone PWA recovery', () => {
    expect(micAccessMessage({ name: 'NotAllowedError' })).toMatch(/Settings → Safari → Microphone/)
  })

  it('falls back for unknown errors', () => {
    expect(micAccessMessage(null)).toMatch(/denied or is unavailable/)
  })
})
