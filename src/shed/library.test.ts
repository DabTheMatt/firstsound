import { beforeEach, describe, expect, it, vi } from 'vitest'
import styles from './ShedView.module.css'
import {
  addElement,
  bringForward,
  deleteElement,
  duplicateElement,
  elementsInDrawOrder,
  moveElement,
  sendBackward,
} from './commands'
import { buildElement } from './geometry'
import { showsField } from './fields'
import {
  ELEMENT_TYPES,
  SHED_STORAGE_KEY,
  defaultElement,
  defaultParams,
  defaultShedDocument,
  defaultTower,
} from './model'
import { loadShedDocument, parseShedDocument, persistShedDocument, recoverShedDocument, resetShedLoadNotice } from './persistence'
import { elementScenePoint, nextZoom, panView, type SceneCamera } from './view'

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

describe('SHED architectural library', () => {
  it('gives every category a drawing and keeps part ids unique', () => {
    for (const type of ELEMENT_TYPES) {
      const graphic = buildElement(defaultElement(type, `${type}-1`))
      expect(graphic.parts.length).toBeGreaterThan(2)
      expect(graphic.width).toBeGreaterThan(10)
      expect(graphic.height).toBeGreaterThan(10)
      expect(new Set(graphic.parts.map((part) => part.id)).size).toBe(graphic.parts.length)
      const again = buildElement(defaultElement(type, `${type}-1`))
      expect(again.parts.map((part) => part.d).join('|')).toBe(graphic.parts.map((part) => part.d).join('|'))
    }
  })

  it('adds unique elements without replacing the ones already there', () => {
    let document = defaultShedDocument()
    const firstId = document.scene.elements[0]?.id
    for (const type of ELEMENT_TYPES) document = addElement(document, type)
    const ids = document.scene.elements.map((element) => element.id)
    expect(ids).toHaveLength(ELEMENT_TYPES.length + 1)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe(firstId)
    expect(document.scene.elements.map((element) => element.type)).toEqual(['tower', ...ELEMENT_TYPES])
  })

  it('lets elements share a position and keeps draw order stable', () => {
    const added = addElement(defaultShedDocument(), 'facade')
    const facade = added.scene.elements[1]!
    const tower = added.scene.elements[0]!
    const overlapped = moveElement(added, facade.id, tower.x, tower.y)
    expect(overlapped.scene.elements[0]?.x).toBeCloseTo(overlapped.scene.elements[1]?.x ?? 0)
    expect(overlapped.scene.elements[0]?.y).toBeCloseTo(overlapped.scene.elements[1]?.y ?? 0)
    const before = elementsInDrawOrder(overlapped).map((element) => element.id)
    const front = bringForward(overlapped, before[0]!)
    expect(elementsInDrawOrder(front).at(-1)?.id).toBe(before[0])
    const back = sendBackward(front, before[0]!)
    expect(elementsInDrawOrder(back)[0]?.id).toBe(before[0])
    expect(sendBackward(back, before[0]!) ).toBe(back)
  })

  it('deletes and duplicates an element', () => {
    const added = addElement(defaultShedDocument(), 'gate')
    const gate = added.scene.elements[1]!
    const copied = duplicateElement(added, gate.id)
    expect(copied.scene.elements).toHaveLength(3)
    const duplicate = copied.scene.elements[2]!
    expect(duplicate.id).not.toBe(gate.id)
    expect(duplicate.type).toBe('gate')
    expect(duplicate.primary).toBe(gate.primary)
    expect(duplicate.variant).toBe(gate.variant)
    expect(duplicate.x).not.toBe(gate.x)
    const removed = deleteElement(copied, gate.id)
    expect(removed.scene.elements.map((element) => element.id)).not.toContain(gate.id)
    expect(removed.scene.elements).toHaveLength(2)
    expect(deleteElement(removed, 'missing')).toBe(removed)
  })

  it('changes arcade, tower, and roof geometry from their parameters', () => {
    const arcade = defaultElement('arcade')
    const few = buildElement({ ...arcade, params: { ...arcade.params, arches: 0 } })
    const many = buildElement({ ...arcade, params: { ...arcade.params, arches: 1 } })
    const count = (graphic: { parts: { id: string }[] }) => graphic.parts.filter((part) => part.id.startsWith('arch-front')).length
    expect(count(many)).toBeGreaterThan(count(few))

    const tower = defaultTower()
    const sparse = buildElement({ ...tower, params: { ...tower.params, windows: 0 } })
    const dense = buildElement({ ...tower, params: { ...tower.params, windows: 1 } })
    expect(dense.windows.length).toBeGreaterThan(sparse.windows.length)

    const roof = defaultElement('roof')
    const low = buildElement({ ...roof, params: { ...roof.params, pitch: 0 } })
    const steep = buildElement({ ...roof, params: { ...roof.params, pitch: 1 } })
    expect(steep.roofHeight).toBeGreaterThan(low.roofHeight)
    expect(showsField('arcade', 'arches')).toBe(true)
    expect(showsField('arcade', 'roof')).toBe(false)
    expect(showsField('tower', 'roof')).toBe(true)
    expect(showsField('facade', 'floors')).toBe(true)
  })

  it('keeps scene coordinates when the camera zooms and pans', () => {
    const moved = moveElement(defaultShedDocument(), 'tower-1', 0.33, 0.44)
    const element = moved.scene.elements[0]!
    let camera: SceneCamera = { zoom: nextZoom(1, 'in'), panX: 0, panY: 0 }
    camera = panView(camera, 'right')
    camera = panView(camera, 'up')
    expect(camera.zoom).toBeGreaterThan(1)
    expect(camera.panX).not.toBe(0)
    expect(camera.panY).not.toBe(0)
    expect(element.x).toBeCloseTo(0.33)
    expect(element.y).toBeCloseTo(0.44)
    expect(elementScenePoint(element)).toEqual({ x: element.x * 1000, y: element.y * 640 })
  })

  it('builds a thirty-element scene deterministically', () => {
    let document = defaultShedDocument()
    for (let index = 0; index < 29; index += 1) document = addElement(document, ELEMENT_TYPES[index % ELEMENT_TYPES.length]!)
    expect(document.scene.elements).toHaveLength(30)
    const started = performance.now()
    const graphics = document.scene.elements.map((element) => buildElement(element))
    expect(performance.now() - started).toBeLessThan(500)
    expect(graphics.every((graphic) => graphic.parts.length > 2 && Number.isFinite(graphic.width))).toBe(true)
    const again = buildElement(document.scene.elements[4]!)
    expect(again.parts.map((part) => part.d).join('|')).toBe(graphics[4]?.parts.map((part) => part.d).join('|'))
  })
})

