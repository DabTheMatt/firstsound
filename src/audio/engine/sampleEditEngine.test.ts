import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { PLAYHEAD_NUDGE_COARSE_SEC, PLAYHEAD_NUDGE_SEC } from './playheadNudge'
import { measureSpectrumDb, SPECTRUM_ANALYSIS_FFT } from './spectrumFft'
import { SPECTRUM_FLOOR_DB } from './spectrumBands'
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

  it('nudges the playhead by fixed steps and clamps to the sample without starting playback', () => {
    const engine = new AudioEngine()
    const source = tone(1, 48000, 1)
    expect(engine.loadPcm(source, 48000)).toBe(true)
    engine.setScrubMode('region')
    engine.setRegion(0.2, 0.4)
    engine.seekSeconds(0, 'sample')
    expect(engine.getSnapshot().playing).toBe(false)

    engine.nudgePlayhead(-PLAYHEAD_NUDGE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBe(0)
    expect(engine.getSnapshot().playing).toBe(false)

    engine.seekSeconds(0.5, 'sample')
    engine.nudgePlayhead(-PLAYHEAD_NUDGE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBeCloseTo(0.5 - PLAYHEAD_NUDGE_SEC, 6)
    engine.nudgePlayhead(PLAYHEAD_NUDGE_COARSE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBeCloseTo(0.5 - PLAYHEAD_NUDGE_SEC + PLAYHEAD_NUDGE_COARSE_SEC, 6)

    engine.seekSeconds(0.25, 'sample')
    engine.nudgePlayhead(-PLAYHEAD_NUDGE_COARSE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBeCloseTo(0.15, 6)

    const duration = engine.getBuffer()!.duration
    engine.seekSeconds(duration, 'sample')
    engine.nudgePlayhead(PLAYHEAD_NUDGE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBeCloseTo(duration, 6)
    engine.nudgePlayhead(-PLAYHEAD_NUDGE_COARSE_SEC, 'sample')
    expect(engine.getPlayheadSeconds()).toBeCloseTo(duration - PLAYHEAD_NUDGE_COARSE_SEC, 6)
    expect(engine.getSnapshot().playing).toBe(false)
  })
})

function sine(channels: number, sampleRate: number, seconds: number, freq = 440): Float32Array[] {
  const frames = Math.round(seconds * sampleRate)
  return Array.from({ length: channels }, (_, ch) => {
    const data = new Float32Array(frames)
    const amp = ch === 0 ? 0.5 : 0.35
    for (let i = 0; i < frames; i++) data[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate)
    return data
  })
}

function spectrumPeak(data: Float32Array): number {
  const bins = new Float32Array(SPECTRUM_ANALYSIS_FFT / 2)
  measureSpectrumDb(data, bins, { window: null, real: null, imag: null })
  let peak = SPECTRUM_FLOOR_DB
  for (let i = 0; i < bins.length; i++) peak = Math.max(peak, bins[i] ?? SPECTRUM_FLOOR_DB)
  return peak
}

describe('mute selection', () => {
  it('zeros the selection in mono and stereo at the start, middle, and end', async () => {
    for (const channels of [1, 2]) {
      for (const where of ['start', 'middle', 'end'] as const) {
        const engine = new AudioEngine()
        const rate = 48000
        const source = sine(channels, rate, 0.5)
        expect(engine.loadPcm(source, rate)).toBe(true)
        const loaded = engine.getBuffer()!
        const duration = loaded.duration
        const spanSec = 0.08
        const start = where === 'start' ? 0 : where === 'end' ? duration - spanSec : duration / 2 - spanSec / 2
        const end = start + spanSec
        engine.setRegion(start, end)
        engine.addAutomationNode(0.05, 0.2)
        engine.addAutomationNode(0.4, 0.8)
        engine.markSampleTransients()
        const beforeNodes = engine.getSnapshot().automation.lanes[0]!.nodes.map((node) => node.time)
        const beforeMarks = engine.getSnapshot().transients.slice()
        const before = engine.captureSampleEdit()!
        expect(engine.getSnapshot().canMuteSelection).toBe(true)
        expect(engine.getSnapshot().playing).toBe(false)
        expect(engine.muteSampleSelection()).toBe(true)

        const muted = engine.getBuffer()!
        expect(muted.numberOfChannels).toBe(channels)
        expect(muted.sampleRate).toBe(rate)
        expect(muted.length).toBe(loaded.length)
        expect(muted.duration).toBeCloseTo(duration, 8)
        const frameStart = Math.round(start * rate)
        const frameEnd = Math.round(end * rate)
        for (let ch = 0; ch < channels; ch++) {
          const data = muted.getChannelData(ch)
          for (let i = frameStart; i < frameEnd; i++) expect(data[i]).toBe(0)
          if (frameStart > 0) expect(data[frameStart - 1]).toBeCloseTo(source[ch]![frameStart - 1]!, 6)
          if (frameEnd < data.length) expect(data[frameEnd]).toBeCloseTo(source[ch]![frameEnd]!, 6)
        }
        expect(engine.getSnapshot().params.start).toBeCloseTo(start, 6)
        expect(engine.getSnapshot().params.end).toBeCloseTo(end, 6)
        expect(engine.getSnapshot().automation.lanes[0]!.nodes.map((node) => node.time)).toEqual(beforeNodes)
        expect(engine.getSnapshot().transients).toEqual(beforeMarks)
        expect(engine.getSnapshot().playing).toBe(false)

        const window = SPECTRUM_ANALYSIS_FFT
        const mid = frameStart + Math.floor((frameEnd - frameStart) / 2) - Math.floor(window / 2)
        const silent = muted.getChannelData(0).subarray(Math.max(0, mid), Math.max(0, mid) + window)
        expect(silent.length).toBe(window)
        expect(spectrumPeak(silent)).toBe(SPECTRUM_FLOOR_DB)
        const outsideAt = where === 'end' ? 0 : loaded.length - window
        const outside = source[0]!.subarray(outsideAt, outsideAt + window)
        expect(spectrumPeak(muted.getChannelData(0).subarray(outsideAt, outsideAt + window))).toBeGreaterThan(-40)
        expect(spectrumPeak(outside)).toBeGreaterThan(-40)

        const after = engine.captureSampleEdit()!
        engine.restoreSamplePcm(snapshotFromCapture(before))
        engine.setRegion(before.start, before.end)
        engine.replaceAutomation(before.automation)
        expect(engine.getBuffer()!.length).toBe(loaded.length)
        expect(engine.getBuffer()!.getChannelData(0)[frameStart]).toBeCloseTo(source[0]![frameStart]!, 5)
        expect(engine.getSnapshot().params.start).toBeCloseTo(start, 6)

        engine.restoreSamplePcm(snapshotFromCapture(after))
        engine.setRegion(after.start, after.end)
        expect(engine.getBuffer()!.getChannelData(0)[frameStart + 10]).toBe(0)
        expect(engine.getBuffer()!.length).toBe(loaded.length)

        const exported = await engine.exportWav({
          name: 'muted',
          sampleRate: 'original',
          bitDepth: 24,
          applyFades: false,
          applyGain: false,
          applyReverse: false,
          applyNormalize: false,
          scope: 'project',
        })
        expect(exported).not.toBeNull()
        expect(exported!.duration).toBeCloseTo(duration, 4)
        const pcm = decodeWav24(await exported!.blob.arrayBuffer())
        expect(pcm.sampleRate).toBe(rate)
        expect(pcm.channels).toBe(channels)
        expect(pcm.frames).toBe(loaded.length)
        const probe = frameStart + Math.floor((frameEnd - frameStart) / 2)
        expect(pcm.sample(0, probe)).toBe(0)
        if (channels > 1) expect(pcm.sample(1, probe)).toBe(0)
        if (frameStart > 8) expect(Math.abs(pcm.sample(0, 4))).toBeGreaterThan(0.01)
        if (frameEnd < loaded.length - 8) {
          expect(Math.abs(pcm.sample(0, loaded.length - 4))).toBeGreaterThan(0.01)
        }
      }
    }
  })
})

function decodeWav24(buffer: ArrayBuffer): {
  sampleRate: number
  channels: number
  frames: number
  sample: (channel: number, frame: number) => number
} {
  const view = new DataView(buffer)
  const channels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)
  const dataBytes = view.getUint32(40, true)
  const frames = dataBytes / (channels * 3)
  const sample = (channel: number, frame: number) => {
    const offset = 44 + (frame * channels + channel) * 3
    let v = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16)
    if (v & 0x800000) v |= ~0xffffff
    return v / 8388607
  }
  return { sampleRate, channels, frames, sample }
}
