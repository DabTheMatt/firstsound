import type { HistoryState } from './history'
import { commitHistory } from './history'
import { cloneFxLfos } from '../audio/fx/lfo'
import { dspSnapshotsEqual, type DspSnapshot } from '../sensory/mapping/mappingEngine'

export function cloneDspSnapshot(dsp: DspSnapshot): DspSnapshot {
  return {
    params: { ...dsp.params },
    eqBands: dsp.eqBands.map((band) => ({ ...band })),
    bypass: { ...dsp.bypass },
    fxLfos: cloneFxLfos(dsp.fxLfos),
    reverbType: dsp.reverbType,
    distortionType: dsp.distortionType,
  }
}

type DspCarrier = {
  layer: string
  dsp?: DspSnapshot
}

/**
 * One undo step for a finished DSP gesture.
 * The previous present is kept as the undo target, with the pre-gesture DSP attached.
 */
export function commitDspGesture<T extends DspCarrier>(
  history: HistoryState<T>,
  before: DspSnapshot,
  after: DspSnapshot,
  equals: (a: T, b: T) => boolean,
): HistoryState<T> {
  if (dspSnapshotsEqual(before, after) && before.eqBands.length === after.eqBands.length) {
    const sameIds = before.eqBands.every((band, index) => band.id === after.eqBands[index]?.id)
    if (sameIds) return history
  }
  const prev = { ...history.present, layer: 'dsp', dsp: cloneDspSnapshot(before) }
  const next = { ...prev, dsp: cloneDspSnapshot(after) }
  return commitHistory({ ...history, present: prev }, next, equals)
}
