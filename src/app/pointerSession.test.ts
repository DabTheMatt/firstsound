import { describe, expect, it } from 'vitest'
import { clearPointerInteraction, onPointerReset, pointerEpoch } from './pointerSession'

describe('clearPointerInteraction', () => {
  it('drops drag cursors and notifies widgets without keeping the gesture', () => {
    const before = pointerEpoch()
    let resets = 0
    const stop = onPointerReset(() => {
      resets += 1
    })
    const wave = { dataset: { cursor: 'fade' } as Record<string, string | undefined> }
    const knob = { dataset: { gesture: 'adjust' } as Record<string, string | undefined> }
    const doc = {
      documentElement: {
        dataset: { chainDrag: '1' } as Record<string, string | undefined>,
        style: { cursor: 'grabbing', removeProperty(prop: string) { if (prop === 'cursor') this.cursor = '' } },
      },
      body: {
        style: { cursor: '', removeProperty(prop: string) { if (prop === 'cursor') this.cursor = '' } },
      },
      querySelectorAll(selector: string) {
        if (selector === '[data-cursor]') return [wave]
        if (selector === '[data-gesture]') return [knob]
        return []
      },
      addEventListener(type: string, fn: () => void) {
        if (type === 'pointerdown') down = fn
      },
    }
    let down: (() => void) | undefined
    clearPointerInteraction(doc as unknown as Document)
    expect(pointerEpoch()).toBe(before + 1)
    expect(resets).toBe(1)
    expect(doc.documentElement.dataset.chainDrag).toBeUndefined()
    expect(wave.dataset.cursor).toBeUndefined()
    expect(knob.dataset.gesture).toBeUndefined()
    expect(doc.documentElement.dataset.cursorReset).toBe('1')
    expect(doc.documentElement.style.cursor).toBe('')
    down?.()
    expect(doc.documentElement.dataset.cursorReset).toBeUndefined()
    stop()
    clearPointerInteraction(doc as unknown as Document)
    expect(resets).toBe(1)
  })
})
