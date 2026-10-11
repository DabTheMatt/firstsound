import { TECHNICAL_WORKSPACES, type TechnicalWorkspaceId } from '../components/workspace/workspaces'
import { readStoredA11ySettings, type A11ySettings } from './settings'

/** Workspace arrangement. Separate from FIELD ACCESS switches and from project audio. */
export const LAYOUT_MEMORY_KEY = 'field.layout.v1'

export const LAYOUT_RESTORE_EVENT = 'field-layout-restore'

/** Hold the current layout variant while the viewport sits on a breakpoint. */
export const LAYOUT_HYSTERESIS_PX = 32

export const INSPECTOR_WIDTH_MIN = 268
export const INSPECTOR_WIDTH_MAX = 480

const WORKSPACES = new Set<string>(TECHNICAL_WORKSPACES)

export type LayoutContextLevel = 'closed' | 'compact' | 'open'
export type LayoutSheetLevel = 'collapsed' | 'medium' | 'expanded'

export type LayoutMemory = {
  technicalWorkspace: TechnicalWorkspaceId | null
  inspectorOpen: boolean | null
  contextLevel: LayoutContextLevel | null
  sheetLevel: LayoutSheetLevel | null
  inspectorWidth: number | null
  scroll: Record<string, number>
}

export function defaultLayoutMemory(): LayoutMemory {
  return {
    technicalWorkspace: null,
    inspectorOpen: null,
    contextLevel: null,
    sheetLevel: null,
    inspectorWidth: null,
    scroll: {},
  }
}

type LayoutFlags = Pick<A11ySettings, 'predictableLayout' | 'stablePanels' | 'rememberWorkspaceLayout' | 'reduceLayoutMovement'>

/** Sub-settings apply only while Predictable Layout is on. */
export function effectiveLayoutFlags(settings: LayoutFlags): {
  active: boolean
  stablePanels: boolean
  rememberWorkspace: boolean
  reduceMovement: boolean
} {
  const active = settings.predictableLayout
  return {
    active,
    stablePanels: active && settings.stablePanels,
    rememberWorkspace: active && settings.rememberWorkspaceLayout,
    reduceMovement: active && settings.reduceLayoutMovement,
  }
}

export function layoutMemoryEnabled(settings: Pick<A11ySettings, 'predictableLayout' | 'rememberWorkspaceLayout'>): boolean {
  return settings.predictableLayout && settings.rememberWorkspaceLayout
}

export function layoutStabilized(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.stablePanels === 'on'
}

export function layoutMovementReduced(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.reduceLayout === 'on'
}

function readWorkspace(raw: unknown): TechnicalWorkspaceId | null {
  return typeof raw === 'string' && WORKSPACES.has(raw) ? (raw as TechnicalWorkspaceId) : null
}

function readLevel(raw: unknown): LayoutContextLevel | null {
  return raw === 'closed' || raw === 'compact' || raw === 'open' ? raw : null
}

function readSheet(raw: unknown): LayoutSheetLevel | null {
  return raw === 'collapsed' || raw === 'medium' || raw === 'expanded' ? raw : null
}

function readScroll(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const next: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) next[key] = value
  }
  return next
}

/** Drops anything that is not a layout fact. Audio parameters never land here. */
export function parseLayoutMemory(raw: unknown): LayoutMemory {
  const next = defaultLayoutMemory()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Record<string, unknown>
  next.technicalWorkspace = readWorkspace(rec.technicalWorkspace)
  if (typeof rec.inspectorOpen === 'boolean') next.inspectorOpen = rec.inspectorOpen
  next.contextLevel = readLevel(rec.contextLevel)
  next.sheetLevel = readSheet(rec.sheetLevel)
  if (typeof rec.inspectorWidth === 'number' && Number.isFinite(rec.inspectorWidth)) next.inspectorWidth = rec.inspectorWidth
  next.scroll = readScroll(rec.scroll)
  return next
}

export function readLayoutMemory(): LayoutMemory {
  if (typeof localStorage === 'undefined') return defaultLayoutMemory()
  try {
    const raw = localStorage.getItem(LAYOUT_MEMORY_KEY)
    return raw == null ? defaultLayoutMemory() : parseLayoutMemory(JSON.parse(raw))
  } catch {
    return defaultLayoutMemory()
  }
}

export function writeLayoutMemory(memory: LayoutMemory): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LAYOUT_MEMORY_KEY, JSON.stringify({ ...memory, version: 1 }))
  } catch {
    /* private mode */
  }
}

export function patchLayoutMemory(patch: Partial<LayoutMemory>): LayoutMemory {
  const current = readLayoutMemory()
  const next: LayoutMemory = {
    ...current,
    ...patch,
    scroll: patch.scroll ? { ...current.scroll, ...patch.scroll } : current.scroll,
  }
  writeLayoutMemory(next)
  return next
}

export function clearLayoutMemory(): LayoutMemory {
  const next = defaultLayoutMemory()
  writeLayoutMemory(next)
  return next
}

export function requestLayoutRestore(): void {
  clearLayoutMemory()
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(LAYOUT_RESTORE_EVENT))
}

/** Memory from the last session, or null when Remember Workspace Layout is off. */
export function initialLayoutMemory(): LayoutMemory | null {
  const settings = readStoredA11ySettings()
  if (!layoutMemoryEnabled(settings)) return null
  return readLayoutMemory()
}

/**
 * Keep a restored width inside the viewport and inside the inspector's own range.
 * Returns null when the stored value is missing. A narrow viewport keeps the minimum.
 */
export function clampInspectorWidth(width: unknown, viewportWidth: number): number | null {
  if (typeof width !== 'number' || !Number.isFinite(width)) return null
  const viewport = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0
  const room = viewport > 0 ? Math.max(INSPECTOR_WIDTH_MIN, viewport - 360) : INSPECTOR_WIDTH_MAX
  const max = Math.min(INSPECTOR_WIDTH_MAX, room)
  const min = Math.min(INSPECTOR_WIDTH_MIN, max)
  return Math.round(Math.min(max, Math.max(min, width)))
}

/** Null when the stored offset is not a usable number. Otherwise clamp into the scroller. */
export function clampScrollTop(saved: unknown, maxScroll: number): number | null {
  if (typeof saved !== 'number' || !Number.isFinite(saved) || saved < 0) return null
  const max = Number.isFinite(maxScroll) ? Math.max(0, maxScroll) : 0
  return Math.min(saved, max)
}

export function inspectorScrollKey(focus: { kind: string; instanceId?: string }): string {
  if (focus.kind === 'module' && focus.instanceId) return `inspector:${focus.instanceId}`
  return `inspector:${focus.kind}`
}

/** Remember scroll while Remember Workspace Layout is on. One write per pause, plus unmount. */
export function bindLayoutScroll(node: HTMLElement, key: string): () => void {
  if (!layoutMemoryEnabled(readStoredA11ySettings())) return () => undefined
  const max = Math.max(0, node.scrollHeight - node.clientHeight)
  const restored = clampScrollTop(readLayoutMemory().scroll[key], max)
  if (restored != null) node.scrollTop = restored
  let timer = 0
  const save = () => {
    const top = node.scrollTop
    if (readLayoutMemory().scroll[key] === top) return
    patchLayoutMemory({ scroll: { [key]: top } })
  }
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(save, 250)
  }
  node.addEventListener('scroll', schedule, { passive: true })
  return () => {
    window.clearTimeout(timer)
    node.removeEventListener('scroll', schedule)
    save()
  }
}
