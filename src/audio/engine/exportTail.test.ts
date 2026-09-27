import { describe, expect, it } from 'vitest'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import { defaultParamValues } from '../parameters/definitions'
import { defaultPrep } from '../samplePrep/state'
import {
  clampExportTail,
  effectTailBudgetSec,
  exportFrameCount,
  exportSourceRange,
  exportWorkingRange,
  MAX_EXPORT_TAIL_SEC,
  prepForWorkingExport,
  prepMatchesWorkingBuffer,
  selectionExportAvailable,
  trimRenderedTail,
} from './exportTail'

function chain(enabled: ModuleType[], bypassed: ModuleType[] = []): ChainModule[] {
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed:
      mod.type === 'gain' || mod.type === 'output'
        ? false
        : bypassed.includes(mod.type) || !enabled.includes(mod.type),
  }))
}

describe('export tail and selection range', () => {
  it('treats a full-window region as no selection', () => {
    const prep = defaultPrep(2)
    expect(selectionExportAvailable(prep)).toBe(false)
    expect(exportSourceRange(prep, 'project')).toEqual({ start: 0, end: 2 })
    expect(exportSourceRange(prep, 'selection')).toEqual({
      start: prep.selectionStart,
      end: prep.selectionEnd,
    })
  })

  it('enables Export Selection only for a real subset', () => {
    const prep = { ...defaultPrep(2), selectionStart: 0.4, selectionEnd: 0.9 }
    expect(selectionExportAvailable(prep)).toBe(true)
    expect(exportSourceRange(prep, 'selection')).toEqual({ start: 0.4, end: 0.9 })
    expect(exportSourceRange(prep, 'project')).toEqual({ start: 0, end: 2 })
  })

  it('exports the highlighted loop, not a stale prep selection', () => {
    const prep = { ...defaultPrep(2), selectionStart: 0.2, selectionEnd: 1.1 }
    const clock = { bufferDuration: 2, regionStart: 0.5, regionEnd: 0.9 }
    expect(exportWorkingRange(prep, 'selection', clock)).toEqual({ start: 0.5, end: 0.9 })
    expect(exportWorkingRange(prep, 'project', clock)).toEqual({ start: 0, end: 2 })
    expect(selectionExportAvailable(prep, clock)).toBe(true)
    const pointed = prepForWorkingExport(prep, 'selection', clock)
    expect(exportSourceRange(pointed, 'selection')).toEqual({ start: 0.5, end: 0.9 })
  })

  it('keeps a baked trim on the working buffer instead of the source head', () => {
    const fitted = { ...defaultPrep(0.4), windowStart: 0, windowEnd: 0.4, selectionStart: 0, selectionEnd: 0.4 }
    const clock = { bufferDuration: 0.4, regionStart: 0, regionEnd: 0.4 }
    expect(prepMatchesWorkingBuffer(fitted, 0.4)).toBe(true)
    expect(exportWorkingRange(fitted, 'project', clock)).toEqual({ start: 0, end: 0.4 })
    const stale = { ...defaultPrep(4), selectionStart: 1.2, selectionEnd: 1.6 }
    expect(prepMatchesWorkingBuffer(stale, 0.4)).toBe(false)
    expect(exportWorkingRange(stale, 'project', clock)).toEqual({ start: 0, end: 0.4 })
    expect(exportWorkingRange(stale, 'selection', clock)).toEqual({ start: 0, end: 0.4 })
    expect(selectionExportAvailable(stale, clock)).toBe(false)
  })

  it('derives a delay/reverb budget instead of a fixed pad', () => {
    const dry = defaultParamValues()
    expect(effectTailBudgetSec(chain([]), dry, 'room')).toBe(0)
    const wet = { ...dry, delayWet: 80, delayFeedback: 40, delayTime: 180 }
    expect(effectTailBudgetSec(chain(['delay'], ['delay']), wet, 'room')).toBe(0)
    const delay = effectTailBudgetSec(chain(['delay']), wet, 'room')
    expect(delay).toBeGreaterThan(0.15)
    expect(delay).toBeLessThan(12)
    expect(delay).not.toBe(10)
    expect(delay).not.toBe(30)
    const verb = {
      ...dry,
      reverbWet: 70,
      reverbDecay: 0.4,
      reverbSize: 20,
      reverbPredelay: 0,
    }
    const reverb = effectTailBudgetSec(chain(['reverb']), verb, 'room')
    expect(reverb).toBeGreaterThan(0.08)
    expect(reverb).toBeLessThan(3)
  })

  it('clamps the tail and rejects a non-finite render length', () => {
    expect(clampExportTail(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampExportTail(-4)).toBe(0)
    expect(clampExportTail(80)).toBe(MAX_EXPORT_TAIL_SEC)
    expect(exportFrameCount(44100, 44100, 2)).toBe(132300)
    expect(() => exportFrameCount(Number.NaN, 44100, 0)).toThrow(/duration/i)
    expect(() => exportFrameCount(100, Number.POSITIVE_INFINITY, 0)).toThrow(/sample rate/i)
    expect(() => exportFrameCount(100, -1, 0)).toThrow(/sample rate/i)
    expect(() => exportFrameCount(44100 * 60 * 30, 44100, 1)).toThrow(/too long/i)
  })

  it('drops a silent tail and keeps a decaying one only while it is hot', () => {
    const sr = 1000
    const silent = [new Float32Array(200)]
    expect(trimRenderedTail(silent, 50, sr)).toBe(50)
    const ringing = new Float32Array(200)
    ringing[55] = 0.2
    ringing[70] = 0.01
    expect(trimRenderedTail([ringing], 50, sr, 0.00045, 0.02)).toBe(71)
    const stillHot = new Float32Array(80)
    stillHot[70] = 0.2
    expect(trimRenderedTail([stillHot], 50, sr, 0.00045, 0.05)).toBe(80)
  })
})
