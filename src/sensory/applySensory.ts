import type { AudioEngine } from '../audio/engine/AudioEngine'
import { FX_LFO_KINDS, FX_LFO_SLOTS } from '../audio/fx/lfo'
import type { ReverbType } from '../audio/fx/types'
import type { DspSnapshot } from './mapping/mappingEngine'
import { fxLfoSlotChanged, mapSensoryToDsp, snapshotFromEngine } from './mapping/mappingEngine'
import type { SensoryValues } from './sensoryState'

export function sensoryReverbType(_space: number): ReverbType {
  return 'hall'
}

export function captureDsp(engine: AudioEngine): DspSnapshot {
  const snap = engine.getSnapshot()
  return snapshotFromEngine(snap)
}

export function writeDsp(engine: AudioEngine, dsp: DspSnapshot): void {
  const snap = engine.getSnapshot()
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
  engine.setReverbType(sensoryReverbType(values.space))
  return mapped
}
