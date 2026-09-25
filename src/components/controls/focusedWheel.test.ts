import { describe, expect, it } from 'vitest'
import { shouldBlurFocusedControl, shouldConsumeParameterWheel } from './focusedWheel'

describe('parameter wheel focus', () => {
  const knob = { name: 'knob' }
  const other = { name: 'other' }

  it('ignores the wheel until that control is focused', () => {
    expect(shouldConsumeParameterWheel(null, knob)).toBe(false)
    expect(shouldConsumeParameterWheel(other, knob)).toBe(false)
    expect(shouldConsumeParameterWheel(knob, null)).toBe(false)
  })

  it('accepts the wheel only for the focused control', () => {
    expect(shouldConsumeParameterWheel(knob, knob)).toBe(true)
    expect(shouldConsumeParameterWheel(other, other)).toBe(true)
  })

  it('drops wheel ownership when the pointer presses outside', () => {
    expect(shouldBlurFocusedControl(knob, knob, false)).toBe(true)
    expect(shouldBlurFocusedControl(knob, knob, true)).toBe(false)
    expect(shouldBlurFocusedControl(other, knob, false)).toBe(false)
    expect(shouldBlurFocusedControl(null, knob, false)).toBe(false)
  })
})
