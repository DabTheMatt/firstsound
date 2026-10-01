import { describe, expect, it } from 'vitest'
import type { EqBand } from '../../audio/engine/eqBands'
import { eqDragMode, focusEqTypePatch, nextQArmed, nudgeFocusEq, qFromVertical } from './eqFocusGesture'

const bell: EqBand = {
  id: 'b',
  type: 'peaking',
  frequency: 1000,
  gain: 0,
  q: 0.7,
  slope: 12,
  bypassed: false,
  lfoExpanded: false,
}

describe('EQ focus gestures', () => {
  it('keeps the first drag on frequency and gain', () => {
    expect(eqDragMode(false, false)).toBe('xy')
    expect(eqDragMode(true, false)).toBe('xy')
  })

  it('arms Q only after a tap on the selected node', () => {
    expect(nextQArmed({ mode: 'xy', alreadySelected: true, movedPx: 2, menuOpened: false })).toBe(true)
    expect(nextQArmed({ mode: 'xy', alreadySelected: false, movedPx: 1, menuOpened: false })).toBe(false)
    expect(nextQArmed({ mode: 'xy', alreadySelected: true, movedPx: 20, menuOpened: false })).toBe(false)
    expect(nextQArmed({ mode: 'xy', alreadySelected: true, movedPx: 1, menuOpened: true })).toBe(false)
  })

  it('uses the following drag for Q and clears the arm on release', () => {
    expect(eqDragMode(true, true)).toBe('q')
    expect(nextQArmed({ mode: 'q', alreadySelected: true, movedPx: 40, menuOpened: false })).toBe(false)
  })

  it('raises Q when the finger moves up', () => {
    expect(qFromVertical(0.7, 80)).toBeCloseTo(1.4, 5)
    expect(qFromVertical(0.7, -800)).toBe(0.1)
  })

  it('nudges gain on arrows and Q with shift', () => {
    expect(nudgeFocusEq(bell, 'ArrowUp', false)?.gain).toBe(0.5)
    expect(nudgeFocusEq(bell, 'ArrowUp', true)?.q).toBeGreaterThan(bell.q)
    expect(nudgeFocusEq(bell, 'ArrowRight', false)?.frequency).toBeGreaterThan(bell.frequency)
  })

  it('gives steep slopes to new low and high pass types', () => {
    expect(focusEqTypePatch(bell, 'lowpass')).toEqual({ type: 'lowpass', slope: 48 })
    expect(focusEqTypePatch({ ...bell, slope: 48 }, 'highpass')).toEqual({ type: 'highpass' })
  })
})