import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  VIZ_BG_GRAIN_KEY,
  VIZ_BG_GRAIN_MAX,
  VIZ_BG_GRAYSCALE_FILTER,
  VIZ_BG_OPACITY_KEY,
  VIZ_BG_OPACITY_MAX,
  acceptVizBackgroundFile,
  clampVizBgGrain,
  clampVizBgOpacity,
  clearVizBackgroundImage,
  coverCrop,
  coverFrame,
  displaySize,
  fillGrainTile,
  getVizBackground,
  loadVizBackgroundFile,
  resetVizBackgroundState,
  setVizBackgroundGrain,
  setVizBackgroundOpacity,
  veilOpacity,
} from './vizBackground'

afterEach(() => {
  resetVizBackgroundState()
  vi.unstubAllGlobals()
})

describe('viz background cover', () => {
  it('crops a landscape photo to a portrait view without stretching', () => {
    const crop = coverCrop(400, 200, 100, 200)
    expect(crop.sy).toBeCloseTo(0)
    expect(crop.sh).toBeCloseTo(200)
    expect(crop.sw).toBeCloseTo(100)
    expect(crop.sx).toBeCloseTo(150)
    expect(crop.sw / crop.sh).toBeCloseTo(100 / 200)
  })

  it('crops a portrait photo to a landscape view from the center', () => {
    const crop = coverCrop(200, 400, 400, 200)
    expect(crop.sx).toBeCloseTo(0)
    expect(crop.sw).toBeCloseTo(200)
    expect(crop.sh).toBeCloseTo(100)
    expect(crop.sy).toBeCloseTo(150)
    const frame = coverFrame(200, 400, 400, 200)
    expect(frame.width / frame.height).toBeCloseTo(200 / 400)
    expect(frame.height).toBeGreaterThan(200)
    expect(frame.top).toBeLessThan(0)
  })

  it('leaves a matching aspect uncropped and centers a square in a wide view', () => {
    expect(coverCrop(300, 150, 600, 300)).toEqual({ sx: 0, sy: 0, sw: 300, sh: 150 })
    const crop = coverCrop(100, 100, 400, 100)
    expect(crop.sh).toBeCloseTo(25)
    expect(crop.sy).toBeCloseTo(37.5)
    expect(crop.sx).toBeCloseTo(0)
  })

  it('covers a phone-sized view from a large photo', () => {
    const crop = coverCrop(8000, 3000, 390, 844)
    expect(crop.sw).toBeLessThanOrEqual(8000)
    expect(crop.sh).toBeLessThanOrEqual(3000)
    expect(crop.sx).toBeGreaterThanOrEqual(0)
    expect(crop.sy).toBeGreaterThanOrEqual(0)
    expect(crop.sw / crop.sh).toBeCloseTo(390 / 844)
    const frame = coverFrame(8000, 3000, 390, 844)
    expect(frame.width / frame.height).toBeCloseTo(8000 / 3000)
    expect(frame.width).toBeGreaterThanOrEqual(390)
    expect(frame.height).toBeGreaterThanOrEqual(844)
  })

  it('scales a large bitmap down for display and keeps aspect', () => {
    expect(displaySize(8000, 3000)).toEqual({ width: 1920, height: 720 })
    expect(displaySize(1200, 800)).toEqual({ width: 1200, height: 800 })
    expect(displaySize(4000, 4000)).toEqual({ width: 1920, height: 1920 })
  })
})

describe('viz background settings', () => {
  it('accepts jpeg and png only', () => {
    expect(acceptVizBackgroundFile({ type: 'image/jpeg', name: 'a.jpg' })).toBe(true)
    expect(acceptVizBackgroundFile({ type: 'image/png', name: 'a.png' })).toBe(true)
    expect(acceptVizBackgroundFile({ type: 'image/jpg', name: 'a.jpeg' })).toBe(true)
    expect(acceptVizBackgroundFile({ type: '', name: 'scan.JPEG' })).toBe(true)
    expect(acceptVizBackgroundFile({ type: 'application/octet-stream', name: 'shot.png' })).toBe(true)
    expect(acceptVizBackgroundFile({ type: 'image/gif', name: 'a.gif' })).toBe(false)
    expect(acceptVizBackgroundFile({ type: 'image/webp', name: 'a.png' })).toBe(false)
    expect(acceptVizBackgroundFile({ type: '', name: 'notes.txt' })).toBe(false)
  })

  it('caps opacity and grain and hides the scrim when the photo is invisible', () => {
    expect(clampVizBgOpacity(2)).toBe(VIZ_BG_OPACITY_MAX)
    expect(clampVizBgOpacity(-1)).toBe(0)
    expect(clampVizBgOpacity(Number.NaN)).toBeGreaterThan(0)
    expect(clampVizBgGrain(1)).toBe(VIZ_BG_GRAIN_MAX)
    expect(veilOpacity(0)).toBe(0)
    expect(veilOpacity(0.3)).toBeGreaterThan(0.2)
    expect(veilOpacity(0.3)).toBeLessThan(0.5)
    expect(veilOpacity(1)).toBeLessThanOrEqual(0.52)
  })

  it('stores opacity and grain as numbers, never the image', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    })
    setVizBackgroundOpacity(0.9)
    setVizBackgroundGrain(0.5)
    expect(getVizBackground().opacity).toBe(VIZ_BG_OPACITY_MAX)
    expect(getVizBackground().grain).toBe(VIZ_BG_GRAIN_MAX)
    expect(memory.get(VIZ_BG_OPACITY_KEY)).toBe(String(VIZ_BG_OPACITY_MAX))
    expect(memory.get(VIZ_BG_GRAIN_KEY)).toBe(String(VIZ_BG_GRAIN_MAX))
    expect([...memory.keys()].some((key) => /image|blob|base64/i.test(key))).toBe(false)
    expect([...memory.values()].every((value) => value.length < 24)).toBe(true)
    clearVizBackgroundImage()
    expect(getVizBackground().imageUrl).toBeNull()
  })

  it('rejects a non-image before keeping a session url', async () => {
    const file = { name: 'anim.gif', type: 'image/gif' } as File
    expect(await loadVizBackgroundFile(file)).toBe(false)
    expect(getVizBackground().imageUrl).toBeNull()
  })

  it('builds a grayscale grain tile', () => {
    const a = fillGrainTile(8, 7)
    const b = fillGrainTile(8, 7)
    expect(a).toEqual(b)
    expect(a.length).toBe(8 * 8 * 4)
    for (let i = 0; i < a.length; i += 4) {
      expect(a[i]).toBe(a[i + 1])
      expect(a[i + 1]).toBe(a[i + 2])
      expect(a[i + 3]).toBe(255)
    }
    expect(fillGrainTile(8, 9)).not.toEqual(a)
  })
})

describe('viz background layer contract', () => {
  it('grayscales through a paint filter instead of rewriting the file', () => {
    expect(VIZ_BG_GRAYSCALE_FILTER).toBe('grayscale(1)')
  })
})
