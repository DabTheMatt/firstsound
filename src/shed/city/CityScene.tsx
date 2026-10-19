import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { DrawPart } from '../draw'
import { buildElement } from '../geometry'
import { SHED_INK, SHED_LIMESTONE, SHED_PARCHMENT, SHED_WARM_GRAY } from '../palette'
import type { SceneCamera } from '../view'
import { cityViewTransform } from './camera'
import { buildingOnPlot, elementForBuilding } from './commands'
import { buildingScale, buildingTransform, neighborPlot, ringPath } from './geo'
import { CITY_BOUNDS, CITY_HEIGHT, CITY_WIDTH, krakowOldTown, type CityPlot } from './map'
import { authorById, type CityDocument } from './model'
import styles from './CityView.module.css'

type Props = {
  document: CityDocument
  selectedPlotId: string | null
  camera: SceneCamera
  sceneLabel: string
  labelFor: (plot: CityPlot, occupied: boolean) => string
  onSelect: (plotId: string, via: 'pointer' | 'keyboard') => void
  onDeselect: () => void
  onDelete: (plotId: string) => void
  onPan: (panX: number, panY: number) => void
  onZoom: (direction: 'in' | 'out') => void
}

const LANDMARK_FILL: Record<string, string> = {
  sukiennice: '#d9c7a4',
  mariacki: '#c4897c',
  'brama-florianska': '#b5796c',
  ratusz: '#cabb9a',
  wojciech: '#d2c4ae',
}

function MapInk({ parts }: { parts: DrawPart[] }) {
  return parts.map((part) => (
    <path
      key={part.id}
      d={part.d}
      fill={part.fill}
      fillOpacity={part.fillOpacity}
      opacity={part.opacity}
      stroke={part.stroke ?? SHED_INK}
      strokeWidth={part.strokeWidth}
      strokeOpacity={part.strokeOpacity}
      strokeDasharray={part.strokeDasharray}
      strokeLinejoin="round"
      strokeLinecap="round"
      fillRule={part.fillRule}
      vectorEffect="non-scaling-stroke"
    />
  ))
}

