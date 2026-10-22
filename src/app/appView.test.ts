import { describe, expect, it } from 'vitest'
import appSource from './App.tsx?raw'
import uiSource from '../modes/uiMode.ts?raw'
import switchSource from './AppViewSwitch.tsx?raw'
import { ACTIVITY_VISIBLE, applyAppView, parseAppView, SHED_VISIBLE } from './appView'

describe('application view', () => {
  it('parses the destinations', () => {
    expect(parseAppView('workspace')).toBe('workspace')
    expect(parseAppView('activity')).toBe('activity')
    expect(parseAppView('shed')).toBe('shed')
    expect(parseAppView('technical')).toBeNull()
  })

  it('keeps the editing mode when the destination changes', () => {
    expect(applyAppView({ view: 'workspace', mode: 'sensory' }, 'shed')).toEqual({
      view: 'shed',
      mode: 'sensory',
    })
    expect(applyAppView({ view: 'shed', mode: 'simple' }, 'workspace')).toEqual({
      view: 'workspace',
      mode: 'simple',
    })
    expect(applyAppView({ view: 'workspace', mode: 'technical' }, 'activity')).toEqual({
      view: 'activity',
      mode: 'technical',
    })
    expect(applyAppView({ view: 'activity', mode: 'simple' }, 'workspace')).toEqual({
      view: 'workspace',
      mode: 'simple',
    })
  })

  it('does not register SHED or Activity as an editing mode', () => {
    expect(uiSource).not.toContain("'shed'")
    expect(uiSource).not.toContain("'activity'")
    expect(uiSource).toContain("'simple'")
  })

  it('switches destination without calling the audio engine', () => {
    const match = appSource.match(/const chooseView = \([\s\S]*?\n  \}/)
    expect(match?.[0]).toContain('applyAppView')
    expect(match?.[0]).not.toContain('engine')
    expect(appSource).toContain("appView === 'shed'")
    expect(appSource).toContain("appView === 'activity'")
  })

  it('keeps Activity and SHED in the codebase without offering them', () => {
    expect(ACTIVITY_VISIBLE).toBe(false)
    expect(SHED_VISIBLE).toBe(false)
    expect(switchSource).toContain('ACTIVITY_VISIBLE')
    expect(switchSource).toContain('SHED_VISIBLE')
    expect(appSource).toContain("ACTIVITY_VISIBLE && appView === 'activity'")
    expect(appSource).toContain("SHED_VISIBLE && appView === 'shed'")
    expect(appSource).toContain("view === 'activity' && !ACTIVITY_VISIBLE")
  })
})
