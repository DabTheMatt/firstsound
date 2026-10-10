/** Track tabs hang from the top of the wave pane; loop nodes sit below them. */
export const LOOP_HANDLE_TOP_PX = 26

export const LOOP_HANDLE_HEIGHT_PX = 16

/** Envelope diamonds sit below the loop nodes so the hit targets do not overlap. */
export const FADE_DIAMOND_TOP_PX = LOOP_HANDLE_TOP_PX + LOOP_HANDLE_HEIGHT_PX + 2

export const FADE_DIAMOND_SIZE_PX = 18

/** Delay/reverb overlay keeps the band above fade diamonds for loop / envelope. */
export const SPACE_HANDLE_TOP_PX = FADE_DIAMOND_TOP_PX + FADE_DIAMOND_SIZE_PX + 2

/** True when a pointer Y is in the loop / parked-fade node stack. */
export function hitsLoopNodeY(y: number, hitPx: number): boolean {
  const pad = hitPx * 0.35
  const top = LOOP_HANDLE_TOP_PX - pad
  const bottom = FADE_DIAMOND_TOP_PX + FADE_DIAMOND_SIZE_PX + pad
  return y >= top && y <= bottom
}

/** Short fades park the diamond on the loop node — do not steal the edge drag. */
export function fadeParkedOnLoopNode(fadePx: number, loopEdgePx: number, hitPx: number): boolean {
  return Math.abs(fadePx - loopEdgePx) < hitPx
}

export type WaveformDragKind =
  | 'start'
  | 'end'
  | 'move'
  | 'fadeIn'
  | 'fadeOut'
  | 'fadeInShape'
  | 'fadeOutShape'
  | 'playhead'
  | 'transient'
  | 'pan'

/** Pixels of left-drag before a body press becomes a sample selection. */
export const SELECTION_DRAG_THRESHOLD_PX = 4

/** Pixels of movement before a non-select press pans the view. */
export const PAN_DRAG_THRESHOLD_PX = 8

/**
 * A mouse left-drag draws a selection in Simple and Technical.
 * Touch keeps the pan gesture. Trim edges are chosen before this runs.
 */
export function promotePlayheadDrag(opts: {
  simple: boolean
  button: number
  pointerType: string
  dx: number
}): 'playhead' | 'select' | 'pan' {
  if (opts.pointerType !== 'touch' && opts.button === 0 && opts.dx > SELECTION_DRAG_THRESHOLD_PX) {
    return 'select'
  }
  if (opts.dx > PAN_DRAG_THRESHOLD_PX) return 'pan'
  return 'playhead'
}

/** Selection spans the press anchor and the current pointer, in either direction. */
export function selectionFromAnchor(anchor: number, pointer: number): { start: number; end: number } {
  return { start: Math.min(anchor, pointer), end: Math.max(anchor, pointer) }
}

/** Top fraction of each selection boundary edits the fade. The rest moves that edge. */
export const SELECTION_FADE_FRACTION = 1 / 8

/**
 * Height of the fade hit zone. Touch grows it a little so a finger can land
 * on it, without taking the resize zone below.
 */
export function selectionFadeZonePx(height: number, coarse = false, larger = false): number {
  const h = Math.max(0, height)
  const fraction = h * SELECTION_FADE_FRACTION
  if (coarse) return Math.min(h * 0.34, Math.max(fraction, Math.min(36, h)))
  if (larger) return Math.min(h * 0.28, Math.max(fraction, Math.min(44, h)))
  return fraction
}

export function selectionBoundaryZone(y: number, height: number, coarse = false, larger = false): 'fade' | 'edge' {
  if (!(height > 0)) return 'edge'
  return y <= selectionFadeZonePx(height, coarse, larger) ? 'fade' : 'edge'
}

/**
 * Radius around the selection line. Touch is a 44px-wide target; the line
 * itself stays about 1.5px.
 */
export function selectionBoundaryHitPx(pointerType: string, larger = false): number {
  if (pointerType === 'touch' || pointerType === 'pen') return 22
  return larger ? 22 : 10
}

/**
 * The selection line is the control.
 * Top of the line edits fade in or fade out. The rest of the line moves that
 * edge. Shift away from the line still slides the whole region. A boundary
 * hit wins over shift, so resize and move stay distinct.
 */
