import type { ChainModule } from '../chain/chain'
import { safeFeedbackGain } from '../fx/dryWet'
import { impulseLengthSec, type ImpulseSpec } from '../fx/impulse'
import { isDelayStereo } from '../fx/spaceModel'
import { wetDryFor } from '../fx/graphs'
import type { ReverbType } from '../fx/types'
import type { ParamId } from '../parameters/types'
import type { ExportScope, SamplePrepState } from '../samplePrep/types'

export type { ExportScope }

/** Current export is one track. `master` is the future sum and is not rendered here. */
export type PlannedExportTarget =
  | { kind: 'track'; trackId: string }
  | { kind: 'selection'; trackId: string }
  | { kind: 'master' }

export function plannedExportTarget(scope: ExportScope, trackId: string): PlannedExportTarget {
  return scope === 'selection' ? { kind: 'selection', trackId } : { kind: 'track', trackId }
}

/** Working sample for Export, or the inner region for Export Selection. */
export function exportSourceRange(
  prep: SamplePrepState,
  scope: ExportScope,
): { start: number; end: number } {
  if (scope === 'selection') {
    return { start: prep.selectionStart, end: prep.selectionEnd }
  }
  return { start: prep.windowStart, end: prep.windowEnd }
}

/** Highlight on the buffer the waveform draws. Times are seconds in that buffer. */
export type WorkingExportClock = {
  bufferDuration: number
  regionStart: number
  regionEnd: number
}

const PREP_FIT_EPS = 0.002

/**
 * Prep times still address this buffer.
 * A bake that replaced the buffer (trim, use as sample) can leave prep
 * describing the original file; those times must not slice the new buffer.
 */
export function prepMatchesWorkingBuffer(prep: SamplePrepState, bufferDuration: number): boolean {
  if (!(bufferDuration > 0)) return false
  return (
    prep.windowStart >= -PREP_FIT_EPS &&
    prep.windowEnd <= bufferDuration + PREP_FIT_EPS &&
    prep.selectionStart >= -PREP_FIT_EPS &&
    prep.selectionEnd <= bufferDuration + PREP_FIT_EPS
  )
}

function clampSpan(start: number, end: number, duration: number): { start: number; end: number } {
  if (!(duration > 0)) return { start: 0, end: 0 }
  const s = Math.min(duration, Math.max(0, start))
  const e = Math.min(duration, Math.max(s, end))
  return { start: s, end: e }
}

/**
 * Slice of the working buffer — the audio the waveform shows.
 * Project is that working sample. Selection is the highlighted loop,
 * not a stale prep range and not the head of the original file.
 */
export function exportWorkingRange(
  prep: SamplePrepState,
  scope: ExportScope,
  clock: WorkingExportClock,
): { start: number; end: number } {
  const duration = Math.max(0, clock.bufferDuration)
  const highlight = clampSpan(clock.regionStart, clock.regionEnd, duration)
  if (!prepMatchesWorkingBuffer(prep, duration)) {
    if (scope === 'selection') return highlight
    return { start: 0, end: duration }
  }
  if (scope === 'selection') return highlight
  return clampSpan(prep.windowStart, prep.windowEnd, duration)
}

/** Point prep at the working-buffer slice `renderExportPcm` will read. */
export function prepForWorkingExport(
  prep: SamplePrepState,
  scope: ExportScope,
  clock: WorkingExportClock,
): SamplePrepState {
  const range = exportWorkingRange(prep, scope, clock)
  if (scope === 'selection') {
    return {
      ...prep,
      windowStart: 0,
      windowEnd: Math.max(clock.bufferDuration, range.end),
      selectionStart: range.start,
      selectionEnd: range.end,
    }
  }
  return {
    ...prep,
    windowStart: range.start,
    windowEnd: range.end,
  }
}

/**
 * Export Selection is available only when the region is a real subset.
 * A full-window region is not a selection — the action stays disabled.
 * Pass `clock` so the check uses the highlighted loop on the working buffer.
 */
export function selectionExportAvailable(prep: SamplePrepState, clock?: WorkingExportClock): boolean {
  if (clock) {
    const project = exportWorkingRange(prep, 'project', clock)
    const selection = exportWorkingRange(prep, 'selection', clock)
    const span = selection.end - selection.start
    if (!(span > 0.001)) return false
    return selection.start > project.start + 0.001 || selection.end < project.end - 0.001
  }
  const span = prep.selectionEnd - prep.selectionStart
  if (!(span > 0.001)) return false
  return prep.selectionStart > prep.windowStart + 0.001 || prep.selectionEnd < prep.windowEnd - 0.001
}

const TAIL_THRESHOLD = 0.00045
const TAIL_HOLD_SEC = 0.06

/**
 * Hard cap on delay/reverb tails. Feedback and reverb never reach exact zero,
 * so export must not extend the offline render while waiting for silence.
 */
export const MAX_EXPORT_TAIL_SEC = 12

