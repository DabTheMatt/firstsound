import { timeToFrac, type View } from '../waveform/viewport'

/** Same fraction the playhead uses. Percent is that fraction on the overlay. */
export function markerLeftPercent(timeSeconds: number, view: View): number {
  return timeToFrac(timeSeconds, view) * 100
}

/**
 * Hide a label when it would sit on the previous visible label.
 * The marker itself stays. Off-screen markers are omitted.
 */
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
