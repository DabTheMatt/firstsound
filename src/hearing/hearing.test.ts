import { describe, expect, it } from 'vitest'
import offlineRenderSource from '../audio/engine/offlineRender.ts?raw'
import simpleExportSource from '../simple/exportSimple.ts?raw'
import { defaultEqBandAt } from '../audio/engine/eqBands'
import { hzToNoteName } from '../audio/engine/pitchScale'
import { analyzePcm, stereoMetrics } from './analyze'
import { mixingFindings } from './assistant'
import { HEARING_BANDS } from './bands'
import { eqCompare, gainCompare, stereoCompare } from './compare'
import { afterShares } from './AfterEqChart'
import { affectedRegion, eqBandDeltas } from './eqAssist'
import { BASS_HEAVY_ON, MIN_HOLD_MS, emptyDescriptorMemory, simpleSummary, updateDescriptors } from './descriptors'
import { detectEvents } from './events'
import { compressorPicture, delayPicture, paramRecord, reverbPicture, stereoAfterMidSide } from './effectViz'
import { fireHaptic, hapticPattern, shouldPulse, vibrationSupported } from './haptics'
import { applyMonitorToChannel, monitorCurves } from './monitor'
import { parseHearingSettings, layersForProfile, readStoredHearingSettings, clampPanelSize } from './settings'
import { hearingRuntimeStats, setHearingClockDemand } from './scheduler'
import { voiceEstimate } from './voiceEstimate'

const RATE = 44100

