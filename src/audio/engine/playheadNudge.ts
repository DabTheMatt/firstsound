/** Small playhead step. Ten milliseconds, independent of the display refresh rate. */
export const PLAYHEAD_NUDGE_SEC = 0.01

/** Coarse playhead step used with Shift. One hundred milliseconds. */
export const PLAYHEAD_NUDGE_COARSE_SEC = 0.1

/** Left / Right move by a fixed time. Shift uses the coarse step. Other keys do nothing. */
export function playheadNudgeSeconds(key: string, shiftKey: boolean): number | null {
  const step = shiftKey ? PLAYHEAD_NUDGE_COARSE_SEC : PLAYHEAD_NUDGE_SEC
  if (key === 'ArrowLeft') return -step
  if (key === 'ArrowRight') return step
  return null
}
