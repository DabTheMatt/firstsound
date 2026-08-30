import { useSyncExternalStore } from 'react'
import { engine } from '../audio/engine/AudioEngine'

export function useEngine() {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
}

export { engine }
