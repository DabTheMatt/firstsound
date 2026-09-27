import { describe, expect, it } from 'vitest'
import { commandGroup, DISPLAY_COMMANDS, EDIT_COMMANDS, runDisplayAction } from './WaveformToolbar'

describe('edit and display commands', () => {
  it('keeps visual normalize with display and clipboard edits with edit', () => {
    expect(commandGroup('normalize-view')).toBe('display')
    expect(DISPLAY_COMMANDS).toContain('normalize-view')
    expect(EDIT_COMMANDS).not.toContain('normalize-view')
    expect(commandGroup('copy')).toBe('edit')
    expect(commandGroup('cut')).toBe('edit')
    expect(commandGroup('paste')).toBe('edit')
    for (const id of EDIT_COMMANDS) expect(DISPLAY_COMMANDS).not.toContain(id)
    for (const id of DISPLAY_COMMANDS) expect(EDIT_COMMANDS).not.toContain(id)
  })

  it('runs display actions through view helpers only', () => {
    const calls: string[] = []
    const view = {
      fitSample: () => calls.push('fit'),
      zoomSelection: () => calls.push('zoom'),
      fitSelection: () => calls.push('fit-selection'),
      resetZoom: () => calls.push('reset'),
    }
    const toggle = () => calls.push('normalize')
    runDisplayAction('normalize-view', view, toggle)
    runDisplayAction('fit-sample', view, toggle)
    runDisplayAction('zoom-selection', view, toggle)
    runDisplayAction('fit-selection', view, toggle)
    runDisplayAction('reset-zoom', view, toggle)
    expect(calls).toEqual(['normalize', 'fit', 'zoom', 'fit-selection', 'reset'])
  })
})
