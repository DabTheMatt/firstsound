import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { elementsInDrawOrder } from './commands'
import type { ArchitecturalElement, ShedDocument } from './model'
import { TowerElement } from './TowerElement'
import { SCENE_HEIGHT, SCENE_WIDTH, viewTransform, type SceneCamera } from './view'
import styles from './ShedView.module.css'

type Props = {
  document: ShedDocument
  selectedId: string | null
  camera: SceneCamera
  sceneLabel: string
  labelFor: (element: ArchitecturalElement, selected: boolean) => string
  onSelect: (id: string, via: 'pointer' | 'keyboard') => void
  onDeselect: () => void
  onMove: (id: string, x: number, y: number) => void
  onNudge: (id: string, key: string, shiftKey: boolean) => void
  onDelete: (id: string) => void
  onPan: (panX: number, panY: number) => void
  onZoom: (direction: 'in' | 'out') => void
}

export function ShedScene({
  document,
  selectedId,
  camera,
  sceneLabel,
  labelFor,
  onSelect,
  onDeselect,
  onMove,
  onNudge,
  onDelete,
  onPan,
  onZoom,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ordered = elementsInDrawOrder(document)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      onZoom(event.deltaY < 0 ? 'in' : 'out')
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [onZoom])

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.target
    const ground = target instanceof Element && (target === event.currentTarget || target.getAttribute('data-scene-ground') === 'true')
    if (!ground || event.button !== 0) return
    onDeselect()
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const originX = camera.panX
    const originY = camera.panY
    const zoom = camera.zoom
    const pointerId = event.pointerId
    svg.setPointerCapture(pointerId)
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId || rect.width < 1 || rect.height < 1) return
      const dx = ((pointer.clientX - startX) / rect.width) * (SCENE_WIDTH / zoom)
      const dy = ((pointer.clientY - startY) / rect.height) * (SCENE_HEIGHT / zoom)
      onPan(originX + dx, originY + dy)
    }
    const end = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return
      svg.removeEventListener('pointermove', move)
      svg.removeEventListener('pointerup', end)
      svg.removeEventListener('pointercancel', end)
    }
    svg.addEventListener('pointermove', move)
    svg.addEventListener('pointerup', end)
    svg.addEventListener('pointercancel', end)
  }

  return (
    <svg
      ref={svgRef}
      className={styles.scene}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      role="group"
      aria-label={sceneLabel}
      data-shed-scene=""
      onPointerDown={onPointerDown}
    >
      <rect data-scene-ground="true" width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="var(--bg-app)" />
      <rect
        data-scene-ground="true"
        y={Math.round(SCENE_HEIGHT * 0.78)}
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT - Math.round(SCENE_HEIGHT * 0.78)}
        fill="color-mix(in srgb, var(--text-primary) 7%, var(--bg-app))"
      />
      <g transform={viewTransform(camera)}>
        {ordered.map((element) => (
          <TowerElement
            key={element.id}
            element={element}
            selected={element.id === selectedId}
            label={labelFor(element, element.id === selectedId)}
            zoom={camera.zoom}
            onSelect={onSelect}
            onMove={onMove}
            onNudge={onNudge}
            onDelete={onDelete}
          />
        ))}
      </g>
    </svg>
  )
}
