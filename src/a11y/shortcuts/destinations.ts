export type FieldMode = 'simple' | 'technical' | 'sensory'

export type DestinationId =
  | 'waveform'
  | 'transport'
  | 'effects'
  | 'inspector'
  | 'eq'
  | 'fft'
  | 'automation'
  | 'hearing'
  | 'guided'
  | 'export'
  | 'accessibility'
  | 'gain'
  | 'parameters'

const TECHNICAL: DestinationId[] = [
  'waveform',
  'transport',
  'effects',
  'inspector',
  'gain',
  'eq',
  'fft',
  'automation',
  'hearing',
  'export',
  'guided',
  'accessibility',
]

const SIMPLE: DestinationId[] = ['waveform', 'transport', 'effects', 'gain', 'export', 'guided', 'accessibility']

const SENSORY: DestinationId[] = ['parameters', 'transport', 'guided', 'accessibility']

export function destinationIds(mode: FieldMode): DestinationId[] {
  if (mode === 'simple') return SIMPLE
  if (mode === 'sensory') return SENSORY
  return TECHNICAL
}

/** Selectors tried in order. The first focusable match wins. */
export function destinationSelectors(id: DestinationId, mode: FieldMode): string[] {
  switch (id) {
    case 'waveform':
      return ['[data-waveform-editor] [role="region"]', '[data-waveform-editor] button']
    case 'parameters':
      return ['[data-drag-free="sensory"] input', '[data-drag-free="wave"] button', '[data-region="sensory"] [role="slider"]']
    case 'transport':
      return ['[data-transport] button:not([disabled])']
    case 'effects':
      return mode === 'simple'
        ? ['[data-guide-target="effect.reverb"] button', '[data-guide-target="effect.delay"] button']
        : ['[data-effect-tab]']
    case 'inspector':
      return ['[data-inspector] button:not([disabled])', '[data-inspector] [role="slider"]', '[data-inspector] input:not([disabled])']
    case 'gain':
      return mode === 'simple'
        ? ['[data-guide-target="input.gain"]']
        : ['[data-inspector] [role="slider"]', '[data-region="sensory"] [role="slider"]']
    case 'eq':
    case 'fft':
    case 'automation':
    case 'hearing':
      return ['[data-workspace-chrome] [role="tab"][aria-selected="true"]', '[data-drag-free="eq"] button', '[data-drag-free="automation"] button']
    case 'export':
      return ['[data-export-open]:not([disabled])', '[data-simple-export]:not([disabled])']
    case 'guided':
      return ['[data-guide-focus]', '[role="region"][aria-labelledby] button']
    case 'accessibility':
      return ['#field-access-title', '[data-settings-dialog] button']
    default:
      return []
  }
}

export function focusDestination(id: DestinationId, mode: FieldMode): boolean {
  if (typeof document === 'undefined') return false
  for (const selector of destinationSelectors(id, mode)) {
    const node = document.querySelector<HTMLElement>(selector)
    if (!node) continue
    node.focus()
    if (document.activeElement === node) return true
  }
  return false
}
