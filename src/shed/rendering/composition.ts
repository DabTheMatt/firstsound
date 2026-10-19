import { SHED_BLUE, SHED_BRICK, SHED_GOLD, SHED_LIMESTONE, SHED_WARM_GRAY } from '../palette'
import { looseRect, wash } from './color'
import { arcContour, diskContour, fmt, lineContour } from './contour'
import { trace } from './ink'
import { starContour } from './ornament'
import { forkRng } from './seed'
import type { SketchPart } from './types'

/**
 * Sheet-level drawing. It does not follow architectural elements,
 * so a drag cannot rebuild it. Every mark ignores the pointer.
 */
export function composeSheet(width: number, height: number, seed: number): SketchPart[] {
  const layout = forkRng(seed, 'sheet')
  const sway = (layout.next() - 0.5) * 12
  const parts: SketchPart[] = []
  const guide = {
    style: 'steady' as const,
    abstraction: 0.15,
    dashed: true,
    weight: 0.45,
    scale: 0.25,
    opacity: 0.42,
  }

  parts.push(...trace(
    'sheet-axis',
    lineContour('sheet-axis', [[width * 0.2 + sway, 36], [width * 0.2 + sway, height - 48]], false),
    { ...guide, rng: forkRng(seed, 'sheet-axis') },
  ))
  parts.push(...trace(
    'sheet-level',
    lineContour('sheet-level', [[42, height * 0.16], [width * 0.34, height * 0.16 + sway * 0.15]], false),
    { ...guide, rng: forkRng(seed, 'sheet-level') },
  ))
  parts.push(...trace(
    'sheet-arc',
    arcContour('sheet-arc', width * 0.8 + sway * 0.4, height * 0.18, 74, 200, 430),
    { ...guide, rng: forkRng(seed, 'sheet-arc'), scale: 0.4, opacity: 0.38 },
  ))
  parts.push(...trace(
    'sheet-arc-minor',
    arcContour('sheet-arc-minor', 92, height * 0.72, 36, 250, 460),
    { ...guide, rng: forkRng(seed, 'sheet-arc-minor'), scale: 0.3, opacity: 0.32 },
  ))

  const tickTop = height * 0.16
  const ticks: string[] = []
  for (let index = 0; index < 7; index += 1) {
    const x = 58 + index * 22
    const tall = index % 3 === 0
    ticks.push(`M${fmt(x)} ${fmt(tickTop - (tall ? 7 : 4))} L${fmt(x)} ${fmt(tickTop + (tall ? 7 : 4))}`)
  }
  parts.push({
    id: 'sheet-ticks',
    d: ticks.join(' '),
    layer: 'construction',
    fill: 'none',
    stroke: SHED_WARM_GRAY,
    strokeWidth: 0.5,
    strokeOpacity: 0.45,
    pointerEvents: 'none',
  })

  parts.push(...wash('sheet-disc-gold', diskContour('sheet-disc-gold', width * 0.16, height * 0.22, 86), SHED_GOLD, {
    treatment: 'reserve',
    abstraction: 0.2,
    rng: forkRng(seed, 'sheet-gold'),
    opacity: 0.14,
  }))
  parts.push(...wash('sheet-disc-blue', diskContour('sheet-disc-blue', width * 0.86, height * 0.58, 58), SHED_BLUE, {
    treatment: 'reserve',
    abstraction: 0.25,
    rng: forkRng(seed, 'sheet-blue'),
    opacity: 0.1,
  }))
  parts.push(looseRect('sheet-patch-brick', 46 + sway, height * 0.6, 78, 34, -3, SHED_BRICK, 0.07))
  parts.push(looseRect('sheet-patch-stone', width - 148, 42, 62, 26, 4, SHED_LIMESTONE, 0.14))

  parts.push(...trace(
    'sheet-star-a',
    starContour('sheet-star-a', 88, 74, 7),
    { style: 'studied', abstraction: 0.35, rng: forkRng(seed, 'sheet-star-a'), scale: 0.4, weight: 0.6, opacity: 0.55 },
  ))
  parts.push(...trace(
    'sheet-star-b',
    starContour('sheet-star-b', width - 96, height * 0.3, 5.5),
    { style: 'studied', abstraction: 0.3, rng: forkRng(seed, 'sheet-star-b'), scale: 0.35, weight: 0.55, opacity: 0.4 },
  ))

  return parts
}
