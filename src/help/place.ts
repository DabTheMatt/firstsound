export type Rect = { top: number; left: number; width: number; height: number }

export type Viewport = { width: number; height: number }

export type PlacedPanel = {
  top: number
  left: number
  width: number
  maxHeight: number
  sheet: boolean
}

const SHEET_BREAK = 480
const TRANSPORT_RESERVE = 72

/** Anchored popover on a wide viewport. Bottom sheet above the transport when narrow. */
export function placeExplainPanel(anchor: Rect, viewport: Viewport, contentHeight: number): PlacedPanel {
  const margin = 8
  if (viewport.width <= SHEET_BREAK) {
    const left = 12
    const width = Math.max(160, viewport.width - left * 2)
    const maxHeight = Math.max(160, Math.min(420, Math.round(viewport.height * 0.52)))
    const top = Math.max(margin, viewport.height - TRANSPORT_RESERVE - margin - maxHeight)
    return { top, left, width, maxHeight, sheet: true }
  }
  const width = Math.min(360, Math.max(280, Math.min(320, viewport.width - margin * 2)))
  const fitted = Math.min(width, Math.max(160, viewport.width - margin * 2))
  let left = anchor.left
  if (left + fitted > viewport.width - margin) left = viewport.width - margin - fitted
  if (left < margin) left = margin
  const maxHeight = Math.min(Math.max(contentHeight, 120), viewport.height - margin * 2, 480)
  let top = anchor.top + anchor.height + margin
  if (top + maxHeight > viewport.height - margin) top = anchor.top - margin - maxHeight
  if (top < margin) top = margin
  const capped = Math.min(maxHeight, viewport.height - top - margin)
  return { top, left, width: fitted, maxHeight: Math.max(120, capped), sheet: false }
}

/** Touch target beside a control, kept off the transport strip. */
export function placeExplainMark(anchor: Rect, viewport: Viewport, size = 44): { top: number; left: number } {
  const margin = 8
  let left = anchor.left + anchor.width - size
  let top = anchor.top - size - 4
  if (top < margin) top = anchor.top + anchor.height + 4
  if (left < margin) left = margin
  if (left + size > viewport.width - margin) left = Math.max(margin, viewport.width - margin - size)
  const floor = viewport.height - TRANSPORT_RESERVE - size
  if (top > floor) top = Math.max(margin, floor)
  return { top, left }
}
