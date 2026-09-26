import type { ChainModule } from '../chain/chain'
import { safeFeedbackGain } from '../fx/dryWet'
import { impulseLengthSec, type ImpulseSpec } from '../fx/impulse'
import { isDelayStereo } from '../fx/spaceModel'
import { wetDryFor } from '../fx/graphs'
import type { ReverbType } from '../fx/types'
import type { ParamId } from '../parameters/types'
import type { ExportScope, SamplePrepState } from '../samplePrep/types'

export type { ExportScope }

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

/**
 * Export Selection is available only when the region is a real subset.
 * A full-window region is not a selection — the action stays disabled.
 */
export function selectionExportAvailable(prep: SamplePrepState): boolean {
  const span = prep.selectionEnd - prep.selectionStart
  if (!(span > 0.001)) return false
  return prep.selectionStart > prep.windowStart + 0.001 || prep.selectionEnd < prep.windowEnd - 0.001
}

const TAIL_THRESHOLD = 0.00045
const TAIL_HOLD_SEC = 0.06
const TAIL_SAFETY_SEC = 12

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
  return Math.min(TAIL_SAFETY_SEC, budget)
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
