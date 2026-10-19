import { useRef } from 'react'
import { elementsInDrawOrder } from './commands'
import type { ArchitecturalElement, ShedDocument } from './model'
import { SHED_INK, SHED_LIMESTONE, SHED_PARCHMENT } from './palette'
import { SCENE_HEIGHT, SCENE_WIDTH } from './view'
import { TowerElement } from './TowerElement'
import styles from './ShedView.module.css'

type Props = {
  document: ShedDocument
  selectedId: string | null
  zoom: number
  sceneLabel: string
  labelFor: (element: ArchitecturalElement, selected: boolean) => string
  onSelect: (id: string, via: 'pointer' | 'keyboard') => void
  onDeselect: () => void
  onMove: (id: string, x: number, y: number) => void
  onNudge: (id: string, key: string, shiftKey: boolean) => void
}

export function ShedScene({
  document,
  selectedId,
  zoom,
  sceneLabel,
  labelFor,
  onSelect,
  onDeselect,
  onMove,
  onNudge,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ordered = elementsInDrawOrder(document)
  return (
    <svg
      ref={svgRef}
      className={styles.scene}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      role="group"
      aria-label={sceneLabel}
      data-shed-scene=""
      onPointerDown={(event) => {
        const target = event.target
        const ground = target instanceof Element && target.getAttribute('data-scene-ground') === 'true'
        if (target === event.currentTarget || ground) {
          onDeselect()
        }
      }}
    >
      <defs>
        <filter id="shed-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.91  0 0 0 0 0.87  0 0 0 0 0.78  0 0 0 0.16 0" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
      </defs>
      <rect data-scene-ground="true" width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={SHED_PARCHMENT} filter="url(#shed-paper)" />
      <rect
        data-scene-ground="true"
        y={Math.round(SCENE_HEIGHT * 0.78)}
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT - Math.round(SCENE_HEIGHT * 0.78)}
        fill={SHED_LIMESTONE}
        opacity={0.45}
      />
      <rect
        x={16}
        y={16}
        width={SCENE_WIDTH - 32}
        height={SCENE_HEIGHT - 32}
        fill="none"
        stroke={SHED_INK}
        strokeWidth={0.6}
        opacity={0.28}
        pointerEvents="none"
      />
      <line
        data-scene-ground="true"
        x1={36}
        y1={Math.round(SCENE_HEIGHT * 0.78)}
        x2={SCENE_WIDTH - 36}
        y2={Math.round(SCENE_HEIGHT * 0.78)}
        stroke={SHED_INK}
        strokeWidth={0.75}
        opacity={0.4}
      />
      {[
        [28, 28],
        [SCENE_WIDTH - 28, 28],
        [28, SCENE_HEIGHT - 28],
        [SCENE_WIDTH - 28, SCENE_HEIGHT - 28],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={SHED_INK} strokeWidth={0.6} opacity={0.4} pointerEvents="none">
          <line x1={x - 7} y1={y} x2={x + 7} y2={y} />
          <line x1={x} y1={y - 7} x2={x} y2={y + 7} />
        </g>
      ))}
      <g transform={`translate(${SCENE_WIDTH / 2} ${SCENE_HEIGHT / 2}) scale(${zoom}) translate(${-SCENE_WIDTH / 2} ${-SCENE_HEIGHT / 2})`}>
        {ordered.map((element) => (
          <TowerElement
            key={element.id}
            element={element}
            selected={element.id === selectedId}
            label={labelFor(element, element.id === selectedId)}
            zoom={zoom}
            onSelect={onSelect}
            onMove={onMove}
            onNudge={onNudge}
          />
        ))}
      </g>
    </svg>
  )
}
