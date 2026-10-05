import type { ModuleType } from '../../audio/chain/chain'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import { mobilePriority } from '../../app/mobilePriority'

/**
 * Presentation grouping for the experimental Technical context panel.
 * Reuses the existing per-effect audit in `mobilePriority`.
 * Parameter ids, ranges, and defaults stay on the shared model.
 */
export type DisclosureTier = 'primary' | 'secondary' | 'advanced'

export function disclosureTiers(type: ModuleType): Record<DisclosureTier, readonly ParamId[]> {
  const grouped = mobilePriority(type)
  return {
    primary: grouped.primary,
    secondary: grouped.secondary,
    advanced: grouped.advanced,
  }
}

export function primaryParamIds(type: ModuleType): readonly ParamId[] {
  return disclosureTiers(type).primary.slice(0, 5)
}

/** Controls that affect sound but are not in the phone priority lists. */
const EXTRA_HIDDEN: Partial<Record<ModuleType, readonly ParamId[]>> = {
  gain: ['stretchInterpAlgo'],
}

export function hiddenParamIds(type: ModuleType): readonly ParamId[] {
  const tiers = disclosureTiers(type)
  return [...tiers.secondary, ...tiers.advanced, ...(EXTRA_HIDDEN[type] ?? [])]
}

export function paramIsNotable(
  id: ParamId,
  value: number,
  flags: { automated?: boolean; modulated?: boolean; randomized?: boolean } = {},
): boolean {
  if (flags.automated || flags.modulated || flags.randomized) return true
  return value !== PARAMS[id].defaultValue
}

export function hiddenNotableCount(
  type: ModuleType,
  notable: (id: ParamId) => boolean,
): number {
  return hiddenParamIds(type).filter((id) => notable(id)).length
}

export function countHiddenActivity(input: {
  type: ModuleType
  params: Record<ParamId, number>
  automated: (id: ParamId) => boolean
  modulated: (id: ParamId) => boolean
  randomized: (id: ParamId) => boolean
  extra?: number
}): number {
  return (
    hiddenNotableCount(input.type, (id) =>
      paramIsNotable(id, input.params[id], {
        automated: input.automated(id),
        modulated: input.modulated(id),
        randomized: input.randomized(id),
      }),
    ) + (input.extra ?? 0)
  )
}

/** Active EQ state that compact context does not edit directly. */
export function eqHiddenNotable(
  bands: readonly { type: string; bypassed?: boolean }[],
  combEnabled: boolean,
  selectedIndex: number,
): number {
  let count = combEnabled ? 1 : 0
  bands.forEach((band, index) => {
    if (index === selectedIndex) return
    if (band.type !== 'off' && !band.bypassed) count += 1
  })
  return count
}
