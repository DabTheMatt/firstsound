import { mobilePriority } from '../app/mobilePriority'
import type { ModuleType } from '../audio/chain/chain'
import { PARAMS } from '../audio/parameters/definitions'
import type { ParamId } from '../audio/parameters/types'
import type { HelpEffect } from './context'

const MODULE: Record<HelpEffect, ModuleType> = {
  gain: 'gain',
  output: 'output',
  grain: 'grain',
  eq: 'eq',
  filter: 'filter',
  midside: 'midside',
  distortion: 'distortion',
  delay: 'delay',
  reverb: 'reverb',
  compressor: 'compressor',
  limiter: 'limiter',
}

const EQ_PARAMS: readonly ParamId[] = ['eq1Freq', 'eq1Gain', 'eq1Q']

export function effectParamIds(effect: HelpEffect): readonly ParamId[] {
  if (effect === 'eq') return EQ_PARAMS
  const grouped = mobilePriority(MODULE[effect])
  return [...grouped.primary, ...grouped.secondary]
}

export function moduleNoteId(effect: HelpEffect): string {
  if (effect === 'gain') return 'module.gain'
  if (effect === 'output') return 'module.output'
  return `module.${effect}`
}

export function isHelpParam(id: string | null | undefined): id is ParamId {
  return Boolean(id && Object.prototype.hasOwnProperty.call(PARAMS, id))
}
