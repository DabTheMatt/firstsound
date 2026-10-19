import { lazy, memo, Suspense, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { addTower } from './commands'
import { ElementPanel } from './ElementPanel'
import type { ArchitecturalElement } from './model'
import { SceneToolbar } from './SceneToolbar'
import { ShedScene } from './ShedScene'
import { useShedDocument } from './useShedDocument'
import { nextZoom } from './view'
import styles from './ShedView.module.css'

const SketchCompare = import.meta.env.DEV
  ? lazy(() => import('./dev/SketchCompare').then((mod) => ({ default: mod.SketchCompare })))
  : null

function sketchPreviewRequested(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('sketch') === '1'
}

function elementLabel(copy: (type: string, selected: boolean) => string, type: string, selected: boolean): string {
  return copy(type, selected)
}

export const ShedView = memo(function ShedView() {
  const { t } = useI18n()
  const shed = useShedDocument()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [focusPanel, setFocusPanel] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const selected = shed.document.scene.elements.find((element) => element.id === selectedId) ?? null

  const select = (id: string, via: 'pointer' | 'keyboard') => {
    setSelectedId(id)
    setFocusPanel(via === 'keyboard')
  }

  const deselect = () => {
    const id = selectedId
    setSelectedId(null)
    setFocusPanel(false)
    if (!id || typeof document === 'undefined') return
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id
    requestAnimationFrame(() => {
      document.querySelector<SVGElement>(`[data-shed-element="${escaped}"]`)?.focus()
    })
  }

  const labelFor = (element: ArchitecturalElement, isSelected: boolean) =>
    elementLabel(t.shed.elementName, t.shed.tower, element.type === 'tower' && isSelected)

  if (SketchCompare && sketchPreviewRequested()) {
    return (
      <section className={styles.root} data-shed-view="" data-sketch-preview="" aria-label={t.view.shed}>
        <Suspense fallback={null}>
          <SketchCompare />
        </Suspense>
      </section>
    )
  }

  return (
    <section
      className={styles.root}
      data-shed-view=""
      aria-label={t.view.shed}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !selectedId) return
        if (event.target instanceof Element && event.target.closest('[data-shed-panel]')) return
        event.preventDefault()
        deselect()
      }}
    >
      <div className={styles.sceneWrap}>
        <ShedScene
          document={shed.document}
          selectedId={selectedId}
          zoom={zoom}
          sceneLabel={t.shed.scene}
          labelFor={labelFor}
          onSelect={select}
          onDeselect={deselect}
          onMove={shed.move}
          onNudge={shed.nudge}
        />
        <SceneToolbar
          copy={t.shed}
          status={shed.status}
          onZoomIn={() => setZoom((current) => nextZoom(current, 'in'))}
          onZoomOut={() => setZoom((current) => nextZoom(current, 'out'))}
          onResetView={() => setZoom(nextZoom(zoom, 'reset'))}
          onAdd={() => {
            const next = addTower(shed.document)
            const added = next.scene.elements[next.scene.elements.length - 1]
            shed.add()
            if (added && next !== shed.document) select(added.id, 'pointer')
          }}
        />
        {selected ? (
          <ElementPanel
            element={selected}
            status={shed.status}
            copy={{
              ...t.shed,
              ornaments: {
                none: t.shed.ornamentNone,
                finial: t.shed.ornamentFinial,
                rosette: t.shed.ornamentRosette,
                star: t.shed.ornamentStar,
              },
            }}
            panelRef={panelRef}
            focusOnOpen={focusPanel}
            onClose={deselect}
            onHeight={(height) => shed.patch(selected.id, { height })}
            onWidth={(width) => shed.patch(selected.id, { width })}
            onRoof={(roof) => shed.patch(selected.id, { roof })}
            onPrimary={(primary) => shed.patch(selected.id, { primary })}
            onSecondary={(secondary) => shed.patch(selected.id, { secondary })}
            onX={(x) => shed.patch(selected.id, { x })}
            onY={(y) => shed.patch(selected.id, { y })}
            onOrnament={(ornament) => shed.ornament(selected.id, ornament)}
            onLayer={(delta) => shed.layer(selected.id, delta)}
            onReset={() => shed.reset(selected.id)}
          />
        ) : null}
      </div>
    </section>
  )
})
