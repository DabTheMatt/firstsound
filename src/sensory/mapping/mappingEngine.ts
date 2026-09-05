import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EqBand } from '../../audio/engine/eqBands'
import { defaultEqBands } from '../../audio/engine/eqBands'
import type { ChainModule, ModuleType } from '../../audio/chain/chain'
import { SENSORY_AXIS_IDS } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { shapedAmount } from './curves'
import { SENSORY_BYPASS_HINTS, SENSORY_INTERACTIONS, SENSORY_MAPPINGS } from './definitions'
import type { EqMappingRule, SensoryMappingRule } from './types'
import { defaultSensoryValues } from '../sensoryState'

export type DspSnapshot = {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  bypass: Partial<Record<ModuleType, boolean>>
}

export type MappedDsp = DspSnapshot

function cloneBands(bands: EqBand[]): EqBand[] {
  return bands.map((b) => ({ ...b }))
}

function cloneParams(params: Record<ParamId, number>): Record<ParamId, number> {
  return { ...params }
}

export function snapshotFromEngine(input: {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  chain: ChainModule[]
}): DspSnapshot {
  const bypass: DspSnapshot['bypass'] = {}
  for (const mod of input.chain) bypass[mod.type] = mod.bypassed
  return {
    params: cloneParams(input.params),
    eqBands: cloneBands(input.eqBands.length ? input.eqBands : defaultEqBands()),
    bypass,
  }
}

export function dspSnapshotsEqual(a: DspSnapshot, b: DspSnapshot, eps = 1e-3): boolean {
  const ids = Object.keys(a.params) as ParamId[]
  for (const id of ids) {
    if (Math.abs((a.params[id] ?? 0) - (b.params[id] ?? 0)) > eps) return false
  }
  if (a.eqBands.length !== b.eqBands.length) return false
  for (let i = 0; i < a.eqBands.length; i++) {
    const x = a.eqBands[i]
    const y = b.eqBands[i]
    if (!x || !y) return false
    if (x.type !== y.type) return false
    if (Math.abs(x.gain - y.gain) > eps) return false
    if (Math.abs(x.frequency - y.frequency) > 0.5) return false
    if (Math.abs(x.q - y.q) > eps) return false
  }
  const keys = new Set([...Object.keys(a.bypass), ...Object.keys(b.bypass)]) as Set<ModuleType>
  for (const key of keys) {
    if (Boolean(a.bypass[key]) !== Boolean(b.bypass[key])) return false
  }
  return true
}

function addParam(params: Record<ParamId, number>, id: ParamId, delta: number): void {
  if (!delta) return
  const def = PARAMS[id]
  params[id] = applyParamValue(params[id] + delta, def)
}

function applyEqRule(bands: EqBand[], rule: EqMappingRule, amount: number): void {
  if (!amount) return
  const i = rule.band
  const current = bands[i]
  if (!current) return
  const gainDelta = rule.gain * amount
  const canAdopt = current.type === 'off' || current.type === rule.type
  if (!canAdopt) {
    bands[i] = { ...current, gain: current.gain + gainDelta * 0.25 }
    return
  }
  const baseGain = current.type === rule.type ? current.gain : 0
  const nextType = rule.type === 'highpass' && amount > 0 ? 'highpass' : rule.type
  bands[i] = {
    type: nextType,
    frequency: current.type === rule.type ? current.frequency : rule.frequency,
    gain: baseGain + gainDelta,
    q: current.type === rule.type ? current.q : rule.q,
    slope: current.slope,
    bypassed: false,
  }
}

function applyRule(dsp: DspSnapshot, rule: SensoryMappingRule, axisValue: number, scale = 1): void {
  const polarity = rule.polarity ?? 'pos'
  const amt = shapedAmount(axisValue, rule.curve, polarity, rule.gate) * (rule.weight ?? 1) * scale
  if (!amt) return
  if (rule.kind === 'param') addParam(dsp.params, rule.target, rule.amount * amt)
  else applyEqRule(dsp.eqBands, rule, amt)
}

function interactionWeight(values: SensoryValues, axes: readonly import('../sensoryParameters').SensoryAxisId[]): number {
  let energy = 1
  for (const id of axes) {
    const v = values[id]
    energy *= Math.abs(v)
  }
  return energy
}

function applyBypassHints(dsp: DspSnapshot): void {
  for (const hint of SENSORY_BYPASS_HINTS) {
    const value = dsp.params[hint.param]
    const baseBypass = dsp.bypass[hint.module]
    if (baseBypass === false) continue
    const active =
      hint.param === 'compressorThreshold'
        ? Math.abs((value ?? 0) - PARAMS.compressorThreshold.defaultValue) > hint.threshold
        : Math.abs(value ?? 0) > hint.threshold
    if (active) dsp.bypass[hint.module] = false
  }
  const eqLive = dsp.eqBands.some((b) => b.type !== 'off' && Math.abs(b.gain) > 0.12)
  if (eqLive && dsp.bypass.eq !== false) dsp.bypass.eq = false
}

export function mapSensoryToDsp(base: DspSnapshot, values: SensoryValues): MappedDsp {
  const dsp: DspSnapshot = {
    params: cloneParams(base.params),
    eqBands: cloneBands(base.eqBands),
    bypass: { ...base.bypass },
  }
  for (const id of SENSORY_AXIS_IDS) {
    const v = values[id]
    if (!v) continue
    for (const rule of SENSORY_MAPPINGS[id]) applyRule(dsp, rule, v)
  }
  for (const interaction of SENSORY_INTERACTIONS) {
    const w = interactionWeight(values, interaction.axes)
    if (w < 0.04) continue
    const scale = interaction.scale ?? 1
    for (const extra of interaction.extras ?? []) {
      const polarity = extra.polarity ?? 'pos'
      applyRule(dsp, extra, polarity === 'neg' ? -w : w, scale)
    }
  }
  applyBypassHints(dsp)
  return dsp
}

export function identityMappingHolds(base: DspSnapshot): boolean {
  return dspSnapshotsEqual(mapSensoryToDsp(base, defaultSensoryValues()), base)
}
