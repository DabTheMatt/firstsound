import type { SketchPart } from './types'

type Props = {
  parts: readonly SketchPart[]
  drawing?: string
}

export function SketchMarks({ parts, drawing }: Props) {
  return parts.map((part) => (
    <path
      key={part.id}
      data-part={part.id}
      data-layer={part.layer}
      data-drawing={drawing}
      d={part.d}
      fill={part.fill}
      fillOpacity={part.fillOpacity}
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