/** Reject renders that would allocate an unbounded or multi-hour buffer. */
export const MAX_EXPORT_RENDER_SEC = 60 * 20

export function clampExportTail(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(MAX_EXPORT_TAIL_SEC, seconds)
}

/**
 * Finite frame count for OfflineAudioContext. Throws on NaN, Infinity,
 * non-positive rates, and durations past the safety cap.
 */
export function exportFrameCount(sourceFrames: number, sampleRate: number, tailSec: number): number {
  if (!Number.isFinite(sourceFrames) || sourceFrames < 1) {
    throw new Error('Invalid export duration')
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || sampleRate > 384000) {
    throw new Error('Invalid export sample rate')
  }
  const tail = clampExportTail(tailSec)
  const totalSeconds = sourceFrames / sampleRate + tail
  const frames = Math.max(sourceFrames, Math.ceil(totalSeconds * sampleRate))
  const maxFrames = Math.floor(MAX_EXPORT_RENDER_SEC * sampleRate)
  if (!Number.isFinite(frames) || frames < 1 || frames > maxFrames) {
    throw new Error('Export is too long to render')
  }
  return frames
}

function moduleByType(chain: readonly ChainModule[], type: ChainModule['type']): ChainModule | undefined {
  return chain.find((mod) => mod.type === type && !mod.bypassed)
}

function delayIsWet(params: Record<ParamId, number>): boolean {
  if (isDelayStereo(params)) return params.delayWet > 0.5 || params.delayWetR > 0.5
  return wetDryFor('delay', params).wet > 0.001
}

function reverbIsWet(params: Record<ParamId, number>): boolean {
  return wetDryFor('reverb', params).wet > 0.001
}

/**
 * Upper bound for how long the render must continue after the source so tails
 * can decay. Level detection trims the file earlier. This is not a fixed pad.
 */
export function effectTailBudgetSec(
  chain: readonly ChainModule[],
  params: Record<ParamId, number>,
  reverbType: ReverbType,
): number {
  let budget = 0
  const delay = moduleByType(chain, 'delay')
  if (delay && delayIsWet(params)) {
    const time = Math.max(params.delayTime, isDelayStereo(params) ? params.delayTimeR : 0) / 1000
    const fb = Math.max(safeFeedbackGain(params.delayFeedback), safeFeedbackGain(params.delayFeedbackR))
    const taps = fb < 0.02 ? 1 : Math.log(0.0005) / Math.log(Math.min(0.98, Math.max(fb, 0.02)))
    budget = Math.max(budget, time * Math.min(48, Math.max(1, taps)) + 0.05)
  }
  const reverb = moduleByType(chain, 'reverb')
  if (reverb && reverbIsWet(params)) {
    const spec: ImpulseSpec = {
      type: reverbType,
      sampleRate: 48000,
      decaySec: params.reverbDecay,
      size: params.reverbSize / 100,
      diffusion: params.reverbDiffusion / 100,
      density: params.reverbDensity / 100,
      early: params.reverbEarly / 100,
      damping: 1 - Math.min(1, params.reverbDamping / 18000),
      reverse: params.reverbReverse / 100,
      shimmer: params.reverbShimmer / 100,
      shimmerPitch: params.reverbShimmerPitch,
      color: params.reverbColor / 100,
      freeze: params.reverbFreeze > 0.5,
    }
    const pre = Math.min(1.8, params.reverbPredelay / 1000)
    budget = Math.max(budget, impulseLengthSec(spec) + pre + 0.08)
  }
  const rings =
    moduleByType(chain, 'eq') ||
    moduleByType(chain, 'filter') ||
    moduleByType(chain, 'distortion') ||
    moduleByType(chain, 'compressor') ||
    moduleByType(chain, 'limiter') ||
    moduleByType(chain, 'midside')
  if (rings) budget = Math.max(budget, 0.05)
  return clampExportTail(budget)
}

/**
 * Keep the source, then stop once the rendered tail stays under the threshold.
 * The cut is the start of that quiet stretch, so the hold itself is not appended.
 */
export function trimRenderedTail(
  channels: readonly Float32Array[],
  sourceFrames: number,
  sampleRate: number,
  threshold = TAIL_THRESHOLD,
  holdSec = TAIL_HOLD_SEC,
): number {
  const length = channels[0]?.length ?? 0
  const start = Math.max(0, Math.min(length, sourceFrames))
  if (length <= start) return length
  const hold = Math.max(1, Math.round(holdSec * sampleRate))
  let quietAt = -1
  let sawHot = false
  for (let i = start; i < length; i++) {
    let hot = false
    for (const ch of channels) {
      if (Math.abs(ch[i] ?? 0) >= threshold) {
        hot = true
        break
      }
    }
    if (hot) {
      sawHot = true
      quietAt = -1
    } else if (quietAt < 0) quietAt = i
    if (quietAt >= 0 && i - quietAt + 1 >= hold) return Math.max(start, quietAt)
  }
  // The render ended without a tail rising above the threshold.
  if (!sawHot) return start
  return length
}
