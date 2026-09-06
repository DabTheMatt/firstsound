import { isCorrelated } from './dryWet'
import type { SpacePreset } from './presets'

/** Factory reverbs must stay under these so a click cannot slam the wet path. */
export const REVERB_PRESET_MAX_WET = 36
export const REVERB_PRESET_MAX_WET_HUGE = 30
export const REVERB_PRESET_MAX_WET_FREEZE = 18
export const REVERB_PRESET_MAX_DRIVE = 16
export const REVERB_PRESET_MAX_SHIMMER = 42
export const REVERB_PRESET_MAX_EARLY = 62
export const REVERB_PRESET_MAX_DECAY = 4.8
export const REVERB_PRESET_MAX_DECAY_FREEZE = 6.5

const HUGE_TYPES = new Set(['cathedral', 'largeHall', 'cloud', 'bloom', 'infinite', 'shimmer'])

export function reverbPresetWetCap(preset: SpacePreset): number {
  const freeze = (preset.params.reverbFreeze ?? 0) > 0.5 || preset.reverbType === 'infinite'
  if (freeze) return REVERB_PRESET_MAX_WET_FREEZE
  const decay = preset.params.reverbDecay ?? 0
  if ((preset.reverbType && HUGE_TYPES.has(preset.reverbType)) || decay >= 6) {
    return REVERB_PRESET_MAX_WET_HUGE
  }
  return REVERB_PRESET_MAX_WET
}

export function reverbPresetSafetyIssues(preset: SpacePreset): string[] {
  const issues: string[] = []
  const p = preset.params
  const wet = p.reverbWet ?? 0
  const cap = reverbPresetWetCap(preset)
  if (wet > cap) issues.push(`wet ${wet} > ${cap}`)
  const freeze = (p.reverbFreeze ?? 0) > 0.5 || preset.reverbType === 'infinite'
  const decayCap = freeze ? REVERB_PRESET_MAX_DECAY_FREEZE : REVERB_PRESET_MAX_DECAY
  if ((p.reverbDecay ?? 0) > decayCap) issues.push(`decay ${p.reverbDecay} > ${decayCap}`)
  if ((p.reverbDrive ?? 0) > REVERB_PRESET_MAX_DRIVE) issues.push(`drive ${p.reverbDrive}`)
  if ((p.reverbShimmer ?? 0) > REVERB_PRESET_MAX_SHIMMER) issues.push(`shimmer ${p.reverbShimmer}`)
  if ((p.reverbEarly ?? 0) > REVERB_PRESET_MAX_EARLY) issues.push(`early ${p.reverbEarly}`)
  if ((p.reverbColor ?? 0) !== 0) issues.push(`color ${p.reverbColor} (use EQ instead)`)
  if (isCorrelated(p.reverbCorrelate ?? 1) && typeof p.reverbDry === 'number' && p.reverbDry + wet !== 100) {
    issues.push(`correlated dry+wet ${p.reverbDry}+${wet}`)
  }
  return issues
}