describe('SHED document migration', () => {
  beforeEach(() => {
    resetShedLoadNotice()
  })

  it('reads a SHED 01 tower as schema 2', () => {
    const stored = {
      schema: 1,
      scene: {
        id: 'shed-01',
        version: 4,
        elements: [
          {
            id: 'tower-1',
            type: 'tower',
            x: 0.22,
            y: 0.7,
            layer: 2,
            height: 0.4,
            width: 0.33,
            roof: 0.25,
            primary: '#9C2F3C',
            secondary: '#E0B15A',
            ornament: 'rosette',
          },
        ],
      },
    }
    const parsed = parseShedDocument(stored)
    expect(parsed?.schema).toBe(2)
    expect(parsed?.scene.elements[0]).toMatchObject({
      id: 'tower-1',
      type: 'tower',
      x: 0.22,
      y: 0.7,
      roof: 0.25,
      primary: '#9c2f3c',
      ornament: 'rosette',
    })
    const store = memoryStorage()
    store.setItem(SHED_STORAGE_KEY, JSON.stringify(stored))
    vi.stubGlobal('localStorage', store)
    const loaded = loadShedDocument()
    expect(loaded.status).toBe('saved')
    expect(loaded.document.scene.elements[0]?.ornament).toBe('rosette')
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"schema":2')
    vi.unstubAllGlobals()
  })

  it('repairs invalid stored elements and skips unknown ones', () => {
    const messy = {
      schema: 2,
      scene: {
        id: 'shed-01',
        version: 2,
        elements: [
          {
            id: 'tower-1',
            type: 'tower',
            x: 5,
            y: -1,
            height: 'tall',
            width: 0.4,
            roof: 0.2,
            layer: 1,
            primary: 'red',
            secondary: '#112233',
            detail: '#abcdef',
            ornament: 'nope',
            variant: 90,
            params: { windows: 4 },
          },
          {
            id: 'tower-1',
            type: 'facade',
            x: 0.3,
            y: 0.4,
            width: 0.4,
            height: 0.4,
            roof: 0.2,
            layer: 1,
            primary: '#112233',
            secondary: '#445566',
            detail: '#778899',
            ornament: 'none',
            variant: 1,
            params: defaultParams(),
          },
          { id: 'gate-9', type: 'mosque', x: 0.2, y: 0.2 },
          {
            id: 'arcade-1',
            type: 'arcade',
            x: 0.4,
            y: 0.5,
            width: 0.5,
            height: 0.4,
            roof: 0.2,
            layer: 3,
            primary: '#123456',
            secondary: '#654321',
            detail: '#abcdef',
            ornament: 'none',
            variant: 0,
            params: defaultParams(),
          },
        ],
      },
    }
    expect(parseShedDocument(messy)).toBeNull()
    const recovered = recoverShedDocument(messy)
    expect(recovered?.scene.elements.map((element) => element.id)).toEqual(['tower-1', 'arcade-1'])
    expect(recovered?.scene.elements[0]).toMatchObject({
      x: 0.96,
      y: 0.04,
      height: 0.5,
      primary: '#9c2f3c',
      ornament: 'finial',
      variant: 3,
    })
    expect(recovered?.scene.elements[0]?.params.windows).toBe(1)
    expect(recovered?.scene.elements[1]?.type).toBe('arcade')
  })

  it('keeps an empty scene and does not overwrite a newer schema or other keys', () => {
    const store = memoryStorage()
    store.setItem('field.theme', 'studio-dark')
    vi.stubGlobal('localStorage', store)
    const empty = deleteElement(defaultShedDocument(), 'tower-1')
    expect(persistShedDocument(empty)).toBe(true)
    expect(loadShedDocument().document.scene.elements).toHaveLength(0)
    store.setItem(SHED_STORAGE_KEY, JSON.stringify({ schema: 9, scene: { id: 'future' } }))
    resetShedLoadNotice()
    const loaded = loadShedDocument()
    expect(loaded.status).toBe('restored')
    expect(loaded.document.scene.elements[0]?.id).toBe('tower-1')
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"schema":9')
    expect(persistShedDocument(defaultShedDocument())).toBe(false)
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"schema":9')
    expect(store.getItem('field.theme')).toBe('studio-dark')
    vi.unstubAllGlobals()
  })
})

describe('SHED mobile layout', () => {
  it('keeps library, scene, and panel classes for the narrow layout', () => {
    expect(styles.root).toBeTruthy()
    expect(styles.scene).toBeTruthy()
    expect(styles.library).toBeTruthy()
    expect(styles.libraryList).toBeTruthy()
    expect(styles.libraryItem).toBeTruthy()
    expect(styles.panel).toBeTruthy()
    expect(styles.toolbar).toBeTruthy()
    expect(styles.preview).toBeTruthy()
  })
})
