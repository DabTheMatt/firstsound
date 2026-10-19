import type { TowerPart } from './geometry'
import { presentedFillOpacity } from './opacity'

export function GraphicPaths({ parts, transparent = true }: { parts: TowerPart[]; transparent?: boolean }) {
  return (
    <>
      {parts.map((part) => (
        <path
          key={part.id}
          data-part={part.id}
          data-drawing="pen-watercolor"
          d={part.d}
          fill={part.fill}
          fillOpacity={presentedFillOpacity(part, transparent)}
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
      ))}
    </>
  )
}
