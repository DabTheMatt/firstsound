import { lazy, memo, Suspense, useCallback, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { addElement } from './commands'
import { ElementLibrary } from './ElementLibrary'
import { ElementPanel } from './ElementPanel'
import type { ArchitecturalElement, ElementType, ParamKey } from './model'
import { buildingsAreTransparent } from './opacity'
import { SceneToolbar } from './SceneToolbar'
import { ShedScene } from './ShedScene'
import { useShedDocument } from './useShedDocument'
import { clampCamera, defaultCamera, nextZoom, panView, type SceneCamera } from './view'
import styles from './ShedView.module.css'

const SketchCompare = import.meta.env.DEV
  ? lazy(() => import('./dev/SketchCompare').then((mod) => ({ default: mod.SketchCompare })))
  : null

function sketchPreviewRequested(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('sketch') === '1'
}

export const ShedView = memo(function ShedView() {
  const { t } = useI18n()
  const shed = useShedDocument()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [camera, setCamera] = useState<SceneCamera>(() => defaultCamera())
  const [focusPanel, setFocusPanel] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const libraryRef = useRef<HTMLElement>(null)
  const selected = shed.document.scene.elements.find((element) => element.id === selectedId) ?? null
  const transparent = buildingsAreTransparent(shed.document.scene)
  const activeId = selected?.id ?? null
  const copy = {
    ...t.shed,
    ornaments: {
      none: t.shed.ornamentNone,
      finial: t.shed.ornamentFinial,
      rosette: t.shed.ornamentRosette,
      star: t.shed.ornamentStar,
    },
  }

  const select = useCallback((id: string, via: 'pointer' | 'keyboard') => {
    setSelectedId(id)
    setFocusPanel(via === 'keyboard')
    setLibraryOpen(false)
  }, [])

  const deselect = useCallback(() => {
    const id = selectedId
    setSelectedId(null)
    setFocusPanel(false)
    if (!id || typeof document === 'undefined') return
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id
    requestAnimationFrame(() => {
      document.querySelector<SVGElement>(`[data-shed-element="${escaped}"]`)?.focus()
    })
  }, [selectedId])

  const labelFor = useCallback(
    (element: ArchitecturalElement, isSelected: boolean) => t.shed.elementName(t.shed.categories[element.type], isSelected),
    [t],
  )

  const zoomBy = useCallback((direction: 'in' | 'out' | 'reset') => {
    setCamera((current) => {
      if (direction === 'reset') return defaultCamera()
      return clampCamera({ ...current, zoom: nextZoom(current.zoom, direction) })
    })
  }, [])

  const add = (type: ElementType) => {
    const before = new Set(shed.document.scene.elements.map((element) => element.id))
    const next = addElement(shed.document, type)
    const added = next.scene.elements.find((element) => !before.has(element.id))
    if (!added) return
    shed.add(type)
    setLibraryOpen(false)
    setSelectedId(added.id)
    setFocusPanel(true)
  }

  const duplicate = () => {
    if (!selected) return
    const id = shed.duplicate(selected.id)
    if (!id) return
    setSelectedId(id)
    setFocusPanel(true)
  }

  const remove = (id: string) => {
    shed.remove(id)
    if (selectedId === id) {
      setSelectedId(null)
      setFocusPanel(false)
    }
  }

  const setParam = (key: ParamKey, value: number) => {
    if (!selected) return
    shed.patch(selected.id, { params: { [key]: value } })
  }

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
        if (event.key !== 'Escape' || !selectedId || libraryOpen) return
        if (event.target instanceof Element && event.target.closest('[data-shed-panel]')) return
        event.preventDefault()
        deselect()
      }}
    >
      <div className={styles.sceneWrap}>
        <ShedScene
          document={shed.document}
          selectedId={activeId}
          camera={camera}
          sceneLabel={copy.scene}
          labelFor={labelFor}
          onSelect={select}
          onDeselect={deselect}
          onMove={shed.move}
          onNudge={shed.nudge}
          onDelete={remove}
          onPan={(panX, panY) => setCamera((current) => clampCamera({ ...current, panX, panY }))}
          onZoom={(direction) => zoomBy(direction)}
          transparent={transparent}
        />
        <SceneToolbar
          copy={copy}
          status={shed.status}
          libraryOpen={libraryOpen}
          transparent={transparent}
          onToggleTransparency={() => shed.setTransparency(!transparent)}
          onZoomIn={() => zoomBy('in')}
          onZoomOut={() => zoomBy('out')}
          onResetView={() => zoomBy('reset')}
          onPan={(direction) => setCamera((current) => panView(current, direction))}
          onAdd={() => {
            setLibraryOpen((open) => !open)
            setFocusPanel(false)
          }}
        />
        {libraryOpen ? (
          <div id="shed-library">
            <ElementLibrary
              copy={copy}
              panelRef={libraryRef}
              onAdd={add}
              onClose={() => setLibraryOpen(false)}
            />
          </div>
        ) : null}
        {selected && !libraryOpen ? (
          <ElementPanel
            element={selected}
            status={shed.status}
            copy={copy}
            panelRef={panelRef}
            focusOnOpen={focusPanel}
            onClose={deselect}
            onHeight={(height) => shed.patch(selected.id, { height })}
            onWidth={(width) => shed.patch(selected.id, { width })}
            onRoof={(roof) => shed.patch(selected.id, { roof })}
            onPrimary={(primary) => shed.patch(selected.id, { primary })}
            onSecondary={(secondary) => shed.patch(selected.id, { secondary })}
            onDetail={(detail) => shed.patch(selected.id, { detail })}
            onX={(x) => shed.patch(selected.id, { x })}
            onY={(y) => shed.patch(selected.id, { y })}
            onOrnament={(ornament) => shed.ornament(selected.id, ornament)}
            onVariant={(variant) => shed.patch(selected.id, { variant })}
            onParam={setParam}
            onForward={() => shed.forward(selected.id)}
            onBackward={() => shed.backward(selected.id)}
            onReset={() => shed.reset(selected.id)}
            onDuplicate={duplicate}
            onDelete={() => remove(selected.id)}
          />
        ) : null}
      </div>
    </section>
  )
})
