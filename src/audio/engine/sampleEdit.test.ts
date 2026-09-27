import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../../app/history'
import { defaultAutomation } from '../automation/automation'
import {
  canClearSampleSelection,
  canDeleteSampleSelection,
  canMuteSampleSelection,
  deleteFrameRange,
  deleteFrameSpan,
  muteFrameRange,
  muteFrameSpan,
  insertFrameForTime,
  insertSilence,
  mapAutomation,
  mapMarkerTimes,
  mapPlayhead,
  mapRange,
  silenceFrameCount,
} from './sampleEdit'

function ramp(length: number, scale = 1): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = ((i + 1) / length) * scale
  return out
}

describe('silenceFrameCount', () => {
  it('follows the buffer sample rate', () => {
    expect(silenceFrameCount(48000)).toBe(48000)
    expect(silenceFrameCount(44100)).toBe(44100)
    expect(silenceFrameCount(22050)).toBe(22050)
    expect(silenceFrameCount(0)).toBe(0)
  })
})

describe('insertSilence', () => {
  it('inserts a one-second gap at the start, middle, and end', () => {
    for (const rate of [44100, 48000]) {
      const before = ramp(32)
      const gap = silenceFrameCount(rate)
      for (const atSec of [0, 0.5, 1]) {
        const length = before.length
        const at = insertFrameForTime(atSec * (length / rate), rate, length)
        const next = insertSilence([before], at, gap)
        expect(next).toHaveLength(1)
        expect(next[0]!.length).toBe(length + gap)
        for (let i = 0; i < gap; i++) expect(next[0]![at + i]).toBe(0)
        for (let i = 0; i < at; i++) expect(next[0]![i]).toBe(before[i])
        for (let i = at; i < length; i++) expect(next[0]![i + gap]).toBe(before[i])
      }
    }
  })

  it('keeps mono and stereo channel structure', () => {
    const mono = insertSilence([ramp(8)], 3, silenceFrameCount(48000))
    expect(mono).toHaveLength(1)
    expect(mono[0]!.length).toBe(8 + 48000)

    const left = ramp(8, 1)
    const right = ramp(8, -1)
    const stereo = insertSilence([left, right], 4, 48000)
    expect(stereo).toHaveLength(2)
    expect(stereo[0]!.length).toBe(stereo[1]!.length)
    expect(stereo[0]![0]).toBe(left[0])
    expect(stereo[1]![0]).toBe(right[0])
    expect(stereo[0]![4]).toBe(0)
    expect(stereo[1]![4]).toBe(0)
    expect(stereo[0]![4 + 48000]).toBe(left[4])
    expect(stereo[1]![4 + 48000]).toBe(right[4])
  })
})

describe('timeline mapping', () => {
  const insert = { kind: 'insert' as const, atSec: 1, deltaSec: 1 }

  it('shifts later automation, markers, and selection with the audio', () => {
    const doc = {
      selectedParamId: 'gain' as const,
      lanes: [
        {
          paramId: 'gain' as const,
          nodes: [
            { id: 'early', time: 0.25, value: 0.2 },
            { id: 'cut', time: 1, value: 0.5 },
            { id: 'late', time: 1.5, value: 0.8 },
          ],
        },
      ],
    }
    const moved = mapAutomation(doc, insert)
    expect(moved.lanes[0]!.nodes.map((node) => node.time)).toEqual([0.25, 2, 2.5])
    expect(mapMarkerTimes([0.2, 1, 2.2], insert)).toEqual([0.2, 2, 3.2])
    expect(mapRange(0.2, 0.8, insert)).toEqual({ start: 0.2, end: 0.8 })
    expect(mapRange(1.2, 1.8, insert)).toEqual({ start: 2.2, end: 2.8 })
    expect(mapRange(0.4, 1.6, insert)).toEqual({ start: 0.4, end: 2.6 })
    expect(mapPlayhead(1.4, insert, 4)).toBe(1)
  })

  it('closes the gap and drops automation that lived in the deleted audio', () => {
    const cut = { kind: 'delete' as const, startSec: 1, endSec: 2 }
    const doc = {
      selectedParamId: 'gain' as const,
      lanes: [
        {
          paramId: 'gain' as const,
          nodes: [
            { id: 'keep', time: 0.4, value: 0.2 },
            { id: 'gone', time: 1.2, value: 0.5 },
            { id: 'after', time: 2.5, value: 0.9 },
          ],
        },
      ],
    }
    const moved = mapAutomation(doc, cut)
    expect(moved.lanes[0]!.nodes.map((node) => [node.id, node.time])).toEqual([
      ['keep', 0.4],
      ['after', 1.5],
    ])
    expect(mapMarkerTimes([0.2, 1.4, 3], cut)).toEqual([0.2, 2])
    expect(mapPlayhead(0.3, cut, 3)).toBeCloseTo(0.3)
    expect(mapPlayhead(1.4, cut, 3)).toBeCloseTo(1)
    expect(mapPlayhead(2.5, cut, 3)).toBeCloseTo(1.5)
  })
})

