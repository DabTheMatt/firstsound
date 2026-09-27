import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { silenceFrameCount, snapshotFromCapture } from './sampleEdit'

function tone(channels: number, sampleRate: number, seconds: number): Float32Array[] {
  const frames = Math.round(seconds * sampleRate)
  return Array.from({ length: channels }, (_, ch) => {
    const data = new Float32Array(frames)
    data.fill(ch === 0 ? 0.4 : -0.25)
    return data
  })
}

describe('destructive sample edits', () => {
  it('inserts one second at the start, middle, and end for mono and stereo', () => {
    for (const channels of [1, 2]) {
      for (const rate of [44100, 48000]) {
        for (const where of ['start', 'middle', 'end'] as const) {
          const engine = new AudioEngine()
          const source = tone(channels, rate, 0.25)
          expect(engine.loadPcm(source, rate)).toBe(true)
          const loaded = engine.getBuffer()!
          expect(loaded.numberOfChannels).toBe(channels)
          expect(loaded.sampleRate).toBe(rate)
          expect(loaded.length).toBe(source[0]!.length)
          engine.addAutomationNode(0.04, 0.2)
          engine.addAutomationNode(0.2, 0.9)
          engine.setScrubMode('sample')
          const at = where === 'start' ? 0 : where === 'end' ? loaded.duration : loaded.duration / 2
          engine.seekSeconds(at)
          const playhead = engine.getPlayheadSeconds()
          const armed = engine.captureSampleEdit()!
          expect(engine.insertSilenceAtPlayhead()).toBe(true)
          const buffer = engine.getBuffer()!
          const gap = silenceFrameCount(rate)
          const atFrame = Math.round(playhead * rate)
          expect(buffer.sampleRate).toBe(rate)
          expect(buffer.numberOfChannels).toBe(channels)
          expect(buffer.length).toBe(loaded.length + gap)
          for (let ch = 0; ch < channels; ch++) {
            const data = buffer.getChannelData(ch)
            expect(data[atFrame]).toBe(0)
            expect(data[atFrame + Math.floor(gap / 2)]).toBe(0)
            expect(data[atFrame + gap - 1]).toBe(0)
            if (atFrame > 0) expect(data[0]).toBeCloseTo(source[ch]![0]!, 6)
            if (atFrame < loaded.length) expect(data[atFrame + gap]).toBeCloseTo(source[ch]![atFrame]!, 6)
          }
          expect(engine.getPlayheadSeconds()).toBeCloseTo(atFrame / rate, 5)
          expect(buffer.duration).toBeCloseTo(loaded.duration + 1, 5)
          const nodes = engine.getSnapshot().automation.lanes[0]!.nodes
          const early = nodes.find((node) => Math.abs(node.value - 0.2) < 1e-6)
          const late = nodes.find((node) => Math.abs(node.value - 0.9) < 1e-6)
          expect(early!.time).toBeCloseTo(0.04 >= playhead ? 1.04 : 0.04, 4)
          expect(late!.time).toBeCloseTo(0.2 >= playhead ? 1.2 : 0.2, 4)

          engine.restoreSamplePcm(snapshotFromCapture(armed))
          engine.setRegion(armed.start, armed.end)
          expect(engine.getBuffer()!.length).toBe(armed.channels[0]!.length)
          expect(engine.getBuffer()!.sampleRate).toBe(rate)
          expect(engine.getBuffer()!.getChannelData(0)[10]).toBeCloseTo(armed.channels[0]![10]!, 6)
          expect(engine.getPlayheadSeconds()).toBeCloseTo(armed.playhead, 4)
        }
      }
    }
  })

  it('deletes a selection, supports undo and redo, and clear leaves the audio alone', () => {
    const engine = new AudioEngine()
    const source = tone(2, 48000, 0.4)
    expect(engine.loadPcm(source, 48000)).toBe(true)
    const loaded = engine.getBuffer()!
    engine.setRegion(0.1, 0.25)
    const beforeDelete = engine.captureSampleEdit()!
    expect(engine.getSnapshot().canDeleteSelection).toBe(true)
    expect(engine.getSnapshot().canClearSelection).toBe(true)
    expect(engine.deleteSampleSelection()).toBe(true)
    const deleted = engine.getBuffer()!
    expect(deleted.numberOfChannels).toBe(2)
    expect(deleted.sampleRate).toBe(48000)
    expect(deleted.length).toBe(loaded.length - Math.round(0.15 * 48000))
    expect(deleted.getChannelData(0)[0]).toBeCloseTo(0.4, 6)
    expect(deleted.getChannelData(1)[Math.round(0.1 * 48000)]).toBeCloseTo(-0.25, 6)
    expect(engine.getSnapshot().canDeleteSelection).toBe(false)

    const afterDelete = engine.captureSampleEdit()!
    engine.restoreSamplePcm(snapshotFromCapture(beforeDelete))
    engine.setRegion(beforeDelete.start, beforeDelete.end)
    expect(engine.getBuffer()!.length).toBe(loaded.length)
    expect(engine.getBuffer()!.getChannelData(0)[20]).toBeCloseTo(0.4, 6)

    engine.restoreSamplePcm(snapshotFromCapture(afterDelete))
    expect(engine.getBuffer()!.length).toBe(deleted.length)

    engine.setRegion(0.05, 0.12)
    const untouched = Float32Array.from(engine.getBuffer()!.getChannelData(0))
    const other = Float32Array.from(engine.getBuffer()!.getChannelData(1))
    expect(engine.clearSampleSelection()).toBe(true)
    expect(Array.from(engine.getBuffer()!.getChannelData(0))).toEqual(Array.from(untouched))
    expect(Array.from(engine.getBuffer()!.getChannelData(1))).toEqual(Array.from(other))
    expect(engine.getSnapshot().params.start).toBeCloseTo(0, 5)
    expect(engine.getSnapshot().params.end).toBeCloseTo(engine.getBuffer()!.duration, 5)
    expect(engine.getSnapshot().canClearSelection).toBe(false)
    expect(engine.getSnapshot().canInsertSilence).toBe(true)
  })
})
