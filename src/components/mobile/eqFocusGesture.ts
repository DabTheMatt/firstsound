import { EQ_MAX_HZ, EQ_MIN_HZ, bandUsesGain, type EqBand, type EqFilterType } from '../../audio/engine/eqBands'
import { SPECTRUM_EQ_MAX_DB, SPECTRUM_EQ_MIN_DB } from '../../audio/engine/eqPlot'

/** Movement below this is a tap, not a drag. */
export const EQ_FOCUS_TAP_PX = 8

/** Hold still this long to open the type menu. */
export const EQ_FOCUS_LONG_PRESS_MS = 480

export type EqDragMode = 'xy' | 'q'

/**
 * Frequency and gain stay on the primary drag.
 * Q is armed by a tap on the already-selected node; the next drag adjusts Q.
 */
export function eqDragMode(alreadySelected: boolean, qArmed: boolean): EqDragMode {
  return alreadySelected && qArmed ? 'q' : 'xy'
}

export function nextQArmed(input: {
  mode: EqDragMode
  alreadySelected: boolean
  movedPx: number
  menuOpened: boolean
}): boolean {
  if (input.mode === 'q' || input.menuOpened) return false
  return input.alreadySelected && input.movedPx < EQ_FOCUS_TAP_PX
}

/** Upward movement raises Q. Matches the spectrum node's existing Q feel. */
export function qFromVertical(q0: number, dyPx: number): number {
  const q = q0 * 2 ** (dyPx / 80)
  return Math.min(20, Math.max(0.1, q))
}

function clampHz(hz: number): number {
  return Math.min(EQ_MAX_HZ, Math.max(EQ_MIN_HZ, hz))
}

function clampDb(db: number): number {
  return Math.min(SPECTRUM_EQ_MAX_DB, Math.max(SPECTRUM_EQ_MIN_DB, db))
}

/** Keyboard nudge for a focused EQ node. Shift adjusts Q. */
export function nudgeFocusEq(band: EqBand, key: string, shift: boolean): Partial<EqBand> | null {
  const step = 2 ** (1 / 12)
  if (key === 'ArrowLeft') return { frequency: clampHz(band.frequency / step) }
  if (key === 'ArrowRight') return { frequency: clampHz(band.frequency * step) }
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null
  const dir = key === 'ArrowUp' ? 1 : -1
  if (shift || !bandUsesGain(band.type)) return { q: qFromVertical(band.q, dir * 16) }
  return { gain: clampDb(band.gain + dir * 0.5) }
}

export function focusEqTypePatch(band: EqBand, type: EqFilterType): Partial<EqBand> {
  if ((type === 'highpass' || type === 'lowpass') && band.slope < 24) return { type, slope: 48 }
  return { type }
}
