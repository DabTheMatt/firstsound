import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { moveElement } from '../commands'
import { SketchCompare } from '../dev/SketchCompare'
import { defaultShedDocument, defaultTower } from '../model'
import { parseShedDocument } from '../persistence'
import { composeSheet } from './composition'
import { clearSketchCache, renderSketchTower } from './tower'

function paths(seed: number, abstraction = 0.4) {
  return renderSketchTower({ ...defaultTower(), visualSeed: seed, abstraction })
}

describe('sketch engine tower', () => {
  it('draws a deterministic St. Mary study from the same seed', () => {
    clearSketchCache()
    const first = paths(17)
    clearSketchCache()
    const second = paths(17)
    expect(first.parts).toEqual(second.parts)
    expect(first.variation.helmet).toBe('needle')
    expect(first.parts.some((part) => part.id === 'helmet')).toBe(true)
    expect(first.parts.some((part) => part.id.startsWith('window'))).toBe(true)
    expect(first.parts.some((part) => part.id.startsWith('pinnacle-left'))).toBe(true)
    expect(first.parts.find((part) => part.id === 'shaft-wash')?.fill).toBe('#a65a4d')
    expect(first.parts.length).toBeGreaterThan(24)
    expect(first.parts.length).toBeLessThan(220)
    const ids = first.parts.map((part) => part.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(first.parts.every((part) => part.d.length > 2 && !part.d.includes('NaN'))).toBe(true)
  })

  it('keeps the drawing when only the position changes', () => {
    clearSketchCache()
    const parked = renderSketchTower({ ...defaultTower(), x: 0.12, y: 0.2, layer: 3 })
    clearSketchCache()
    const moved = renderSketchTower({ ...defaultTower(), x: 0.88, y: 0.91, layer: 8 })
    expect(moved.parts).toEqual(parked.parts)
    expect(moved.width).toBe(parked.width)
    const document = moveElement(defaultShedDocument(), 'tower-1', 0.33, 0.44)
    clearSketchCache()
    const shifted = renderSketchTower(document.scene.elements[0]!)
    clearSketchCache()
    expect(shifted.parts).toEqual(renderSketchTower(defaultTower()).parts)
  })

  it('changes architectural structure across seeds', () => {
    const studies = [3, 21, 88, 256, 880, 4096, 12000].map((seed) => paths(seed).variation)
    expect(new Set(studies.map((study) => study.helmet)).size).toBeGreaterThan(1)
    expect(new Set(studies.map((study) => study.rhythm)).size).toBeGreaterThan(1)
    expect(new Set(studies.map((study) => study.extension)).size).toBeGreaterThan(1)
    const drawings = [21, 880].map((seed) => paths(seed).parts.map((part) => part.d).join('|'))
    expect(drawings[0]).not.toBe(drawings[1])
  })

  it('keeps structure at higher abstraction and changes the drawing', () => {
    const low = paths(21, 0)
    const high = paths(21, 1)
    expect(high.variation).toEqual(low.variation)
    expect(low.parts.some((part) => part.id.startsWith('collage'))).toBe(false)
    expect(high.parts.some((part) => part.id === 'collage-lancet')).toBe(true)
    expect(high.parts.filter((part) => part.id.startsWith('gallery-bay')).length).toBeLessThan(
      low.parts.filter((part) => part.id.startsWith('gallery-bay')).length,
    )
    const lowShift = low.parts.find((part) => part.id === 'shaft-wash')?.d
    const highShift = high.parts.find((part) => part.id === 'shaft-wash')?.d
    expect(lowShift).toBeTruthy()
    expect(highShift).not.toBe(lowShift)
  })

  it('scales the shaft and roof and survives invalid parameters', () => {
    const base = defaultTower()
    const short = renderSketchTower({ ...base, height: 0.1, width: 0.1, roof: 0.05 })
    const tall = renderSketchTower({ ...base, height: 0.95, width: 0.9, roof: 0.95 })
    expect(tall.body.h).toBeGreaterThan(short.body.h)
    expect(tall.body.w).toBeGreaterThan(short.body.w)
    expect(tall.roofHeight).toBeGreaterThan(short.roofHeight)
    const broken = renderSketchTower({
      ...base,
      height: Number.NaN,
      width: Number.POSITIVE_INFINITY,
      roof: -4,
      primary: 'brick',
      secondary: '#zzzzzz',
      abstraction: 9,
      visualSeed: Number.NaN,
    })
    expect(broken.primary).toBe('#a65a4d')
    expect(broken.secondary).toBe('#668078')
    expect(broken.abstraction).toBeLessThanOrEqual(1)
    expect(broken.parts.every((part) => !part.d.includes('NaN'))).toBe(true)
  })

  it('uses the explicit seed instead of the element id', () => {
    const fromId = renderSketchTower({ ...defaultTower('tower-9'), visualSeed: 42 })
    const otherId = renderSketchTower({ ...defaultTower('tower-2'), visualSeed: 42 })
    expect(otherId.parts).toEqual(fromId.parts)
    expect(renderSketchTower(defaultTower('tower-9')).seed).not.toBe(renderSketchTower(defaultTower('tower-1')).seed)
  })
})

describe('sketch sheet composition', () => {
  it('stays sparse, stable, and out of the pointer path', () => {
    const first = composeSheet(1000, 640, 7)
    const second = composeSheet(1000, 640, 7)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(4)
    expect(first.length).toBeLessThan(24)
    expect(first.every((part) => part.pointerEvents === 'none')).toBe(true)
  })
})

describe('sketch compare fixture', () => {
  it('places the current renderer beside the sketch engine', () => {
    const markup = renderToStaticMarkup(createElement(SketchCompare))
    expect(markup).toContain('data-renderer="legacy"')
    expect(markup).toContain('data-renderer="sketch"')
    expect(markup).toContain('Current renderer')
    expect(markup).toContain('Sketch engine')
    expect(markup).toContain('data-sketch-compare')
  })
})

describe('sketch document migration', () => {
  it('loads a schema 1 scene without inventing sketch fields', () => {
    const legacy = {
      schema: 1,
      scene: {
        id: 'shed-01',
        version: 4,
        elements: [
          {
            id: 'tower-1',
            type: 'tower',
            x: 0.42,
            y: 0.7,
            layer: 2,
            height: 0.5,
            width: 0.4,
            roof: 0.3,
            primary: '#a65a4d',
            secondary: '#668078',
            ornament: 'finial',
          },
        ],
      },
    }
    const parsed = parseShedDocument(legacy)
    expect(parsed?.schema).toBe(1)
    expect(parsed?.scene.elements[0]).toEqual(legacy.scene.elements[0])
    expect(parsed?.scene.elements[0]).not.toHaveProperty('visualSeed')
    const redraw = renderSketchTower(parsed!.scene.elements[0]!)
    expect(redraw.parts).toEqual(renderSketchTower(parsed!.scene.elements[0]!).parts)
  })
})
