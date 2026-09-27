import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../../app/history'
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

describe('copy cut paste', () => {
  it('copies without changing audio, then cuts and pastes as single undo steps', () => {
    const engine = new AudioEngine()
    const rate = 48000
    const source = tone(2, rate, 0.5)
    expect(engine.loadPcm(source, rate)).toBe(true)
    engine.setScrubMode('sample')
    engine.setRegion(0.1, 0.25)
    engine.addAutomationNode(0.05, 0.2)
    engine.addAutomationNode(0.4, 0.9)
    const seeded = engine.captureSampleEdit()!
    engine.restoreSamplePcm({
      ...snapshotFromCapture(seeded),
      transients: [0.02, 0.15, 0.4],
    })
    engine.setRegion(0.1, 0.25)
    engine.replaceAutomation(seeded.automation)
    const original = Float32Array.from(engine.getBuffer()!.getChannelData(0))
    const before = engine.captureSampleEdit()!
    expect(engine.getSnapshot().canCopySelection).toBe(true)
    expect(engine.copySampleSelection()).toBe(true)
    expect(engine.getBuffer()!.length).toBe(original.length)
    expect(engine.getBuffer()!.getChannelData(0)[1000]).toBeCloseTo(original[1000]!, 6)
    expect(engine.getBuffer()!.getChannelData(1)[1000]).toBeCloseTo(-0.25, 6)
    expect(engine.getSnapshot().automation.lanes[0]!.nodes.map((node) => node.time)).toEqual([0.05, 0.4])
    expect(engine.getSnapshot().transients).toEqual([0.02, 0.15, 0.4])
    expect(engine.getSnapshot().canPaste).toBe(true)

    expect(engine.cutSampleSelection()).toBe(true)
    const cut = engine.getBuffer()!
    const removed = Math.round(0.15 * rate)
    expect(cut.numberOfChannels).toBe(2)
    expect(cut.sampleRate).toBe(rate)
    expect(cut.length).toBe(original.length - removed)
    expect(cut.getChannelData(0)[Math.round(0.1 * rate)]).toBeCloseTo(original[Math.round(0.25 * rate)]!, 5)
    expect(engine.getSnapshot().transients.map((time) => Number(time.toFixed(4)))).toEqual([0.02, 0.25])
    const nodes = engine.getSnapshot().automation.lanes[0]!.nodes.map((node) => node.time)
    expect(nodes).toContain(0.05)
    expect(nodes.some((time) => Math.abs(time - 0.25) < 1e-4)).toBe(true)
    expect(nodes.some((time) => Math.abs(time - 0.4) < 1e-3)).toBe(false)

    const afterCut = engine.captureSampleEdit()!
    type Step = { pcmId: number; length: number }
    const eq = (a: Step, b: Step) => a.pcmId === b.pcmId
    const beforeStep = { pcmId: snapshotFromCapture(before).id, length: original.length }
    const afterStep = { pcmId: snapshotFromCapture(afterCut).id, length: cut.length }
    let history = commitHistory(
      { ...createHistory(beforeStep), present: beforeStep },
      afterStep,
      eq,
    )
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    engine.restoreSamplePcm(snapshotFromCapture(before))
    engine.setRegion(before.start, before.end)
    engine.replaceAutomation(before.automation)
    expect(engine.getBuffer()!.length).toBe(original.length)
    expect(engine.getBuffer()!.getChannelData(0)[5000]).toBeCloseTo(original[5000]!, 6)
    history = redoHistory(history)
    engine.restoreSamplePcm(snapshotFromCapture(afterCut))
    expect(engine.getBuffer()!.length).toBe(cut.length)
    expect(history.present.length).toBe(cut.length)

    engine.seekSeconds(0.1)
    const beforePaste = engine.captureSampleEdit()!
    expect(engine.pasteAtPlayhead()).toBe(true)
    const restored = engine.getBuffer()!
    expect(restored.length).toBe(original.length)
    expect(restored.getChannelData(0)[5000]).toBeCloseTo(original[5000]!, 5)
    expect(restored.getChannelData(1)[5000]).toBeCloseTo(-0.25, 5)
    const pasteStep = { pcmId: snapshotFromCapture(engine.captureSampleEdit()!).id, length: restored.length }
    const pasteHistory = commitHistory(
      { ...createHistory({ pcmId: snapshotFromCapture(beforePaste).id, length: cut.length }), present: { pcmId: 1, length: cut.length } },
      pasteStep,
      eq,
    )
    expect(pasteHistory.past).toHaveLength(1)
    expect(engine.getPlayheadSeconds()).toBeCloseTo(0.1, 4)
  })

  it('pastes at the beginning, middle, and end and shifts later automation and markers', () => {
    for (const where of ['start', 'middle', 'end'] as const) {
      const engine = new AudioEngine()
      const rate = 48000
      const source = tone(2, rate, 0.5)
      expect(engine.loadPcm(source, rate)).toBe(true)
      engine.setScrubMode('sample')
      engine.setRegion(0.1, 0.2)
      engine.addAutomationNode(0.05, 0.2)
      engine.addAutomationNode(0.4, 0.9)
      const seeded = engine.captureSampleEdit()!
      engine.restoreSamplePcm({ ...snapshotFromCapture(seeded), transients: [0.02, 0.45] })
      engine.setRegion(0.1, 0.2)
      engine.replaceAutomation(seeded.automation)
      expect(engine.copySampleSelection()).toBe(true)
      const duration = engine.getBuffer()!.duration
      const at = where === 'start' ? 0 : where === 'end' ? duration : 0.25
      engine.seekSeconds(at)
      const playhead = engine.getPlayheadSeconds()
      const beforeLen = engine.getBuffer()!.length
      expect(engine.pasteAtPlayhead()).toBe(true)
      const pasted = engine.getBuffer()!
      const clipFrames = Math.round(0.1 * rate)
      const atFrame = Math.round(playhead * rate)
      expect(pasted.numberOfChannels).toBe(2)
      expect(pasted.sampleRate).toBe(rate)
      expect(pasted.length).toBe(beforeLen + clipFrames)
      expect(pasted.duration).toBeCloseTo(duration + clipFrames / rate, 5)
      for (let i = 0; i < 8; i++) {
        expect(pasted.getChannelData(0)[atFrame + i]).toBeCloseTo(0.4, 5)
        expect(pasted.getChannelData(1)[atFrame + i]).toBeCloseTo(-0.25, 5)
      }
      if (atFrame > 0) expect(pasted.getChannelData(0)[0]).toBeCloseTo(source[0]![0]!, 5)
      if (atFrame < beforeLen) expect(pasted.getChannelData(0)[atFrame + clipFrames]).toBeCloseTo(source[0]![atFrame]!, 5)
      expect(engine.getPlayheadSeconds()).toBeCloseTo(atFrame / rate, 5)
      const times = engine.getSnapshot().automation.lanes[0]!.nodes.map((node) => node.time)
      expect(times).toContainEqual(expect.closeTo(0.05 >= playhead ? 0.15 : 0.05, 4))
      expect(times).toContainEqual(expect.closeTo(0.4 >= playhead ? 0.5 : 0.4, 4))
      const marks = engine.getSnapshot().transients
      expect(marks[0]).toBeCloseTo(0.02 >= playhead ? 0.12 : 0.02, 4)
      expect(marks[1]).toBeCloseTo(0.45 >= playhead ? 0.55 : 0.45, 4)
    }
  })

  it('duplicates mono into stereo, mixes stereo into mono, and resamples to the destination rate', () => {
    const monoToStereo = new AudioEngine()
    expect(monoToStereo.loadPcm(tone(1, 48000, 0.2), 48000)).toBe(true)
    monoToStereo.setScrubMode('sample')
    monoToStereo.setRegion(0.05, 0.1)
    expect(monoToStereo.copySampleSelection()).toBe(true)
    expect(monoToStereo.loadPcm(tone(2, 48000, 0.2), 48000)).toBe(true)
    monoToStereo.setScrubMode('sample')
    monoToStereo.seekSeconds(0)
    expect(monoToStereo.pasteAtPlayhead()).toBe(true)
    const widened = monoToStereo.getBuffer()!
    const clipFrames = Math.round(0.05 * 48000)
    expect(widened.numberOfChannels).toBe(2)
    expect(widened.getChannelData(0)[0]).toBeCloseTo(0.4, 5)
    expect(widened.getChannelData(1)[0]).toBeCloseTo(0.4, 5)
    expect(widened.getChannelData(1)[clipFrames]).toBeCloseTo(-0.25, 5)
    expect(widened.length).toBe(Math.round(0.2 * 48000) + clipFrames)

    const resampled = new AudioEngine()
    expect(resampled.loadPcm(tone(2, 44100, 0.2), 44100)).toBe(true)
    resampled.setRegion(0.02, 0.07)
    expect(resampled.copySampleSelection()).toBe(true)
    const copiedFrames = Math.round(0.07 * 44100) - Math.round(0.02 * 44100)
    expect(resampled.loadPcm(tone(1, 48000, 0.3), 48000)).toBe(true)
    resampled.setScrubMode('sample')
    resampled.seekSeconds(0.1)
    expect(resampled.getSnapshot().canPaste).toBe(true)
    expect(resampled.pasteAtPlayhead()).toBe(true)
    const mixed = resampled.getBuffer()!
    const inserted = Math.round(copiedFrames * (48000 / 44100))
    const at = Math.round(0.1 * 48000)
    expect(mixed.numberOfChannels).toBe(1)
    expect(mixed.sampleRate).toBe(48000)
    expect(mixed.length).toBe(Math.round(0.3 * 48000) + inserted)
    expect(inserted).not.toBe(copiedFrames)
    expect(mixed.getChannelData(0)[0]).toBeCloseTo(0.4, 5)
    expect(mixed.getChannelData(0)[at]).toBeCloseTo(0.075, 3)
    expect(mixed.getChannelData(0)[at + inserted]).toBeCloseTo(0.4, 5)
  })

  it('refuses to cut the entire buffer and leaves the clipboard empty', () => {
    const engine = new AudioEngine()
    expect(engine.loadPcm(tone(1, 48000, 0.3), 48000)).toBe(true)
    const duration = engine.getBuffer()!.duration
    const length = engine.getBuffer()!.length
    engine.setRegion(0, duration)
    expect(engine.getSnapshot().canCopySelection).toBe(true)
    expect(engine.getSnapshot().canCutSelection).toBe(false)
    expect(engine.cutSampleSelection()).toBe(false)
    expect(engine.getBuffer()!.length).toBe(length)
    expect(engine.getSnapshot().canPaste).toBe(false)
    expect(engine.copySampleSelection()).toBe(true)
    expect(engine.getBuffer()!.length).toBe(length)
    expect(engine.getSnapshot().canPaste).toBe(true)
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
