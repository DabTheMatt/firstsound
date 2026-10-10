import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { auditionWindow } from './auditionHold'

describe('audition window', () => {
  it('starts at the playhead and keeps a short fragment', () => {
    const window = auditionWindow(3, 10)
    expect(window).toEqual({ start: 3, end: 4.25, resumeAt: 3 })
  })

  it('slides back at the end of the sample and still resumes inside the fragment', () => {
    const window = auditionWindow(9.9, 10)
    expect(window?.start).toBeCloseTo(8.75)
    expect(window?.end).toBeCloseTo(10)
    expect(window?.resumeAt).toBeGreaterThan(window!.start)
    expect(window?.resumeAt).toBeLessThan(window!.end)
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
    expect(engine.getPlayheadSeconds()).toBeCloseTo(3, 1)
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
