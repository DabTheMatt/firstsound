import { describe, expect, it } from 'vitest'
import { isPrimaryPointerDown, isPrimaryPointerHeld } from './pointerDrag'

describe('pointerDrag', () => {
  it('starts only on the left mouse button', () => {
    expect(isPrimaryPointerDown({ button: 0 })).toBe(true)
    expect(isPrimaryPointerDown({ button: 1 })).toBe(false)
    expect(isPrimaryPointerDown({ button: 2 })).toBe(false)
    expect(isPrimaryPointerDown({ button: -1 })).toBe(false)
  })

  it('continues only while the left button is held', () => {
    expect(isPrimaryPointerHeld({ buttons: 1 })).toBe(true)
    expect(isPrimaryPointerHeld({ buttons: 0 })).toBe(false)
    expect(isPrimaryPointerHeld({ buttons: 2 })).toBe(false)
    expect(isPrimaryPointerHeld({ buttons: 3 })).toBe(true)
  })
})
