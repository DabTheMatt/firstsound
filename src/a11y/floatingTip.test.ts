import { describe, expect, it } from 'vitest'
import { placeFloatingTip, type TipRect } from './floatingTip'

const view = { width: 800, height: 600 }

function anchor(partial: Partial<TipRect>): TipRect {
  const left = partial.left ?? 100
  const top = partial.top ?? 200
  const width = partial.width ?? 40
  const height = partial.height ?? 40
  return {
    left,
    top,
    width,
    height,
    right: partial.right ?? left + width,
    bottom: partial.bottom ?? top + height,
  }
}

describe('placeFloatingTip', () => {
  it('sits above the anchor and stays inside the viewport', () => {
    const placed = placeFloatingTip(anchor({ left: 10, top: 80 }), { width: 200, height: 40 }, view)
    expect(placed.top).toBe(32)
    expect(placed.left).toBe(8)
  })

  it('drops below the anchor when the top edge is too close', () => {
    const placed = placeFloatingTip(anchor({ top: 4, height: 30, bottom: 34 }), { width: 80, height: 40 }, view)
    expect(placed.top).toBe(42)
  })

  it('shifts a right-edge tip back into the viewport', () => {
    const placed = placeFloatingTip(anchor({ left: 760, width: 30, right: 790 }), { width: 180, height: 36 }, view)
    expect(placed.left + 180).toBeLessThanOrEqual(view.width - 8)
  })
})
