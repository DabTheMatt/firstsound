import { describe, expect, it } from 'vitest'
import { classifyGesture, isTap } from './gestureIntent'

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
