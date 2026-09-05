import type { EqFilterType } from '../../audio/engine/eqBands'
import type { ModuleType } from '../../audio/chain/chain'
import type { ParamId } from '../../audio/parameters/types'
import type { SensoryAxisId } from '../sensoryParameters'
import type { CurveKind } from './curves'

export type MappingPolarity = 'pos' | 'neg' | 'both'

export type ParamMappingRule = {
  kind: 'param'
  target: ParamId
  /** Added to the base parameter (DSP units). */
  amount: number
  curve: CurveKind
  polarity?: MappingPolarity
  gate?: number
  weight?: number
}

export type EqMappingRule = {
  kind: 'eq'
  band: number
  type: EqFilterType
  frequency: number
  gain: number
  q: number
  curve: CurveKind
  polarity?: MappingPolarity
  gate?: number
  weight?: number
}

export type SensoryMappingRule = ParamMappingRule | EqMappingRule

export type InteractionModifier = {
  axes: readonly SensoryAxisId[]
  /** Multiply overlapping positive energy. */
  scale?: number
  extras?: readonly SensoryMappingRule[]
}

export type BypassHint = {
  module: ModuleType
  /** Un-bypass when this parameter exceeds the threshold (absolute). */
  param: ParamId
  threshold: number
}
