/**
 * Measurement-based descriptors.
 * Thresholds are the enter values. Exit values provide hysteresis.
 * A label stays up for at least MIN_HOLD_MS so it does not flicker.
 */

import type { BufferAnalysis } from './analyze'
import type { HearingBandId } from './bands'
import { spectralTones } from './tones'

/** Enter when this fraction of spectral power is below 250 Hz. */
export const BASS_HEAVY_ON = 0.38
export const BASS_HEAVY_OFF = 0.3
/** Enter when power from 250 Hz to 6 kHz exceeds this share. */
export const MID_DOMINANT_ON = 0.45
export const MID_DOMINANT_OFF = 0.36
export const LOUD_RMS_ON = -14
export const LOUD_RMS_OFF = -18
export const QUIET_RMS_ON = -30
export const QUIET_RMS_OFF = -26
export const WIDE_ON = 0.5
export const WIDE_OFF = 0.4
export const NARROW_ON = 0.12
export const NARROW_OFF = 0.2
export const TRANSIENT_CREST_ON = 12
export const TRANSIENT_CREST_OFF = 9
/** Enter when power from 6 kHz up exceeds this share. */
export const HIGH_BAND_ON = 0.16
export const HIGH_BAND_OFF = 0.1
/** Enter when AIR (12–20 kHz) exceeds this share. */
export const AIR_ON = 0.05
export const AIR_OFF = 0.03
export const IMBALANCE_ON = 0.28
export const IMBALANCE_OFF = 0.18
export const DC_ON = 0.02
export const DC_OFF = 0.012
export const NEAR_FULL_ON = -1
export const NEAR_FULL_OFF = -3
export const MIN_HOLD_MS = 700

export type DescriptorId =
  | 'silence'
  | 'loud'
  | 'quiet'
  | 'bass-heavy'
  | 'midrange-dominant'
  | 'high-band'
  | 'air'
  | 'wide'
  | 'narrow'
  | 'imbalance'
  | 'low-correlation'
  | 'strong-transients'
  | 'continuous'
  | 'clipped'
  | 'near-full-scale'
  | 'dc-offset'
  | 'dominant'
  | 'tone'

export type Descriptor = {
  id: DescriptorId
  label: string
  detail: string
}

export type DescriptorMemory = {
  flags: Partial<Record<DescriptorId, boolean>>
  shownAt: Partial<Record<DescriptorId, number>>
}

export function emptyDescriptorMemory(): DescriptorMemory {
  return { flags: {}, shownAt: {} }
}

function bandShare(analysis: BufferAnalysis, ids: readonly HearingBandId[]): number {
  return analysis.bands.filter((band) => ids.includes(band.id)).reduce((sum, band) => sum + band.share, 0)
}

function below250(analysis: BufferAnalysis): number {
  return bandShare(analysis, ['sub', 'bass'])
}

function midShare(analysis: BufferAnalysis): number {
  return bandShare(analysis, ['lowMid', 'mid', 'highMid'])
}

function highShare(analysis: BufferAnalysis): number {
  return bandShare(analysis, ['high', 'air'])
}

function hold(
  memory: DescriptorMemory,
  id: DescriptorId,
  want: boolean,
  nowMs: number,
): boolean {
  const current = memory.flags[id] === true
  if (want === current) {
    if (want && memory.shownAt[id] === undefined) memory.shownAt[id] = nowMs
    return current
  }
  const shown = memory.shownAt[id]
  if (current && !want && shown !== undefined && nowMs - shown < MIN_HOLD_MS) return true
  memory.flags[id] = want
  memory.shownAt[id] = nowMs
  return want
}

function clearHold(memory: DescriptorMemory, id: DescriptorId) {
  memory.flags[id] = false
  delete memory.shownAt[id]
}

/** One of a pair may stay through the hold window. The opposite measurement replaces it at once. */
function exclusiveHold(
  memory: DescriptorMemory,
  id: DescriptorId,
  want: boolean,
  oppositeWant: boolean,
  nowMs: number,
): boolean {
  if (oppositeWant) {
    clearHold(memory, id)
    return false
  }
  return hold(memory, id, want, nowMs)
}

