import type { ModuleType } from '../audio/chain/chain'
import type { InspectorFocus, VizMode } from './editorState'

/**
 * The open inspector and the editor view are separate.
 * Automation playback can stay active while a different inspector is visible.
 */
export function inspectorPanel(focus: InspectorFocus): 'automation' | 'editor' {
  return focus.kind === 'automation' ? 'automation' : 'editor'
}

export function inspectorKey(focus: InspectorFocus): string {
  if (focus.kind === 'automation') return 'automation'
  if (focus.kind === 'tool') return 'tool'
  return focus.type
}

/** AUTO requests the automation inspector. Other views leave the inspector alone. */
export function routeViz(
  viz: VizMode,
  focus: InspectorFocus,
  inspectorOpen: boolean,
): { viz: VizMode; focus: InspectorFocus; inspectorOpen: boolean } {
  if (viz !== 'automation') return { viz, focus, inspectorOpen }
  return { viz, focus: { kind: 'automation' }, inspectorOpen: true }
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
