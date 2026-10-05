import { describe, expect, it } from 'vitest'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ModuleType } from '../../audio/chain/chain'
import { MOBILE_PARAM_PRIORITY } from '../../app/mobilePriority'
import {
  eqHiddenNotable,
  hiddenNotableCount,
  hiddenParamIds,
  paramIsNotable,
  primaryParamIds,
} from './disclosure'
import { vizForWorkspace, workspaceFromViz } from './workspaces'

const TYPES = Object.keys(MOBILE_PARAM_PRIORITY) as ModuleType[]

describe('workspace disclosure', () => {
  it('only names parameters that already exist', () => {
    for (const type of TYPES) {
      const ids = [...primaryParamIds(type), ...hiddenParamIds(type)]
      for (const id of ids) expect(PARAMS[id]).toBeDefined()
    }
  })

  it('keeps input primaries to gain, speed, and pitch', () => {
    expect([...primaryParamIds('gain')]).toEqual(['gain', 'speed', 'pitch'])
  })

  it('counts hidden non-default, automated, modulated, and randomized parameters', () => {
    expect(paramIsNotable('gain', PARAMS.gain.defaultValue)).toBe(false)
    expect(paramIsNotable('gain', -6)).toBe(true)
    expect(paramIsNotable('pan', PARAMS.pan.defaultValue, { automated: true })).toBe(true)
    const count = hiddenNotableCount('gain', (id) => id === 'pan' || id === 'invertPhase')
    expect(count).toBe(2)
  })

  it('flags other audible EQ bands and an enabled comb while one band is selected', () => {
    expect(
      eqHiddenNotable(
        [
          { type: 'peaking' },
          { type: 'highshelf' },
          { type: 'off' },
        ],
        true,
        0,
      ),
    ).toBe(2)
  })
})

describe('workspace navigation', () => {
  it('maps the five technical activities without a new audio mode', () => {
    expect(workspaceFromViz('waveform', false)).toBe('wave')
    expect(workspaceFromViz('eq-split', false)).toBe('eq')
    expect(workspaceFromViz('spectrum', false)).toBe('fft')
    expect(workspaceFromViz('split', false)).toBe('fft')
    expect(workspaceFromViz('automation', false)).toBe('auto')
    expect(workspaceFromViz('waveform', true)).toBe('hearing')
    expect(vizForWorkspace('hearing')).toBeNull()
    expect(vizForWorkspace('eq')).toBe('eq-split')
    expect(vizForWorkspace('fft')).toBe('spectrum')
  })
})