export function updateDescriptors(
  analysis: BufferAnalysis,
  memory: DescriptorMemory,
  nowMs: number,
  toneSensitivity = 0.5,
): Descriptor[] {
  if (analysis.silent) {
    hold(memory, 'silence', true, nowMs)
    for (const id of [
      'loud',
      'quiet',
      'bass-heavy',
      'midrange-dominant',
      'high-band',
      'air',
      'wide',
      'narrow',
      'imbalance',
      'low-correlation',
      'strong-transients',
      'continuous',
      'clipped',
      'near-full-scale',
      'dc-offset',
      'dominant',
    ] as const) {
      hold(memory, id, false, nowMs)
    }
    return [
      {
        id: 'silence',
        label: 'SILENCE',
        detail: 'Peak level is below the silence threshold. No dominant frequency is reported.',
      },
    ]
  }
  hold(memory, 'silence', false, nowMs)
  const low = below250(analysis)
  const mid = midShare(analysis)
  const rms = analysis.rmsDbfs
  const crest = analysis.crestDb
  const width = analysis.stereo?.width ?? 0
  const loud = rms !== null && (memory.flags.loud ? rms >= LOUD_RMS_OFF : rms >= LOUD_RMS_ON)
  const quiet = rms !== null && (memory.flags.quiet ? rms <= QUIET_RMS_OFF : rms <= QUIET_RMS_ON)
  const bass = memory.flags['bass-heavy'] ? low >= BASS_HEAVY_OFF : low >= BASS_HEAVY_ON
  const mids = !bass && (memory.flags['midrange-dominant'] ? mid >= MID_DOMINANT_OFF : mid >= MID_DOMINANT_ON)
  const wide = analysis.stereo ? (memory.flags.wide ? width >= WIDE_OFF : width >= WIDE_ON) : false
  const narrow = analysis.stereo ? (memory.flags.narrow ? width <= NARROW_OFF : width <= NARROW_ON) : false
  const highs = highShare(analysis)
  const air = bandShare(analysis, ['air'])
  const transients = crest !== null && (memory.flags['strong-transients'] ? crest >= TRANSIENT_CREST_OFF : crest >= TRANSIENT_CREST_ON)
  const continuous = analysis.tonality === 'high' && !transients && crest !== null && crest < 8
  const balance = analysis.stereo?.balance ?? 0
  const imbalance = analysis.stereo
    ? memory.flags.imbalance
      ? Math.abs(balance) >= IMBALANCE_OFF
      : Math.abs(balance) >= IMBALANCE_ON
    : false
  const lowCorrelation = analysis.stereo?.lowCorrelation === true
  const dc = Math.abs(analysis.dcOffset)
  const dcOn = memory.flags['dc-offset'] ? dc >= DC_OFF : dc >= DC_ON
  const peak = analysis.peakDbfs
  const nearFull = peak !== null && (memory.flags['near-full-scale'] ? peak >= NEAR_FULL_OFF : peak >= NEAR_FULL_ON)

  const flags: { id: DescriptorId; on: boolean; label: string; detail: string }[] = [
    {
      id: 'loud',
      on: exclusiveHold(memory, 'loud', loud && !quiet, quiet && !loud, nowMs),
      label: 'LOUD',
      detail: rms !== null ? `RMS ${rms.toFixed(1)} dBFS.` : 'RMS is high.',
    },
    {
      id: 'quiet',
      on: exclusiveHold(memory, 'quiet', quiet && !loud, loud && !quiet, nowMs),
      label: 'QUIET',
      detail: rms !== null ? `RMS ${rms.toFixed(1)} dBFS.` : 'RMS is low.',
    },
    {
      id: 'bass-heavy',
      on: hold(memory, 'bass-heavy', bass, nowMs),
      label: 'BASS-HEAVY',
      detail: `${Math.round(low * 100)}% of measured spectral energy is below 250 Hz.`,
    },
    {
      id: 'midrange-dominant',
      on: hold(memory, 'midrange-dominant', mids, nowMs),
      label: 'MIDRANGE-DOMINANT',
      detail: `${Math.round(mid * 100)}% of measured spectral energy is between 250 Hz and 6 kHz.`,
    },
    {
      id: 'high-band',
      on: hold(memory, 'high-band', highs >= (memory.flags['high-band'] ? HIGH_BAND_OFF : HIGH_BAND_ON), nowMs),
      label: 'HIGH-BAND ENERGY',
      detail: `${Math.round(highs * 100)}% of measured spectral energy is above 6 kHz.`,
    },
    {
      id: 'air',
      on: hold(memory, 'air', air >= (memory.flags.air ? AIR_OFF : AIR_ON), nowMs),
      label: 'AIR ENERGY',
      detail: `${Math.round(air * 100)}% of measured spectral energy is between 12 kHz and 20 kHz.`,
    },
    {
      id: 'wide',
      on: exclusiveHold(memory, 'wide', wide && !narrow, narrow && !wide, nowMs),
      label: 'WIDE STEREO',
      detail: analysis.stereo ? `Side energy is ${Math.round(analysis.stereo.width * 100)}% of mid+side energy.` : '',
    },
    {
      id: 'narrow',
      on: exclusiveHold(memory, 'narrow', narrow && !wide, wide && !narrow, nowMs),
      label: 'NARROW STEREO',
      detail: analysis.stereo ? `Side energy is ${Math.round(analysis.stereo.width * 100)}% of mid+side energy.` : '',
    },
    {
      id: 'imbalance',
      on: hold(memory, 'imbalance', imbalance, nowMs),
      label: analysis.stereo && analysis.stereo.balance < 0 ? 'LEFT-HEAVY' : 'RIGHT-HEAVY',
      detail: analysis.stereo
        ? `Balance is ${analysis.stereo.balanceSide} ${Math.round(analysis.stereo.balancePct)}%.`
        : '',
    },
    {
      id: 'low-correlation',
      on: hold(memory, 'low-correlation', lowCorrelation, nowMs),
      label: 'LOW CORRELATION',
      detail: analysis.stereo
        ? `Correlation ${analysis.stereo.correlation.toFixed(2)}. Possible mono compatibility issue.`
        : '',
    },
    {
      id: 'strong-transients',
      on: hold(memory, 'strong-transients', transients, nowMs),
      label: 'STRONG TRANSIENTS',
      detail: crest !== null ? `Crest factor ${crest.toFixed(1)} dB.` : '',
    },
    {
      id: 'continuous',
      on: hold(memory, 'continuous', continuous, nowMs),
      label: 'CONTINUOUS / TONAL',
      detail:
        analysis.flatness !== null
          ? `Spectral flatness ${analysis.flatness.toFixed(3)}. Narrow tonal energy is present.`
          : 'Narrow tonal energy is present.',
    },
    {
      id: 'clipped',
      on: hold(memory, 'clipped', analysis.clipped, nowMs),
      label: 'CLIPPING',
      detail: `${analysis.clipCount} full-scale sample${analysis.clipCount === 1 ? '' : 's'}.`,
    },
    {
      id: 'near-full-scale',
      on: hold(memory, 'near-full-scale', nearFull && !analysis.clipped, nowMs),
      label: 'NEAR FULL SCALE',
      detail: peak !== null ? `Peak ${peak.toFixed(1)} dBFS.` : 'Peak is close to full scale.',
    },
    {
      id: 'dc-offset',
      on: hold(memory, 'dc-offset', dcOn, nowMs),
      label: 'DC OFFSET',
      detail: `Mean sample ${analysis.dcOffset.toFixed(4)}.`,
    },
  ]

  const out = flags.filter((flag) => flag.on).map(({ id, label, detail }) => ({ id, label, detail }))
  const tones = spectralTones(analysis.spectrumDb, analysis.sampleRate, analysis.fftSize, toneSensitivity)
  for (const tone of tones) {
    out.push({
      id: 'tone',
      label: `${tone.note} · ${Math.round(tone.hz)} Hz`,
      detail: `${tone.note} at ${Math.round(tone.hz)} Hz, ${tone.db.toFixed(1)} dB. Louder partials are listed first.`,
    })
  }
  return out
}

