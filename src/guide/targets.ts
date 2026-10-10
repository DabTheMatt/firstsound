import type { ParamId } from '../audio/parameters/types'
import type { GuideSlot, GuideTargetId } from './types'
import { GUIDE_TARGETS } from './types'

const TARGET_SET = new Set<string>(GUIDE_TARGETS)

export function isGuideTarget(value: string): value is GuideTargetId {
  return TARGET_SET.has(value)
}

const PARAM_TARGET: Partial<Record<ParamId, GuideTargetId>> = {
  gain: 'input.gain',
  speed: 'input.speed',
  pitch: 'input.pitch',
  reverbWet: 'technical.reverbWet',
  delayWet: 'technical.delayWet',
  delayTime: 'technical.delayTime',
}

const MODULE_TARGET: Record<string, GuideTargetId | undefined> = {
  eq: 'effect.eq',
  reverb: 'effect.reverb',
  delay: 'effect.delay',
}

const TECHNICAL_MODULE_TARGET: Record<string, GuideTargetId | undefined> = {
  eq: 'technical.eq',
  reverb: 'technical.reverb',
  delay: 'technical.delay',
  gain: 'technical.inputGain',
}

const ADD_TARGET: Record<string, GuideTargetId | undefined> = {
  eq: 'technical.add.eq',
  reverb: 'technical.add.reverb',
  delay: 'technical.add.delay',
}

const TARGET_ALIAS: Partial<Record<GuideTargetId, GuideTargetId>> = {
  'technical.waveform': 'waveform.main',
  'technical.selection': 'waveform.selection',
  'technical.export': 'export.open',
  'technical.inputGain': 'input.gain',
}

const ACTION_TARGET: Record<string, GuideTargetId | undefined> = {
  trim: 'edit.trim',
  'fade-in': 'edit.fadeIn',
  'fade-out': 'edit.fadeOut',
}

export function guideTargetForParam(id: ParamId): GuideTargetId | null {
  return PARAM_TARGET[id] ?? null
}

export function guideTargetForModule(type: string): GuideTargetId | null {
  return MODULE_TARGET[type] ?? null
}

export function technicalTargetForModule(type: string): GuideTargetId | null {
  return TECHNICAL_MODULE_TARGET[type] ?? null
}

export function guideTargetForInsert(type: string): GuideTargetId | null {
  return ADD_TARGET[type] ?? null
}

export function guideTargetForAction(id: string): GuideTargetId | null {
  return ACTION_TARGET[id] ?? null
}

export function guideTargetAttrs(
  id: GuideTargetId | null | undefined,
  rank: '1' | '2' = '2',
  instanceId?: string | null,
): {
  'data-guide-target'?: GuideTargetId
  'data-guide-rank'?: '1' | '2'
  'data-guide-instance'?: string
} {
  if (!id) return {}
  return {
    'data-guide-target': id,
    'data-guide-rank': rank,
    ...(instanceId ? { 'data-guide-instance': instanceId } : {}),
  }
}

/** Simple section that holds the control. Null when the control is always on screen. */
export function simpleSectionFor(target: GuideTargetId | null): 'edit' | 'sound' | 'effects' | null {
  switch (target) {
    case 'edit.trim':
    case 'edit.fadeIn':
    case 'edit.fadeOut':
      return 'edit'
    case 'input.gain':
    case 'sound.clarity':
    case 'sound.warmth':
    case 'effect.eq':
      return 'sound'
    case 'effect.reverb':
    case 'effect.delay':
      return 'effects'
    default:
      return null
  }
}

/** Technical chain module to reveal. Does not insert a module. */
export function moduleTypeForTarget(target: GuideTargetId | null): 'gain' | 'eq' | 'reverb' | 'delay' | null {
  switch (target) {
    case 'input.gain':
    case 'input.speed':
    case 'input.pitch':
    case 'input.reverse':
    case 'technical.inputGain':
      return 'gain'
    case 'effect.eq':
    case 'sound.clarity':
    case 'sound.warmth':
    case 'technical.eq':
    case 'technical.add.eq':
      return 'eq'
    case 'effect.reverb':
    case 'technical.reverb':
    case 'technical.reverbWet':
    case 'technical.add.reverb':
      return 'reverb'
    case 'effect.delay':
    case 'technical.delay':
    case 'technical.delayWet':
    case 'technical.delayTime':
    case 'technical.add.delay':
      return 'delay'
    default:
      return null
  }
}

