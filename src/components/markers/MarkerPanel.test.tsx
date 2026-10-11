import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { resetMarkerPanel, setMarkerPanelOpen } from '../../audio/markers/panel'
import { MarkerPanel } from './MarkerPanel'

describe('marker panel markup', () => {
  it('explains why add is unavailable before audio is loaded', () => {
    resetMarkerPanel()
    const closed = renderToStaticMarkup(<MarkerPanel mode="simple" onCommit={() => undefined} />)
    expect(closed).toContain('Markers')
    expect(closed).toContain('aria-expanded="false"')
    setMarkerPanelOpen(true)
    const open = renderToStaticMarkup(<MarkerPanel mode="simple" onCommit={() => undefined} />)
    expect(open).toContain('Load audio before adding a marker.')
    expect(open).toContain('disabled')
    expect(open).not.toContain('Detected places')
    resetMarkerPanel()
  })

  it('offers detected places only in Technical', () => {
    resetMarkerPanel()
    setMarkerPanelOpen(true)
    const technical = renderToStaticMarkup(<MarkerPanel mode="technical" onCommit={() => undefined} />)
    expect(technical).toContain('Detected places')
    expect(technical).toContain('Previous marker')
    resetMarkerPanel()
  })
})
