import type { TowerPart } from './geometry'

export function GraphicPaths({ parts }: { parts: TowerPart[] }) {
  return (
    <>
      {parts.map((part) => (
        <path
          key={part.id}
          data-part={part.id}
          data-drawing="pen-watercolor"
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
      ))}
    </>
  )
}
