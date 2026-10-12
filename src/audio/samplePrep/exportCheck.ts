/**
 * Export preflight. Reads project settings and reports whether the current
 * export request can run. It does not render audio, resample, or edit prep.
 */

import { INSERTABLE_TYPES, type ModuleType } from '../chain/chain'
import { exportWorkingRange, prepMatchesWorkingBuffer, selectionExportAvailable } from '../engine/exportTail'
import type { ChannelMode, ExportScope, SamplePrepState, WavBitDepth } from './types'

/** Formats this build can encode. FLAC, AIFF, and MP3 are not offered. */
export const EXPORT_FORMATS = ['wav'] as const

/** Rates the technical exporter lists. Original file rate is separate. */
export const EXPORT_SAMPLE_RATES = [44100, 48000, 88200, 96000] as const

/** Rates the simple exporter lists. */
export const SIMPLE_EXPORT_RATES = [44100, 48000] as const

export const EXPORT_BIT_DEPTHS = [16, 24, 32] as const
export const SIMPLE_EXPORT_BIT_DEPTHS = [16, 24] as const

/** Matches the prep/export fit tolerance. Values inside it are the same span. */
const RANGE_EPS = 0.002
const MIN_SPAN = 0.001
/** Same ceiling as `exportFrameCount`. */
const MAX_SAMPLE_RATE = 384000

export type ExportCheckMode = 'simple' | 'technical' | 'sensory'
export type ExportCheckSeverity = 'error' | 'warning' | 'info'
export type ExportCheckField = 'format' | 'rate' | 'depth' | 'channels' | 'range' | 'effects'
export type ExportChannelId = 'mono' | 'stereo' | 'left' | 'right' | 'swap'

export type ExportCheckIssueId =
  | 'no-audio'
  | 'invalid-range'
  | 'zero-length'
  | 'range-outside'
  | 'unsupported-format'
  | 'unsupported-rate'
  | 'unsupported-depth'
  | 'selection-not-partial'
  | 'effects-included'
  | 'clip-unmeasured'
  | 'clip-detected'
  | 'clip-within'
  | 'resample'
  | 'swap-without-pair'

export type ExportCheckIssue = {
  id: ExportCheckIssueId
  severity: ExportCheckSeverity
}

export type ExportChainModule = {
  instanceId?: string
  type: string
  bypassed: boolean
}

/** Peak of a rendered export, valid only for the matching configuration key. */
export type ExportOutputMeasurement = {
  kind: 'export-output'
  peak: number
  key: string
}

export type ExportRangeOverride = {
  start: number
  end: number
  kind: 'full' | 'selection'
}

export type ExportCheckInput = {
  sampleLoaded: boolean
  sourceSampleRate: number
  sourceChannels: number
  bufferDuration: number
  regionStart: number
  regionEnd: number
  prep: SamplePrepState
  scope: ExportScope
  format: string
  sampleRate: number | 'original'
  bitDepth: number
  chain: readonly ExportChainModule[]
  /** Simple mode's explicit mono switch. Does not rewrite `prep.channelMode`. */
  forceMono?: boolean
  /** When set, this span is checked instead of the technical project/selection rule. */
  rangeOverride?: ExportRangeOverride
  /** Selection export must be a real subset. Technical selection passes true. */
  requirePartial?: boolean
  allowedRates?: readonly number[]
  allowedBitDepths?: readonly number[]
  bufferRev?: number
  /** Effect settings, automation, and modulation. A change invalidates a measurement. */
  processingStamp?: string
  measurement?: ExportOutputMeasurement | null
}

export type ExportCheckResult = {
  format: string | null
  formatSupported: boolean
  sampleRateHz: number | null
  sampleRateSupported: boolean
  rateIsOriginal: boolean
  bitDepth: number | null
  bitDepthSupported: boolean
  /** Integer PCM, or floating-point file encoding. Null when the depth is unsupported. */
  bitDepthKind: 'pcm' | 'float' | null
  /** True only for 16-bit, which the WAV encoder dithers with TPDF. */
  dither: boolean
  channels: ExportChannelId
  channelCount: number
  rangeKind: 'full' | 'selection'
  rangeStart: number
  rangeEnd: number
  duration: number
  rangeValid: boolean
  effectsIncluded: boolean
  activeEffects: ModuleType[]
  /** Set only when the measurement key matches this request. Never a stale peak. */
  measuredPeak: number | null
  measurementFresh: boolean
  issues: ExportCheckIssue[]
  canExport: boolean
  status: 'valid' | 'warning' | 'error'
}

