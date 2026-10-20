import { memo, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { buildElement, type TowerGraphic } from './geometry'
import type { ArchitecturalElement } from './model'
import { GraphicPaths } from './parts'
import { SketchMarks } from './rendering/SketchMarks'
import { renderSketchTower, usesSketchTower } from './rendering/tower'
import { SCENE_HEIGHT, SCENE_WIDTH, elementFit } from './view'
import styles from './ShedView.module.css'

type Props = {
  element: ArchitecturalElement
  selected: boolean
  label: string
  zoom: number
  onSelect: (id: string, via: 'pointer' | 'keyboard') => void
  onMove: (id: string, x: number, y: number) => void
  onNudge: (id: string, key: string, shiftKey: boolean) => void
  onDelete?: (id: string) => void
  transparent?: boolean
}

export const TowerElement = memo(function TowerElement({
  element,
  selected,
  label,
  zoom,
  onSelect,
  onMove,
  onNudge,
  onDelete,
  transparent = true,
}: Props) {
  const sketch = usesSketchTower(element) ? renderSketchTower(element) : null
  const library = sketch ? null : buildElement(element)
  const graphic = sketch ?? (library as TowerGraphic)
  const x = element.x * SCENE_WIDTH
  const y = element.y * SCENE_HEIGHT
  const fit = elementFit(graphic.width, graphic.height)

  const onPointerDown = (event: ReactPointerEvent<SVGGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus()
    onSelect(element.id, 'pointer')
    if (event.pointerType === 'touch' && !selected) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const svg = event.currentTarget.ownerSVGElement
    const rect = svg?.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const originX = element.x
    const originY = element.y
    const pointerId = event.pointerId
    const target = event.currentTarget

    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId || !rect || rect.width < 1 || rect.height < 1) return
      const dx = (pointer.clientX - startX) / rect.width / zoom
      const dy = (pointer.clientY - startY) / rect.height / zoom
      onMove(element.id, originX + dx, originY + dy)
    }
    const end = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  const onKeyDown = (event: ReactKeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(element.id, 'keyboard')
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!onDelete) return
      event.preventDefault()
      onDelete(element.id)
      return
    }
    if (event.key.startsWith('Arrow')) {
      event.preventDefault()
      onNudge(element.id, event.key, event.shiftKey)
    }
  }

  return (
    <g
      className={styles.element}
      data-shed-element={element.id}
      data-element-type={element.type}
      data-selected={selected ? 'true' : 'false'}
      data-variant={element.variant}
      data-primary={graphic.primary}
      data-secondary={graphic.secondary}
      data-ornament={graphic.ornament}
      data-body-height={graphic.body.h.toFixed(1)}
      data-body-width={graphic.body.w.toFixed(1)}
      data-roof-height={graphic.roofHeight.toFixed(1)}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      transform={`translate(${x} ${y}) scale(${fit.toFixed(4)}) translate(${(-graphic.anchorX).toFixed(1)} ${(-graphic.anchorY).toFixed(1)})`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      {sketch ? (
        <SketchMarks parts={sketch.parts} drawing="pen-watercolor" transparent={transparent} />
      ) : (
        <GraphicPaths parts={library!.parts} transparent={transparent} />
      )}
      <rect className={styles.focusRing} x={-6} y={-6} width={graphic.width + 12} height={graphic.height + 12} />
      {selected ? (
        <g aria-hidden="true">
          <rect className={styles.selectionRing} x={-8} y={-8} width={graphic.width + 16} height={graphic.height + 16} />
          <rect className={styles.selectionMark} x={graphic.width - 4} y={-4} width={10} height={10} />
        </g>
      ) : null}
    </g>
  )
})

export const SceneElement = TowerElement
