import { describe, expect, it } from 'vitest'
import { isPrimaryPadPress, shouldApplyPadMove, xyFromClient } from './filterXyPad'

const rect = { left: 10, top: 20, width: 100, height: 50 }

describe('xyFromClient', () => {
  it('maps the bottom-left corner to cutoff 0 and reso 0', () => {
    expect(xyFromClient(rect, 10, 70)).toEqual({ x: 0, y: 0 })
  })

  it('maps the top-right corner to cutoff 1 and reso 1', () => {
    expect(xyFromClient(rect, 110, 20)).toEqual({ x: 1, y: 1 })
  })
})

describe('isPrimaryPadPress', () => {
  it('rejects hover-like mouse events with no buttons held', () => {
    expect(isPrimaryPadPress({ button: 0, buttons: 0, pointerType: 'mouse' })).toBe(false)
  })

  it('accepts a left-button press', () => {
    expect(isPrimaryPadPress({ button: 0, buttons: 1, pointerType: 'mouse' })).toBe(true)
  })

  it('rejects a right-button press', () => {
    expect(isPrimaryPadPress({ button: 2, buttons: 2, pointerType: 'mouse' })).toBe(false)
  })
})

describe('shouldApplyPadMove', () => {
  it('ignores mouse movement when the left button is not held', () => {
    expect(shouldApplyPadMove({ buttons: 0, pointerType: 'mouse' })).toBe(false)
  })

  it('tracks the pad while the left mouse button is held', () => {
    expect(shouldApplyPadMove({ buttons: 1, pointerType: 'mouse' })).toBe(true)
  })

  it('keeps tracking touch after WebKit reports buttons=0', () => {
    expect(shouldApplyPadMove({ buttons: 0, pointerType: 'touch' })).toBe(true)
  })
})