export function exportChainKey(chain: readonly ExportChainModule[]): string {
  return chain.map((mod) => `${mod.instanceId ?? mod.type}:${mod.type}:${mod.bypassed ? 1 : 0}`).join('|')
}

export function exportProcessingStamp(state: {
  chain: readonly ExportChainModule[]
  automation: unknown
  lfos: unknown
  params: unknown
}): string {
  try {
    return JSON.stringify(state)
  } catch {
    return 'unreadable'
  }
}

export function activeExportEffects(chain: readonly ExportChainModule[]): ModuleType[] {
  const allowed = new Set<string>(INSERTABLE_TYPES)
  const seen: ModuleType[] = []
  for (const mod of chain) {
    if (mod.bypassed || !allowed.has(mod.type)) continue
    const type = mod.type as ModuleType
    if (!seen.includes(type)) seen.push(type)
  }
  return seen
}

export function exportChannelPlan(
  sourceChannels: number,
  mode: ChannelMode,
  forceMono = false,
): { count: number; id: ExportChannelId; note: 'swap-without-pair' | null } {
  if (forceMono || mode === 'mono') return { count: 1, id: 'mono', note: null }
  if (mode === 'left') return { count: 1, id: 'left', note: null }
  if (mode === 'right') return { count: 1, id: 'right', note: null }
  if (mode === 'swap') {
    if (sourceChannels >= 2) return { count: 2, id: 'swap', note: null }
    return { count: 1, id: 'mono', note: 'swap-without-pair' }
  }
  if (sourceChannels >= 2) return { count: 2, id: 'stereo', note: null }
  return { count: 1, id: 'mono', note: null }
}

export function formatExportSampleRate(hz: number, locale: 'en' | 'pl'): string {
  if (!Number.isFinite(hz) || hz <= 0) return '—'
  const khz = hz / 1000
  const trimmed = (Math.round(khz * 100) / 100).toFixed(2).replace(/\.?0+$/, '')
  const shown = locale === 'pl' ? trimmed.replace('.', ',') : trimmed
  return `${shown} kHz`
}

export function visibleExportFields(mode: ExportCheckMode): ExportCheckField[] {
  if (mode === 'simple') return ['format', 'range']
  return ['format', 'rate', 'depth', 'channels', 'range', 'effects']
}

export function visibleExportIssues(
  mode: ExportCheckMode,
  issues: readonly ExportCheckIssue[],
): ExportCheckIssue[] {
  return issues.filter((issue) => {
    if (mode === 'simple') {
      if (issue.severity === 'error' || issue.severity === 'warning') return true
      return issue.id === 'effects-included' || issue.id === 'clip-unmeasured'
    }
    return issue.id !== 'effects-included'
  })
}

export function exportCheckSignature(status: ExportCheckResult['status'], issues: readonly ExportCheckIssue[]): string {
  return `${status}:${issues.map((issue) => `${issue.severity}:${issue.id}`).join(',')}`
}

/** Announces a new error or warning. An unchanged signature stays quiet. */
export function exportCheckAnnouncement(
  previousSignature: string | null,
  status: ExportCheckResult['status'],
  issues: readonly ExportCheckIssue[],
): { signature: string; announce: 'problems' | 'recovered' | null } {
  const signature = exportCheckSignature(status, issues)
  if (previousSignature === signature) return { signature, announce: null }
  const problems = issues.some((issue) => issue.severity === 'error' || issue.severity === 'warning')
  if (problems) return { signature, announce: 'problems' }
  const hadProblem =
    previousSignature != null && (previousSignature.startsWith('error:') || previousSignature.startsWith('warning:'))
  if (hadProblem) return { signature, announce: 'recovered' }
  return { signature, announce: null }
}

type ResolvedRange = {
  start: number
  end: number
  kind: 'full' | 'selection'
  outside: boolean
  zero: boolean
  invalid: boolean
  partial: boolean
}

