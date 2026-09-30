export type AutomationLabelAnchor = {
  id: string
  /** 0–1 across the plot, left to right. */
  x: number
  /** 0–1 down the plot. */
  y: number
  text: string
  /** Higher values win when labels overlap. */
  priority: number
}

export type PlacedAutomationLabel = {
  id: string
  text: string
  /** Percent of the plot width. */
  left: number
  /** Percent of the plot height. */
  top: number
  visible: boolean
  side: 'above' | 'below'
}

const CHAR_PX = 5.6
const PAD_X = 8
const LABEL_H = 14
const GAP = 3
const NODE_CLEAR = 11

function labelWidth(text: string, plotWidth: number): number {
  return Math.min(plotWidth - 4, Math.max(12, text.length * CHAR_PX + PAD_X))
}

function overlaps(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right + GAP && a.right + GAP > b.left && a.top < b.bottom + GAP && a.bottom + GAP > b.top
}

/**
 * Small node readouts. Prefer above the node, flip below when that collides
 * or leaves the plot, and drop lower-priority labels that still overlap.
 */
export function placeAutomationLabels(
  anchors: readonly AutomationLabelAnchor[],
  plotWidth: number,
  plotHeight: number,
): PlacedAutomationLabel[] {
  const width = plotWidth
  const height = plotHeight
  if (!(width > 1) || !(height > 1)) {
    return anchors.map((anchor) => ({
      id: anchor.id,
      text: anchor.text,
      left: anchor.x * 100,
      top: anchor.y * 100,
      visible: false,
      side: 'above',
    }))
  }

  const sorted = [...anchors].sort((a, b) => b.priority - a.priority || a.x - b.x || a.id.localeCompare(b.id))
  const occupied: { left: number; top: number; right: number; bottom: number }[] = []
  const placed = new Map<string, PlacedAutomationLabel>()

  for (const anchor of sorted) {
    const boxW = labelWidth(anchor.text, width)
    const cx = Math.min(width, Math.max(0, anchor.x * width))
    const cy = Math.min(height, Math.max(0, anchor.y * height))
    const left = Math.min(Math.max(2, cx - boxW / 2), Math.max(2, width - boxW - 2))
    const aboveTop = cy - NODE_CLEAR - LABEL_H
    const belowTop = cy + NODE_CLEAR
    const preferAbove = aboveTop >= 0
    const order: Array<'above' | 'below'> = preferAbove ? ['above', 'below'] : ['below', 'above']
    let chosen: { top: number; side: 'above' | 'below' } | null = null

    for (const side of order) {
      const top = side === 'above' ? aboveTop : belowTop
      if (top < 0 || top + LABEL_H > height) continue
      const box = { left, top, right: left + boxW, bottom: top + LABEL_H }
      if (occupied.some((other) => overlaps(box, other))) continue
      chosen = { top, side }
      break
    }

    if (!chosen && anchor.priority >= 3) {
      const side: 'above' | 'below' = aboveTop >= 0 ? 'above' : 'below'
      const raw = side === 'above' ? aboveTop : belowTop
      const top = Math.min(Math.max(0, raw), Math.max(0, height - LABEL_H))
      chosen = { top, side }
    }

    if (!chosen) {
      placed.set(anchor.id, {
        id: anchor.id,
        text: anchor.text,
        left: (left / width) * 100,
        top: (cy / height) * 100,
        visible: false,
        side: 'above',
      })
      continue
    }

    occupied.push({ left, top: chosen.top, right: left + boxW, bottom: chosen.top + LABEL_H })
    placed.set(anchor.id, {
      id: anchor.id,
      text: anchor.text,
      left: (left / width) * 100,
      top: (chosen.top / height) * 100,
      visible: true,
      side: chosen.side,
    })
  }

  return anchors.map((anchor) => placed.get(anchor.id)!)
}
