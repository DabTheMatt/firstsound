import { describe, expect, it } from 'vitest'
import { fadeGain } from './fade'
import { createHistory, commit, undo, redo, live, canUndo } from './history'
import { detectSilence, peakAmplitude, removeDc } from './prepare'
import { renderPrep } from './render'
import { resampleChannel } from './resample'
import { autoFadeSeconds, defaultPrep } from './state'
import type { Pcm, SamplePrepState } from './types'
import { nextVariationName } from './variations'
import { encodeWav, exportFileName } from './wav'
import { findZeroCrossing } from './zeroCrossing'

function sinePcm(freq: number, seconds: number, sampleRate = 1000, amp = 0.5): Pcm {
  const n = Math.floor(seconds * sampleRate)
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * amp
  return { sampleRate, channels: [ch] }
}

describe('autoFadeSeconds', () => {
  it('keeps short transients short and falls back near 10 ms', () => {
    expect(autoFadeSeconds(0.4)).toBeCloseTo(0.005)
    expect(autoFadeSeconds(4)).toBeCloseTo(0.01)
    expect(autoFadeSeconds(20)).toBeCloseTo(0.018)
    expect(autoFadeSeconds(90)).toBeCloseTo(0.025)
    expect(autoFadeSeconds(4, true)).toBeCloseTo(0.005)
  })
})

describe('fadeGain', () => {
  it('starts at 0 and ends at 1 for every named curve', () => {
    for (const curve of ['linear', 'equalPower', 'exponential', 'sCurve'] as const) {
      expect(fadeGain(0, curve)).toBeCloseTo(0)
      expect(fadeGain(1, curve)).toBeCloseTo(1)
    }
  })

  it('equal-power is above linear in the middle', () => {
    expect(fadeGain(0.5, 'equalPower')).toBeGreaterThan(fadeGain(0.5, 'linear'))
  })
})

describe('zero crossing', () => {
  it('prefers a nearby quiet crossing over a distant loud one', () => {
    const sr = 1000
    const ch = new Float32Array(200)
    // Loud crossing far from the cursor (sample 20: + to -)
    ch[19] = 0.9
    ch[20] = -0.9
    // Quiet crossing near the cursor (sample 100)
    ch[99] = 0.01
    ch[100] = -0.008
    const hit = findZeroCrossing([ch], sr, 0.1, 0.09, 0.05)
    expect(hit?.index).toBeGreaterThanOrEqual(99)
    expect(hit?.index).toBeLessThanOrEqual(101)
    expect(hit?.far).toBe(false)
  })

  it('marks a far snap so the UI can warn instead of jumping silently', () => {
    const sr = 1000
    const ch = new Float32Array(200)
    ch[10] = 0.02
    ch[11] = -0.02
    const hit = findZeroCrossing([ch], sr, 0.15, 0.2, 0.04)
    expect(hit?.far).toBe(true)
  })
})

describe('detectSilence', () => {
  it('proposes leading and trailing trim without mutating', () => {
    const ch = new Float32Array(1000)
    for (let i = 200; i < 800; i++) ch[i] = 0.2
    const original = ch[200]
    const proposal = detectSilence([ch], 1000, 0.05)
    expect(proposal?.startSec).toBeCloseTo(0.2, 2)
    expect(proposal?.endSec).toBeCloseTo(0.8, 2)
    expect(ch[200]).toBe(original)
  })
})

describe('removeDc / peak', () => {
  it('subtracts the mean and reports peak', () => {
    const ch = new Float32Array([0.2, 0.4, 0.6])
    const [out] = removeDc([ch])
    const mean = (out!.reduce((a, b) => a + b, 0) / out!.length)
    expect(mean).toBeCloseTo(0, 8)
    expect(peakAmplitude([new Float32Array([-0.5, 0.25])])).toBeCloseTo(0.5)
  })
})

describe('renderPrep pipeline', () => {
  it('slices, reverses, peak-normalizes to -1 dBFS, then fades', () => {
    const source = sinePcm(10, 1, 1000, 0.5)
    const state: SamplePrepState = {
      ...defaultPrep(1),
      selectionStart: 0.1,
      selectionEnd: 0.4,
      reverse: true,
      normalize: true,
      normalizeTargetDbfs: -1,
      fadeInEnabled: true,
      fadeOutEnabled: true,
      fadeInSec: 0.02,
      fadeOutSec: 0.02,
      fadeInCurve: 'linear',
      fadeOutCurve: 'linear',
      fadeInBend: 0.5,
      fadeOutBend: 0.5,
    }
    const out = renderPrep(source, state, {
      applyFades: true,
      applyGain: false,
      applyReverse: true,
      applyNormalize: true,
      applyDc: false,
      applyChannels: false,
      sampleRate: 'original',
    })
    expect(out.channels[0]!.length).toBe(300)
    expect(out.channels[0]![0]).toBeCloseTo(0, 5)
    expect(out.channels[0]![299]).toBeCloseTo(0, 5)
    const mid = out.channels[0]![150]!
    const target = 10 ** (-1 / 20)
    expect(Math.abs(mid)).toBeLessThanOrEqual(target + 0.02)
  })

  it('does not upsample when sampleRate is original', () => {
    const source = sinePcm(5, 0.2, 800, 0.3)
    const out = renderPrep(source, defaultPrep(0.2), {
      applyFades: false,
      applyGain: false,
      applyReverse: false,
      applyNormalize: false,
      applyDc: false,
      applyChannels: false,
      sampleRate: 'original',
    })
    expect(out.sampleRate).toBe(800)
  })
})

describe('resampleChannel', () => {
  it('changes length proportionally', () => {
    const input = new Float32Array(100)
    input[50] = 1
    const out = resampleChannel(input, 100, 200)
    expect(out.length).toBe(200)
  })
})

describe('encodeWav', () => {
  it('writes a valid RIFF/WAVE header for 24-bit PCM', () => {
    const pcm: Pcm = { sampleRate: 48000, channels: [new Float32Array(10)] }
    const buf = encodeWav(pcm, 24)
    const view = new DataView(buf)
    const ascii = (o: number, n: number) =>
      String.fromCharCode(...new Uint8Array(buf.slice(o, o + n)))
    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint16(34, true)).toBe(24)
  })
})

describe('exportFileName', () => {
  it('does not overwrite the source name', () => {
    expect(exportFileName('forest_recording.wav', true)).toBe('forest_recording_trim.wav')
    expect(exportFileName('forest_recording.wav', false)).toBe('forest_recording_prep.wav')
    expect(exportFileName('forest_recording.wav', true, 'birds_01')).toBe('birds_01.wav')
  })
})

describe('history', () => {
  it('commits whole gestures, not live frames', () => {
    let h = createHistory({ n: 0 })
    h = live(h, { n: 1 })
    h = live(h, { n: 2 })
    expect(canUndo(h)).toBe(false)
    h = commit(h, { n: 2 }, (a, b) => a.n === b.n)
    expect(h.current.n).toBe(2)
    h = commit(h, { n: 3 }, (a, b) => a.n === b.n)
    h = undo(h)
    expect(h.current.n).toBe(2)
    h = redo(h)
    expect(h.current.n).toBe(3)
  })
})

describe('nextVariationName', () => {
  it('numbers clips from one source without colliding', () => {
    expect(nextVariationName('forest.wav', [])).toBe('forest_01')
    expect(nextVariationName('forest.wav', ['forest_01'])).toBe('forest_02')
  })
})
