import { describe, expect, it } from 'vitest'
import { PARAMS } from '../audio/parameters/definitions'
import type { ParamId } from '../audio/parameters/types'
import { SENSORY_AXIS_IDS } from '../sensory/sensoryParameters'
import { EN, PL, paramLabel } from './messages'
import { PL_PARAMS } from './plParams'

describe('i18n catalogs', () => {
  it('covers every sensory feeling in both locales', () => {
    for (const id of SENSORY_AXIS_IDS) {
      expect(EN.sensory.feelings[id]?.label).toBeTruthy()
      expect(PL.sensory.feelings[id]?.label).toBeTruthy()
    }
  })

  it('covers every ParamId in Polish', () => {
    for (const id of Object.keys(PARAMS) as ParamId[]) {
      expect(PL_PARAMS[id]).toBeTruthy()
    }
  })

  it('returns English parameter labels by default', () => {
    expect(paramLabel('en', 'gain')).toBe('Gain')
    expect(paramLabel('pl', 'gain')).toBe('Wzmocnienie')
  })
})
