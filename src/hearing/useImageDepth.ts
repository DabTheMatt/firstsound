import { useEngine } from '../hooks/useEngine'
import { reverbImageDepth } from './reverbDepth'

/** Depth of the heard image. 0 is close in front of the listener, 1 is further in front. */
export function useImageDepth(): number {
  const snap = useEngine()
  const engaged = snap.chain.some((mod) => mod.type === 'reverb' && !mod.bypassed)
  return reverbImageDepth({
    engaged,
    wet: snap.params.reverbWet,
    distance: snap.params.reverbDistance,
    size: snap.params.reverbSize,
    predelayMs: snap.params.reverbPredelay,
  })
}
