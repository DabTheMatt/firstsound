import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissHearingAlert, getHearingAlerts, HEARING_INFO_MS, pushHearingAlert } from './alerts'

function clearAlerts(): void {
  for (const alert of [...getHearingAlerts()]) dismissHearingAlert(alert.id)
}

describe('hearing alerts', () => {
  afterEach(() => {
    clearAlerts()
    vi.useRealTimers()
  })

  it('removes an info badge on its own so a loop notice does not stay', () => {
    vi.useFakeTimers()
    pushHearingAlert({ id: 'loop', title: 'LOOP ON', detail: 'Transport loop state.', tone: 'info' })
    expect(getHearingAlerts().map((alert) => alert.id)).toEqual(['loop'])
    vi.advanceTimersByTime(HEARING_INFO_MS)
    expect(getHearingAlerts()).toEqual([])
  })

  it('keeps a warning until it is dismissed', () => {
    vi.useFakeTimers()
    pushHearingAlert({ id: 'audio', title: 'AUDIO BLOCKED', detail: 'The browser has not started audio.', tone: 'warn' })
    vi.advanceTimersByTime(HEARING_INFO_MS * 3)
    expect(getHearingAlerts()).toHaveLength(1)
    dismissHearingAlert('audio')
    expect(getHearingAlerts()).toEqual([])
  })
})