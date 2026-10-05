import type { ModuleType } from '../audio/chain/chain'
import type { EqBand } from '../audio/engine/eqBands'
import { FX_LFO_KINDS, type FxLfoMap } from '../audio/fx/lfo'
import type { DelayType, ReverbType } from '../audio/fx/types'
import type { DspSnapshot } from '../sensory/mapping/mappingEngine'
import { matchSimpleDelay, matchSimpleReverb } from './fxPresets'
import { matchSimpleTone } from './tonePresets'

const ADVANCED_MODULES: readonly ModuleType[] = ['grain', 'filter', 'midside', 'distortion', 'compressor', 'limiter']

export function bypassSimpleListen(dsp: DspSnapshot): DspSnapshot {
  return {
    ...dsp,
    bypass: { ...dsp.bypass, eq: true, reverb: true, delay: true },
  }
}

export function lfoIsRouted(map: FxLfoMap | undefined): boolean {
  if (!map) return false
  for (const kind of FX_LFO_KINDS) {
    for (const slot of map[kind] ?? []) {
      if (slot?.target) return true
    }
  }
  return false
}

export function simpleProcessingIsAdvanced(input: {
  chain: readonly { type: ModuleType; bypassed: boolean }[]
  eqBands: readonly EqBand[]
  eqBypassed: boolean
  reverb: {
    bypassed: boolean
    type: ReverbType
    wet: number
    size: number
    decay: number
    predelay: number
    correlate: number
  }
  delay: {
    bypassed: boolean
    type: DelayType
    wet: number
    wetR: number
    time: number
    feedback: number
    sync: number
    correlate: number
  }
  automationLaneCount: number
  lfoRouted: boolean
  chaos: boolean
}): boolean {
  if (input.chaos || input.lfoRouted || input.automationLaneCount > 0) return true
  for (const type of ADVANCED_MODULES) {
    const mod = input.chain.find((item) => item.type === type)
    if (mod && !mod.bypassed) return true
  }
  if (matchSimpleTone(input.eqBands as EqBand[], input.eqBypassed).id === 'custom') return true
  if (matchSimpleReverb(input.reverb).kind === 'custom') return true
  if (matchSimpleDelay(input.delay).kind === 'custom') return true
  return false
}
