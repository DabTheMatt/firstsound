import { describe, expect, it } from 'vitest'
import type { InspectorFocus } from './editorState'
import {
  inspectorKey,
  inspectorPanel,
  routeCollapse,
  routeModule,
  routeReveal,
  routeViz,
} from './inspectorRoute'

const delay: InspectorFocus = { kind: 'module', instanceId: 'delay-1', type: 'delay' }
const eq: InspectorFocus = { kind: 'module', instanceId: 'eq-1', type: 'eq' }
const filter: InspectorFocus = { kind: 'module', instanceId: 'filter-1', type: 'filter' }
const automation: InspectorFocus = { kind: 'automation' }

describe('inspector routing', () => {
  it('opens the automation inspector from AUTO without coupling it to later effect edits', () => {
    const opened = routeViz('automation', delay, false)
    expect(opened.viz).toBe('automation')
    expect(opened.focus).toEqual(automation)
    expect(opened.inspectorOpen).toBe(true)
    expect(inspectorPanel(opened.focus)).toBe('automation')

    const next = routeModule('delay-1', 'delay')
    expect(next.focus).toEqual(delay)
    expect(next.inspectorOpen).toBe(true)
    expect(inspectorPanel(next.focus)).toBe('editor')
    expect(inspectorKey(next.focus)).toBe('delay')
  })

  it('switches each selected effect into the single inspector slot', () => {
    const focuses = [
      delay,
      eq,
      filter,
      routeModule('reverb-1', 'reverb').focus,
      routeModule('distortion-1', 'distortion').focus,
      routeModule('gain-1', 'gain').focus,
    ]
    for (const focus of focuses) {
      expect(inspectorPanel(focus)).toBe('editor')
      expect(inspectorKey(focus)).not.toBe('automation')
    }
  })

  it('returns to the automation inspector when AUTO is chosen again', () => {
    const back = routeViz('automation', eq, false)
    expect(back.focus).toEqual(automation)
    expect(back.inspectorOpen).toBe(true)
    expect(inspectorKey(back.focus)).toBe('automation')
  })

  it('does not show the automation inspector merely because the automation view is active', () => {
    expect(inspectorPanel(delay)).toBe('editor')
    expect(inspectorPanel(filter)).toBe('editor')
    const stayed = routeViz('waveform', automation, true)
    expect(stayed.focus).toBe(automation)
    expect(stayed.inspectorOpen).toBe(true)
    expect(inspectorPanel(stayed.focus)).toBe('automation')
  })

  it('collapses and restores the same inspector without a second visibility flag', () => {
    const closed = routeCollapse(delay)
    expect(closed).toEqual({ focus: delay, inspectorOpen: false })
    expect(routeReveal(closed.focus)).toEqual({ focus: delay, inspectorOpen: true })

    const autoClosed = routeCollapse(automation)
    expect(routeReveal(autoClosed.focus).focus).toEqual(automation)
  })

  it('reopens the inspector when an effect or AUTO is chosen while collapsed', () => {
    expect(routeModule('eq-1', 'eq').inspectorOpen).toBe(true)
    expect(routeViz('automation', delay, false).inspectorOpen).toBe(true)
  })

  it('keeps an optional advanced pane on the module focus', () => {
    expect(routeModule('filter-1', 'filter', 'advanced').focus).toEqual({
      kind: 'module',
      instanceId: 'filter-1',
      type: 'filter',
      pane: 'advanced',
    })
  })
})
