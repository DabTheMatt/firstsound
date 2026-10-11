import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getEqBandSelection, subscribeEqBandSelection } from '../../audio/engine/eqBandSelection'
import { currentStep } from '../../guide/session'
import { presentStep } from '../../guide/present'
import { getGuideState, subscribeGuide } from '../../guide/store'
import { useEngine } from '../../hooks/useEngine'
import { useA11ySettings } from '../useA11ySettings'
import { getAttentionContext, type AttentionModal, type AttentionOperation } from './context'
import { publishAttention } from './publish'
import { getAttentionSignals, subscribeAttentionSignals } from './signals'

type Props = {
  uiMode: 'simple' | 'technical' | 'sensory'
  workspace: string | null
  exportOpen: boolean
  settingsOpen: boolean
  manualOpen: boolean
  navOpen: boolean
  keysOpen: boolean
  lfoOpen: boolean
  selectionActive: boolean
  inspectorKind: 'module' | 'tool' | 'automation' | null
  effectId: string | null
  effectType: string | null
  automationPointId: string | null
  automationLaneId: string | null
}

function focusReading(node: Element | null): { lfo: boolean; operation: AttentionOperation } {
  if (!node) return { lfo: false, operation: null }
  const lfo = Boolean(node.closest('[data-modulation-editor], [data-modulation-sheet], [data-lfo-center]'))
  if (node.closest('[data-guide-target="edit.trim"]')) return { lfo, operation: 'trim' }
  if (node.closest('[data-fade-handle="out"], [data-guide-target="edit.fadeOut"]')) return { lfo, operation: 'fade-out' }
  if (node.closest('[data-fade-handle="in"], [data-guide-target="edit.fadeIn"], [data-fade-controls]')) {
    return { lfo, operation: 'fade-in' }
  }
  return { lfo, operation: null }
}

/**
 * Publishes Attention Focus from the state FIELD already has.
 * It does not move focus, open panels, or change parameters.
 */
export function useAttentionFocus(props: Props): void {
  const { settings } = useA11ySettings()
  const snap = useEngine()
  const guide = useSyncExternalStore(subscribeGuide, getGuideState, getGuideState)
  const signals = useSyncExternalStore(subscribeAttentionSignals, getAttentionSignals, getAttentionSignals)
  const eqPick = useSyncExternalStore(subscribeEqBandSelection, getEqBandSelection, getEqBandSelection)
  const [lfoFocus, setLfoFocus] = useState(false)
  const [focusOperation, setFocusOperation] = useState<AttentionOperation>(null)

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const node = event.target instanceof Element ? event.target : null
      const next = focusReading(node)
      setLfoFocus(next.lfo)
      setFocusOperation(next.operation)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  const eqBands = eqPick ? snap.eqById[eqPick.instanceId]?.bands : undefined
  const eqBandId = eqPick && eqBands ? (eqBands[eqPick.index]?.id ?? null) : null

  const modal: AttentionModal = props.exportOpen || signals.simpleExport
    ? 'export'
    : signals.dragSection === 'trim'
      ? 'trim'
      : props.settingsOpen
        ? 'settings'
        : props.manualOpen
          ? 'manual'
          : props.navOpen
            ? 'nav'
            : props.keysOpen
              ? 'keys'
              : null

  const guideActive = guide.view === 'task' && guide.panel !== 'minimized'
  const rawStep = guideActive ? currentStep(guide) : null
  const guideTarget = rawStep ? (presentStep(rawStep, props.uiMode).target ?? null) : null

  const operation: AttentionOperation =
    signals.dragSection === 'trim'
      ? 'trim'
      : signals.fadeDrag === 'in'
        ? 'fade-in'
        : signals.fadeDrag === 'out'
          ? 'fade-out'
          : signals.dragSection === 'times'
            ? 'selection'
            : focusOperation

  const context = useMemo(
    () =>
      getAttentionContext({
        uiMode: props.uiMode,
        workspace: props.workspace,
        modal,
        guideActive,
        guideTarget,
        operation,
        selectionActive: props.selectionActive,
        inspectorKind: props.inspectorKind,
        effectId: props.effectId,
        effectType: props.effectType,
        eqBandId,
        eqInstanceId: eqPick?.instanceId ?? null,
        automationPointId: props.automationPointId,
        automationLaneId: props.automationLaneId,
        lfoEditing: props.lfoOpen || lfoFocus,
        sensoryAxisId: signals.sensoryAxisId,
        assistedOpen: false,
        markerEditing: signals.markerEditing,
      }),
    [
      props.uiMode,
      props.workspace,
      props.selectionActive,
      props.inspectorKind,
      props.effectId,
      props.effectType,
      props.automationPointId,
      props.automationLaneId,
      props.lfoOpen,
      modal,
      guideActive,
      guideTarget,
      operation,
      eqBandId,
      eqPick?.instanceId,
      lfoFocus,
      signals.sensoryAxisId,
      signals.markerEditing,
    ],
  )

  useEffect(() => {
    publishAttention(settings.attentionFocus, context)
  }, [settings.attentionFocus, context])
}
