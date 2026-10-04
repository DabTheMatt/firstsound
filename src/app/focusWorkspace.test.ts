import { describe, expect, it } from 'vitest'
import {
  automationInsertTime,
  defaultSelectionFadeSeconds,
  focusLaneFraction,
  focusLanePolyline,
  focusLaneValue,
  segmentAtTime,
  focusCapabilities,
  focusHas,
  focusWorkspaceForViz,
} from './focusWorkspace'

describe('focus workspace', () => {
  it('maps each visualization to its task', () => {
    expect(focusWorkspaceForViz('waveform')).toBe('wave')
    expect(focusWorkspaceForViz('split')).toBe('wave')
    expect(focusWorkspaceForViz('eq-split')).toBe('eq')
    expect(focusWorkspaceForViz('automation')).toBe('auto')
    expect(focusWorkspaceForViz('spectrum')).toBe('fft')
  })

  it('keeps a complete minimal toolset per workspace', () => {
    expect(focusCapabilities('eq')).toEqual(['addBand', 'nodeEdit', 'nodeType', 'nodeDelete', 'liveReadout'])
    expect(focusHas('wave', 'fadeIn')).toBe(true)
    expect(focusHas('wave', 'addParameter')).toBe(false)
    expect(focusHas('auto', 'segmentInterpolation')).toBe(true)
    expect(focusHas('auto', 'fadeOut')).toBe(false)
    expect(focusHas('fft', 'minimalAnalyzerControls')).toBe(true)
    expect(focusHas('hearing', 'liveReadout')).toBe(true)
    expect(focusHas('hearing', 'editActions')).toBe(false)
    expect(focusHas('eq', 'editActions')).toBe(false)
  })

  it('places a short fade inside the selection', () => {
    expect(defaultSelectionFadeSeconds(1, 1.2)).toBeCloseTo(0.04)
    expect(defaultSelectionFadeSeconds(0, 4)).toBeCloseTo(0.12)
    expect(defaultSelectionFadeSeconds(2, 2)).toBe(0)
  })

  it('insets focus automation so a zero line stays on the plot', () => {
    expect(focusLaneFraction(0)).toBeCloseTo(0.92)
    expect(focusLaneFraction(1)).toBeCloseTo(0.08)
    expect(focusLaneValue(0.92)).toBeCloseTo(0)
    expect(focusLaneValue(0.08)).toBeCloseTo(1)
    expect(focusLanePolyline('0.000,100.000 50.000,0.000')).toBe('0.000,92.000 50.000,8.000')
  })

  it('inserts an automation node at the playhead when it is visible', () => {
    expect(automationInsertTime(1.5, 1, 2)).toBe(1.5)
    expect(automationInsertTime(8, 1, 3)).toBe(2)
  })

  it('picks the automation segment under a time', () => {
    const nodes = [
      { id: 'a', time: 0 },
      { id: 'b', time: 1 },
      { id: 'c', time: 2 },
    ]
    expect(segmentAtTime(nodes, 0.4)).toBe('a')
    expect(segmentAtTime(nodes, 1.2)).toBe('b')
    expect(segmentAtTime(nodes, 3)).toBe('b')
    expect(segmentAtTime([{ id: 'only', time: 0 }], 0.2)).toBeNull()
  })
})
