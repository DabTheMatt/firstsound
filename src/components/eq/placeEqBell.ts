import { EQ_MAX_BANDS, type EqBand } from '../../audio/engine/eqBands'
import { selectEqBand } from '../../audio/engine/eqBandSelection'
import { engine } from '../../hooks/useEngine'

/** Turn an empty slot, or a new band, into a bell and select it. */
export function placeEqBell(
  instanceId: string | null,
  chainLength: number,
  patch: Pick<EqBand, 'frequency' | 'gain' | 'q'>,
): { instanceId: string; index: number } | null {
  let id = instanceId
  if (!id) {
    id = engine.insertModule('eq', Math.max(0, chainLength - 2))
  }
  if (!id) return null
  const bands = engine.getSnapshot().eqById[id]?.bands ?? []
  let index = bands.findIndex((band) => band.type === 'off')
  if (index < 0) {
    if (bands.length >= EQ_MAX_BANDS) return null
    const next = engine.addEqBand(id)
    if (next == null) return null
    index = next
  }
  engine.setEqBand(
    index,
    { type: 'peaking', frequency: patch.frequency, gain: patch.gain, q: patch.q, bypassed: false },
    id,
  )
  const mod = engine.getSnapshot().chain.find((item) => item.instanceId === id)
  if (mod?.bypassed) engine.setModuleBypass(id, false)
  selectEqBand({ instanceId: id, index })
  return { instanceId: id, index }
}
