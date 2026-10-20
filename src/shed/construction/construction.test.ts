import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteElement, updateElement } from '../commands'
import { buildElement } from '../geometry'
import { SHED_STYLE } from '../style'
import { defaultShedDocument, freeShedDocument, isConstructionDocument, SHED_STORAGE_KEY } from '../model'
import { loadShedDocument, parseShedDocument, persistShedDocument, resetShedLoadNotice, serializeShedDocument } from '../persistence'
import { elementFromCatalog } from './element'
import { attachPiece, deleteBranch, placeFoundation } from './build'
import { CATALOG } from './catalog'
import { openDirections } from './graph'
import { GROUND_Y, JOIN, sceneBounds } from './layout'

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

describe('SHED construction', () => {
  it('starts empty and only accepts a ground-floor root', () => {
    const empty = defaultShedDocument()
    expect(isConstructionDocument(empty)).toBe(true)
    expect(empty.scene.elements).toHaveLength(0)
    const roof = placeFoundation(empty, 'gothic-roof')
    expect(roof.error).toBe('foundation')
    expect(roof.document.scene.elements).toHaveLength(0)
    const rooted = placeFoundation(empty, 'townhouse-base')
    expect(rooted.error).toBeNull()
    const root = rooted.document.scene.elements[0]
    expect(root?.parentId).toBeNull()
    expect(root?.role).toBe('ground')
    expect(sceneBounds(root!).bottom).toBeCloseTo(GROUND_Y, 1)
    expect(placeFoundation(rooted.document, 'gate-base').error).toBe('foundation')
  })

  it('grows left, right, and upward, and rejects a floating or incompatible piece', () => {
    const root = placeFoundation(defaultShedDocument(), 'townhouse-base')
    const id = root.addedId!
    expect(openDirections(root.document.scene.elements, id)).toEqual(['LEFT', 'RIGHT', 'TOP'])
    const right = attachPiece(root.document, id, 'RIGHT', 'gothic-base')
    expect(right.error).toBeNull()
    const rightElement = right.document.scene.elements.find((element) => element.id === right.addedId)
    const parent = right.document.scene.elements.find((element) => element.id === id)!
    expect(rightElement?.parentId).toBe(id)
    expect(rightElement?.attachmentType).toBe('RIGHT')
    expect(sceneBounds(rightElement!).left).toBeCloseTo(sceneBounds(parent).right - JOIN, 1)
    expect(sceneBounds(rightElement!).bottom).toBeCloseTo(sceneBounds(parent).bottom, 1)
    const above = attachPiece(right.document, id, 'TOP', 'townhouse-floor')
    expect(above.error).toBeNull()
    const floor = above.document.scene.elements.find((element) => element.id === above.addedId)!
    expect(sceneBounds(floor).bottom).toBeCloseTo(sceneBounds(above.document.scene.elements.find((element) => element.id === id)!).top + JOIN, 1)
    expect(attachPiece(above.document, id, 'TOP', 'finial').error).toBe('anchor')
    expect(attachPiece(above.document, floor.id, 'TOP', 'gothic-roof').error).toBeNull()
    expect(attachPiece(root.document, id, 'TOP', 'gothic-helmet').error).toBe('incompatible')
    const added = deleteElement(above.document, 'not-a-real-add')
    expect(added.scene.elements.length).toBe(above.document.scene.elements.length)
  })

  it('keeps descendants attached when a support changes size', () => {
    const root = placeFoundation(defaultShedDocument(), 'townhouse-base')
    const right = attachPiece(root.document, root.addedId!, 'RIGHT', 'townhouse-base')
    const before = sceneBounds(right.document.scene.elements.find((element) => element.id === right.addedId)!)
    const edited = updateElement(right.document, root.addedId!, { width: 0.7 })
    const parent = edited.scene.elements.find((element) => element.id === root.addedId)!
    const child = edited.scene.elements.find((element) => element.id === right.addedId)!
    expect(child.parentId).toBe(parent.id)
    expect(sceneBounds(child).left).toBeCloseTo(sceneBounds(parent).right - JOIN, 1)
    expect(sceneBounds(child).left).not.toBeCloseTo(before.left, 0)
    const moved = updateElement(edited, child.id, { x: 0.1, y: 0.1 })
    expect(moved.scene.elements.find((element) => element.id === child.id)?.x).toBeCloseTo(child.x)
  })

  it('moves a whole branch together and deletes that branch', () => {
    const root = placeFoundation(defaultShedDocument(), 'gate-base')
    const above = attachPiece(root.document, root.addedId!, 'TOP', 'defensive-tower')
    const helmet = attachPiece(above.document, above.addedId!, 'TOP', 'gothic-helmet')
    const tower = helmet.document.scene.elements.find((element) => element.id === above.addedId)!
    const shifted = updateElement(helmet.document, tower.id, { height: tower.height })
    expect(shifted.scene.elements).toHaveLength(3)
    const removed = deleteBranch(helmet.document, above.addedId!)
    expect(removed.document.scene.elements.map((element) => element.id)).toEqual([root.addedId])
    expect(deleteElement(helmet.document, above.addedId!)).toBe(helmet.document)
  })

  it('draws distinct silhouettes with one ink grammar', () => {
    const forms = ['townhouse-base', 'gothic-base', 'sukiennice-attic', 'gothic-roof', 'pointed-arcade', 'krakow-crown', 'crest']
    const paths = forms.map((id) => {
      const entry = CATALOG.find((item) => item.id === id)!
      const graphic = buildElement(elementFromCatalog(entry, id, { parentId: null, attachmentType: null }))
      expect(new Set(graphic.parts.map((part) => part.id)).size).toBe(graphic.parts.length)
      for (const part of graphic.parts) {
        if (part.stroke && part.stroke !== 'none') {
          expect([SHED_STYLE.ink, SHED_STYLE.constructionLine]).toContain(part.stroke)
        }
      }
      return graphic.parts.map((part) => part.d).join('|')
    })
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('keeps a free sheet free and reloads a connected build', () => {
    const free = freeShedDocument()
    expect(isConstructionDocument(free)).toBe(false)
    expect(parseShedDocument(JSON.parse(serializeShedDocument(free)))?.schema).toBe(2)
    const built = attachPiece(placeFoundation(defaultShedDocument(), 'three-arch').document, 'missing', 'LEFT', 'gate-base')
    expect(built.error).toBe('parent')
    const saved = placeFoundation(defaultShedDocument(), 'three-arch')
    const store = memoryStorage()
    vi.stubGlobal('localStorage', store)
    resetShedLoadNotice()
    expect(persistShedDocument(saved.document)).toBe(true)
    const loaded = loadShedDocument()
    expect(loaded.document.scene.elements[0]?.catalogId).toBe('three-arch')
    expect(loaded.document.scene.composition).toBe('construction')
    expect(loaded.document.scene.elements[0]?.x).toBeCloseTo(saved.document.scene.elements[0]!.x)
    vi.unstubAllGlobals()
  })
})

describe('SHED construction persistence', () => {
  beforeEach(() => resetShedLoadNotice())

  it('does not rewrite a schema 2 sheet into a construction', () => {
    const stored = serializeShedDocument(freeShedDocument())
    const store = memoryStorage()
    store.setItem(SHED_STORAGE_KEY, stored)
    vi.stubGlobal('localStorage', store)
    const loaded = loadShedDocument()
    expect(loaded.document.schema).toBe(2)
    expect(loaded.document.scene.composition).toBeUndefined()
    expect(loaded.document.scene.elements[0]?.id).toBe('tower-1')
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"schema":2')
    vi.unstubAllGlobals()
  })
})
