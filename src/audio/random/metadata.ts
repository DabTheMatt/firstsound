import type { ParamId } from '../parameters/types'
import type { RandomMeta } from './types'

/**
 * Discrete parameters Random may draw.
 * Continuous parameters stay on the family windows in distributions.ts.
 * UI-only choices (theme, mode, workspace, focus) are not parameters.
 */
export const RANDOM_META: Partial<Record<ParamId, RandomMeta>> = {
  stretchInterpAlgo: { kind: 'enum', options: [0, 1, 2], expensive: true },
  filterKind: { kind: 'filterType', options: [0, 1, 2, 3, 4, 5, 6], expensive: true },
  filterSlope: { kind: 'enum', options: [0, 1, 2, 3, 4, 5], expensive: true },
  filterCharacter: { kind: 'enum', options: [0, 1, 2, 3, 4] },
  filterLfoShape: { kind: 'enum', options: [0, 1, 2, 3, 4, 5] },
  filterLfoSync: { kind: 'boolean', options: [0, 1] },
  filterLfoNote: { kind: 'division', options: [0, 1, 2, 3, 4, 5, 6, 7] },
  filterLfoNoteKind: { kind: 'enum', options: [0, 1, 2] },
  filterEnvDir: { kind: 'enum', options: [0, 1] },
  delayNote: { kind: 'division', options: [0, 1, 2, 3, 4, 5, 6, 7] },
  delayNoteKind: { kind: 'enum', options: [0, 1, 2] },
  delayNoteR: { kind: 'division', options: [0, 1, 2, 3, 4, 5, 6, 7] },
  delayNoteKindR: { kind: 'enum', options: [0, 1, 2] },
  reverbNote: { kind: 'division', options: [0, 1, 2, 3, 4, 5, 6, 7] },
  reverbNoteKind: { kind: 'enum', options: [0, 1, 2] },
  /** Linked reverb stores Mix in Wet and derives Dry. Not an independent draw. */
  reverbDry: { kind: 'continuous', derived: true, auto: false },
  msHaasDir: { kind: 'enum', options: [0, 1] },
}

export function randomMeta(id: ParamId): RandomMeta | null {
  return RANDOM_META[id] ?? null
}

export function isDiscreteRandom(id: ParamId): boolean {
  const meta = randomMeta(id)
  return meta != null && meta.kind !== 'continuous' && meta.kind !== 'integer'
}

export function isAutoRandomizable(id: ParamId): boolean {
  const meta = randomMeta(id)
  if (meta?.auto === false) return false
  return true
}

export function isExpensiveRandom(id: ParamId): boolean {
  return randomMeta(id)?.expensive === true
}
