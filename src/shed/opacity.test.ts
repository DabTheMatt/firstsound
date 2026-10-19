import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { setBuildingTransparency } from './commands'
import { defaultElement, defaultShedDocument } from './model'
import { GLASS_FILL, SOLID_FILL, buildingsAreTransparent, presentedFillOpacity } from './opacity'
import { parseShedDocument } from './persistence'
import { TowerElement } from './TowerElement'

const handlers = {
  zoom: 1,
  onSelect: () => undefined,
  onMove: () => undefined,
  onNudge: () => undefined,
}

describe('building transparency', () => {
  it('keeps ink and stains, and opens or covers the wash', () => {
    const wash = { fill: '#a65a4d', fillOpacity: 0.94 }
    const stain = { fill: '#a65a4d', fillOpacity: 0.16 }
    const ink = { fill: 'none', fillOpacity: undefined }
    const hit = { fill: '#20272a', fillOpacity: 0 }
    expect(presentedFillOpacity(wash, true)).toBe(GLASS_FILL)
    expect(presentedFillOpacity(wash, false)).toBe(SOLID_FILL)
    expect(presentedFillOpacity(stain, true)).toBe(0.16)
    expect(presentedFillOpacity(stain, false)).toBe(0.16)
    expect(presentedFillOpacity(ink, false)).toBeUndefined()
    expect(presentedFillOpacity(hit, false)).toBe(0)
  })

  it('treats a scene without the switch as clear and stores an explicit choice', () => {
    const scene = defaultShedDocument()
    expect(scene.scene).not.toHaveProperty('transparentBuildings')
    expect(buildingsAreTransparent(scene.scene)).toBe(true)
    const solid = setBuildingTransparency(scene, false)
    expect(solid.scene.transparentBuildings).toBe(false)
    expect(solid.scene.version).toBe(scene.scene.version + 1)
    expect(setBuildingTransparency(solid, false)).toBe(solid)
    const clear = setBuildingTransparency(solid, true)
    expect(clear.scene.transparentBuildings).toBe(true)
    expect(buildingsAreTransparent(clear.scene)).toBe(true)
  })

  it('keeps a stored choice and drops an invalid one without rejecting the scene', () => {
    const stored = {
      schema: 2,
      scene: {
        id: 'shed-01',
        version: 3,
        transparentBuildings: false,
        elements: [
          {
            ...defaultElement('facade', 'facade-1'),
          },
        ],
      },
    }
    const parsed = parseShedDocument(stored)
    expect(parsed?.scene.transparentBuildings).toBe(false)
    const broken = parseShedDocument({
      ...stored,
      scene: { ...stored.scene, transparentBuildings: 'yes' },
    })
    expect(broken?.scene).not.toHaveProperty('transparentBuildings')
    expect(broken?.scene.elements[0]?.id).toBe('facade-1')
  })

  it('paints the same building clear or solid in the scene', () => {
    const element = defaultElement('facade', 'facade-1')
    const glass = renderToStaticMarkup(
      createElement(TowerElement, { element, selected: false, label: 'Facade', transparent: true, ...handlers }),
    )
    const solid = renderToStaticMarkup(
      createElement(TowerElement, { element, selected: false, label: 'Facade', transparent: false, ...handlers }),
    )
    expect(glass).toContain(`fill-opacity="${GLASS_FILL}"`)
    expect(glass).not.toContain(`fill-opacity="${SOLID_FILL}"`)
    expect(solid).toContain(`fill-opacity="${SOLID_FILL}"`)
    expect(solid).toContain('stroke="#20272a"')
  })
})
