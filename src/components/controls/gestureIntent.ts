/**
 * Touch gesture intent for parameter controls.
 * A contact does not change a value. Movement locks the gesture to either
 * scrolling or editing, and that role does not switch mid-gesture.
 */

export type GestureRole = 'pending' | 'scroll' | 'adjust'

export const GESTURE_SLOP_PX = 10

/** Vertical flicks faster than this (px/ms) scroll even on an armed control. */
export const FLICK_SPEED_PX_PER_MS = 0.85

export type GestureAxis = 'either' | 'horizontal' | 'vertical'

export function isCoarsePointer(pointerType: string): boolean {
  return pointerType === 'touch'
}

export function classifyParameterGesture(input: {
  dx: number
  dy: number
  elapsedMs: number
  armed: boolean
  axis?: GestureAxis
  slop?: number
}): GestureRole {
  const slop = input.slop ?? GESTURE_SLOP_PX
  const adx = Math.abs(input.dx)
  const ady = Math.abs(input.dy)
  if (adx < slop && ady < slop) return 'pending'

  const vertical = ady >= adx
  const axis = input.axis ?? 'either'

  if (axis === 'horizontal' && vertical) return 'scroll'
  if (axis === 'vertical' && !vertical) return 'scroll'

  if (!input.armed) {
    return vertical ? 'scroll' : 'adjust'
  }

  if (vertical) {
    const speed = ady / Math.max(16, input.elapsedMs)
    if (speed > FLICK_SPEED_PX_PER_MS) return 'scroll'
    return 'adjust'
  }
  return 'adjust'
}

export function fineDragSpan(normal: number, fine: boolean): number {
  return fine ? normal * 3 : normal
}

export type CoarseGesturePoint = {
  clientX: number
  clientY: number
  timeStamp: number
  shiftKey?: boolean
}

export type CoarseGestureHandlers = {
  armed: boolean
  axis?: GestureAxis
  onScroll?: () => void
  onAdjustStart?: (info: { fine: boolean; clientX: number; clientY: number }) => void
  /** dy is upward-positive, matching a rotary drag. */
  onAdjust?: (info: { clientX: number; clientY: number; dx: number; dy: number; fine: boolean }) => void
  onTap?: () => void
  onEnd?: (info: { adjusted: boolean }) => void
}

export function createCoarseGestureSession(start: CoarseGesturePoint, handlers: CoarseGestureHandlers) {
  let role: GestureRole = 'pending'
  let lastX = start.clientX
  let lastY = start.clientY
  let fine = false

  const move = (event: CoarseGesturePoint): GestureRole => {
    if (role === 'scroll') return role
    if (role === 'pending') {
      const next = classifyParameterGesture({
        dx: event.clientX - start.clientX,
        dy: event.clientY - start.clientY,
        elapsedMs: event.timeStamp - start.timeStamp,
        armed: handlers.armed,
        axis: handlers.axis,
      })
      if (next === 'pending') return role
      role = next
      if (next === 'scroll') {
        handlers.onScroll?.()
        return role
      }
      fine = Boolean(event.shiftKey) || event.timeStamp - start.timeStamp > 280
      handlers.onAdjustStart?.({ fine, clientX: event.clientX, clientY: event.clientY })
      lastX = event.clientX
      lastY = event.clientY
      return role
    }
    const dx = event.clientX - lastX
    const dy = lastY - event.clientY
    lastX = event.clientX
    lastY = event.clientY
    handlers.onAdjust?.({
      clientX: event.clientX,
      clientY: event.clientY,
      dx,
      dy,
      fine: fine || Boolean(event.shiftKey),
    })
    return role
  }

  const end = (kind: 'up' | 'cancel'): GestureRole => {
    if (kind === 'up' && role === 'pending') handlers.onTap?.()
    handlers.onEnd?.({ adjusted: role === 'adjust' })
    return role
  }

  return {
    move,
    end,
    get role() {
      return role
    },
  }
}
