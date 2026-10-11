import type { AttentionContext } from './context'

export type AttentionMarks = {
  hit: string[]
  live: string[]
}

/** Escape an attribute value. Dots stay so band and target ids remain readable. */
function cssId(value: string | null): string | null {
  if (!value) return null
  return value.replace(/["\\]/g, '\\$&')
}

function region(name: string): string {
  return `[data-attention-region="${name}"]`
}

function guidedRegions(target: string | null): string[] {
  if (!target) return ['waveform']
  if (target.startsWith('export')) return []
  if (
    target.startsWith('edit.') ||
    target.startsWith('waveform') ||
    target.startsWith('technical.waveform') ||
    target.startsWith('technical.selection') ||
    target.startsWith('transport')
  ) {
    return ['waveform', 'selection']
  }
  if (target.includes('eq') || target.startsWith('sound.') || target.startsWith('effect.') || target.startsWith('technical.')) {
    return ['inspector', 'chain', 'eq']
  }
  if (target.startsWith('input.') || target.startsWith('sample.')) return ['inspector', 'waveform']
  return ['waveform']
}

/** Selectors for one context change. Callers apply them once. They do not scan on a timer. */
export function attentionSelectors(ctx: AttentionContext): AttentionMarks {
  const live = ['[data-transport]', '[data-meter-clip="on"]', '[role="alert"]', '[data-critical]']
  const hit: string[] = []
  const effectId = cssId(ctx.selectedEffectId)
  const bandId = cssId(ctx.selectedBandId)
  const pointId = cssId(ctx.selectedAutomationPointId)
  const laneId = cssId(ctx.automationLaneId)
  const target = cssId(ctx.activeTaskTarget)
  const axis = cssId(ctx.sensoryAxisId)

  const addRegions = (names: string[]) => {
    for (const name of names) live.push(region(name))
  }

  switch (ctx.kind) {
    case 'export':
      hit.push('[data-export-dialog]')
      live.push('[data-export-dialog]')
      break
    case 'dialog':
      live.push('[data-settings-dialog]', '[data-manual-dialog]', '[role="dialog"][aria-modal="true"]')
      break
    case 'assisted':
      hit.push('[data-assisted-editor]', '[data-drag-free]')
      live.push('[data-assisted-editor]', '[data-drag-free]')
      break
    case 'guided':
      if (target) hit.push(`[data-guide-target="${target}"]`)
      addRegions(guidedRegions(ctx.activeTaskTarget))
      if (ctx.activeTaskTarget?.includes('eq') && bandId) {
        hit.push(`[data-band-id="${bandId}"]`)
      }
      if (effectId && ctx.activeTaskTarget && /effect|reverb|delay|eq/.test(ctx.activeTaskTarget)) {
        hit.push(`[data-effect-tab="${effectId}"]`, `[data-effect-id="${effectId}"]`, `[data-guide-instance="${effectId}"]`)
      }
      break
    case 'trim':
      addRegions(['waveform', 'selection'])
      hit.push('[data-guide-target="edit.trim"]', '[data-selection-toolbar="selection"]', '[data-drag-free-section="trim"]')
      break
    case 'fade':
      addRegions(['waveform', 'selection'])
      hit.push('[data-fade-handle]', '[data-fade-controls]', '[data-guide-target="edit.fadeIn"]', '[data-guide-target="edit.fadeOut"]')
      break
    case 'selection':
      addRegions(['waveform', 'selection'])
      hit.push(
        '[data-selection-toolbar="selection"]',
        '[data-guide-target="waveform.selection"]',
        '[data-guide-target="technical.selection"]',
        '[data-guide-target="edit.trim"]',
        '[data-guide-target="edit.fadeIn"]',
        '[data-guide-target="edit.fadeOut"]',
        '[data-drag-free="wave"]',
      )
      break
    case 'eq':
      addRegions(['eq', 'fft', 'inspector', 'chain'])
      if (bandId) hit.push(`[data-band-id="${bandId}"]`)
      if (effectId) {
        hit.push(`[data-effect-tab="${effectId}"]`, `[data-effect-id="${effectId}"]`, `[data-guide-instance="${effectId}"]`)
      }
      hit.push('[data-drag-free="eq"]')
      break
    case 'effect':
      addRegions(['inspector', 'chain'])
      if (effectId) {
        hit.push(`[data-effect-tab="${effectId}"]`, `[data-effect-id="${effectId}"]`, `[data-guide-instance="${effectId}"]`)
      }
      break
    case 'automation':
      addRegions(['automation', 'inspector', 'waveform'])
      if (pointId) hit.push(`[data-auto-node="${pointId}"]`, `[data-auto-value="${pointId}"]`)
      if (laneId) hit.push(`[data-automation-lane="${laneId}"]`)
      hit.push('[data-drag-free="automation"]')
      break
    case 'lfo':
      addRegions(['inspector'])
      hit.push('[data-lfo-center]', '[data-modulation-editor]', '[data-modulation-sheet]')
      if (effectId) hit.push(`[data-guide-instance="${effectId}"]`)
      break
    case 'fft':
      addRegions(['fft'])
      hit.push('[data-attention-region="fft"]')
      break
    case 'hearing':
      addRegions(['hearing', 'waveform'])
      hit.push('[data-attention-region="hearing"]')
      break
    case 'sensory':
      addRegions(['sensory', 'waveform'])
      if (axis) hit.push(`[data-axis="${axis}"]`)
      else hit.push('[data-attention-region="sensory"]')
      break
    case 'waveform':
      addRegions(['waveform'])
      hit.push('[data-attention-region="waveform"]', '[data-drag-free="wave"]')
      break
    default:
      break
  }

  return { hit, live }
}
