/**
 * Derives the editing activity Attention Focus should emphasize.
 * Every field is copied from existing UI state. Nothing here is stored as a parameter.
 */

export type AttentionKind =
  | 'export'
  | 'dialog'
  | 'assisted'
  | 'guided'
  | 'trim'
  | 'fade'
  | 'selection'
  | 'eq'
  | 'effect'
  | 'automation'
  | 'lfo'
  | 'fft'
  | 'hearing'
  | 'sensory'
  | 'marker'
  | 'waveform'

export type AttentionModal = 'export' | 'settings' | 'manual' | 'nav' | 'keys' | 'trim' | 'assisted' | null

export type AttentionOperation = 'trim' | 'fade-in' | 'fade-out' | 'selection' | null

export type AttentionInput = {
  uiMode: 'simple' | 'technical' | 'sensory'
  workspace: string | null
  modal: AttentionModal
  guideActive: boolean
  guideTarget: string | null
  operation: AttentionOperation
  selectionActive: boolean
  inspectorKind: 'module' | 'tool' | 'automation' | null
  effectId: string | null
  effectType: string | null
  eqBandId: string | null
  eqInstanceId: string | null
  automationPointId: string | null
  automationLaneId: string | null
  lfoEditing: boolean
  sensoryAxisId: string | null
  assistedOpen: boolean
  markerEditing?: boolean
}

export type AttentionContext = {
  kind: AttentionKind
  workspace: string | null
  selectedEffectId: string | null
  selectedBandId: string | null
  selectedAutomationPointId: string | null
  automationLaneId: string | null
  activeTaskTarget: string | null
  sensoryAxisId: string | null
}

const WAVE = new Set(['wave', 'simple', 'waveform', null])

function shell(input: AttentionInput, kind: AttentionKind, extra?: Partial<AttentionContext>): AttentionContext {
  return {
    kind,
    workspace: input.workspace,
    selectedEffectId: extra?.selectedEffectId ?? input.effectId,
    selectedBandId: input.eqBandId,
    selectedAutomationPointId: input.automationPointId,
    automationLaneId: input.automationLaneId,
    activeTaskTarget: input.guideActive ? input.guideTarget : null,
    sensoryAxisId: input.sensoryAxisId,
    ...extra,
  }
}

function specificEffect(input: AttentionInput): boolean {
  return Boolean(
    input.inspectorKind === 'module' &&
      input.effectId &&
      input.effectType &&
      input.effectType !== 'gain' &&
      input.effectType !== 'output',
  )
}

/**
 * Priority: modal, Guided Tasks target, explicit operation, selected object, workspace.
 * One kind wins so two highlights do not compete.
 */
export function getAttentionContext(input: AttentionInput): AttentionContext {
  if (input.modal === 'export') return shell(input, 'export')
  if (input.modal === 'trim') return shell(input, 'trim')
  if (input.modal === 'assisted' || input.assistedOpen) return shell(input, 'assisted')
  if (input.modal) return shell(input, 'dialog')

  if (input.guideActive && input.guideTarget) return shell(input, 'guided')

  if (input.operation === 'trim') return shell(input, 'trim')
  if (input.operation === 'fade-in' || input.operation === 'fade-out') return shell(input, 'fade')
  if (input.operation === 'selection') return shell(input, 'selection')

  if (input.markerEditing) return shell(input, 'marker')

  if (input.lfoEditing) return shell(input, 'lfo')

  const workspace = input.workspace
  const onWave = WAVE.has(workspace)
  const eqWorkspace = workspace === 'eq'
  const autoWorkspace = workspace === 'auto'

  if (input.automationPointId && (autoWorkspace || input.inspectorKind === 'automation')) {
    return shell(input, 'automation')
  }
  if (eqWorkspace || (input.eqBandId && input.effectType === 'eq')) {
    return shell(input, 'eq', { selectedEffectId: input.eqInstanceId ?? input.effectId })
  }
  if (input.uiMode === 'sensory' && input.sensoryAxisId) return shell(input, 'sensory')
  if (specificEffect(input) && !autoWorkspace) {
    return shell(input, 'effect')
  }
  if (input.selectionActive && onWave && input.uiMode !== 'sensory') return shell(input, 'selection')

  if (input.uiMode === 'sensory') return shell(input, 'sensory')
  if (workspace === 'fft') return shell(input, 'fft')
  if (workspace === 'hearing') return shell(input, 'hearing')
  if (workspace === 'eq') return shell(input, 'eq', { selectedEffectId: input.eqInstanceId ?? input.effectId })
  if (workspace === 'auto') return shell(input, 'automation')
  return shell(input, 'waveform')
}