function resolveRange(input: ExportCheckInput): ResolvedRange {
  const duration = input.bufferDuration
  const clock = {
    bufferDuration: duration,
    regionStart: input.regionStart,
    regionEnd: input.regionEnd,
  }
  const partial = selectionExportAvailable(input.prep, clock)
  let start: number
  let end: number
  let kind: 'full' | 'selection'
  if (input.rangeOverride) {
    start = input.rangeOverride.start
    end = input.rangeOverride.end
    kind = input.rangeOverride.kind
  } else if (input.scope === 'selection') {
    start = input.regionStart
    end = input.regionEnd
    kind = 'selection'
  } else {
    start = input.prep.windowStart
    end = input.prep.windowEnd
    kind = 'full'
  }
  const finite = Number.isFinite(start) && Number.isFinite(end)
  const invalid = !finite || end < start
  const zero = finite && end >= start && end - start <= MIN_SPAN
  const outside = finite && (start < -RANGE_EPS || end > duration + RANGE_EPS)
  const aligned = prepMatchesWorkingBuffer(input.prep, duration)
  const display =
    !invalid && !zero && !outside && !input.rangeOverride && aligned
      ? exportWorkingRange(input.prep, input.scope, clock)
      : { start, end }
  return {
    start: display.start,
    end: display.end,
    kind,
    outside,
    zero,
    invalid,
    partial,
  }
}

function emptyResult(range: ResolvedRange, channels: ReturnType<typeof exportChannelPlan>): ExportCheckResult {
  return {
    format: null,
    formatSupported: false,
    sampleRateHz: null,
    sampleRateSupported: false,
    rateIsOriginal: false,
    bitDepth: null,
    bitDepthSupported: false,
    bitDepthKind: null,
    dither: false,
    channels: channels.id,
    channelCount: channels.count,
    rangeKind: range.kind,
    rangeStart: range.start,
    rangeEnd: range.end,
    duration: 0,
    rangeValid: false,
    effectsIncluded: false,
    activeEffects: [],
    measuredPeak: null,
    measurementFresh: false,
    issues: [],
    canExport: false,
    status: 'error',
  }
}

export function exportMeasurementKey(input: ExportCheckInput): string {
  const range = resolveRange(input)
  const mode = input.forceMono ? 'mono' : input.prep.channelMode
  const channels = exportChannelPlan(input.sourceChannels, input.forceMono ? 'mono' : input.prep.channelMode, false)
  return [
    input.bufferRev ?? 0,
    input.sourceSampleRate,
    range.start.toFixed(4),
    range.end.toFixed(4),
    input.scope,
    input.format,
    String(input.sampleRate),
    input.bitDepth,
    channels.count,
    mode,
    input.forceMono ? 1 : 0,
    exportChainKey(input.chain),
    input.processingStamp ?? '',
  ].join('~')
}

function finish(result: ExportCheckResult, issues: ExportCheckIssue[]): ExportCheckResult {
  const rank: Record<ExportCheckSeverity, number> = { error: 0, warning: 1, info: 2 }
  const ordered = [...issues].sort((a, b) => rank[a.severity] - rank[b.severity])
  const canExport = !ordered.some((issue) => issue.severity === 'error')
  const status = ordered.some((issue) => issue.severity === 'error')
    ? 'error'
    : ordered.some((issue) => issue.severity === 'warning')
      ? 'warning'
      : 'valid'
  return { ...result, issues: ordered, canExport, status }
}

