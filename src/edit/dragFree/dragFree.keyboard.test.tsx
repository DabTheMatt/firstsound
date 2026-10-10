import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_A11Y_SETTINGS, persistA11ySettings } from '../../a11y/settings'
import { DragFreeWave } from './DragFreeWave'
import { effectMoveAvailable } from './edits'

describe('drag-free keyboard markup', () => {
  it('exposes selection, time, fade, and trim controls as buttons and fields', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, dragFreeEditing: true })
    const html = renderToStaticMarkup(
      <DragFreeWave
        fadeIn={0.25}
        fadeOut={0.4}
        onFades={() => undefined}
        onFadesCommit={() => undefined}
        onRegionCommit={() => undefined}
        onTrim={() => undefined}
      />,
    )
    expect(html).toContain('Set start')
    expect(html).toContain('Set end')
    expect(html).toContain('Edit times')
    expect(html).toContain('Go to time')
    expect(html).toContain('Fade in')
    expect(html).toContain('Fade out')
    expect(html).toContain('type="button"')
    expect(html).toContain('<input')
    expect(html).not.toContain('tabindex="-1"')
    expect(effectMoveAvailable(5, 2, false)).toEqual({ up: true, down: true })
  })

  it('stays quiet when drag-free editing is off', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, dragFreeEditing: false })
    const html = renderToStaticMarkup(
      <DragFreeWave
        fadeIn={0}
        fadeOut={0}
        onFades={() => undefined}
        onFadesCommit={() => undefined}
        onRegionCommit={() => undefined}
        onTrim={() => undefined}
      />,
    )
    expect(html).toBe('')
  })
})
