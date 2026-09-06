import type { AudioEngine } from '../audio/engine/AudioEngine'
import { FX_LFO_KINDS, FX_LFO_SLOTS } from '../audio/fx/lfo'
import type { CreativeFilterType } from '../audio/fx/filter'
import type { DistortionType, ReverbType } from '../audio/fx/types'
import { EFFECT_MORPHS } from './mapping/effectMorphs'
import { MORPH_GATE } from './mapping/morph'
import type { DspSnapshot } from './mapping/mappingEngine'
import { fxLfoSlotChanged, mapSensoryToDsp, snapshotFromEngine } from './mapping/mappingEngine'
import type { SensoryAxisId } from './sensoryParameters'
import type { SensoryValues } from './sensoryState'

function strongestMorphColor<T extends 'reverbType' | 'distortionType' | 'filterType'>(
  values: SensoryValues | number,
  field: T,
): NonNullable<(typeof EFFECT_MORPHS)[number][T]> | undefined {
  if (typeof values === 'number') return field === 'reverbType' ? ('hall' as never) : undefined
  let best = MORPH_GATE
  let picked: NonNullable<(typeof EFFECT_MORPHS)[number][T]> | undefined
  for (const morph of EFFECT_MORPHS) {
    const amount = Math.abs(values[morph.axis as SensoryAxisId] ?? 0)
    const color = morph[field]
    if (!color || amount < best) continue
    best = amount
    picked = color
  }
  return picked
}

export function sensoryReverbType(values: SensoryValues | number): ReverbType {
  return strongestMorphColor(values, 'reverbType') ?? 'hall'
}

export function sensoryDistortionType(values: SensoryValues): DistortionType | undefined {
  return strongestMorphColor(values, 'distortionType')
}

export function sensoryFilterType(values: SensoryValues): CreativeFilterType | undefined {
  return strongestMorphColor(values, 'filterType')
}

export function captureDsp(engine: AudioEngine): DspSnapshot {
  const snap = engine.getSnapshot()
  return snapshotFromEngine(snap)
}

export function writeDsp(engine: AudioEngine, dsp: DspSnapshot): void {
  const snap = engine.getSnapshot()
  if (dsp.reverbType) engine.setReverbType(dsp.reverbType)
  if (dsp.distortionType) engine.setDistortionType(dsp.distortionType)
  const patch: Partial<typeof snap.params> = { ...dsp.params }
  delete patch.start
  delete patch.end
  engine.setParams(patch)
  dsp.eqBands.forEach((band, i) => {
    engine.setEqBand(i, band)
  })
  const chain = engine.getSnapshot().chain
  for (const mod of chain) {
    const want = dsp.bypass[mod.type]
    if (typeof want !== 'boolean') continue
    if (want !== mod.bypassed) engine.setModuleBypass(mod.instanceId, want)
  }
  const eq = engine.getSnapshot().chain.find((m) => m.type === 'eq')
  if (eq && dsp.bypass.eq === false && eq.bypassed) {
    engine.setModuleBypass(eq.instanceId, false)
  }
  const liveMap = engine.getSnapshot().fxLfos
  for (const kind of FX_LFO_KINDS) {
    for (let slot = 0; slot < FX_LFO_SLOTS; slot++) {
      const want = dsp.fxLfos[kind][slot]
      if (!want) continue
      if (!fxLfoSlotChanged(liveMap[kind][slot], want)) continue
      engine.setFxLfo(kind, slot, {
        target: want.target,
        shape: want.shape,
        depth: want.depth,
        rateHz: want.rateHz,
      })
    }
  }
}

export function applySensorySession(engine: AudioEngine, base: DspSnapshot, values: SensoryValues): DspSnapshot {
  const mapped = mapSensoryToDsp(base, values)
  writeDsp(engine, mapped)
  return mapped
}