export function CityScene({
  document,
  selectedPlotId,
  camera,
  sceneLabel,
  labelFor,
  onSelect,
  onDeselect,
  onDelete,
  onPan,
  onZoom,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { meta, planty, squares, streets, landmarks, footprints, labels, plots } = krakowOldTown

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
    const ground = target instanceof Element && (target === event.currentTarget || target.closest('[data-scene-ground]') != null)
    const plotHit = target instanceof Element && target.closest('[data-city-plot]')
    if (plotHit || !ground || event.button !== 0) return
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
      const dx = ((pointer.clientX - startX) / rect.width) * (CITY_WIDTH / zoom)
      const dy = ((pointer.clientY - startY) / rect.height) * (CITY_HEIGHT / zoom)
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

  const onPlotKey = (plot: CityPlot, event: ReactKeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(plot.plotId, 'keyboard')
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete(plot.plotId)
      return
    }
    if (!event.key.startsWith('Arrow')) return
    const next = neighborPlot(plots, plot.plotId, event.key)
    if (!next) return
    event.preventDefault()
    onSelect(next.plotId, 'keyboard')
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(next.plotId) : next.plotId
    requestAnimationFrame(() => {
      svgRef.current?.querySelector<SVGElement>(`[data-city-plot="${escaped}"]`)?.focus()
    })
  }

  return (
    <svg
      ref={svgRef}
      className={styles.scene}
      viewBox={`${CITY_BOUNDS.minX} ${CITY_BOUNDS.minY} ${CITY_WIDTH} ${CITY_HEIGHT}`}
      role="group"
      aria-label={sceneLabel}
      data-shed-city-scene=""
      data-map-source={meta.source}
      data-map-retrieved={meta.retrieved}
      onPointerDown={onPointerDown}
    >
      <title>{sceneLabel}</title>
      <defs>
        <filter id="city-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.91  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.14 0" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
      </defs>
      <g transform={cityViewTransform(camera)} data-city-camera="">
        <rect
          data-scene-ground="true"
          x={CITY_BOUNDS.minX}
          y={CITY_BOUNDS.minY}
          width={CITY_WIDTH}
          height={CITY_HEIGHT}
          fill={SHED_PARCHMENT}
          filter="url(#city-paper)"
        />
        <path data-scene-ground="true" data-city-planty="" d={ringPath(planty)} fill="#c5c9a8" opacity={0.9} stroke={SHED_INK} strokeWidth={0.8} strokeOpacity={0.28} vectorEffect="non-scaling-stroke" />
        {streets.map((street) => (
          <path
            key={street.id}
            data-scene-ground="true"
            data-city-street={street.name || street.kind}
            d={ringPath(street.path, false)}
            fill="none"
            stroke={SHED_INK}
            strokeWidth={street.kind === 'pedestrian' ? 1.25 : 0.85}
            strokeOpacity={street.kind === 'pedestrian' ? 0.48 : 0.32}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {squares.map((square) => (
          <path
            key={square.name}
            data-scene-ground="true"
            data-city-square={square.name}
            d={ringPath(square.ring)}
            fill="#f3ead6"
            stroke={SHED_INK}
            strokeWidth={0.9}
            strokeOpacity={0.45}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {footprints
          .filter((footprint) => footprint.role !== 'landmark')
          .map((footprint) => (
            <path
              key={footprint.osmId}
              data-scene-ground="true"
              data-city-footprint=""
              d={ringPath(footprint.ring)}
              fill="#ddd3c0"
              stroke={SHED_INK}
              strokeWidth={0.45}
              strokeOpacity={0.35}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {landmarks.map((landmark) => (
          <path
            key={landmark.key}
            data-scene-ground="true"
            data-city-landmark={landmark.key}
            d={ringPath(landmark.ring)}
            fill={LANDMARK_FILL[landmark.key] ?? SHED_LIMESTONE}
            stroke={SHED_INK}
            strokeWidth={1.15}
            strokeOpacity={0.75}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {plots.map((plot) => {
          const building = buildingOnPlot(document, plot.plotId)
          const selected = plot.plotId === selectedPlotId
          const highlighted = Boolean(building && building.authorId === document.scene.activeAuthorId)
          const marker = building ? authorById(building.authorId)?.marker ?? SHED_WARM_GRAY : SHED_INK
          const graphic = building ? buildElement(elementForBuilding(building)) : null
          const placed = graphic ? buildingTransform(plot.center, graphic.anchorX, graphic.anchorY, buildingScale(graphic, plot.ring)) : ''
          return (
            <g
              key={plot.plotId}
              className={styles.plot}
              data-city-plot={plot.plotId}
              data-plot-status={building ? 'occupied' : 'available'}
              data-selected={selected ? 'true' : 'false'}
              data-author-highlight={highlighted ? 'true' : 'false'}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={labelFor(plot, Boolean(building))}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.focus()
                onSelect(plot.plotId, 'pointer')
              }}
              onKeyDown={(event) => onPlotKey(plot, event)}
            >
              <path d={ringPath(plot.ring)} fill="transparent" stroke="transparent" strokeWidth={12} />
              <path
                className={styles.plotShape}
                d={ringPath(plot.ring)}
                fill={building ? 'none' : '#f4e4c4'}
                fillOpacity={building ? 0 : 0.72}
                stroke={SHED_INK}
                strokeWidth={selected ? 2.4 : 1.7}
                strokeOpacity={building ? 0.4 : 0.9}
                strokeDasharray={building ? undefined : '4 3'}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {graphic ? (
                <g data-city-building={building?.id} data-building-type={building?.type} data-building-variant={building?.variant} transform={placed}>
                  <MapInk parts={graphic.parts} />
                </g>
              ) : null}
              {highlighted ? (
                <path
                  data-author-mark=""
                  d={ringPath(plot.ring)}
                  fill="none"
                  stroke={marker}
                  strokeWidth={2.4}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ) : null}
            </g>
          )
        })}
        {labels.map((label) => (
          <g key={`${label.name}-${label.x}`} transform={`translate(${label.x} ${label.y}) rotate(${label.rotate}) scale(${(1 / camera.zoom).toFixed(4)})`} pointerEvents="none">
            <text className={styles.streetLabel} textAnchor="middle" dominantBaseline="middle">
              {label.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
