import { describe, expect, it } from 'vitest'
import offlineRenderSource from '../audio/engine/offlineRender.ts?raw'
import simpleExportSource from '../simple/exportSimple.ts?raw'
import { defaultEqBandAt } from '../audio/engine/eqBands'
import { hzToNoteName } from '../audio/engine/pitchScale'
import { analyzePcm, stereoMetrics } from './analyze'
import { mixingFindings } from './assistant'
import { HEARING_BANDS } from './bands'
import { eqCompare, gainCompare, stereoCompare } from './compare'
import { afterShares, compareTrackGeometry } from './AfterEqChart'
import { affectedRegion, eqBandDeltas, heardBandLevels, levelBar, shiftSoundMap } from './eqAssist'
import { BASS_HEAVY_ON, MIN_HOLD_MS, emptyDescriptorMemory, simpleSummary, updateDescriptors } from './descriptors'
import { formatLoudnessDb, levelsFromTimeDomain, liveMeterZone, loudnessZone } from './loudness'
import { SOUND_MAP_FLOOR_DB, soundMapLevel } from './levels'
import { distanceWord, headLayout, reverbSpacePicture, roomWord, sourceOutsideHead } from './reverbDepth'
import { detectEvents, transientMarkers } from './events'
import { applyPanToBalance, compressorPicture, delayPicture, paramRecord, reverbPicture, stereoAfterMidSide } from './effectViz'
import { fireHaptic, hapticPattern, shouldPulse, vibrationSupported } from './haptics'
import { getHearingReveal, showTransientOnWave } from './reveal'
import { nearestSpaceBucket } from './spaceLive'
import { applyMonitorToChannel, monitorCurves } from './monitor'
import { parseHearingSettings, layersForProfile, readStoredHearingSettings, clampPanelPosition, clampPanelSize } from './settings'
import { heardDelay, heardSpaceTimeline, type HeardDelay } from './heardSpace'
import { hearingRuntimeStats, setHearingClockDemand } from './scheduler'
import { voiceEstimate } from './voiceEstimate'

const RATE = 44100

