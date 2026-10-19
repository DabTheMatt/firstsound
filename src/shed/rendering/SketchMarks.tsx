import { presentedFillOpacity } from '../opacity'
import type { SketchPart } from './types'

type Props = {
  parts: readonly SketchPart[]
  drawing?: string
  /** Sheet marks stay as drawn. Building marks follow the scene switch. */
  transparent?: boolean
}

export function SketchMarks({ parts, drawing, transparent }: Props) {
  return parts.map((part) => (
    <path
      key={part.id}
      data-part={part.id}
      data-layer={part.layer}
      data-drawing={drawing}
      d={part.d}
      fill={part.fill}
      fillOpacity={transparent == null ? part.fillOpacity : presentedFillOpacity(part, transparent)}
      opacity={part.opacity}
      stroke={part.stroke}
      strokeWidth={part.strokeWidth}
      strokeOpacity={part.strokeOpacity}
      strokeDasharray={part.strokeDasharray}
      strokeLinejoin="round"
      strokeLinecap="round"
      fillRule={part.fillRule}
      pointerEvents={part.pointerEvents}
    />
  ))
}
