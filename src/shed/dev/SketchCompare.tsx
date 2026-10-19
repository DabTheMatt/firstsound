import type { ReactNode } from 'react'
import { buildTower } from '../geometry'
import { defaultTower, type ArchitecturalElement } from '../model'
import { renderSketchTower } from '../rendering/tower'
import type { SketchPart } from '../rendering/types'
import styles from './SketchCompare.module.css'

type LegacyPart = {
  id: string
  d: string
  fill: string
  fillOpacity?: number
  opacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  strokeDasharray?: string
  fillRule?: 'evenodd' | 'nonzero'
  pointerEvents?: 'none'
}

function marks(parts: readonly (SketchPart | LegacyPart)[]) {
  return parts.map((part) => (
    <path
      key={part.id}
      data-part={part.id}
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
      pointerEvents="none"
    />
  ))
}

function Frame({
  caption,
  renderer,
  width,
  height,
  children,
}: {
  caption: string
  renderer: string
  width: number
  height: number
  children: ReactNode
}) {
  return (
    <figure className={styles.frame} data-renderer={renderer}>
      <svg className={styles.sheet} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label={caption}>
        <rect width={width} height={height} fill="#e8ddc8" />
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function LegacyTower({ element }: { element: ArchitecturalElement }) {
  const graphic = buildTower(element)
  return (
    <Frame caption="Current renderer" renderer="legacy" width={graphic.width} height={graphic.height}>
      {marks(graphic.parts)}
    </Frame>
  )
}

function SketchTower({ element, caption }: { element: ArchitecturalElement; caption: string }) {
  const graphic = renderSketchTower(element)
  return (
    <Frame caption={caption} renderer="sketch" width={graphic.width} height={graphic.height}>
      {marks(graphic.parts)}
    </Frame>
  )
}

/** Development fixture. Not mounted from the production SHED scene. */
export function SketchCompare() {
  const shared = defaultTower()
  const seeds = [shared.visualSeed ?? 1847, 21, 880, 4096]
  return (
    <div className={styles.page} data-sketch-compare="">
      <h1>SHED sketch engine</h1>
      <p className={styles.note}>
        Development preview. Both towers use the same height, width, roof, and colors. This panel is not part of the SHED scene.
      </p>
      <div className={styles.pair}>
        <LegacyTower element={shared} />
        <SketchTower element={shared} caption="Sketch engine" />
      </div>
      <h2>Seeds</h2>
      <div className={styles.row}>
        {seeds.map((seed) => (
          <SketchTower key={seed} element={{ ...shared, visualSeed: seed }} caption={`Seed ${seed}`} />
        ))}
      </div>
      <h2>Abstraction</h2>
      <div className={styles.row}>
        {[0, 0.4, 0.72, 1].map((abstraction) => (
          <SketchTower
            key={abstraction}
            element={{ ...shared, abstraction }}
            caption={`Abstraction ${abstraction.toFixed(2)}`}
          />
        ))}
      </div>
    </div>
  )
}
