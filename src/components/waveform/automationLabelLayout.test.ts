import { describe, expect, it } from 'vitest'
import { placeAutomationLabels, type AutomationLabelAnchor } from './automationLabelLayout'

function anchor(patch: Partial<AutomationLabelAnchor> & Pick<AutomationLabelAnchor, 'id'>): AutomationLabelAnchor {
  return {
    x: 0.5,
    y: 0.5,
    text: '+3.2 dB',
    priority: 1,
    ...patch,
  }
}

describe('automation label placement', () => {
  it('puts a free label above the node and flips a crowded neighbor below', () => {
    const placed = placeAutomationLabels(
      [
        anchor({ id: 'a', x: 0.5 }),
        anchor({ id: 'b', x: 0.53 }),
      ],
      400,
      200,
    )
    const a = placed.find((item) => item.id === 'a')
    const b = placed.find((item) => item.id === 'b')
    expect(a?.visible).toBe(true)
    expect(b?.visible).toBe(true)
    expect(a?.side).toBe('above')
    expect(b?.side).toBe('below')
  })

  it('keeps the selected and hovered labels and hides a lower-priority overlap', () => {
    const placed = placeAutomationLabels(
      [
        anchor({ id: 'idle', x: 0.5, priority: 1 }),
        anchor({ id: 'hover', x: 0.52, priority: 2 }),
        anchor({ id: 'selected', x: 0.51, priority: 3, text: '-4.0 dB' }),
      ],
      400,
      200,
    )
    expect(placed.find((item) => item.id === 'selected')?.visible).toBe(true)
    expect(placed.find((item) => item.id === 'hover')?.visible).toBe(true)
    expect(placed.find((item) => item.id === 'idle')?.visible).toBe(false)
  })

  it('places a node at the top edge below itself', () => {
    const placed = placeAutomationLabels([anchor({ id: 'top', y: 0.02 })], 400, 200)
    expect(placed[0]?.visible).toBe(true)
    expect(placed[0]?.side).toBe('below')
  })

  it('places a node at the bottom edge above itself', () => {
    const placed = placeAutomationLabels([anchor({ id: 'bottom', y: 0.98 })], 400, 200)
    expect(placed[0]?.visible).toBe(true)
    expect(placed[0]?.side).toBe('above')
  })
})
