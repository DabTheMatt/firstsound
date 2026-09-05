export const SENSORY_SCENE_STORAGE_KEY = 'firstsound.sensoryScene'

export const SENSORY_SCENE_IDS = ['range', 'glass'] as const

export type SensorySceneId = (typeof SENSORY_SCENE_IDS)[number]

export function parseSensoryScene(raw: string | null | undefined): SensorySceneId {
  if (raw === 'range' || raw === 'glass') return raw
  return 'range'
}

export function readStoredSensoryScene(): SensorySceneId {
  try {
    return parseSensoryScene(localStorage.getItem(SENSORY_SCENE_STORAGE_KEY))
  } catch {
    return 'range'
  }
}

export function persistSensoryScene(scene: SensorySceneId): void {
  try {
    localStorage.setItem(SENSORY_SCENE_STORAGE_KEY, scene)
  } catch {
    /* private mode */
  }
}
