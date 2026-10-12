import { PARAMS } from '../audio/parameters/definitions'
import type { GuideTargetId } from '../guide/types'

const PARAM_IDS = new Set<string>(Object.keys(PARAMS))

const GUIDE_HELP: Partial<Record<GuideTargetId, string>> = {
  'waveform.main': 'wave.editor',
  'waveform.selection': 'wave.selection',
  'technical.waveform': 'wave.editor',
  'technical.selection': 'wave.selection',
  'edit.trim': 'wave.trim',
  'edit.fadeIn': 'wave.fadeIn',
  'edit.fadeOut': 'wave.fadeOut',
  'input.gain': 'gain',
  'input.speed': 'speed',
  'input.pitch': 'pitch',
  'input.reverse': 'wave.reverse',
  'technical.inputGain': 'gain',
  'technical.eq': 'module.eq',
  'effect.eq': 'module.eq',
  'technical.reverb': 'module.reverb',
  'effect.reverb': 'module.reverb',
  'technical.delay': 'module.delay',
  'effect.delay': 'module.delay',
  'technical.reverbWet': 'reverbWet',
  'technical.delayWet': 'delayWet',
  'technical.delayTime': 'delayTime',
  'export.open': 'export.format',
  'technical.export': 'export.format',
  'export.confirm': 'export.format',
  'transport.play': 'wave.playhead',
}

/** Existing structural hooks, used when a control has no closer id. */
const STRUCTURAL_HELP: { attr: string; id: string }[] = [
  { attr: 'data-automation-lane', id: 'auto.lane' },
  { attr: 'data-automation-segment-curve', id: 'auto.interpolation' },
  { attr: 'data-automation-inspector', id: 'auto.lane' },
  { attr: 'data-marker-editor', id: 'markers.edit' },
  { attr: 'data-marker-add', id: 'markers.user' },
  { attr: 'data-marker-popover', id: 'markers.user' },
  { attr: 'data-fft-primary', id: 'fft.spectrum' },
  { attr: 'data-export-preview', id: 'export.preview' },
  { attr: 'data-export-check', id: 'export.check' },
]

/** Nearest stable id. Walks ancestors so a focused knob beats a parent section. */
export function explainIdFrom(target: EventTarget | null): { id: string; anchor: HTMLElement } | null {
  let node = target instanceof Element ? target : null
  while (node) {
    if (!(node instanceof HTMLElement)) {
      node = node.parentElement
      continue
    }
    if (node.closest('[data-explain-popover]')) return null
    const fallback = node.getAttribute('data-explain-fallback')
    if (node.hasAttribute('data-explain-mark') && fallback) {
      return { id: fallback, anchor: node }
    }
    const explicit = node.getAttribute('data-explain')
    if (explicit) return { id: explicit, anchor: node }
    const param = node.getAttribute('data-param-id')
    if (param && PARAM_IDS.has(param)) return { id: param, anchor: node }
    const guide = node.getAttribute('data-guide-target')
    const mapped = guide ? GUIDE_HELP[guide as GuideTargetId] : undefined
    if (mapped) return { id: mapped, anchor: node }
    for (const item of STRUCTURAL_HELP) {
      if (node.hasAttribute(item.attr)) return { id: item.id, anchor: node }
    }
    node = node.parentElement
  }
  return null
}
