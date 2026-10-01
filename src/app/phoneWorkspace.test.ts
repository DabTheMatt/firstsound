import { describe, expect, it } from 'vitest'
import {
  essentialParamIds,
  focusWorkspaceForViz,
  nextSheetLevel,
  phoneDisplayViz,
  phoneVizFromMode,
  vizForPhone,
} from './phoneWorkspace'

describe('phone visualization', () => {
  it('collapses stacked analyzer views to one primary mode', () => {
    expect(phoneDisplayViz('split')).toBe('waveform')
    expect(phoneDisplayViz('mix-split')).toBe('waveform')
    expect(phoneDisplayViz('waveform-multi')).toBe('waveform')
    expect(phoneDisplayViz('spectrum')).toBe('eq-split')
    expect(phoneDisplayViz('eq-split')).toBe('eq-split')
    expect(phoneDisplayViz('automation')).toBe('automation')
  })

  it('maps the compact switch onto editor viz modes', () => {
    expect(phoneVizFromMode('waveform')).toBe('wave')
    expect(phoneVizFromMode('spectrum')).toBe('eq')
    expect(vizForPhone('eq')).toBe('eq-split')
    expect(vizForPhone('auto')).toBe('automation')
  })
})

describe('focus workspace', () => {
  it('maps the current phone view onto a presentation-only workspace', () => {
    expect(focusWorkspaceForViz('waveform')).toBe('wave')
    expect(focusWorkspaceForViz('eq-split')).toBe('eq')
    expect(focusWorkspaceForViz('spectrum')).toBe('fft')
    expect(focusWorkspaceForViz('automation')).toBe('auto')
  })
})

describe('phone sheet', () => {
  it('cycles collapsed, medium, and expanded', () => {
    expect(nextSheetLevel('collapsed')).toBe('medium')
    expect(nextSheetLevel('medium')).toBe('expanded')
    expect(nextSheetLevel('expanded')).toBe('collapsed')
  })

  it('keeps input essentials to gain, speed, and pitch', () => {
    expect(essentialParamIds('gain')).toEqual(['gain', 'speed', 'pitch'])
    expect(essentialParamIds('eq')).toEqual([])
  })
})
