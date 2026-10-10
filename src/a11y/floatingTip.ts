export type TipRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Keep a tooltip inside the viewport. Prefer above the anchor, then below. */
export function placeFloatingTip(
  anchor: TipRect,
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): { top: number; left: number } {
  const width = Math.min(tip.width, Math.max(0, viewport.width - margin * 2))
  const height = tip.height
  let left = anchor.left + anchor.width / 2 - width / 2
  let top = anchor.top - height - margin
  if (top < margin) top = anchor.bottom + margin
  const maxTop = viewport.height - margin - height
  if (top > maxTop) top = Math.max(margin, maxTop)
  const maxLeft = viewport.width - margin - width
  left = Math.min(Math.max(margin, left), Math.max(margin, maxLeft))
  return { top, left }
}
