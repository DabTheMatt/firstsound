import type { AttentionContext } from './context'
import { attentionSelectors } from './selectors'

const marked: Element[] = []
let lastKey = ''

function clearMarks(): void {
  for (const el of marked) {
    el.removeAttribute('data-attention-hit')
    el.removeAttribute('data-attention-live')
  }
  marked.length = 0
}

function stamp(selector: string, name: 'data-attention-hit' | 'data-attention-live'): void {
  if (typeof document === 'undefined') return
  let nodes: NodeListOf<Element>
  try {
    nodes = document.querySelectorAll(selector)
  } catch {
    return
  }
  for (const el of nodes) {
    el.setAttribute(name, 'true')
    marked.push(el)
  }
}

function writeContext(ctx: AttentionContext | null): void {
  const root = document.documentElement
  const set = (key: string, value: string | null) => {
    if (value) root.dataset[key] = value
    else delete root.dataset[key]
  }
  set('attentionContext', ctx?.kind ?? null)
  set('attentionWorkspace', ctx?.workspace ?? null)
  set('attentionEffect', ctx?.selectedEffectId ?? null)
  set('attentionBand', ctx?.selectedBandId ?? null)
  set('attentionPoint', ctx?.selectedAutomationPointId ?? null)
  set('attentionLane', ctx?.automationLaneId ?? null)
  set('attentionTarget', ctx?.activeTaskTarget ?? null)
  set('attentionAxis', ctx?.sensoryAxisId ?? null)
}

/**
 * Writes the derived context onto the document once per change.
 * Marks are presentation only: no inert, no aria-hidden, no pointer-events.
 */
export function publishAttention(enabled: boolean, ctx: AttentionContext | null): void {
  if (typeof document === 'undefined') return
  const key = enabled && ctx ? JSON.stringify(ctx) : 'off'
  if (key === lastKey) return
  lastKey = key
  clearMarks()
  if (!enabled || !ctx) {
    writeContext(null)
    return
  }
  writeContext(ctx)
  const marks = attentionSelectors(ctx)
  for (const selector of marks.live) stamp(selector, 'data-attention-live')
  for (const selector of marks.hit) stamp(selector, 'data-attention-hit')
}

/** Test helper so a later case does not reuse a stale key. */
export function resetAttentionPublish(): void {
  lastKey = ''
  clearMarks()
}