export function evaluateExportCheck(input: ExportCheckInput): ExportCheckResult {
  const channelMode = input.forceMono ? 'mono' : input.prep.channelMode
  const channels = exportChannelPlan(input.sourceChannels, channelMode, false)
  const range = resolveRange(input)
  const base = emptyResult(range, channels)
  const audioMissing =
    !input.sampleLoaded || !(input.bufferDuration > 0) || !(input.sourceSampleRate > 0) || !Number.isFinite(input.sourceSampleRate)
  if (audioMissing) {
    return finish(base, [{ id: 'no-audio', severity: 'error' }])
  }

  const issues: ExportCheckIssue[] = []
  const formatSupported = (EXPORT_FORMATS as readonly string[]).includes(input.format)
  const allowedRates = input.allowedRates ?? EXPORT_SAMPLE_RATES
  const allowedDepths = input.allowedBitDepths ?? EXPORT_BIT_DEPTHS
  let sampleRateHz: number | null = null
  let sampleRateSupported = false
  const rateIsOriginal = input.sampleRate === 'original'
  if (rateIsOriginal) {
    const source = input.sourceSampleRate
    sampleRateSupported = Number.isFinite(source) && source > 0 && source <= MAX_SAMPLE_RATE
    sampleRateHz = sampleRateSupported ? source : null
  } else if (typeof input.sampleRate === 'number' && Number.isFinite(input.sampleRate)) {
    sampleRateHz = input.sampleRate
    sampleRateSupported =
      input.sampleRate > 0 && input.sampleRate <= MAX_SAMPLE_RATE && allowedRates.includes(input.sampleRate)
  }
  const bitDepthSupported = allowedDepths.includes(input.bitDepth)
  const bitDepthKind: ExportCheckResult['bitDepthKind'] =
    !bitDepthSupported ? null : input.bitDepth === 32 ? 'float' : 'pcm'
  const dither = bitDepthSupported && input.bitDepth === 16
  const activeEffects = activeExportEffects(input.chain)
  const rangeValid = !range.invalid && !range.zero && !range.outside
  const requirePartial = input.requirePartial ?? input.scope === 'selection'
  const span = range.end - range.start
  const duration = Number.isFinite(span) ? Math.max(0, span) : 0

  if (!formatSupported) issues.push({ id: 'unsupported-format', severity: 'error' })
  if (!sampleRateSupported) issues.push({ id: 'unsupported-rate', severity: 'error' })
  if (!bitDepthSupported) issues.push({ id: 'unsupported-depth', severity: 'error' })
  if (range.invalid) issues.push({ id: 'invalid-range', severity: 'error' })
  else if (range.zero) issues.push({ id: 'zero-length', severity: 'error' })
  else if (range.outside) issues.push({ id: 'range-outside', severity: 'error' })
  else if (requirePartial && input.scope === 'selection' && !range.partial) {
    issues.push({ id: 'selection-not-partial', severity: 'error' })
  }
  if (sampleRateSupported && !rateIsOriginal && sampleRateHz !== input.sourceSampleRate) {
    issues.push({ id: 'resample', severity: 'info' })
  }
  if (channels.note === 'swap-without-pair') issues.push({ id: 'swap-without-pair', severity: 'info' })
  if (activeEffects.length) issues.push({ id: 'effects-included', severity: 'info' })

  const key = exportMeasurementKey(input)
  const measurement = input.measurement
  const freshPeak =
    measurement?.kind === 'export-output' && measurement.key === key && Number.isFinite(measurement.peak)
      ? measurement.peak
      : null
  if (freshPeak == null) {
    issues.push({ id: 'clip-unmeasured', severity: 'info' })
  } else if (freshPeak > 1) {
    issues.push({ id: 'clip-detected', severity: 'warning' })
  } else {
    issues.push({ id: 'clip-within', severity: 'info' })
  }

  return finish(
    {
      ...base,
      format: formatSupported ? input.format : null,
      formatSupported,
      sampleRateHz,
      sampleRateSupported,
      rateIsOriginal,
      bitDepth: bitDepthSupported ? input.bitDepth : null,
      bitDepthSupported,
      bitDepthKind,
      dither,
      channels: channels.id,
      channelCount: channels.count,
      rangeKind: range.kind,
      rangeStart: range.start,
      rangeEnd: range.end,
      duration,
      rangeValid: rangeValid && !(requirePartial && input.scope === 'selection' && !range.partial),
      effectsIncluded: activeEffects.length > 0,
      activeEffects,
      measuredPeak: freshPeak,
      measurementFresh: freshPeak != null,
    },
    issues,
  )
}

export function isSupportedExportFormat(format: string): format is (typeof EXPORT_FORMATS)[number] {
  return (EXPORT_FORMATS as readonly string[]).includes(format)
}

export function isSupportedWavBitDepth(depth: number, allowed: readonly number[] = EXPORT_BIT_DEPTHS): depth is WavBitDepth {
  return allowed.includes(depth)
}