const FOCUS_VISIBLE = new Set<GuideTargetId>([
  'waveform.main',
  'waveform.selection',
  'technical.waveform',
  'technical.selection',
  'transport.play',
  'edit.trim',
  'edit.fadeIn',
  'edit.fadeOut',
])

export function targetHiddenInFocus(target: GuideTargetId | null): boolean {
  if (!target) return false
  return !FOCUS_VISIBLE.has(target)
}

type DockRect = { left: number; top: number; width: number; height: number }

const DOCK_ORDER: readonly GuideSlot[] = ['top-left', 'bottom-left', 'top-right', 'bottom-right']
const WIDE_DOCK_ORDER: readonly GuideSlot[] = ['top-right', 'bottom-right', 'top-left', 'bottom-left']

function panelBox(slot: GuideSlot, viewportWidth: number, viewportHeight: number): DockRect {
  const width = Math.min(400, Math.max(160, viewportWidth - 24))
  const height = Math.min(420, Math.max(160, viewportHeight * 0.72))
  const top = slot.startsWith('top') ? 12 : viewportHeight - 20 - height
  const left = slot.endsWith('left') ? 16 : viewportWidth - 16 - width
  return { left, top, width, height }
}

function overlapArea(a: DockRect, b: DockRect): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  if (width <= 0 || height <= 0) return 0
  return width * height
}

/**
 * Pick one corner per step. A wide canvas (the waveform) prefers the top-right
 * corner so the left of the wave and the transport stay clear. Smaller controls
 * keep the first corner that does not cover them.
 */
export function dockSlot(
  rect: { left?: number; top: number; width?: number; height: number } | null,
  viewportHeight: number,
  viewportWidth = 1280,
): GuideSlot {
  if (viewportHeight <= 0) return 'bottom-left'
  if (viewportWidth <= 720) {
    if (!rect) return 'bottom-left'
    const mid = rect.top + rect.height / 2
    return mid > viewportHeight * 0.55 ? 'top-left' : 'bottom-left'
  }
  if (!rect || !(rect.width && rect.width > 0) || !(rect.height > 0) || rect.left == null) return 'bottom-left'
  const target: DockRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  const wide = target.width > viewportWidth * 0.45
  const order = wide ? WIDE_DOCK_ORDER : DOCK_ORDER
  let best: GuideSlot = order[0]
  let bestArea = Number.POSITIVE_INFINITY
  for (const slot of order) {
    const area = overlapArea(panelBox(slot, viewportWidth, viewportHeight), target)
    const clears = area === 0 && bestArea > 0
    if (clears || area + 8000 < bestArea) {
      best = slot
      bestArea = area
    }
  }
  return best
}

export function findGuideElement(id: GuideTargetId, instanceId?: string | null): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const keys = [id, TARGET_ALIAS[id]].filter((key): key is GuideTargetId => Boolean(key))
  const nodes = keys.flatMap((key) => [...document.querySelectorAll<HTMLElement>(`[data-guide-target="${key}"]`)])
  const ranked = nodes
    .map((node) => {
      const rect = node.getBoundingClientRect()
      const visible = rect.width >= 2 && rect.height >= 2 && rect.bottom > 0 && rect.right > 0
      const rank = Number(node.dataset.guideRank ?? '1')
      return { node, rect, visible, rank }
    })
    .filter((item) => item.visible)
  ranked.sort((a, b) => b.rank - a.rank)
  if (instanceId) {
    return ranked.find((item) => item.node.dataset.guideInstance === instanceId)?.node ?? null
  }
  const unscoped = ranked.filter((item) => !item.node.dataset.guideInstance)
  if (unscoped.length) return unscoped[0]?.node ?? null
  const instances = new Set(ranked.map((item) => item.node.dataset.guideInstance).filter(Boolean))
  if (instances.size === 1) return ranked[0]?.node ?? null
  return null
}