export function resolveWaveformDrag(opts: {
  altOrMiddle: boolean
  shift: boolean
  x: number
  y: number
  height?: number
  startX: number
  endX: number
  fadeInX: number
  fadeOutX: number
  hitPx: number
  fadeSide?: 'in' | 'out'
  fadeRole?: string
  edge?: 'start' | 'end'
  boundaryZone?: 'fade' | 'edge'
  coarse?: boolean
  larger?: boolean
  transient?: boolean
}): WaveformDragKind {
  if (opts.altOrMiddle) return 'pan'
  const height = opts.height ?? 0
  const zone =
    opts.boundaryZone ?? (height > 0 ? selectionBoundaryZone(opts.y, height, opts.coarse, opts.larger) : 'edge')
  const nearStart = height > 0 && Math.abs(opts.x - opts.startX) <= opts.hitPx
  const nearEnd = height > 0 && Math.abs(opts.x - opts.endX) <= opts.hitPx
  let edge = opts.edge
  if (!edge) {
    if (nearStart && nearEnd) edge = Math.abs(opts.x - opts.startX) <= Math.abs(opts.x - opts.endX) ? 'start' : 'end'
    else if (nearStart) edge = 'start'
    else if (nearEnd) edge = 'end'
  }
  if (edge === 'start' || edge === 'end') {
    if (zone === 'fade') return edge === 'start' ? 'fadeIn' : 'fadeOut'
    return edge
  }
  if (opts.fadeSide === 'in' && opts.fadeRole === 'shape') return 'fadeInShape'
  if (opts.fadeSide === 'out' && opts.fadeRole === 'shape') return 'fadeOutShape'
  if (opts.fadeSide === 'in') return 'fadeIn'
  if (opts.fadeSide === 'out') return 'fadeOut'
  if (opts.transient) return 'transient'
  if (opts.shift) return 'move'
  return 'playhead'
}

/** Envelope diamonds share the loop-node X when fade length is 0. */
export function fadeHandleAtLoopFrac(loopEdgeFrac: number): number {
  return loopEdgeFrac
}

/** Fade-in always starts on loop start; fade-out always ends on loop end. */
export function fadeOriginTime(side: 'in' | 'out', start: number, end: number): number {
  return side === 'in' ? start : end
}

/** Fade length stays inside the loop; origin cannot leave the loop edge. */
export function clampFadeLengthToLoop(length: number, start: number, end: number): number {
  const span = Math.max(0, end - start)
  return Math.min(span, Math.max(0, length))
}

/** Diamond sits at the fade knee (end of fade-in / start of fade-out). */
export function fadeDiamondLayout(opts: {
  side: 'in' | 'out'
  start: number
  end: number
  fadeIn: number
  fadeOut: number
}): { time: number } {
  const span = Math.max(0, opts.end - opts.start)
  if (opts.side === 'in') {
    const dur = Math.min(Math.max(0, opts.fadeIn), span)
    return { time: opts.start + dur }
  }
  const dur = Math.min(Math.max(0, opts.fadeOut), span)
  return { time: opts.end - dur }
}

/** Mid-fade point on the envelope line, used by the shape handle. */
export function fadeShapeHandleLayout(opts: {
  side: 'in' | 'out'
  start: number
  end: number
  fadeIn: number
  fadeOut: number
}): { time: number; progress: number } | null {
  const span = Math.max(0, opts.end - opts.start)
  const dur = opts.side === 'in'
    ? Math.min(Math.max(0, opts.fadeIn), span)
    : Math.min(Math.max(0, opts.fadeOut), span)
  if (dur < 0.002) return null
  const time = opts.side === 'in' ? opts.start + dur * 0.5 : opts.end - dur * 0.5
  return { time, progress: 0.5 }
}

/** Pointer X at the fade diamond maps 1:1 to fade length, origin pinned to the loop. */
export function fadeLengthFromDiamondTime(side: 'in' | 'out', start: number, end: number, t: number): number {
  const origin = fadeOriginTime(side, start, end)
  if (side === 'in') return clampFadeLengthToLoop(t - origin, start, end)
  return clampFadeLengthToLoop(origin - t, start, end)
}

/** Knob travel covers the region, and at least 8 s so short loops still have room. */
export function fadeKnobMaxSec(regionSec: number): number {
  return Math.max(8, Math.max(0, regionSec))
}

export type SimpleWaveformDragKind = 'start' | 'end' | 'pan' | 'playhead'

/** Full-height trim edges for Simple mode — 44px targets, no fade diamonds. */
export function resolveSimpleWaveformDrag(opts: {
  altOrMiddle: boolean
  x: number
  startX: number
  endX: number
  hitPx: number
  edge?: 'start' | 'end'
}): SimpleWaveformDragKind {
  if (opts.altOrMiddle) return 'pan'
  if (opts.edge === 'start') return 'start'
  if (opts.edge === 'end') return 'end'
  const hit = Math.max(44, opts.hitPx)
  const nearStart = Math.abs(opts.x - opts.startX) <= hit
  const nearEnd = Math.abs(opts.x - opts.endX) <= hit
  if (nearStart && nearEnd) return Math.abs(opts.x - opts.startX) <= Math.abs(opts.x - opts.endX) ? 'start' : 'end'
  if (nearStart) return 'start'
  if (nearEnd) return 'end'
  return 'playhead'
}
