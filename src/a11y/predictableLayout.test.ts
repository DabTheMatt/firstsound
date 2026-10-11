import { describe, expect, it, vi } from 'vitest'
import { TECHNICAL_WORKSPACES } from '../components/workspace/workspaces'
import { resolveLayoutMode, resolveLayoutModeStable } from '../app/layoutMode'
import { DEFAULT_A11Y_SETTINGS } from './settings'
import {
  LAYOUT_HYSTERESIS_PX,
  clampInspectorWidth,
  clampScrollTop,
  clearLayoutMemory,
  defaultLayoutMemory,
  effectiveLayoutFlags,
  initialLayoutMemory,
  inspectorScrollKey,
  layoutMemoryEnabled,
  parseLayoutMemory,
  patchLayoutMemory,
  readLayoutMemory,
  requestLayoutRestore,
} from './predictableLayout'

describe('predictable layout flags', () => {
  it('stays off until the user turns it on, and sub-settings start off', () => {
    expect(DEFAULT_A11Y_SETTINGS.predictableLayout).toBe(false)
    expect(DEFAULT_A11Y_SETTINGS.stablePanels).toBe(false)
    expect(DEFAULT_A11Y_SETTINGS.rememberWorkspaceLayout).toBe(false)
    expect(DEFAULT_A11Y_SETTINGS.reduceLayoutMovement).toBe(false)
    expect(effectiveLayoutFlags(DEFAULT_A11Y_SETTINGS)).toEqual({
      active: false,
      stablePanels: false,
      rememberWorkspace: false,
      reduceMovement: false,
    })
    const on = effectiveLayoutFlags({
      ...DEFAULT_A11Y_SETTINGS,
      predictableLayout: true,
      stablePanels: true,
      rememberWorkspaceLayout: true,
      reduceLayoutMovement: true,
    })
    expect(on).toEqual({
      active: true,
      stablePanels: true,
      rememberWorkspace: true,
      reduceMovement: true,
    })
    expect(effectiveLayoutFlags({ ...DEFAULT_A11Y_SETTINGS, predictableLayout: true, stablePanels: false }).stablePanels).toBe(false)
  })

  it('keeps the existing workspace order', () => {
    expect(TECHNICAL_WORKSPACES).toEqual(['wave', 'eq', 'fft', 'auto', 'hearing'])
  })
})

describe('layout memory', () => {
  it('ignores audio fields and invalid values', () => {
    const parsed = parseLayoutMemory({
      technicalWorkspace: 'eq',
      inspectorOpen: true,
      contextLevel: 'compact',
      sheetLevel: 'expanded',
      inspectorWidth: 360,
      scroll: { 'inspector:eq-1': 40, bad: -1, nope: '12' },
      gain: -6,
      params: { speed: 1 },
      automation: [],
    })
    expect(parsed.technicalWorkspace).toBe('eq')
    expect(parsed.inspectorOpen).toBe(true)
    expect(parsed.contextLevel).toBe('compact')
    expect(parsed.sheetLevel).toBe('expanded')
    expect(parsed.scroll).toEqual({ 'inspector:eq-1': 40 })
    expect(parsed).not.toHaveProperty('gain')
    expect(parsed).not.toHaveProperty('params')
    expect(parseLayoutMemory({ technicalWorkspace: 'mixer' }).technicalWorkspace).toBeNull()
    expect(parseLayoutMemory(null)).toEqual(defaultLayoutMemory())
  })

  it('stores layout apart from accessibility settings and survives a fresh read', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
    expect(layoutMemoryEnabled(DEFAULT_A11Y_SETTINGS)).toBe(false)
    expect(initialLayoutMemory()).toBeNull()
    patchLayoutMemory({ technicalWorkspace: 'fft', inspectorOpen: false, contextLevel: 'closed' })
    expect(readLayoutMemory().technicalWorkspace).toBe('fft')
    expect(readLayoutMemory().inspectorOpen).toBe(false)
    expect(JSON.parse(store.get('field.layout.v1') ?? '{}').gain).toBeUndefined()
    clearLayoutMemory()
    expect(readLayoutMemory().technicalWorkspace).toBeNull()
    vi.unstubAllGlobals()
  })

  it('clamps a restored inspector width to the viewport', () => {
    expect(clampInspectorWidth(900, 1600)).toBe(480)
    expect(clampInspectorWidth(100, 1600)).toBe(268)
    expect(clampInspectorWidth(320, 700)).toBe(320)
    expect(clampInspectorWidth(400, 700)).toBe(340)
    expect(clampInspectorWidth('wide', 1400)).toBeNull()
    expect(clampInspectorWidth(undefined, 1400)).toBeNull()
  })

  it('rejects an unusable scroll offset and clamps a long one', () => {
    expect(clampScrollTop(-4, 100)).toBeNull()
    expect(clampScrollTop('20', 100)).toBeNull()
    expect(clampScrollTop(20, 100)).toBe(20)
    expect(clampScrollTop(400, 80)).toBe(80)
    expect(clampScrollTop(12, 0)).toBe(0)
  })

  it('keys inspector scroll by effect instance', () => {
    expect(inspectorScrollKey({ kind: 'module', instanceId: 'eq-2' })).toBe('inspector:eq-2')
    expect(inspectorScrollKey({ kind: 'module', instanceId: 'eq-3' })).not.toBe('inspector:eq-2')
    expect(inspectorScrollKey({ kind: 'automation' })).toBe('inspector:automation')
  })

  it('clears layout memory without touching accessibility storage', () => {
    const store = new Map<string, string>([['field.accessibility.v1', '{"predictableLayout":true}']])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    vi.stubGlobal('document', { dispatchEvent: () => true })
    patchLayoutMemory({ technicalWorkspace: 'auto' })
    requestLayoutRestore()
    expect(readLayoutMemory().technicalWorkspace).toBeNull()
    expect(store.get('field.accessibility.v1')).toContain('predictableLayout')
    vi.unstubAllGlobals()
  })
})

describe('stable breakpoints', () => {
  it('matches the current layout when the preference is off', () => {
    const input = { width: 810, height: 900 }
    expect(resolveLayoutModeStable(input, 'sheet', false, LAYOUT_HYSTERESIS_PX)).toBe(resolveLayoutMode(input))
  })

  it('holds the previous variant inside the breakpoint band', () => {
    expect(resolveLayoutMode({ width: 810, height: 900 })).toBe('dock-bottom')
    expect(resolveLayoutModeStable({ width: 810, height: 900 }, 'sheet', true, LAYOUT_HYSTERESIS_PX)).toBe('sheet')
    expect(resolveLayoutMode({ width: 890, height: 800 })).toBe('dock-bottom')
    expect(resolveLayoutModeStable({ width: 890, height: 800 }, 'dock-right', true, LAYOUT_HYSTERESIS_PX)).toBe('dock-right')
  })

  it('switches once the viewport leaves the band', () => {
    expect(resolveLayoutModeStable({ width: 860, height: 900 }, 'sheet', true, LAYOUT_HYSTERESIS_PX)).toBe('dock-bottom')
    expect(resolveLayoutModeStable({ width: 1400, height: 900 }, 'sheet', true, LAYOUT_HYSTERESIS_PX)).toBe('dock-right')
  })
})
