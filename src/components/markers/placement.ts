import { fracToTime, timeToFrac, type View } from '../waveform/viewport'

/** Same fraction the playhead uses. Percent is that fraction on the overlay. */
export function markerLeftPercent(timeSeconds: number, view: View): number {
  return timeToFrac(timeSeconds, view) * 100
}

/**
 * Hide a label when it would sit on the previous visible label.
 * The marker itself stays. Off-screen markers are omitted.
 */
/** Map a pointer x on the waveform overlay to a marker time inside the file. */
export function markerTimeFromClientX(
  clientX: number,
  bounds: { left: number; width: number },
  view: View,
  duration: number,
): number {
  const width = Math.max(1, bounds.width)
  const time = fracToTime((clientX - bounds.left) / width, view)
  if (!(duration > 0)) return 0
  return Math.min(duration, Math.max(0, time))
}

export function markerLabelVisibility(
  items: readonly { id: string; fraction: number }[],
  minGap = 0.1,
): string[] {
  const shown: string[] = []
  let last = Number.NEGATIVE_INFINITY
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.fraction - b.item.fraction || a.index - b.index)
  for (const entry of ordered) {
    const fraction = entry.item.fraction
    if (fraction < -0.02 || fraction > 1.02) continue
    if (fraction - last < minGap) continue
    shown.push(entry.item.id)
    last = fraction
  }
  return shown
}