describe('delete and clear selection', () => {
  it('removes the selected frames and shifts the tail left', () => {
    const rate = 100
    const left = ramp(100, 1)
    const right = ramp(100, 0.5)
    const span = deleteFrameSpan(0.25, 0.5, rate, 100)
    expect(span).toEqual({ start: 25, end: 50 })
    const removed = deleteFrameRange([left, right], span!.start, span!.end)!
    expect(removed).toHaveLength(2)
    expect(removed[0]!.length).toBe(100 - (span!.end - span!.start))
    expect(removed[0]!.subarray(0, span!.start)).toEqual(left.subarray(0, span!.start))
    expect(removed[0]!.subarray(span!.start)).toEqual(left.subarray(span!.end))
    expect(removed[1]!.subarray(span!.start)).toEqual(right.subarray(span!.end))
  })

  it('refuses to delete the entire buffer and can clear only a partial selection', () => {
    expect(deleteFrameSpan(0, 1, 44100, 44100)).toBeNull()
    expect(canDeleteSampleSelection(0, 1, 44100, 44100)).toBe(false)
    expect(canDeleteSampleSelection(0.2, 0.5, 44100, 44100)).toBe(true)
    expect(canClearSampleSelection(0, 2, 2)).toBe(false)
    expect(canClearSampleSelection(0.2, 0.8, 2)).toBe(true)
    expect(canClearSampleSelection(0, 0, 2)).toBe(false)
  })
})

describe('mute selection', () => {
  it('zeros only the selected frames in every channel and keeps the length', () => {
    const rate = 1000
    const left = ramp(100, 1)
    const right = ramp(100, -1)
    const span = muteFrameSpan(0.02, 0.05, rate, 100)
    expect(span).toEqual({ start: 20, end: 50 })
    const muted = muteFrameRange([left, right], span!.start, span!.end)!
    expect(muted).toHaveLength(2)
    expect(muted[0]!.length).toBe(100)
    expect(muted[1]!.length).toBe(100)
    expect(Array.from(muted[0]!.subarray(0, 20))).toEqual(Array.from(left.subarray(0, 20)))
    expect(Array.from(muted[0]!.subarray(50))).toEqual(Array.from(left.subarray(50)))
    expect(Array.from(muted[1]!.subarray(0, 20))).toEqual(Array.from(right.subarray(0, 20)))
    expect(Array.from(muted[1]!.subarray(50))).toEqual(Array.from(right.subarray(50)))
    for (let i = 20; i < 50; i++) {
      expect(muted[0]![i]).toBe(0)
      expect(muted[1]![i]).toBe(0)
    }
  })

  it('covers the start and the end without spilling past the selection', () => {
    const rate = 48000
    const length = 48000
    const head = muteFrameSpan(0, 0.01, rate, length)
    expect(head).toEqual({ start: 0, end: 480 })
    const tail = muteFrameSpan((length - 480) / rate, length / rate, rate, length)
    expect(tail).toEqual({ start: length - 480, end: length })
    const whole = muteFrameSpan(0, length / rate, rate, length)
    expect(whole).toEqual({ start: 0, end: length })
  })

  it('does not mute a sample that only partly overlaps the selection', () => {
    const rate = 1000
    const span = muteFrameSpan(10.4 / rate, 20.6 / rate, rate, 100)
    expect(span).toEqual({ start: 11, end: 20 })
    const source = ramp(100)
    const muted = muteFrameRange([source], span!.start, span!.end)!
    expect(muted[0]![10]).toBe(source[10])
    expect(muted[0]![11]).toBe(0)
    expect(muted[0]![19]).toBe(0)
    expect(muted[0]![20]).toBe(source[20])
    expect(muted[0]!.length).toBe(source.length)
  })

  it('refuses an empty range and allows a full-buffer mute', () => {
    expect(muteFrameSpan(0.2, 0.2, 48000, 48000)).toBeNull()
    expect(canMuteSampleSelection(0.2, 0.2, 48000, 48000)).toBe(false)
    expect(canMuteSampleSelection(0, 1, 48000, 48000)).toBe(true)
    expect(canDeleteSampleSelection(0, 1, 48000, 48000)).toBe(false)
  })
})

describe('sample edit history', () => {
  it('records one undo step for one insertion', () => {
    type State = { pcmId: number; end: number; auto: number }
    const eq = (a: State, b: State) => a.pcmId === b.pcmId && a.end === b.end && a.auto === b.auto
    let history = createHistory<State>({ pcmId: 1, end: 2, auto: 1.2 })
    const before = history.present
    const after = { pcmId: 2, end: 3, auto: 2.2 }
    history = commitHistory({ ...history, present: before }, after, eq)
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    expect(history.present).toEqual(before)
    history = redoHistory(history)
    expect(history.present).toEqual(after)
  })
})

describe('default automation stays importable', () => {
  it('maps an empty document', () => {
    expect(mapAutomation(defaultAutomation(), { kind: 'insert', atSec: 0, deltaSec: 1 }).lanes).toEqual([])
  })
})
