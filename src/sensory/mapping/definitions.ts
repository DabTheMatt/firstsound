import type { InteractionModifier, SensoryMappingRule } from './types'
import type { SensoryAxisId } from '../sensoryParameters'

/** Additive rules retired: each control morphs one effect via EFFECT_MORPHS. */
export const SENSORY_MAPPINGS: Record<SensoryAxisId, readonly SensoryMappingRule[]> = {
  character: [],
  space: [],
  echo: [],
  grain: [],
  dirt: [],
  tight: [],
  mod: [],
  drift: [],
  pan: [],
  veil: [],
  halo: [],
  well: [],
  bloom: [],
  plate: [],
  spring: [],
  shimmer: [],
  reverse: [],
  gate: [],
  fuzz: [],
  crush: [],
  tape: [],
  fold: [],
  vinyl: [],
  sweep: [],
  dark: [],
  thin: [],
  phone: [],
  notch: [],
  peak: [],
  comb: [],
  melt: [],
}

export const SENSORY_INTERACTIONS: readonly InteractionModifier[] = []
