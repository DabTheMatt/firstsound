import type { ModuleType } from '../audio/chain/chain'
import type { InspectorFocus, VizMode } from './editorState'

/**
 * One inspector context for the selected track.
 * Track Input, an effect, Edit, and Automation share this slot.
 */
export type InspectorContext =
  | { kind: 'trackInput' }
  | { kind: 'effect'; instanceId: string; type: ModuleType; pane?: 'main' | 'advanced' }
  | { kind: 'edit' }
  | { kind: 'automation' }

export type TrackInspectorMemory = Record<string, InspectorContext>

export type ChainSlot = { instanceId: string; type: ModuleType }

/**
 * The open inspector and the editor view are separate.
 * Automation playback can stay active while a different inspector is visible.
 */
export function inspectorPanel(focus: InspectorFocus): 'automation' | 'editor' {
  return focus.kind === 'automation' ? 'automation' : 'editor'
}

/** Map the open inspector onto the single per-track context. */
export function contextFromFocus(focus: InspectorFocus): InspectorContext {
  if (focus.kind === 'automation') return { kind: 'automation' }
  if (focus.kind === 'tool') return { kind: 'edit' }
  if (focus.type === 'gain') return { kind: 'trackInput' }
  return focus.pane
    ? { kind: 'effect', instanceId: focus.instanceId, type: focus.type, pane: focus.pane }
    : { kind: 'effect', instanceId: focus.instanceId, type: focus.type }
}

/** Stable id for the inspector header: input, edit, automation, or the effect type. */
export function inspectorContextId(focus: InspectorFocus): string {
  const context = contextFromFocus(focus)
  if (context.kind === 'trackInput') return 'input'
  if (context.kind === 'effect') return context.type
  return context.kind
}

/** Resolve a stored context against the selected track's chain. Missing effects fall back to Input. */
export function focusFromContext(context: InspectorContext, chain: readonly ChainSlot[]): InspectorFocus {
  if (context.kind === 'automation') return { kind: 'automation' }
  if (context.kind === 'edit') return { kind: 'tool', tool: 'select' }
  if (context.kind === 'effect') {
    const mod = chain.find((item) => item.instanceId === context.instanceId && item.type === context.type)
    if (mod && mod.type !== 'gain') {
      return context.pane
        ? { kind: 'module', instanceId: mod.instanceId, type: mod.type, pane: context.pane }
        : { kind: 'module', instanceId: mod.instanceId, type: mod.type }
    }
  }
  const gain = chain.find((item) => item.type === 'gain') ?? chain[0]
  return {
    kind: 'module',
    instanceId: gain?.instanceId ?? 'gain-1',
    type: gain?.type ?? 'gain',
  }
}

/**
 * Clicking a track keeps an explicit context on that same track.
 * A different track restores its remembered context, or Track Input.
 */
export function routeTrackClick(
  nextTrackId: string,
  currentTrackId: string,
  focus: InspectorFocus,
  memory: TrackInspectorMemory,
): { trackId: string; context: InspectorContext; memory: TrackInspectorMemory; inspectorOpen: true } {
  const saved: TrackInspectorMemory = { ...memory, [currentTrackId]: contextFromFocus(focus) }
  const context = nextTrackId === currentTrackId ? contextFromFocus(focus) : (saved[nextTrackId] ?? { kind: 'trackInput' })
  return {
    trackId: nextTrackId,
    context,
    memory: { ...saved, [nextTrackId]: context },
    inspectorOpen: true,
  }
}

/** EDIT selects the track, opens the wave editor, and shows the Edit inspector. */
export function routeTrackEdit(
  trackId: string,
  currentTrackId: string,
  focus: InspectorFocus,
  memory: TrackInspectorMemory,
): {
  trackId: string
  context: InspectorContext
  memory: TrackInspectorMemory
  focus: InspectorFocus
  viz: 'waveform'
  inspectorOpen: true
} {
  const clicked = routeTrackClick(trackId, currentTrackId, focus, memory)
  const context: InspectorContext = { kind: 'edit' }
  return {
    trackId,
    context,
    memory: { ...clicked.memory, [trackId]: context },
    focus: { kind: 'tool', tool: 'select' },
    viz: 'waveform',
    inspectorOpen: true,
  }
}

export function inspectorKey(focus: InspectorFocus): string {
  if (focus.kind === 'automation') return 'automation'
  if (focus.kind === 'tool') return 'tool'
  return focus.type
}

/** A view shows a different picture. It does not choose or reopen the inspector. */
export function routeViz(
  viz: VizMode,
  focus: InspectorFocus,
  inspectorOpen: boolean,
): { viz: VizMode; focus: InspectorFocus; inspectorOpen: boolean } {
  return { viz, focus, inspectorOpen }
}

/**
 * EQ view may show the equalizer inspector while that picture is open.
 * Leaving it, including for Wave, restores the inspector that was open before.
 */
export type EqViewHold = {
  focus: InspectorFocus
  eqId: string
}

export function routeEqView(
  next: VizMode,
  current: VizMode,
  focus: InspectorFocus,
  hold: EqViewHold | null,
  eqId: string | null,
): { viz: VizMode; focus: InspectorFocus; hold: EqViewHold | null } {
  if (next === 'eq-split' && eqId) {
    const already = focus.kind === 'module' && focus.instanceId === eqId
    return {
      viz: next,
      focus: already ? focus : { kind: 'module', instanceId: eqId, type: 'eq' },
      hold: already ? hold : { focus, eqId },
    }
  }
  if (current === 'eq-split' && next !== current) {
    const restore = hold != null && focus.kind === 'module' && focus.instanceId === hold.eqId
    return { viz: next, focus: restore ? hold.focus : focus, hold: null }
  }
  return { viz: next, focus, hold }
}

/** Selecting a chain module selects that effect and opens its inspector. */
export function routeModule(
  instanceId: string,
  type: ModuleType,
  pane?: 'main' | 'advanced',
): { focus: InspectorFocus; inspectorOpen: true } {
  return {
    focus: pane ? { kind: 'module', instanceId, type, pane } : { kind: 'module', instanceId, type },
    inspectorOpen: true,
  }
}

/** Hiding the inspector collapses it. The active context stays put. */
export function routeCollapse(focus: InspectorFocus): { focus: InspectorFocus; inspectorOpen: false } {
  return { focus, inspectorOpen: false }
}

/** The reveal control reopens whatever inspector was active. */
export function routeReveal(focus: InspectorFocus): { focus: InspectorFocus; inspectorOpen: true } {
  return { focus, inspectorOpen: true }
}
