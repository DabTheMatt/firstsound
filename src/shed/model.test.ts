import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addTower, moveElement, nudgeElement, resetElement, updateElement } from './commands'
import { buildTower } from './geometry'
import { DEFAULT_PRIMARY, defaultShedDocument, defaultTower, SHED_STORAGE_KEY } from './model'
import { loadShedDocument, parseShedDocument, persistShedDocument, resetShedLoadNotice } from './persistence'
import { nextZoom } from './view'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
  }
}

describe('SHED document', () => {
  it('moves a tower and keeps it inside the scene', () => {
    const moved = moveElement(defaultShedDocument(), 'tower-1', 0.2, 0.3)
    expect(moved.scene.elements[0]?.x).toBeCloseTo(0.2)
    expect(moved.scene.elements[0]?.y).toBeCloseTo(0.3)
    const edge = moveElement(moved, 'tower-1', -2, 4)
    expect(edge.scene.elements[0]?.x).toBe(0.04)
    expect(edge.scene.elements[0]?.y).toBe(0.96)
  })

  it('nudges with the arrow keys and a finer shift step', () => {
    const start = defaultShedDocument()
    const nudged = nudgeElement(start, 'tower-1', 'ArrowRight', false)
    expect(nudged.scene.elements[0]?.x).toBeCloseTo(start.scene.elements[0]!.x + 0.02)
    const fine = nudgeElement(start, 'tower-1', 'ArrowUp', true)
    expect(fine.scene.elements[0]?.y).toBeCloseTo(start.scene.elements[0]!.y - 0.005)
    expect(nudgeElement(start, 'tower-1', 'Enter', false)).toBe(start)
  })

  it('edits geometry, color, and ornament, then restores the initial tower', () => {
    const edited = updateElement(defaultShedDocument(), 'tower-1', {
      height: 0.9,
      width: 0.2,
      roof: 0.8,
      primary: '#112233',
      secondary: '#ABCDEF',
      ornament: 'star',
    })
    const tower = edited.scene.elements[0]!
    expect(tower.height).toBeCloseTo(0.9)
    expect(tower.primary).toBe('#112233')
    expect(tower.secondary).toBe('#abcdef')
    expect(tower.ornament).toBe('star')
    const restored = resetElement(edited, 'tower-1')
    expect(restored.scene.elements[0]).toMatchObject({
      ...defaultTower('tower-1'),
      layer: tower.layer,
    })
  })

  it('adds another tower without a placement grid', () => {
    const next = addTower(defaultShedDocument())
    expect(next.scene.elements).toHaveLength(2)
    expect(next.scene.elements[1]?.type).toBe('tower')
    expect(next.scene.elements[1]?.x).not.toBe(next.scene.elements[0]?.x)
  })
})

describe('SHED geometry', () => {
  it('grows the body and roof from normalized parameters', () => {
    const base = defaultTower()
    const short = buildTower({ ...base, height: 0.1, width: 0.1, roof: 0.05 })
    const tall = buildTower({ ...base, height: 0.95, width: 0.9, roof: 0.95 })
    expect(tall.body.h).toBeGreaterThan(short.body.h)
    expect(tall.body.w).toBeGreaterThan(short.body.w)
    expect(tall.roofHeight).toBeGreaterThan(short.roofHeight)
    expect(tall.windows.length).toBeGreaterThan(short.windows.length)
  })

  it('paints the tower from its colors and swaps the ornament', () => {
    const painted = buildTower({ ...defaultTower(), primary: '#112233', secondary: '#445566', ornament: 'star' })
    expect(painted.parts.find((part) => part.id === 'body-front')?.fill).toBe('#112233')
    expect(painted.parts.find((part) => part.id === 'roof-front')?.fill).toBe('#445566')
    expect(painted.parts.some((part) => part.id === 'ornament-star')).toBe(true)
    const plain = buildTower({ ...defaultTower(), ornament: 'none' })
    expect(plain.parts.some((part) => part.id.startsWith('ornament-'))).toBe(false)
    expect(painted.side).not.toBe(DEFAULT_PRIMARY)
  })
})

describe('SHED persistence', () => {
  beforeEach(() => {
    resetShedLoadNotice()
  })

  it('round-trips a document under the SHED storage key', () => {
    const store = memoryStorage()
    vi.stubGlobal('localStorage', store)
    const edited = moveElement(defaultShedDocument(), 'tower-1', 0.25, 0.5)
    expect(persistShedDocument(edited)).toBe(true)
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"x":0.25')
    expect(loadShedDocument().document.scene.elements[0]).toMatchObject({ x: 0.25, y: 0.5 })
    expect(loadShedDocument().status).toBe('saved')
    vi.unstubAllGlobals()
  })

  it('restores a default scene when stored data is invalid', () => {
    const store = memoryStorage()
    store.setItem(SHED_STORAGE_KEY, '{not json')
    vi.stubGlobal('localStorage', store)
    const loaded = loadShedDocument()
    expect(loaded.status).toBe('restored')
    expect(loaded.document.scene.elements[0]?.id).toBe('tower-1')
    expect(parseShedDocument(JSON.parse(store.getItem(SHED_STORAGE_KEY) ?? 'null'))).not.toBeNull()
    expect(loadShedDocument().status).toBe('restored')
    vi.unstubAllGlobals()
  })

  it('rejects a document that is missing the schema', () => {
    expect(parseShedDocument({ scene: { id: 'x', version: 1, elements: [] } })).toBeNull()
    expect(parseShedDocument({ schema: 1, scene: { id: 'x', version: 1, elements: [{ id: 'a', type: 'dome' }] } })).toBeNull()
  })
})

describe('SHED view zoom', () => {
  it('zooms in, out, and back to the initial view', () => {
    const closer = nextZoom(1, 'in')
    expect(closer).toBeGreaterThan(1)
    expect(nextZoom(closer, 'out')).toBeLessThan(closer)
    expect(nextZoom(1.4, 'reset')).toBe(1)
  })
})
