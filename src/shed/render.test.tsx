import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n'
import { AppViewSwitch } from '../app/AppViewSwitch'
import { defaultTower } from './model'
import { freeShedDocument } from './model'
import { ShedScene } from './ShedScene'
import { TowerElement } from './TowerElement'

describe('SHED rendering', () => {
  it('draws a tower whose geometry and colors are in the SVG', () => {
    const low = renderToStaticMarkup(
      createElement(TowerElement, {
        element: { ...defaultTower(), height: 0.1, width: 0.15, primary: '#112233', secondary: '#445566' },
        selected: false,
        label: 'Tower — architectural element',
        zoom: 1,
        onSelect: () => undefined,
        onMove: () => undefined,
        onNudge: () => undefined,
      }),
    )
    const high = renderToStaticMarkup(
      createElement(TowerElement, {
        element: { ...defaultTower(), height: 0.95, width: 0.9, primary: '#112233', secondary: '#445566', ornament: 'star' },
        selected: true,
        label: 'Tower — architectural element, selected',
        zoom: 1,
        onSelect: () => undefined,
        onMove: () => undefined,
        onNudge: () => undefined,
      }),
    )
    expect(low).toContain('data-element-type="tower"')
    expect(low).toContain('aria-label="Tower — architectural element"')
    expect(low).toContain('#112233')
    expect(low).toContain('#445566')
    expect(low).not.toContain('ornament-star')
    expect(high).toContain('aria-pressed="true"')
    expect(high).toContain('ornament-star')
    expect(high).not.toBe(low)
    const lowHeight = Number(/data-body-height="([^"]+)"/.exec(low)?.[1])
    const highHeight = Number(/data-body-height="([^"]+)"/.exec(high)?.[1])
    expect(highHeight).toBeGreaterThan(lowHeight)
  })

  it('hides the SHED destination from the header switch', () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <AppViewSwitch view="workspace" onChange={() => undefined} />
      </I18nProvider>,
    )
    expect(markup).toContain('Workspace')
    expect(markup).toContain('Activity')
    expect(markup).toContain('data-app-view="activity"')
    expect(markup).not.toContain('SHED')
    expect(markup).not.toContain('data-app-view="shed"')
  })

  it('sizes the scene with a viewBox instead of a fixed page width', () => {
    const markup = renderToStaticMarkup(
      <ShedScene
        document={freeShedDocument()}
        selectedId={null}
        camera={{ zoom: 1, panX: 0, panY: 0 }}
        sceneLabel="Architectural scene"
        labelFor={() => 'Tower — architectural element'}
        onSelect={() => undefined}
        onMove={() => undefined}
        onDeselect={() => undefined}
        onNudge={() => undefined}
        onDelete={() => undefined}
        onPan={() => undefined}
        onZoom={() => undefined}
      />,
    )
    expect(markup).toContain('viewBox="0 0 1000 640"')
    expect(markup).toContain('data-shed-scene')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('#e8ddc8')
    expect(markup).toContain('data-drawing="pen-watercolor"')
    expect(markup.slice(0, markup.indexOf('>'))).not.toContain('width=')
  })
})
