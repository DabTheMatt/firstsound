import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { elementsInDrawOrder } from './commands'
import type { ArchitecturalElement, ShedDocument } from './model'
import { SHED_INK, SHED_LIMESTONE, SHED_PARCHMENT } from './palette'
import { SketchMarks } from './rendering/SketchMarks'
import { composeSheet } from './rendering/composition'
import { hashString } from './rendering/seed'
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
  const decoration = useMemo(
    () => composeSheet(SCENE_WIDTH, SCENE_HEIGHT, hashString(document.scene.id)),
    [document.scene.id],
  )

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
      <g transform={viewTransform(camera)}>
        <g data-shed-composition="" aria-hidden="true" pointerEvents="none">
          <SketchMarks parts={decoration} />
        </g>
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
