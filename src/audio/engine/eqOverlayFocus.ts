import { moduleLabel, primaryEqInstanceId, type ChainModule } from '../chain/chain'

export const EQ_OVERLAY_ALL = 'all'
export type EqOverlayFocus = typeof EQ_OVERLAY_ALL | string

const STORAGE_KEY = 'field.eqOverlayFocus'

export type EqOverlayOption = {
  value: EqOverlayFocus
  label: string
}

export function eqOverlayOptions(chain: readonly ChainModule[]): EqOverlayOption[] {
  const eqs = chain.filter((m) => m.type === 'eq')
  return [
    { value: EQ_OVERLAY_ALL, label: 'All' },
    ...eqs.map((mod) => ({
      value: mod.instanceId,
      label: eqs.length > 1 ? moduleLabel(mod, chain) : 'EQ 1',
    })),
  ]
}

export function clampEqOverlayFocus(
  raw: unknown,
  chain: readonly ChainModule[],
): EqOverlayFocus {
  if (raw === EQ_OVERLAY_ALL) return EQ_OVERLAY_ALL
  if (typeof raw === 'string' && chain.some((m) => m.type === 'eq' && m.instanceId === raw)) {
    return raw
  }
  return EQ_OVERLAY_ALL
}

export function eqOverlayIncludes(focus: EqOverlayFocus, instanceId: string): boolean {
  return focus === EQ_OVERLAY_ALL || focus === instanceId
}

export function eqInstanceUsesSharedLfo(
  chain: readonly ChainModule[],
  instanceId: string,
): boolean {
  return primaryEqInstanceId(chain) === instanceId
}

export function loadEqOverlayFocus(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EQ_OVERLAY_ALL
  } catch {
    return EQ_OVERLAY_ALL
  }
}

const overlayListeners = new Set<(focus: EqOverlayFocus) => void>()

export function persistEqOverlayFocus(focus: EqOverlayFocus): void {
  try {
    localStorage.setItem(STORAGE_KEY, focus)
  } catch {
    /* private mode */
  }
  for (const listener of overlayListeners) listener(focus)
}

export function subscribeEqOverlayFocus(onChange: (focus: EqOverlayFocus) => void): () => void {
  overlayListeners.add(onChange)
  return () => overlayListeners.delete(onChange)
}