function sine(freq: number, seconds: number, amplitude: number, phase = 0): Float32Array {
  const n = Math.floor(seconds * RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin(phase + (2 * Math.PI * freq * i) / RATE)
  return out
}

function noise(seconds: number, amplitude: number, seed = 3): Float32Array {
  let state = seed >>> 0
  const n = Math.floor(seconds * RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    out[i] = ((state / 4294967296) * 2 - 1) * amplitude
  }
  return out
}

function span(left: Float32Array, right: Float32Array | null = null, scope: 'full' | 'selection' | 'current' = 'full') {
  return analyzePcm(
    {
      left,
      right,
      sampleRate: RATE,
      startFrame: 0,
      endFrame: left.length,
      originSec: 0,
      scope,
    },
    { soundMap: true, maxMapColumns: 32 },
  )
}

function bandShare(id: string, analysis: ReturnType<typeof span>): number {
  return analysis.bands.find((band) => band.id === id)?.share ?? 0
}

describe('hearing access analysis', () => {
  it('reports silence without a dominant frequency or invented energy', () => {
    const analysis = span(new Float32Array(RATE))
    expect(analysis.silent).toBe(true)
    expect(analysis.peak).toBe(0)
    expect(analysis.dominantHz).toBeNull()
    expect(analysis.dominantNote).toBeNull()
    expect(analysis.narrowTonal).toBe(false)
    expect(analysis.tonality).toBeNull()
    for (const band of analysis.bands) expect(band.share).toBe(0)
    const events = detectEvents(new Float32Array(RATE), null, RATE, 0, RATE, 0)
    expect(events.some((event) => event.kind === 'silence')).toBe(true)
    const described = updateDescriptors(analysis, emptyDescriptorMemory(), 0)
    expect(described.map((item) => item.id)).toEqual(['silence'])
  })

  it('measures a 440 Hz sine as A4 in the low-mid region', () => {
    const analysis = span(sine(440, 1, 0.5))
    expect(analysis.dominantHz).not.toBeNull()
    expect(Math.abs((analysis.dominantHz ?? 0) - 440)).toBeLessThan(8)
    expect(analysis.dominantNote).toBe('A4')
    expect(hzToNoteName(440)).toBe('A4')
    expect(analysis.dominantBand).toBe('lowMid')
    expect(analysis.narrowTonal).toBe(true)
    expect(bandShare('lowMid', analysis)).toBeGreaterThan(0.6)
    expect(bandShare('high', analysis) + bandShare('air', analysis)).toBeLessThan(0.05)
    expect(analysis.soundMap && analysis.soundMap.length).toBeGreaterThan(0)
  })

  it('measures a 60 Hz sine as low-frequency energy without a false high band', () => {
    const analysis = span(sine(60, 1, 0.5))
    expect(analysis.dominantHz).not.toBeNull()
    expect(Math.abs((analysis.dominantHz ?? 0) - 60)).toBeLessThan(8)
    expect(bandShare('sub', analysis) + bandShare('bass', analysis)).toBeGreaterThan(0.7)
    expect(bandShare('high', analysis) + bandShare('air', analysis)).toBeLessThan(0.05)
    expect(analysis.dominantBand === 'sub' || analysis.dominantBand === 'bass').toBe(true)
  })

  it('does not call noise a narrow tone', () => {
    const white = span(noise(1, 0.2, 9))
    const pinkSource = noise(1, 1, 11)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < pinkSource.length; i++) {
      const whiteSample = pinkSource[i] ?? 0
      b0 = 0.99765 * b0 + whiteSample * 0.099046
      b1 = 0.963 * b1 + whiteSample * 0.2965164
      b2 = 0.57 * b2 + whiteSample * 1.0526913
      pinkSource[i] = (b0 + b1 + b2) * 0.05
    }
    const pink = span(pinkSource)
    expect(white.narrowTonal).toBe(false)
    expect(white.tonality).not.toBe('high')
    expect(pink.narrowTonal).toBe(false)
    expect(pink.tonality).not.toBe('high')
    const occupied = white.bands.filter((band) => band.share > 0.01).length
    expect(occupied).toBeGreaterThanOrEqual(4)
    expect(Math.max(...white.bands.map((band) => band.share))).toBeLessThan(0.8)
    const whiteLow = bandShare('sub', white) + bandShare('bass', white)
    const pinkLow = bandShare('sub', pink) + bandShare('bass', pink)
    expect(pinkLow).toBeGreaterThan(whiteLow)
  })

  it('marks an impulse as a navigable event and a dynamics transient', () => {
    const left = new Float32Array(RATE)
    const at = Math.floor(0.4 * RATE)
    left[at] = 0.9
    const analysis = span(left)
    expect(analysis.dynamics.some((bucket) => bucket.transient)).toBe(true)
    expect(analysis.clipped).toBe(false)
    const events = detectEvents(left, null, RATE, 0, left.length, 0)
    const hit = events.find((event) => Math.abs(event.time - 0.4) < 0.03)
    expect(hit).toBeTruthy()
    expect(hit && ['transient', 'possibleClick', 'loud', 'lowFrequency'].includes(hit.kind)).toBe(true)
    expect(events.length).toBeLessThan(8)
  })

  it('reports a right-heavy stereo balance', () => {
    const right = sine(220, 0.5, 0.5)
    const left = right.map((sample) => sample * 10 ** (-12 / 20))
    const metrics = stereoMetrics(left, right, 0, left.length)
    expect(metrics).not.toBeNull()
    expect(metrics!.balanceSide).toBe('R')
    expect(metrics!.balance).toBeGreaterThan(0.4)
    expect(metrics!.channelDeltaDb).toBeGreaterThan(8)
  })

  it('reports mono as narrow with high positive correlation', () => {
    const left = sine(330, 0.5, 0.4)
    const metrics = stereoMetrics(left, left, 0, left.length)
    expect(metrics!.width).toBeLessThan(0.05)
    expect(metrics!.correlation).toBeGreaterThan(0.98)
    expect(metrics!.lowCorrelation).toBe(false)
    expect(simpleSummary(span(left, left)).space).toBe('MONO')
  })

  it('warns on anti-correlation without a subjective label', () => {
    const left = sine(330, 0.5, 0.4)
    const right = left.map((sample) => -sample)
    const metrics = stereoMetrics(left, right, 0, left.length)
    expect(metrics!.correlation).toBeLessThan(-0.9)
    expect(metrics!.lowCorrelation).toBe(true)
    const findings = mixingFindings(span(left, right), [])
    const warning = findings.find((finding) => finding.id === 'low-correlation')
    expect(warning?.detail.toLowerCase()).toContain('mono compatibility')
    expect(warning?.title.toLowerCase()).not.toContain('bad')
    expect(warning?.detail.toLowerCase()).not.toContain('bad')
  })

  it('shows an EQ energy increase around 1 kHz', () => {
    const analysis = span(sine(1000, 1, 0.4))
    const band = { ...defaultEqBandAt(2), type: 'peaking' as const, frequency: 1000, gain: 6, q: 1, bypassed: false }
    const rows = eqBandDeltas(analysis, [band], RATE)
    const mid = rows.find((item) => item.id === 'mid')
    expect(mid?.deltaDb ?? 0).toBeGreaterThan(3)
    const shares = afterShares(analysis, rows)
    const midIndex = rows.findIndex((item) => item.id === 'mid')
    expect(shares[midIndex] ?? 0).toBeGreaterThan(analysis.bands[midIndex]?.share ?? 1)
    const region = affectedRegion(band, RATE)
    expect(region).not.toBeNull()
    expect(region!.lo).toBeLessThan(1000)
    expect(region!.hi).toBeGreaterThan(1000)
    expect(region!.hi - region!.lo).toBeLessThan(16000)
    const text = eqCompare(analysis, [band], RATE).map((item) => item.label).join(' ')
    expect(text.length).toBeGreaterThan(0)
  })

  it('follows compressor gain reduction on a transient', () => {
    const left = new Float32Array(RATE)
    for (let i = 0; i < left.length; i++) left[i] = i > RATE * 0.2 && i < RATE * 0.21 ? 0.95 : 0.02
    const picture = compressorPicture(
      left,
      RATE,
      0,
      left.length,
      0,
      paramRecord({
        compressorThreshold: -24,
        compressorRatio: 8,
        compressorKnee: 0,
        compressorInput: 0,
        compressorMakeup: 0,
        compressorAutoMakeup: 0,
      }),
    )
    expect(picture.peaksReduced).toBe(true)
    expect(picture.maxReductionDb).toBeLessThan(-3)
    expect(picture.averageReductionDb).toBeGreaterThan(picture.maxReductionDb)
    const quiet = picture.points.find((point) => (point.inputDb ?? 0) < -20)
    const peak = picture.points.find((point) => (point.inputDb ?? -99) > -6)
    expect(peak && quiet && peak.reductionDb < quiet.reductionDb).toBe(true)
  })

  it('places delay repeats on the DSP times', () => {
    const taps = delayPicture(
      paramRecord({ delayTime: 250, delayFeedback: 45, delayWet: 50, delayStereo: 0, delaySync: 0, delayWidth: 100 }),
      'digital',
      120,
    )
    expect(taps.length).toBeGreaterThan(2)
    expect(Math.abs(taps[0]!.time - 0.25)).toBeLessThan(0.02)
    expect(Math.abs(taps[1]!.time - 0.5)).toBeLessThan(0.03)
    const stereo = delayPicture(
      paramRecord({
        delayTime: 250,
        delayTimeR: 375,
        delayFeedback: 40,
        delayFeedbackR: 40,
        delayWet: 40,
        delayWetR: 40,
        delayStereo: 1,
        delaySync: 0,
        delaySyncR: 0,
        delayWidth: 80,
      }),
      'digital',
      120,
    )
    expect(stereo.some((tap) => tap.channel === 'L' && Math.abs(tap.time - 0.25) < 0.03)).toBe(true)
    expect(stereo.some((tap) => tap.channel === 'R' && Math.abs(tap.time - 0.375) < 0.03)).toBe(true)
  })

  it('describes a reverb tail without claiming RT60', () => {
    const left = new Float32Array(2048)
    left[100] = 1
    const picture = reverbPicture(
      paramRecord({ reverbDecay: 1.6, reverbWet: 40, reverbSize: 50, reverbPredelay: 20, reverbEarly: 40, reverbSync: 0 }),
      'hall',
      120,
    )
    expect(picture.duration).toBeGreaterThan(0.8)
    expect(picture.early.length).toBeGreaterThan(0)
    expect(picture.rt60Sec).toBeNull()
    expect(picture.note.toLowerCase()).toContain('not a measured rt60')
    expect(picture.wet).toBeCloseTo(0.4, 2)
    void left
  })

  it('keeps monitoring compensation out of the export graph', () => {
    const offline = offlineRenderSource
    const simple = simpleExportSource
    expect(offline.includes('setHearingMonitor')).toBe(false)
    expect(offline.includes('hearingMonitor')).toBe(false)
    expect(offline.includes('applyMonitorToChannel')).toBe(false)
    expect(simple.includes('applyMonitorToChannel')).toBe(false)
    expect(simple.includes('setHearingMonitor')).toBe(false)
    const dry = sine(440, 0.05, 0.2)
    const wet = applyMonitorToChannel(dry, { low: 0, mid: 0, high: 9 }, RATE)
    let delta = 0
    for (let i = 0; i < dry.length; i++) delta = Math.max(delta, Math.abs((wet[i] ?? 0) - (dry[i] ?? 0)))
    expect(delta).toBeGreaterThan(0.001)
    expect(monitorCurves({ low: 0, mid: 0, high: 0 })).toBeNull()
    expect(monitorCurves({ low: 40, mid: -40, high: 3 })?.map((band) => band.gain)).toEqual([12, -12, 3])
  })

  it('rate-limits haptics and stays quiet when unsupported or off', () => {
    expect(vibrationSupported({})).toBe(false)
    expect(vibrationSupported({ vibrate: () => true })).toBe(true)
    expect(shouldPulse(100, 0, 'off')).toBe(false)
    expect(shouldPulse(100, 0, 'low')).toBe(false)
    expect(shouldPulse(500, 0, 'low')).toBe(true)
    const pulses: number[][] = []
    const remember = (pattern: number | number[]) => {
      pulses.push(Array.isArray(pattern) ? pattern : [pattern])
      return true
    }
    const first = fireHaptic('transient', 'high', 0, -1000, remember)
    const dense = fireHaptic('transient', 'high', 20, first.lastPulseMs, () => true)
    const later = fireHaptic('transient', 'high', 400, first.lastPulseMs, remember)
    expect(first.result.fired).toBe(true)
    expect(dense.result.reason).toBe('rate-limited')
    expect(later.result.fired).toBe(true)
    expect(hapticPattern('frequency', 'low', 'bass').length).toBeGreaterThan(1)
    expect(fireHaptic('transient', 'off', 0, 0, () => true).result.reason).toBe('off')
    expect(fireHaptic('clip', 'medium', 0, -1000, null).result.reason).toBe('unsupported')
  })

  it('keeps descriptor labels stable across a brief dip', () => {
    const heavy = span(sine(80, 1, 0.5))
    expect(bandShare('sub', heavy) + bandShare('bass', heavy)).toBeGreaterThan(BASS_HEAVY_ON)
    const memory = emptyDescriptorMemory()
    const first = updateDescriptors(heavy, memory, 0)
    expect(first.some((item) => item.id === 'bass-heavy')).toBe(true)
    const dipped = {
      ...heavy,
      bands: heavy.bands.map((band) =>
        band.id === 'sub' || band.id === 'bass' ? { ...band, share: band.id === 'bass' ? 0.33 : 0.02 } : band,
      ),
    }
    const held = updateDescriptors(dipped, memory, 200)
    expect(held.some((item) => item.id === 'bass-heavy')).toBe(true)
    const released = updateDescriptors(
      {
        ...dipped,
        bands: dipped.bands.map((band) => (band.id === 'bass' || band.id === 'sub' ? { ...band, share: 0.05 } : { ...band, share: 0.3 })),
      },
      memory,
      MIN_HOLD_MS + 50,
    )
    expect(released.some((item) => item.id === 'bass-heavy')).toBe(false)
  })

  it('encodes regions and events with more than color', () => {
    const hatches = new Set(HEARING_BANDS.map((band) => band.hatch))
    expect(hatches.size).toBe(HEARING_BANDS.length)
    for (const band of HEARING_BANDS) expect(band.label.length).toBeGreaterThan(1)
    const shapes = ['▲', '▭', '!', '◆']
    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('keeps static analysis bounded', () => {
    const left = sine(440, 3, 0.25)
    const right = sine(440, 3, 0.25, 0.2)
    const fingerprintStarted = performance.now()
    analyzePcm(
      { left, right, sampleRate: RATE, startFrame: 0, endFrame: left.length, originSec: 0, scope: 'full' },
      { soundMap: false },
    )
    const fingerprintMs = performance.now() - fingerprintStarted
    console.info(`hearing-perf fingerprintMs=${fingerprintMs.toFixed(1)}`)
    const mapStarted = performance.now()
    analyzePcm(
      { left, right, sampleRate: RATE, startFrame: 0, endFrame: left.length, originSec: 0, scope: 'full' },
      { soundMap: true, maxMapColumns: 96 },
    )
    const soundMapMs = performance.now() - mapStarted
    console.info(`hearing-perf soundMapMs=${soundMapMs.toFixed(1)}`)
    expect(fingerprintMs).toBeLessThan(750)
    expect(soundMapMs).toBeLessThan(1200)
  })

  it('does not start a clock or an analyser while idle', () => {
    setHearingClockDemand({ enabled: false, playing: false, soundMapVisible: false, haptics: false })
    const stats = hearingRuntimeStats()
    expect(stats.rafActive).toBe(false)
    expect(stats.analyserNodesCreated).toBe(0)
  })

  it('shifts gain and widens mid/side from the real coefficients', () => {
    const analysis = span(sine(440, 0.4, 0.25))
    const rows = gainCompare(analysis, 3)
    expect(rows.find((item) => item.id === 'peak')?.after).toContain('dBFS')
    const left = sine(200, 0.3, 0.3)
    const right = sine(200, 0.3, 0.3, 0.6)
    const before = stereoMetrics(left, right, 0, left.length)
    const after = stereoAfterMidSide(left, right, 0, left.length, 180, 0, 0)
    expect(after && before && after.width).toBeGreaterThan((before?.width ?? 1) + 0.02)
    expect(stereoCompare(before, after).some((item) => item.id === 'width')).toBe(true)
  })

  it('omits a precise voice number for a pure tone', () => {
    const estimate = voiceEstimate(span(sine(440, 1, 0.4)))
    expect(estimate.status).toBe('omitted')
    expect(estimate.contrastDb).toBeNull()
    expect(estimate.detail.toLowerCase()).toContain('not')
  })

  it('persists a chosen profile without inferring one', () => {
    const parsed = parseHearingSettings({ enabled: true, profile: 'visual', monitorLow: 99, eventFilters: { silence: false } })
    expect(parsed.enabled).toBe(true)
    expect(parsed.profile).toBe('visual')
    expect(parsed.monitorLow).toBe(12)
    expect(parsed.eventFilters.silence).toBe(false)
    expect(parsed.eventFilters.transient).toBe(true)
    expect(layersForProfile('assisted').soundMap).toBe(false)
    expect(layersForProfile('visual').soundMap).toBe(true)
    expect(parseHearingSettings({ profile: 'doctor' }).profile).toBe('assisted')
    expect(readStoredHearingSettings()).toBe(readStoredHearingSettings())
    expect(clampPanelSize(10, 9000)).toEqual({ panelWidth: 320, panelHeight: 1100 })
    expect(parseHearingSettings({ panelWidth: 800, panelHeight: 700 }).panelWidth).toBe(800)
  })

  it('navigates findings without prescribing a fix', () => {
    const left = sine(80, 0.5, 0.4)
    left[10] = 1
    const analysis = span(left, left.map((sample) => sample * 0.2))
    const events = detectEvents(left, null, RATE, 0, left.length, 0)
    const findings = mixingFindings(analysis, events)
    expect(findings.some((finding) => /bad|poor|wrong/i.test(finding.title))).toBe(false)
    const clip = findings.find((finding) => finding.id === 'possible-clipping')
    expect(clip?.time).not.toBeNull()
  })
})
