import { useEngine } from '../hooks/useEngine'
import { reverbSpacePicture, type ReverbSpacePicture } from './reverbDepth'

const DRY: ReverbSpacePicture = { engaged: false, size: 0, distance: 0, wet: 0, decay: 0 }

/** Room size and source distance from the engaged reverb. Wet stays a separate amount. */
export function useReverbSpace(): ReverbSpacePicture {
  const snap = useEngine()
  const engaged = snap.chain.some((mod) => mod.type === 'reverb' && !mod.bypassed)
  if (!engaged) return DRY
  return reverbSpacePicture({
    engaged,
    wet: snap.params.reverbWet,
    distance: snap.params.reverbDistance,
    size: snap.params.reverbSize,
    decaySec: snap.params.reverbDecay,
  })
}
