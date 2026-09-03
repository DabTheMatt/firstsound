import { describe, expect, it } from 'vitest'
import { appViewportHeightPx, inspectorWidth, resolveLayoutMode } from './layoutMode'

describe('resolveLayoutMode', () => {
  it('uses bottom sheets on phone-width viewports', () => {
    expect(resolveLayoutMode({ width: 390, height: 844 })).toBe('sheet')
  })

  it('uses a bottom inspector on portrait tablets', () => {
    expect(resolveLayoutMode({ width: 768, height: 1024 })).toBe('dock-bottom')
  })

  it('uses a right inspector on landscape / desktop widths', () => {
    expect(resolveLayoutMode({ width: 1280, height: 800 })).toBe('dock-right')
    expect(resolveLayoutMode({ width: 1180, height: 820 })).toBe('dock-right')
  })

  it('treats a narrow desktop window like a tablet', () => {
    expect(resolveLayoutMode({ width: 820, height: 900 })).toBe('dock-bottom')
  })
})

describe('inspectorWidth', () => {
  it('is zero when the inspector is not a right dock', () => {
    expect(inspectorWidth('sheet', 390)).toBe(0)
    expect(inspectorWidth('dock-bottom', 768)).toBe(0)
  })

  it('narrows on compact landscape', () => {
    expect(inspectorWidth('dock-right', 1100)).toBe(280)
    expect(inspectorWidth('dock-right', 1440)).toBe(360)
  })
})

describe('appViewportHeightPx', () => {
  it('uses the largest of inner, visual, and client heights', () => {
    expect(appViewportHeightPx(844)).toBe(844)
    expect(appViewportHeightPx(844, 700)).toBe(844)
    expect(appViewportHeightPx(720, 800, 844)).toBe(844)
  })

  it('grows to the visual viewport so standalone PWA does not leave a bottom gap', () => {
    expect(appViewportHeightPx(720, 844)).toBe(844)
  })
})
