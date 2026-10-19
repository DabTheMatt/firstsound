import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EN, PL } from '../i18n/messages'
import { ElementLibrary } from './ElementLibrary'
import { ElementPanel } from './ElementPanel'
import { ELEMENT_TYPES, defaultElement, type ElementType } from './model'
import { TowerElement } from './TowerElement'
import { ShedScene } from './ShedScene'
import { addElement } from './commands'
import { defaultShedDocument } from './model'

function copyFor(locale: typeof EN) {
  return {
    ...locale.shed,
    ornaments: {
      none: locale.shed.ornamentNone,
      finial: locale.shed.ornamentFinial,
      rosette: locale.shed.ornamentRosette,
      star: locale.shed.ornamentStar,
    },
  }
}

const noop = () => undefined

function panel(type: ElementType, locale: typeof EN) {
  return renderToStaticMarkup(
    createElement(ElementPanel, {
      element: defaultElement(type, `${type}-1`),
      status: 'saved',
      copy: copyFor(locale),
      panelRef: { current: null },
      focusOnOpen: false,
      onClose: noop,
      onHeight: noop,
      onWidth: noop,
      onRoof: noop,
      onPrimary: noop,
      onSecondary: noop,
      onDetail: noop,
      onOrnament: noop,
      onVariant: noop,
      onParam: noop,
      onX: noop,
      onY: noop,
      onForward: noop,
      onBackward: noop,
      onReset: noop,
      onDuplicate: noop,
      onDelete: noop,
    }),
  )
}

describe('SHED library interface', () => {
  it('renders every category from its geometry in both languages', () => {
    for (const type of ELEMENT_TYPES) {
      const markup = renderToStaticMarkup(
        createElement(TowerElement, {
          element: defaultElement(type, `${type}-7`),
          selected: type === 'gate',
          label: EN.shed.elementName(EN.shed.categories[type], type === 'gate'),
          zoom: 1,
          onSelect: noop,
          onMove: noop,
          onNudge: noop,
          onDelete: noop,
        }),
      )
      expect(markup).toContain(`data-element-type="${type}"`)
      expect(markup).toContain('data-part=')
      expect(markup).toContain('tabindex="0"')
      expect(markup).not.toContain('🏰')
    }

    const library = renderToStaticMarkup(
      createElement(ElementLibrary, {
        copy: copyFor(EN),
        panelRef: { current: null },
        onAdd: noop,
        onClose: noop,
      }),
    )
    expect(library).toContain('Element library')
    expect(library).toContain('<svg')
    for (const type of ELEMENT_TYPES) {
      expect(library).toContain(EN.shed.categories[type])
      expect(library).toContain(EN.shed.descriptions[type].replaceAll("'", '&#x27;'))
    }
    const polish = renderToStaticMarkup(
      createElement(ElementLibrary, {
        copy: copyFor(PL),
        panelRef: { current: null },
        onAdd: noop,
        onClose: noop,
      }),
    )
    expect(polish).toContain('Biblioteka elementów')
    expect(polish).toContain('Fasada')
    expect(polish).toContain('Attyka')
    expect(polish).toContain('Brama Floriańska')
  })

  it('shows only the controls for the selected category and keeps keyboard position', () => {
    const tower = panel('tower', EN)
    const arcade = panel('arcade', EN)
    expect(tower).toContain('data-inspector-for="tower"')
    expect(tower).toContain('Helmet')
    expect(tower).toContain('Body proportion')
    expect(tower).toContain('Bring forward')
    expect(tower).toContain('Send backward')
    expect(tower).toContain('Duplicate')
    expect(tower).toContain('Delete element')
    expect(tower).toContain('Horizontal position')
    expect(tower).toContain('type="range"')
    expect(tower).not.toContain('>Arches<')
    expect(arcade).toContain('data-inspector-for="arcade"')
    expect(arcade).toContain('Arches')
    expect(arcade).toContain('Arch height')
    expect(arcade).toContain('Column width')
    expect(arcade).not.toContain('Helmet')
    expect(arcade).not.toContain('Body proportion')
    const polish = panel('gate', PL)
    expect(polish).toContain('Przesuń na wierzch')
    expect(polish).toContain('Usuń element')
    expect(polish).toContain('Duplikuj')
    expect(polish).toContain('Brama Floriańska')
  })

  it('marks the selected element when several overlap in draw order', () => {
    const document = moveElementToFront(addElement(defaultShedDocument(), 'arcade'))
    const front = document.scene.elements.at(-1)!
    const markup = renderToStaticMarkup(
      createElement(ShedScene, {
        document,
        selectedId: front.id,
        camera: { zoom: 1.4, panX: 20, panY: -12 },
        sceneLabel: 'Architectural scene',
        labelFor: (element, selected) => EN.shed.elementName(EN.shed.categories[element.type], selected),
        onSelect: noop,
        onDeselect: noop,
        onMove: noop,
        onNudge: noop,
        onDelete: noop,
        onPan: noop,
        onZoom: noop,
      }),
    )
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain(`data-shed-element="${front.id}"`)
    expect(markup).toContain('scale(1.4)')
    expect(markup).toContain(`data-shed-element="${document.scene.elements[0]?.id}"`)
  })
})

function moveElementToFront(document: ReturnType<typeof defaultShedDocument>) {
  const front = document.scene.elements[0]!
  const other = document.scene.elements[1]!
  return {
    ...document,
    scene: {
      ...document.scene,
      elements: [
        { ...other, x: front.x, y: front.y, layer: 0 },
        { ...front, layer: 2 },
      ],
    },
  }
}
