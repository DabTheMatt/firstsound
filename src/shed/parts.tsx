import type { TowerPart } from './geometry'

export function GraphicPaths({ parts }: { parts: TowerPart[] }) {
  return (
    <>
      {parts.map((part) => (
        <path
          key={part.id}
          data-part={part.id}
          d={part.d}
          fill={part.fill ?? 'none'}
          stroke={part.stroke}
          strokeWidth={part.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={part.opacity}
        />
      ))}
    </>
  )
}