export type LevelWord = 'LOW' | 'MEDIUM' | 'HIGH'
export type SimpleSummary = {
  level: 'SILENT' | 'QUIET' | 'NORMAL' | 'LOUD'
  low: LevelWord
  mid: LevelWord
  high: LevelWord
  space: 'MONO' | 'NARROW' | 'MEDIUM' | 'WIDE' | '—'
  dynamics: LevelWord | '—'
  transients: 'LOW' | 'MEDIUM' | 'STRONG' | '—'
}

function word(share: number): LevelWord {
  if (share >= 0.34) return 'HIGH'
  if (share >= 0.18) return 'MEDIUM'
  return 'LOW'
}

export function simpleSummary(analysis: BufferAnalysis): SimpleSummary {
  if (analysis.silent) {
    return { level: 'SILENT', low: 'LOW', mid: 'LOW', high: 'LOW', space: analysis.stereo ? 'MONO' : '—', dynamics: '—', transients: '—' }
  }
  const rms = analysis.rmsDbfs ?? -120
  const level = rms >= LOUD_RMS_ON ? 'LOUD' : rms <= QUIET_RMS_ON ? 'QUIET' : 'NORMAL'
  const low = word(bandShare(analysis, ['sub', 'bass']))
  const mid = word(bandShare(analysis, ['lowMid', 'mid', 'highMid']))
  const high = word(bandShare(analysis, ['high', 'air']))
  let space: SimpleSummary['space'] = '—'
  if (analysis.stereo) {
    const width = analysis.stereo.width
    space = width < 0.08 ? 'MONO' : width < 0.25 ? 'NARROW' : width < WIDE_ON ? 'MEDIUM' : 'WIDE'
  }
  const crest = analysis.crestDb
  const dynamics = crest === null ? '—' : crest >= 12 ? 'HIGH' : crest >= 6 ? 'MEDIUM' : 'LOW'
  const transients = crest === null ? '—' : crest >= TRANSIENT_CREST_ON ? 'STRONG' : crest >= 6 ? 'MEDIUM' : 'LOW'
  return { level, low, mid, high, space, dynamics, transients }
}
