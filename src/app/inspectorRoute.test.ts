import { describe, expect, it } from 'vitest'
import type { InspectorFocus } from './editorState'
import {
  contextFromFocus,
  focusFromContext,
  inspectorContextId,
  inspectorKey,
  inspectorPanel,
  routeCollapse,
  routeModule,
  routeReveal,
  routeTrackClick,
  routeTrackEdit,
  routeViz,
} from './inspectorRoute'

const delay: InspectorFocus = { kind: 'module', instanceId: 'delay-1', type: 'delay' }
const eq: InspectorFocus = { kind: 'module', instanceId: 'eq-1', type: 'eq' }
const filter: InspectorFocus = { kind: 'module', instanceId: 'filter-1', type: 'filter' }
const automation: InspectorFocus = { kind: 'automation' }

describe('inspector routing', () => {
  it('keeps the effect inspector when AUTO is only a view', () => {
    const opened = routeViz('automation', delay, true)
    expect(opened.viz).toBe('automation')
    expect(opened.focus).toEqual(delay)
    expect(opened.inspectorOpen).toBe(true)
    expect(inspectorPanel(opened.focus)).toBe('editor')

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

  it('leaves the selected effect in place when AUTO is chosen again', () => {
    const back = routeViz('automation', eq, false)
    expect(back.focus).toEqual(eq)
    expect(back.inspectorOpen).toBe(false)
    expect(inspectorKey(back.focus)).toBe('eq')
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

  it('reopens the inspector when an effect is chosen while collapsed', () => {
    expect(routeModule('eq-1', 'eq').inspectorOpen).toBe(true)
    expect(routeViz('automation', delay, false).inspectorOpen).toBe(false)
    expect(routeViz('spectrum', delay, true).focus).toEqual(delay)
  })

  it('keeps an optional advanced pane on the module focus', () => {
    expect(routeModule('filter-1', 'filter', 'advanced').focus).toEqual({
      kind: 'module',
      instanceId: 'filter-1',
      type: 'filter',
      pane: 'advanced',
    })
  })

  it('opens Track Input when a different track has no remembered context', () => {
    const chain = [
      { instanceId: 'gain-1', type: 'gain' as const },
      { instanceId: 'delay-1', type: 'delay' as const },
    ]
    const routed = routeTrackClick('track-2', 'track-1', delay, {})
    expect(routed.context).toEqual({ kind: 'trackInput' })
    expect(routed.memory['track-1']).toEqual({ kind: 'effect', instanceId: 'delay-1', type: 'delay' })
    expect(focusFromContext(routed.context, chain)).toEqual({
      kind: 'module',
      instanceId: 'gain-1',
      type: 'gain',
    })
    expect(inspectorContextId(focusFromContext(routed.context, chain))).toBe('input')
  })

  it('keeps an explicit effect when the same track is selected again', () => {
    const routed = routeTrackClick('track-2', 'track-2', delay, {})
    expect(routed.context).toEqual(contextFromFocus(delay))
    expect(inspectorContextId(delay)).toBe('delay')
  })

  it('restores the effect remembered for that track and never another track', () => {
    const chain = [
      { instanceId: 'gain-1', type: 'gain' as const },
      { instanceId: 'delay-1', type: 'delay' as const },
    ]
    const left = routeTrackClick('track-3', 'track-2', delay, {})
    const back = routeTrackClick('track-2', 'track-3', { kind: 'tool', tool: 'select' }, left.memory)
    expect(back.context).toEqual({ kind: 'effect', instanceId: 'delay-1', type: 'delay' })
    const restored = focusFromContext(back.context, chain)
    expect(restored).toEqual({ kind: 'module', instanceId: 'delay-1', type: 'delay' })
    expect(back.memory['track-3']).toEqual({ kind: 'edit' })
    expect(focusFromContext({ kind: 'effect', instanceId: 'missing', type: 'reverb' }, chain)).toEqual({
      kind: 'module',
      instanceId: 'gain-1',
      type: 'gain',
    })
  })

  it('routes EDIT to the wave editor for the clicked track', () => {
    const routed = routeTrackEdit('track-3', 'track-1', delay, {})
    expect(routed.trackId).toBe('track-3')
    expect(routed.viz).toBe('waveform')
    expect(routed.focus).toEqual({ kind: 'tool', tool: 'select' })
    expect(routed.inspectorOpen).toBe(true)
    expect(routed.memory['track-3']).toEqual({ kind: 'edit' })
    expect(routed.memory['track-1']).toEqual(contextFromFocus(delay))
    expect(inspectorContextId(routed.focus)).toBe('edit')
  })
})
