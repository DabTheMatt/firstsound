import { describe, expect, it } from 'vitest'
import { EQ_FILTER_TYPES, type EqFilterType } from '../../audio/engine/eqBands'
import { EQ_STRIP_SLOT_COUNT, eqStripParamSlots } from './eqStripSlots'

describe('eqStripParamSlots', () => {
  it('keeps three rows for every filter type', () => {
    for (const item of EQ_FILTER_TYPES) {
      const slots = eqStripParamSlots(item.value)
      expect(slots).toHaveLength(EQ_STRIP_SLOT_COUNT)
      expect(slots[0]).toBe('freq')
    }
  })

  it('matches the console strips used by the EQ layout', () => {
    const expectSlots = (type: EqFilterType, second: string, third: string) => {
      expect(eqStripParamSlots(type)).toEqual(['freq', second, third])
    }
    expectSlots('peaking', 'gain', 'q')
    expectSlots('notch', 'empty', 'width')
    expectSlots('bandpass', 'empty', 'width')
    expectSlots('lowshelf', 'gain', 'q')
    expectSlots('highshelf', 'gain', 'q')
    expectSlots('lowpass', 'slope', 'q')
    expectSlots('highpass', 'slope', 'q')
  })
})
