import { describe, expect, it } from 'vitest'
import { envelopeToParam } from '../../audio/automation/automation'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import {
  automationDisplayValue,
  automationNormalizedValue,
  effectMoveAvailable,
  indexOfBandId,
  stepFade,
  stepPlayhead,
  validateFade,
  validateLoop,
  validateSelection,
} from './edits'

describe('drag-free selection', () => {
  it('keeps a typed range that matches the engine clamp', () => {
    const next = validateSelection(12.35, 18.7, 60)
    expect(next).toEqual({ ok: true, value: { start: 12.35, end: 18.7 } })
  })

  it('does not swap a backwards range', () => {
    expect(validateSelection(8, 2, 10).ok).toBe(false)
    if (validateSelection(8, 2, 10).ok) return
    expect(validateSelection(8, 2, 10)).toEqual({ ok: false, error: 'order' })
  })

  it('rejects a range past the buffer, a negative time, and a short span', () => {
    expect(validateSelection(-1, 2, 10)).toMatchObject({ ok: false, error: 'negative' })
    expect(validateSelection(0, 11, 10)).toMatchObject({ ok: false, error: 'past' })
    expect(validateSelection(1, 1.01, 10)).toMatchObject({ ok: false, error: 'short' })
    expect(validateSelection(0, 1, 0)).toMatchObject({ ok: false, error: 'missing' })
  })
})

describe('drag-free playhead and fades', () => {
  it('steps the playhead by 100 ms inside the buffer', () => {
    expect(stepPlayhead(1, 1, 2)).toEqual({ ok: true, value: 1.1 })
    expect(stepPlayhead(0, -1, 2).ok).toBe(false)
    expect(stepPlayhead(2, 1, 2).ok).toBe(false)
  })

  it('keeps fade length inside the selection', () => {
    expect(validateFade(0.25, 0, 1)).toEqual({ ok: true, value: 0.25 })
    expect(validateFade(2, 0, 1)).toMatchObject({ ok: false, error: 'fade' })
    expect(validateFade(-0.01, 0, 1)).toMatchObject({ ok: false, error: 'negative' })
    expect(stepFade(0.2, 1, 0, 1)).toEqual({ ok: true, value: 0.25 })
    expect(stepFade(1, 1, 0, 1).ok).toBe(false)
  })
})

describe('drag-free loop, EQ identity, and chain moves', () => {
  it('edits an independent loop without swapping the edges', () => {
    expect(validateLoop(1, 2, 8)).toEqual({ ok: true, value: { start: 1, end: 2 } })
    expect(validateLoop(3, 1, 8)).toMatchObject({ ok: false, error: 'order' })
  })

  it('finds a band by id after the list order changes', () => {
    const bands = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(indexOfBandId(bands, 'b')).toBe(1)
    expect(indexOfBandId([bands[2]!, bands[0]!], 'a')).toBe(1)
    expect(indexOfBandId(bands, 'missing')).toBe(-1)
  })

  it('disables moves at the fixed input and output', () => {
    expect(effectMoveAvailable(4, 0, true)).toEqual({ up: false, down: false })
    expect(effectMoveAvailable(4, 1, false)).toEqual({ up: false, down: true })
    expect(effectMoveAvailable(4, 2, false)).toEqual({ up: true, down: false })
  })
})

describe('automation display values', () => {
  it('edits the parameter amount, not the stored envelope', () => {
    const shown = automationDisplayValue('gain', 0.5)
    expect(shown).toBeCloseTo(envelopeToParam('gain', 0.5))
    expect(shown).not.toBeCloseTo(0.5)
    const stored = automationNormalizedValue('gain', shown)
    expect(stored).toBeCloseTo(toNormalized(shown, PARAMS.gain))
    expect(stored).toBeGreaterThan(0)
    expect(stored).toBeLessThan(1)
  })
})
