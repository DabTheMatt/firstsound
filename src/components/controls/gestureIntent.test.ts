import { describe, expect, it } from 'vitest'
import {
  classifyParameterGesture,
  createCoarseGestureSession,
  fineDragSpan,
  isCoarsePointer,
} from './gestureIntent'

describe('classifyParameterGesture', () => {
  it('does not decide before the pointer leaves the slop', () => {
    expect(classifyParameterGesture({ dx: 4, dy: 6, elapsedMs: 40, armed: false })).toBe('pending')
  })

  it('treats an unarmed vertical swipe as scrolling', () => {
    expect(classifyParameterGesture({ dx: 2, dy: 28, elapsedMs: 40, armed: false })).toBe('scroll')
  })

  it('treats an unarmed horizontal drag as a parameter gesture', () => {
    expect(classifyParameterGesture({ dx: 24, dy: 4, elapsedMs: 80, armed: false })).toBe('adjust')
  })

  it('lets a slow armed vertical drag edit a rotary control', () => {
    expect(classifyParameterGesture({ dx: 1, dy: 18, elapsedMs: 220, armed: true })).toBe('adjust')
  })

  it('lets a fast vertical flick scroll even when the control is armed', () => {
    expect(classifyParameterGesture({ dx: 2, dy: 40, elapsedMs: 30, armed: true })).toBe('scroll')
  })

  it('scrolls a horizontal slider on a vertical swipe', () => {
    expect(
      classifyParameterGesture({ dx: 3, dy: 22, elapsedMs: 40, armed: true, axis: 'horizontal' }),
    ).toBe('scroll')
  })
})

describe('createCoarseGestureSession', () => {
  it('does not emit a value change for a vertical swipe', () => {
    const changes: number[] = []
    const session = createCoarseGestureSession(
      { clientX: 40, clientY: 80, timeStamp: 0 },
      {
        armed: false,
        onAdjust: () => changes.push(1),
        onTap: () => changes.push(2),
      },
    )
    session.move({ clientX: 42, clientY: 96, timeStamp: 30 })
    session.move({ clientX: 43, clientY: 140, timeStamp: 70 })
    session.end('up')
    expect(session.role).toBe('scroll')
    expect(changes).toEqual([])
  })

  it('arms on a tap and edits on the following drag', () => {
    let armed = false
    let delta = 0
    const first = createCoarseGestureSession(
      { clientX: 10, clientY: 10, timeStamp: 0 },
      { armed, onTap: () => { armed = true } },
    )
    first.end('up')
    expect(armed).toBe(true)

    const second = createCoarseGestureSession(
      { clientX: 10, clientY: 10, timeStamp: 500 },
      {
        armed,
        onAdjust: (info) => {
          delta += info.dy
        },
      },
    )
    second.move({ clientX: 12, clientY: 28, timeStamp: 700 })
    second.move({ clientX: 12, clientY: 8, timeStamp: 820 })
    expect(second.role).toBe('adjust')
    expect(delta).toBeGreaterThan(0)
  })
})

describe('fineDragSpan', () => {
  it('lengthens the drag for fine adjustment', () => {
    expect(fineDragSpan(140, false)).toBe(140)
    expect(fineDragSpan(140, true)).toBe(420)
  })
})

describe('isCoarsePointer', () => {
  it('treats touch as coarse and mouse as precise', () => {
    expect(isCoarsePointer('touch')).toBe(true)
    expect(isCoarsePointer('mouse')).toBe(false)
    expect(isCoarsePointer('pen')).toBe(false)
  })
})
