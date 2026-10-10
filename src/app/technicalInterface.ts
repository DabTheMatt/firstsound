/**
 * Choice of Technical presentation.
 * The previous key, `field.technicalInterface`, stored Classic while Classic was the default.
 * This key starts empty, so a refresh opens Workspace until Classic is chosen again.
 */
export const TECHNICAL_INTERFACE_KEY = 'field.technicalUi'

/** Presentation variant of Technical mode. Not an audio mode. */
export const TECHNICAL_INTERFACES = ['classic', 'workspace'] as const

export type TechnicalInterface = (typeof TECHNICAL_INTERFACES)[number]

export function parseTechnicalInterface(raw: string | null | undefined): TechnicalInterface {
  if (raw === 'classic') return 'classic'
  if (raw == null || raw === '' || raw === 'workspace') return 'workspace'
  return 'classic'
}

export function readStoredTechnicalInterface(): TechnicalInterface {
  try {
    return parseTechnicalInterface(localStorage.getItem(TECHNICAL_INTERFACE_KEY))
  } catch {
    return 'workspace'
  }
}

const listeners = new Set<() => void>()

export function persistTechnicalInterface(next: TechnicalInterface): void {
  try {
    localStorage.setItem(TECHNICAL_INTERFACE_KEY, next)
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener()
}

export function subscribeTechnicalInterface(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
