import { clampFadeLengthToLoop } from '../../components/waveform/handleLayout'
import { MIN_LOOP_SPAN, loopBounds } from '../../audio/mix/playback'
import { clampRegion, toNormalized } from '../../audio/parameters/mapping'
import { envelopeToParam } from '../../audio/automation/automation'
import { toDisplayAutomationValue } from './automationValue'
import type { ParamId } from '../../audio/parameters/types'
import { PARAMS } from '../../audio/parameters/definitions'

/**
 * Same minimum span `clampRegion` uses when AudioEngine edits a selection.
 * Kept here so a typed range is rejected instead of being quietly resized.
 */
export const SELECTION_MIN_SEC = 0.05

/** Display rounding. A typed clock may sit this close to the buffer end. */
const DISPLAY_SLACK_SEC = 0.0005

export type EditError = 'format' | 'negative' | 'past' | 'order' | 'short' | 'fade' | 'range' | 'missing'

export type EditResult<T> = { ok: true; value: T } | { ok: false; error: EditError }

function finite(value: number): boolean {
  return Number.isFinite(value)
}

/** Pull a displayed time onto the buffer when it only overshoots by one millisecond. */
export function snapDisplayedTime(time: number, duration: number): number | null {
  if (!finite(time) || !finite(duration) || !(duration >= 0)) return null
  if (time < -DISPLAY_SLACK_SEC) return null
  if (time > duration + DISPLAY_SLACK_SEC) return null
  return Math.min(duration, Math.max(0, time))
}

export function validateSelection(start: number, end: number, duration: number): EditResult<{ start: number; end: number }> {
  if (!(duration > 0)) return { ok: false, error: 'missing' }
  const snappedStart = snapDisplayedTime(start, duration)
  const snappedEnd = snapDisplayedTime(end, duration)
  if (start < 0 || end < 0) return { ok: false, error: 'negative' }
  if (snappedStart == null || snappedEnd == null) return { ok: false, error: 'past' }
  if (!(snappedStart < snappedEnd)) return { ok: false, error: 'order' }
  if (snappedEnd - snappedStart < SELECTION_MIN_SEC - 1e-9) return { ok: false, error: 'short' }
  const clamped = clampRegion(snappedStart, snappedEnd, duration, SELECTION_MIN_SEC)
  if (Math.abs(clamped.start - snappedStart) > 1e-6 || Math.abs(clamped.end - snappedEnd) > 1e-6) {
    return { ok: false, error: 'short' }
  }
  return { ok: true, value: { start: snappedStart, end: snappedEnd } }
}

export function validatePlayhead(time: number, duration: number): EditResult<number> {
  if (!(duration > 0)) return { ok: false, error: 'missing' }
  if (time < 0) return { ok: false, error: 'negative' }
  const snapped = snapDisplayedTime(time, duration)
  if (snapped == null) return { ok: false, error: 'past' }
  return { ok: true, value: snapped }
}

export const PLAYHEAD_STEP_SEC = 0.1

export function stepPlayhead(current: number, direction: -1 | 1, duration: number, step = PLAYHEAD_STEP_SEC): EditResult<number> {
  if (!(duration > 0)) return { ok: false, error: 'missing' }
  const ms = Math.round(Math.max(0, current) * 1000) + direction * Math.round(step * 1000)
  return validatePlayhead(ms / 1000, duration)
}

export const FADE_STEP_SEC = 0.05

export function validateFade(seconds: number, regionStart: number, regionEnd: number): EditResult<number> {
  if (!finite(seconds)) return { ok: false, error: 'format' }
  if (seconds < -1e-9) return { ok: false, error: 'negative' }
  const length = Math.max(0, seconds)
  const clamped = clampFadeLengthToLoop(length, regionStart, regionEnd)
  if (Math.abs(clamped - length) > 1e-6) return { ok: false, error: 'fade' }
  return { ok: true, value: clamped }
}

export function stepFade(current: number, direction: -1 | 1, regionStart: number, regionEnd: number): EditResult<number> {
  const ms = Math.round(Math.max(0, current) * 1000) + direction * Math.round(FADE_STEP_SEC * 1000)
  return validateFade(ms / 1000, regionStart, regionEnd)
}

export function validateLoop(start: number, end: number, duration: number): EditResult<{ start: number; end: number }> {
  if (!(duration > MIN_LOOP_SPAN)) return { ok: false, error: 'missing' }
  if (start < 0 || end < 0) return { ok: false, error: 'negative' }
  const snappedStart = snapDisplayedTime(start, duration)
  const snappedEnd = snapDisplayedTime(end, duration)
  if (snappedStart == null || snappedEnd == null) return { ok: false, error: 'past' }
  if (!(snappedEnd > snappedStart)) return { ok: false, error: 'order' }
  if (snappedEnd - snappedStart < MIN_LOOP_SPAN - 1e-9) return { ok: false, error: 'short' }
  const bounded = loopBounds(duration, snappedStart, snappedEnd)
  if (Math.abs(bounded.start - snappedStart) > 1e-4 || Math.abs(bounded.end - snappedEnd) > 1e-4) {
    return { ok: false, error: 'short' }
  }
  return { ok: true, value: { start: snappedStart, end: snappedEnd } }
}

export function indexOfBandId(bands: readonly { id?: string }[], id: string): number {
  if (!id) return -1
  return bands.findIndex((band) => band.id === id)
}

export function effectMoveAvailable(chainLength: number, index: number, fixed: boolean): { up: boolean; down: boolean } {
  if (fixed || chainLength < 3) return { up: false, down: false }
  return { up: index > 1, down: index < chainLength - 2 }
}

/** Display value of one automation point. Never the stored 0–1 envelope. */
export function automationDisplayValue(paramId: ParamId, normalized: number): number {
  return envelopeToParam(paramId, normalized)
}

/** Stored envelope value for a typed parameter amount. */
export function automationNormalizedValue(paramId: ParamId, display: number): number {
  return toNormalized(display, PARAMS[paramId])
}

export function formatAutomationDisplay(paramId: ParamId, normalized: number): string {
  return toDisplayAutomationValue(paramId, normalized)
}
