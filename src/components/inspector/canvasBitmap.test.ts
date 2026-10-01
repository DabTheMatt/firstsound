import { describe, expect, it } from 'vitest'
import { canvasBitmapSize } from './canvasBitmap'

describe('canvasBitmapSize', () => {
  it('stays stable for a fixed CSS box', () => {
    const first = canvasBitmapSize(320, 168, 2)
    const second = canvasBitmapSize(320, 168, 2)
    expect(first).toEqual({ width: 640, height: 336 })
    expect(second).toEqual(first)
  })

  it('caps a bitmap that was fed back as the CSS size', () => {
    const first = canvasBitmapSize(320, 168, 2)
    const grown = canvasBitmapSize(first.width, first.height, 2)
    const capped = canvasBitmapSize(grown.width, grown.height, 2)
    expect(capped).toEqual({ width: 960, height: 960 })
    expect(capped.height).toBeLessThan(grown.height * 2)
  })
})