function sine(freq: number, seconds: number, amplitude: number, phase = 0): Float32Array {
  const n = Math.floor(seconds * RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin(phase + (2 * Math.PI * freq * i) / RATE)
  return out
}

function mixTone(lowHz: number, lowAmp: number, highHz: number, highAmp: number): Float32Array {
  const low = sine(lowHz, 1, lowAmp)
  const high = sine(highHz, 1, highAmp)
  const out = new Float32Array(low.length)
  for (let i = 0; i < out.length; i++) out[i] = (low[i] ?? 0) + (high[i] ?? 0)
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
    const heard = heardBandLevels(analysis, RATE, 0, [band], true).find((item) => item.id === 'mid')
    expect(heard?.deltaDb ?? 0).toBeGreaterThan(3)
    expect(levelBar(heard?.afterDb ?? null)).toBeGreaterThan(levelBar(heard?.beforeDb ?? null))
    const region = affectedRegion(band, RATE)
    expect(region).not.toBeNull()
    expect(region!.lo).toBeLessThan(1000)
    expect(region!.hi).toBeGreaterThan(1000)
    expect(region!.hi - region!.lo).toBeLessThan(16000)
    const text = eqCompare(analysis, [band], RATE).find((item) => item.id === 'mid')
    expect(text?.label.length ?? 0).toBeGreaterThan(0)
    expect(text?.after.endsWith('dB')).toBe(true)
    expect(text?.delta.startsWith('+')).toBe(true)
    expect(text?.after).not.toBe(text?.delta)
    expect(compareTrackGeometry(-40, -20).boost).toBe(true)
    expect(compareTrackGeometry(-40, -20).afterPct).toBeGreaterThan(compareTrackGeometry(-40, -20).beforePct)
    expect(compareTrackGeometry(-20, -40).boost).toBe(false)
  })

  it('marks a transient with a line and follows the nearest space bucket', () => {
    showTransientOnWave(1.25)
    const reveal = getHearingReveal()
    expect(reveal?.mark).toBe('line')
    expect(reveal?.start).toBe(1.25)
    expect(reveal?.end).toBe(1.25)
    const buckets = [
      { time: 0, balance: -0.4, width: 0.1, correlation: 0.9 },
      { time: 1, balance: 0.6, width: 0.4, correlation: 0.2 },
    ]
    expect(nearestSpaceBucket(buckets, 0.8)?.balance).toBe(0.6)
    expect(nearestSpaceBucket(buckets, null)).toBeNull()
  })

  it('keeps a quieter high band visible on a dB scale', () => {
    const bass = sine(80, 1, 0.55)
    const high = sine(8000, 1, 0.08)
    const mix = bass.map((sample, index) => sample + (high[index] ?? 0))
    const analysis = span(mix)
    const share = analysis.bands.find((band) => band.id === 'high')?.share ?? 1
    expect(share).toBeLessThan(0.2)
    const row = heardBandLevels(analysis, RATE, 0, [], false).find((band) => band.id === 'high')
    expect(levelBar(row?.beforeDb ?? null)).toBeGreaterThan(0.15)
    expect(levelBar(null)).toBe(0)
    expect(levelBar(0)).toBe(1)
  })

  it('moves band energy up an octave of pitch', () => {
    const analysis = span(sine(300, 1, 0.45))
    const rows = heardBandLevels(analysis, RATE, 12, [], false)
    const low = rows.find((band) => band.id === 'lowMid')
    const mid = rows.find((band) => band.id === 'mid')
    expect(low?.beforeDb ?? -200).toBeGreaterThan((mid?.beforeDb ?? 0) + 6)
    expect(mid?.afterDb ?? -200).toBeGreaterThan((low?.afterDb ?? -200) + 6)
    const shifted = shiftSoundMap([{ time: 0, power: [0, 0, 1, 0, 0, 0, 0] }], 12)
    expect(shifted?.[0]?.power[2]).toBe(0)
    expect(shifted?.[0]?.power[3]).toBeGreaterThan(0)
    expect(shiftSoundMap([{ time: 0, power: [1, 0, 0, 0, 0, 0, 0] }], 0)?.[0]?.power[0]).toBe(1)
  })

  it('moves a centered image when pan goes hard right or left', () => {
    expect(applyPanToBalance(0, 100)).toBeGreaterThan(0.9)
    expect(applyPanToBalance(0, -100)).toBeLessThan(-0.9)
    expect(Math.abs(applyPanToBalance(0, 0))).toBeLessThan(0.02)
    expect(applyPanToBalance(0.2, 80)).toBeGreaterThan(0.2)
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
    expect(vibrationSupported({ vibrate: () => false })).toBe(true)
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

  it('tags high-band energy and a hard-panned image', () => {
    const high = span(sine(8000, 1, 0.4))
    expect(bandShare('high', high) + bandShare('air', high)).toBeGreaterThan(0.16)
    const mixed = span(mixTone(80, 0.5, 8000, 0.08))
    const column = mixed.soundMap?.[0]
    expect(column).toBeTruthy()
    const bassLevel = soundMapLevel(column?.power[1] ?? 0)
    const highLevel = Math.max(soundMapLevel(column?.power[4] ?? 0), soundMapLevel(column?.power[5] ?? 0))
    expect(bassLevel).toBeGreaterThan(highLevel)
    expect(highLevel).toBeGreaterThan(0.25)
    const highTags = updateDescriptors(high, emptyDescriptorMemory(), 0)
    expect(highTags.some((item) => item.id === 'high-band')).toBe(true)
    const left = sine(440, 0.5, 0.6)
    const right = sine(440, 0.5, 0.02)
    const panned = span(left, right)
    expect(Math.abs(panned.stereo?.balance ?? 0)).toBeGreaterThan(0.28)
    const sideTags = updateDescriptors(panned, emptyDescriptorMemory(), 0)
    expect(sideTags.some((item) => item.id === 'imbalance' && item.label === 'LEFT-HEAVY')).toBe(true)
  })

  it('prefers measured transient events over the dynamics map', () => {
    expect(
      transientMarkers(
        [
          {
            id: 't',
            kind: 'transient',
            time: 1.25,
            duration: 0.01,
            label: 'TRANSIENT',
            detail: '',
            confidence: 'measured',
          },
        ],
        [{ time: 4, transient: true }],
      ),
    ).toEqual([
      { time: 1.25, label: 'TRANSIENT' },
      { time: 4, label: 'TRANSIENT' },
    ])
    expect(transientMarkers([], [{ time: 0.4, transient: true }, { time: 0.8, transient: false }])).toEqual([
      { time: 0.4, label: 'TRANSIENT' },
    ])
    expect(
      transientMarkers(
        [
          {
            id: 't',
            kind: 'transient',
            time: 0.4,
            duration: 0.01,
            label: 'TRANSIENT',
            detail: '',
            confidence: 'measured',
          },
        ],
        [{ time: 0.42, transient: true }],
      ),
    ).toEqual([{ time: 0.4, label: 'TRANSIENT' }])
  })

  it('replaces wide stereo with narrow stereo immediately', () => {
    const sample = span(noise(0.3, 0.4, 1), noise(0.3, 0.4, 9))
    expect(sample.stereo).toBeTruthy()
    const memory = emptyDescriptorMemory()
    const wide = { ...sample, stereo: { ...sample.stereo!, width: 0.8 } }
    expect(updateDescriptors(wide, memory, 0).some((item) => item.id === 'wide')).toBe(true)
    const narrow = { ...wide, stereo: { ...wide.stereo!, width: 0.05 } }
    const next = updateDescriptors(narrow, memory, 50)
    expect(next.some((item) => item.id === 'wide')).toBe(false)
    expect(next.some((item) => item.id === 'narrow')).toBe(true)
    expect(next.filter((item) => item.id === 'wide' || item.id === 'narrow')).toHaveLength(1)
  })

  it('moves the space field when mid/side or a right-channel delay changes', () => {
    const n = 44100
    const left = new Float32Array(n)
    const right = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      left[i] = Math.sin(i * 0.17) * 0.35
      right[i] = Math.sin(i * 0.17 + 1.4) * 0.35
    }
    const base = {
      left,
      right,
      sampleRate: 44100,
      originSec: 0,
      startFrame: 0,
      frames: n,
      panPct: 0,
      leftDb: 0,
      rightDb: 0,
      delay: null,
    }
    const meanWidth = (widthPct: number, balance = 0) => {
      const buckets = heardSpaceTimeline({ ...base, midSide: { widthPct, midDb: 0, sideDb: 0, balance } })
      return buckets.reduce((sum, bucket) => sum + bucket.width, 0) / buckets.length
    }
    expect(meanWidth(0)).toBeLessThan(0.05)
    expect(meanWidth(160)).toBeGreaterThan(meanWidth(0) + 0.08)
    expect(meanWidth(100, 100)).toBeGreaterThan(meanWidth(100, -100) + 0.2)
    const rightOnly: HeardDelay = {
      stereo: true,
      timeL: 0.08,
      timeR: 0.25,
      fbL: 0,
      fbR: 0,
      pingToL: 0,
      pingToR: 0,
      dryL: 1,
      wetL: 0,
      dryR: 0,
      wetR: 1,
      moduleDry: 0,
      moduleWet: 1,
      pan: 0,
      widthGain: 1,
    }
    const fromParams = heardDelay(
      paramRecord({
        delayStereo: 1,
        delayTime: 80,
        delayTimeR: 250,
        delayWet: 0,
        delayDry: 100,
        delayWetR: 100,
        delayDryR: 0,
        delayCorrelate: 0,
        delayFeedback: 0,
        delayFeedbackR: 0,
        delayWidth: 100,
        delayPan: 0,
      }),
      'digital',
      120,
    )
    expect(fromParams.stereo).toBe(true)
    expect(fromParams.timeR).toBeCloseTo(0.25, 2)
    expect(fromParams.wetR).toBeCloseTo(1)
    expect(fromParams.dryR).toBeCloseTo(0)
    expect(fromParams.wetL).toBeCloseTo(0)
    const burst = new Float32Array(22050)
    const burstR = new Float32Array(22050)
    for (let i = 0; i < 900; i++) {
      burst[i] = 0.7
      burstR[i] = 0.7
    }
    const delayed = heardSpaceTimeline({
      ...base,
      left: burst,
      right: burstR,
      frames: burst.length,
      midSide: null,
      delay: rightOnly,
    })
    const early = delayed.find((bucket) => bucket.time < 0.04)
    const echo = delayed.reduce<(typeof delayed)[number] | null>(
      (best, bucket) => (bucket.balance > (best?.balance ?? -2) ? bucket : best),
      null,
    )
    expect(early).toBeTruthy()
    expect(echo).toBeTruthy()
    expect(early!.balance).toBeLessThan(-0.5)
    expect(echo!.balance).toBeGreaterThan(0.5)
    const noise = new Float32Array(44100)
    const noiseR = new Float32Array(44100)
    for (let i = 0; i < noise.length; i++) {
      const sample = ((i * 17) % 100) / 50 - 1
      noise[i] = sample
      noiseR[i] = sample
    }
    const plain = heardSpaceTimeline({ ...base, left: noise, right: noiseR, frames: noise.length, midSide: null, delay: null })
    const shifted = heardSpaceTimeline({
      ...base,
      left: noise,
      right: noiseR,
      frames: noise.length,
      midSide: null,
      delay: { ...rightOnly, timeR: 0.03 },
    })
    const meanCorr = (buckets: typeof plain) => buckets.reduce((sum, bucket) => sum + bucket.correlation, 0) / buckets.length
    expect(meanCorr(shifted)).toBeLessThan(meanCorr(plain) - 0.15)
    const dryImage = heardSpaceTimeline({
      ...base,
      left: noise,
      right: noiseR,
      frames: noise.length,
      delay: null,
      midSide: { widthPct: 100, midDb: 0, sideDb: 0 },
    })
    const haas = heardSpaceTimeline({
      ...base,
      left: noise,
      right: noiseR,
      frames: noise.length,
      delay: null,
      midSide: { widthPct: 100, midDb: 0, sideDb: 0, haasAmount: 100, haasTime: 30, haasDir: 0 },
    })
    const meanW = (buckets: typeof plain) => buckets.reduce((sum, bucket) => sum + bucket.width, 0) / buckets.length
    expect(meanW(haas)).toBeGreaterThan(meanW(dryImage) + 0.15)
  })

  it('names loudness zones on a dBFS scale', () => {
    expect(loudnessZone(null)).toBe('silent')
    expect(loudnessZone(-70)).toBe('silent')
    expect(loudnessZone(-42)).toBe('quiet')
    expect(loudnessZone(-20)).toBe('medium')
    expect(loudnessZone(-10)).toBe('loud')
    expect(loudnessZone(-3)).toBe('very-loud')
    expect(loudnessZone(-0.2)).toBe('clipping')
    expect(liveMeterZone(false, -2, true)).toBe('silent')
    expect(liveMeterZone(true, -2, false)).toBe('very-loud')
    const bypassed = reverbSpacePicture({ engaged: false, wet: 100, distance: 100, size: 100, decaySec: 4 })
    expect(bypassed.distance).toBe(0)
    expect(bypassed.size).toBe(0)
    const dryFar = reverbSpacePicture({ engaged: true, wet: 0, distance: 100, size: 100, decaySec: 4 })
    const wetClose = reverbSpacePicture({ engaged: true, wet: 100, distance: 0, size: 20, decaySec: 0.4 })
    expect(dryFar.distance).toBe(1)
    expect(dryFar.wet).toBe(0)
    expect(wetClose.distance).toBe(0)
    expect(wetClose.distance).toBeLessThan(dryFar.distance)
    expect(dryFar.size).toBeGreaterThan(wetClose.size)
    expect(roomWord(dryFar.size)).toBe('large')
    expect(distanceWord(0)).toBe('close')
    expect(distanceWord(1)).toBe('far')
    const small = headLayout(220, 180, 0, 0, 1)
    const large = headLayout(220, 180, 0, 1, 1)
    const closeSource = headLayout(220, 180, 0, 1, 0)
    expect(large.headRadius).toBeLessThan(small.headRadius * 0.7)
    expect(large.sourceY).toBeLessThan(closeSource.sourceY - 24)
    expect(sourceOutsideHead(small)).toBe(true)
    expect(sourceOutsideHead(large)).toBe(true)
    expect(sourceOutsideHead(closeSource)).toBe(true)
    expect(soundMapLevel(0)).toBe(0)
    expect(soundMapLevel(1)).toBe(1)
    const quietHigh = soundMapLevel(10 ** (-24 / 10))
    expect(quietHigh).toBeGreaterThan(0.4)
    expect(quietHigh).toBeLessThan(soundMapLevel(1))
    expect(SOUND_MAP_FLOOR_DB).toBeLessThan(-24)
    expect(loudnessZone(-30, true)).toBe('clipping')
    expect(formatLoudnessDb(-6.24)).toBe('-6.2 dBFS')
    const tone = levelsFromTimeDomain(Float32Array.from([0, 0.5, 0, -0.5]))
    expect(tone.peakDb).toBeCloseTo(20 * Math.log10(0.5), 4)
    expect(tone.rmsDb).toBeLessThan(tone.peakDb)
    expect(levelsFromTimeDomain(new Float32Array(8)).peakDb).toBe(Number.NEGATIVE_INFINITY)
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
    expect(parseHearingSettings({}).panelLeft).toBeNull()
    expect(parseHearingSettings({ panelLeft: 40, panelTop: 80 })).toMatchObject({ panelLeft: 40, panelTop: 80 })
    expect(parseHearingSettings({}).transientSensitivity).toBe(0.5)
    expect(parseHearingSettings({}).showWaveSymbols).toBe(true)
    expect(parseHearingSettings({ showWaveSymbols: false }).showWaveSymbols).toBe(false)
    expect(parseHearingSettings({ transientSensitivity: 2 }).transientSensitivity).toBe(1)
    expect(clampPanelPosition(-20)).toBe(0)
    expect(clampPanelPosition(9000)).toBe(8000)
    expect(clampPanelPosition('nope')).toBeNull()
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
