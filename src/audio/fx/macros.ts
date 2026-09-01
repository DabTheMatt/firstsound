import { PARAMS } from '../parameters/definitions'
import { fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

export type DelayMacro = 'time' | 'feedback' | 'color' | 'space' | 'mod' | 'mix'
export type ReverbMacro = 'size' | 'decay' | 'color' | 'distance' | 'mod' | 'mix'

export const DELAY_MACROS: { id: DelayMacro; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'color', label: 'Color' },
  { id: 'space', label: 'Space' },
  { id: 'mod', label: 'Mod' },
  { id: 'mix', label: 'Mix' },
]

export const REVERB_MACROS: { id: ReverbMacro; label: string }[] = [
  { id: 'size', label: 'Size' },
  { id: 'decay', label: 'Decay' },
  { id: 'color', label: 'Color' },
  { id: 'distance', label: 'Distance' },
  { id: 'mod', label: 'Mod' },
  { id: 'mix', label: 'Mix' },
]

export function delayMacroNormalized(id: DelayMacro, params: Record<ParamId, number>): number {
  switch (id) {
    case 'time':
      return toNormalized(params.delayTime, PARAMS.delayTime)
    case 'feedback':
      return toNormalized(params.delayFeedback, PARAMS.delayFeedback)
    case 'color':
      return (toNormalized(params.delayLp, PARAMS.delayLp) * 0.55 +
        (1 - toNormalized(params.delayHp, PARAMS.delayHp)) * 0.25 +
        (1 - params.delayDrive / 100) * 0.2)
    case 'space':
      return (params.delayWidth / 200) * 0.5 + (params.delayDiffusion / 100) * 0.5
    case 'mod':
      return Math.min(
        1,
        params.delayModDepth / 100 * 0.5 + params.delayWow / 200 + params.delayFlutter / 200,
      )
    case 'mix':
      return params.spaceMix / 100
  }
}

export function reverbMacroNormalized(id: ReverbMacro, params: Record<ParamId, number>): number {
  switch (id) {
    case 'size':
      return toNormalized(params.reverbSize, PARAMS.reverbSize)
    case 'decay':
      return toNormalized(params.reverbDecay, PARAMS.reverbDecay)
    case 'color':
      return (params.reverbColor + 100) / 200
    case 'distance':
      return params.reverbDistance / 100
    case 'mod':
      return Math.min(1, params.reverbModDepth / 100 * 0.7 + params.reverbShimmer / 300)
    case 'mix':
      return params.reverb / 100
  }
}

export function applyDelayMacro(
  id: DelayMacro,
  n: number,
  params: Record<ParamId, number>,
): Partial<Record<ParamId, number>> {
  const t = Math.min(1, Math.max(0, n))
  switch (id) {
    case 'time':
      return { delayTime: fromNormalized(t, PARAMS.delayTime), delaySync: 0 }
    case 'feedback':
      return { delayFeedback: fromNormalized(t, PARAMS.delayFeedback) }
    case 'color':
      return {
        delayLp: fromNormalized(0.35 + t * 0.65, PARAMS.delayLp),
        delayHp: fromNormalized((1 - t) * 0.45, PARAMS.delayHp),
        delayDrive: (1 - t) * 28,
      }
    case 'space':
      return {
        delayWidth: t * 200,
        delayDiffusion: t * 70,
        delayOffset: params.delayOffset,
      }
    case 'mod':
      return {
        delayModDepth: t * 100,
        delayWow: t * 40,
        delayFlutter: t * 22,
        delayModRate: fromNormalized(0.2 + t * 0.35, PARAMS.delayModRate),
      }
    case 'mix':
      return { spaceMix: t * 100 }
  }
}

export function applyReverbMacro(
  id: ReverbMacro,
  n: number,
  params: Record<ParamId, number>,
): Partial<Record<ParamId, number>> {
  const t = Math.min(1, Math.max(0, n))
  void params
  switch (id) {
    case 'size':
      return { reverbSize: fromNormalized(t, PARAMS.reverbSize) }
    case 'decay':
      return { reverbDecay: fromNormalized(t, PARAMS.reverbDecay) }
    case 'color':
      return {
        reverbColor: t * 200 - 100,
        reverbDamping: fromNormalized(0.25 + t * 0.7, PARAMS.reverbDamping),
        reverbHighCut: fromNormalized(0.4 + t * 0.6, PARAMS.reverbHighCut),
      }
    case 'distance':
      return {
        reverbDistance: t * 100,
        reverbPredelay: fromNormalized(t * 0.55, PARAMS.reverbPredelay),
        reverbEarly: 20 + (1 - t) * 55,
        reverbLowCut: fromNormalized(t * 0.4, PARAMS.reverbLowCut),
      }
    case 'mod':
      return {
        reverbModDepth: t * 100,
        reverbModRate: fromNormalized(0.25 + t * 0.4, PARAMS.reverbModRate),
      }
    case 'mix':
      return { reverb: t * 100 }
  }
}
