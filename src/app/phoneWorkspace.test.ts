import { describe, expect, it } from 'vitest'
import { essentialParamIds, nextSheetLevel, phoneDisplayViz, phoneVizFromMode, vizForPhone } from './phoneWorkspace'

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
