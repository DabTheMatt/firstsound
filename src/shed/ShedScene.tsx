import { useRef } from 'react'
import { elementsInDrawOrder } from './commands'
import type { ArchitecturalElement, ShedDocument } from './model'
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
      <rect data-scene-ground="true" width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="var(--bg-app)" />
      <rect
        data-scene-ground="true"
        y={Math.round(SCENE_HEIGHT * 0.78)}
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT - Math.round(SCENE_HEIGHT * 0.78)}
        fill="color-mix(in srgb, var(--text-primary) 7%, var(--bg-app))"
      />
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
