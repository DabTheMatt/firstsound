import { SCENE_MODE_KEY, SCENE_MODES, type ShedSceneMode } from './model'

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function parseSceneMode(value: unknown): ShedSceneMode {
  return value === 'city' || value === 'architecture' ? value : 'architecture'
}

export function loadSceneMode(): ShedSceneMode {
  const store = storage()
  if (!store) return 'architecture'
  try {
    return parseSceneMode(store.getItem(SCENE_MODE_KEY))
  } catch {
    return 'architecture'
  }
}

export function persistSceneMode(mode: ShedSceneMode): void {
  if (!(SCENE_MODES as readonly string[]).includes(mode)) return
  const store = storage()
  if (!store) return
  try {
    store.setItem(SCENE_MODE_KEY, mode)
  } catch {
    /* The sheet still switches for this visit. */
  }
}
