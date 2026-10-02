import { describe, expect, it } from 'vitest'
import { classifyGesture, isTap, lockModulationGesture } from './gestureIntent'

describe('gesture intent', () => {
  it('keeps a small movement pending so a tap can focus without editing', () => {
    expect(classifyGesture(2, 3)).toBe('pending')
    expect(isTap(2, 3)).toBe(true)
  })

  it('treats a vertical move as scrolling', () => {
    expect(classifyGesture(4, 28)).toBe('scroll')
    expect(isTap(4, 28)).toBe(false)
  })

  it('treats a horizontal move as editing', () => {
    expect(classifyGesture(24, 6)).toBe('edit')
  })
})

describe('modulation press', () => {
  it('stays pending for a tap', () => {
    expect(lockModulationGesture('pending', 2, 3)).toBe('pending')
    expect(isTap(2, 3)).toBe(true)
  })

  it('locks a vertical move to scroll and does not reopen', () => {
    const locked = lockModulationGesture('pending', 4, 28)
    expect(locked).toBe('scroll')
    expect(lockModulationGesture(locked, 30, 2)).toBe('scroll')
  })

  it('ignores a sideways drag so the affordance does not edit the parameter', () => {
    expect(lockModulationGesture('pending', 24, 4)).toBe('ignore')
  })
})
