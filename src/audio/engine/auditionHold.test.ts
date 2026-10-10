import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { auditionWindow } from './auditionHold'

describe('audition window', () => {
  it('ends at the playhead so the loop is the sound already on the EQ', () => {
    const window = auditionWindow(3, 10)
    expect(window).toEqual({ start: 1.75, end: 3, resumeAt: 2.98 })
  })

  it('stays on the sounded fragment at the end of the sample', () => {
    const window = auditionWindow(9.9, 10)
    expect(window?.start).toBeCloseTo(8.65)
    expect(window?.end).toBeCloseTo(9.9)
    expect(window?.resumeAt).toBeGreaterThan(window!.start)
    expect(window?.resumeAt).toBeLessThanOrEqual(window!.end)
    expect(window?.end).toBeLessThan(10)
  })

  it('uses the whole sample when it is shorter than the fragment', () => {
    const window = auditionWindow(0.1, 0.4)
    expect(window?.start).toBe(0)
    expect(window?.end).toBeCloseTo(0.4)
  })

  it('returns nothing for an empty buffer', () => {
    expect(auditionWindow(0, 0)).toBeNull()
  })
})

describe('pause and hold', () => {
  it('loops a fragment without moving the selection, then plays on from that place', async () => {
    const host = window as Window & { setTimeout?: typeof setTimeout; clearTimeout?: typeof clearTimeout }
    host.setTimeout = setTimeout
    host.clearTimeout = clearTimeout
    const engine = new AudioEngine()
    const id = engine.getSnapshot().tracks[0]!.id
    expect(engine.loadTrackPcm(id, [new Float32Array(44100 * 8)], 44100)).toBe(true)
    engine.seekSeconds(3)
    engine.setLoop(false)
    const start = engine.getSnapshot().params.start
    engine.holdAudition(true)
    expect(engine.getPlayheadSeconds()).toBeCloseTo(1.75, 1)
    expect(engine.getSnapshot().loop).toBe(true)
    expect(engine.getSnapshot().params.start).toBe(start)
    engine.holdAudition(false)
    expect(engine.getPlayheadSeconds()).toBeCloseTo(3, 1)
    expect(engine.getSnapshot().loop).toBe(false)
    expect(engine.getSnapshot().params.start).toBe(start)
    await Promise.resolve()
    engine.stop()
  })
})
