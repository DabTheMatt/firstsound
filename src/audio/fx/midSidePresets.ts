import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import type { FxLfo } from './lfo'
import { MS_PARAM_IDS } from './midSide'

export type MidSideRecipeId =
  | 'monoFocus'
  | 'wide'
  | 'superWide'
  | 'darkCenter'
  | 'movingStereo'
  | 'sideTexture'
  | 'narrowBass'
  | 'unstable'

export type MidSideRecipe = {
  id: MidSideRecipeId
  label: string
  params: Partial<Record<ParamId, number>>
  lfo?: Partial<FxLfo>
}

function ms(patch: Partial<Record<ParamId, number>>): Partial<Record<ParamId, number>> {
  return patch
}

export const MIDSIDE_RECIPES: MidSideRecipe[] = [
  {
    id: 'monoFocus',
    label: 'Mono Focus',
    params: ms({
      msWidth: 12,
      msBalance: -62,
      msMidGain: 1.5,
      msSideGain: -8,
      msSideHpf: 140,
      msRotate: 0,
      msCrossfeed: 18,
      msHaasAmount: 0,
      msMidTilt: -8,
      msSideTilt: 0,
      msFlipMid: 0,
      msFlipSide: 0,
    }),
  },
  {
    id: 'wide',
    label: 'Wide',
    params: ms({
      msWidth: 148,
      msBalance: 18,
      msMidGain: 0,
      msSideGain: 1.5,
      msSideHpf: 90,
      msRotate: 0,
      msCrossfeed: 6,
      msHaasAmount: 0,
      msMidTilt: 0,
      msSideTilt: 12,
    }),
  },
  {
    id: 'superWide',
    label: 'Super Wide',
    params: ms({
      msWidth: 188,
      msBalance: 36,
      msMidGain: -1,
      msSideGain: 4,
      msSideHpf: 160,
      msRotate: 0,
      msCrossfeed: 0,
      msHaasAmount: 12,
      msHaasTime: 6,
      msSideTilt: 22,
    }),
  },
  {
    id: 'darkCenter',
    label: 'Dark Center',
    params: ms({
      msWidth: 128,
      msBalance: -8,
      msMidGain: 1,
      msSideGain: 2,
      msSideHpf: 110,
      msMidTilt: -48,
      msSideTilt: 42,
      msCrossfeed: 8,
      msHaasAmount: 0,
    }),
  },
  {
    id: 'movingStereo',
    label: 'Moving Stereo',
    params: ms({
      msWidth: 118,
      msBalance: 0,
      msMidGain: 0,
      msSideGain: 1,
      msSideHpf: 80,
      msRotate: 0,
      msCrossfeed: 4,
      msHaasAmount: 0,
    }),
    lfo: { target: 'msWidth', depth: 32, rateHz: 0.35, shape: 'sine' },
  },
  {
    id: 'sideTexture',
    label: 'Side Texture',
    params: ms({
      msWidth: 142,
      msBalance: 68,
      msMidGain: -7,
      msSideGain: 5,
      msSideHpf: 70,
      msSideTilt: 28,
      msMidTilt: -12,
      msCrossfeed: 0,
      msHaasAmount: 8,
      msHaasTime: 11,
    }),
  },
  {
    id: 'narrowBass',
    label: 'Narrow Bass',
    params: ms({
      msWidth: 122,
      msBalance: -16,
      msMidGain: 1.2,
      msSideGain: 0.5,
      msSideHpf: 180,
      msMidTilt: -6,
      msSideTilt: 18,
      msCrossfeed: 10,
      msHaasAmount: 0,
    }),
  },
  {
    id: 'unstable',
    label: 'Unstable',
    params: ms({
      msWidth: 156,
      msBalance: 22,
      msMidGain: -2,
      msSideGain: 3,
      msSideHpf: 55,
      msRotate: 28,
      msCrossfeed: 22,
      msHaasAmount: 48,
      msHaasTime: 14,
      msFlipSide: 0,
      msMidTilt: -18,
      msSideTilt: 30,
    }),
    lfo: { target: 'msBalance', depth: 28, rateHz: 0.22, shape: 'triangle' },
  },
]

export function midSideRecipePatch(id: MidSideRecipeId): Partial<Record<ParamId, number>> {
  const found = MIDSIDE_RECIPES.find((r) => r.id === id)
  return found ? { ...found.params } : {}
}

export function resetMidSidePatch(): Partial<Record<ParamId, number>> {
  const patch: Partial<Record<ParamId, number>> = {}
  for (const id of MS_PARAM_IDS) patch[id] = PARAMS[id].defaultValue
  return patch
}

function jitter(seed: number, span: number): number {
  return (seed * 13.7 - Math.floor(seed * 13.7)) * span - span / 2
}

export function randomizeMidSide(seed = Math.random()): {
  params: Partial<Record<ParamId, number>>
  lfo: Partial<FxLfo> | null
} {
  const recipe = MIDSIDE_RECIPES[Math.floor(seed * MIDSIDE_RECIPES.length) % MIDSIDE_RECIPES.length]!
  const base = { ...recipe.params }
  const n = (seed * 9.1) % 1
  const patch: Partial<Record<ParamId, number>> = { ...resetMidSidePatch(), ...base }
  const nudge = (id: ParamId, amount: number) => {
    const cur = patch[id] ?? PARAMS[id].defaultValue
    patch[id] = applyParamValue(cur + jitter(n + amount, amount), PARAMS[id])
  }
  nudge('msWidth', 14)
  nudge('msBalance', 10)
  nudge('msMidGain', 1.4)
  nudge('msSideGain', 1.6)
  nudge('msSideHpf', 24)
  nudge('msRotate', recipe.id === 'unstable' ? 12 : 4)
  nudge('msCrossfeed', 6)
  if (recipe.id !== 'unstable') {
    patch.msFlipMid = 0
    patch.msFlipSide = 0
  }
  return { params: patch, lfo: recipe.lfo ? { ...recipe.lfo } : null }
}

export function isMidSideRecipeId(value: string): value is MidSideRecipeId {
  return MIDSIDE_RECIPES.some((r) => r.id === value)
}
