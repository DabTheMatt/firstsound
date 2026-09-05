import type { AudioEngine } from '../audio/engine/AudioEngine'
import type { DspSnapshot } from './mapping/mappingEngine'
import { mapSensoryToDsp, snapshotFromEngine } from './mapping/mappingEngine'
import type { SensoryValues } from './sensoryState'

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
  for (const mod of snap.chain) {
    const want = dsp.bypass[mod.type]
    if (typeof want === 'boolean' && want !== mod.bypassed) {
      engine.setModuleBypass(mod.instanceId, want)
    }
  }
}

export function applySensorySession(engine: AudioEngine, base: DspSnapshot, values: SensoryValues): DspSnapshot {
  const mapped = mapSensoryToDsp(base, values)
  writeDsp(engine, mapped)
  return mapped
}
