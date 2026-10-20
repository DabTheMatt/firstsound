import { lazy, memo, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { CityView } from './city/CityView'
import { loadSceneMode, persistSceneMode } from './city/sceneMode'
import type { ShedSceneMode } from './city/model'
import { hasBranch } from './construction/build'
import { CATALOG, type CatalogGroup } from './construction/catalog'
import { entriesFor, openDirections } from './construction/graph'
import { sceneBounds } from './construction/layout'
import { ElementLibrary } from './ElementLibrary'
import { ElementPanel } from './ElementPanel'
import { addElement } from './commands'
import {
  isConstructionDocument,
  type ArchitecturalElement,
  type AttachmentType,
  type ElementType,
  type ParamKey,
} from './model'
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

type LibraryRequest =
  | { kind: 'free' }
  | { kind: 'foundation' }
  | { kind: 'attach'; parentId: string; direction: AttachmentType }

export const ShedView = memo(function ShedView() {
  const { t } = useI18n()
  const shed = useShedDocument()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [camera, setCamera] = useState<SceneCamera>(() => defaultCamera())
  const [focusPanel, setFocusPanel] = useState(false)
  const [library, setLibrary] = useState<LibraryRequest | null>(null)
  const [pendingDelete, setPendingDelete] = useState<'branch' | 'root' | null>(null)
  const [sceneMode, setSceneMode] = useState<ShedSceneMode>(() => loadSceneMode())
  const panelRef = useRef<HTMLElement>(null)
  const libraryRef = useRef<HTMLElement>(null)
  const construction = isConstructionDocument(shed.document)
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
  const directions = useMemo(
    () => (construction && selected ? openDirections(shed.document.scene.elements, selected.id) : []),
    [construction, selected, shed.document.scene.elements],
  )

  const select = useCallback((id: string, via: 'pointer' | 'keyboard') => {
    setSelectedId(id)
    setFocusPanel(via === 'keyboard')
    setLibrary(null)
    setPendingDelete(null)
    shed.clearNotice()
  }, [shed])

  const deselect = useCallback(() => {
    const id = selectedId
    setSelectedId(null)
    setFocusPanel(false)
    setPendingDelete(null)
    if (!id || typeof document === 'undefined') return
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id
    requestAnimationFrame(() => {
      document.querySelector<SVGElement>(`[data-shed-element="${escaped}"]`)?.focus()
    })
  }, [selectedId])

  const labelFor = useCallback(
    (element: ArchitecturalElement, isSelected: boolean) => {
      const piece = element.catalogId ? t.shed.pieces[element.catalogId] : undefined
      const name = piece || t.shed.categories[element.type]
      if (!construction) return t.shed.elementName(name, isSelected)
      const parent = shed.document.scene.elements.find((item) => item.id === element.parentId)
      const parentName = parent?.catalogId ? t.shed.pieces[parent.catalogId] : parent ? t.shed.categories[parent.type] : ''
      const relation =
        element.attachmentType === 'TOP'
          ? t.shed.relationAbove(parentName)
          : element.attachmentType === 'LEFT'
            ? t.shed.relationLeft(parentName)
            : element.attachmentType === 'RIGHT'
              ? t.shed.relationRight(parentName)
              : t.shed.relationRoot
      const open = openDirections(shed.document.scene.elements, element.id)
      const links = open.length
        ? t.shed.linksAvailable(open.map((direction) => t.shed.directions[direction]).join(', '))
        : t.shed.linksNone
      const spoken = t.shed.structureLabel(name, relation, links)
      return isSelected ? `${spoken}` : spoken
    },
    [construction, shed.document.scene.elements, t],
  )

  const zoomBy = useCallback((direction: 'in' | 'out' | 'reset') => {
    setCamera((current) => {
      if (direction === 'reset') return defaultCamera()
      return clampCamera({ ...current, zoom: nextZoom(current.zoom, direction) })
    })
  }, [])

  const openDirection = (direction: AttachmentType) => {
    if (!selected) return
    setLibrary({ kind: 'attach', parentId: selected.id, direction })
    setFocusPanel(false)
    setPendingDelete(null)
  }

  const add = (type: ElementType) => {
    const before = new Set(shed.document.scene.elements.map((element) => element.id))
    const next = addElement(shed.document, type)
    const added = next.scene.elements.find((element) => !before.has(element.id))
    if (!added) return
    shed.add(type)
    setLibrary(null)
    setSelectedId(added.id)
    setFocusPanel(true)
  }

  const pickCatalog = (catalogId: string) => {
    if (!library || library.kind === 'free') return
    const added = library.kind === 'foundation' ? shed.found(catalogId) : shed.attach(library.parentId, library.direction, catalogId)
    if (!added) return
    setLibrary(null)
    setSelectedId(added)
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
    if (construction) {
      const element = shed.document.scene.elements.find((item) => item.id === id)
      if (!element) return
      if (hasBranch(shed.document, id)) {
        setPendingDelete('branch')
        setSelectedId(id)
        setFocusPanel(true)
        return
      }
      if (element.parentId == null) {
        setPendingDelete('root')
        setSelectedId(id)
        setFocusPanel(true)
        return
      }
      shed.remove(id)
    } else {
      shed.remove(id)
    }
    if (selectedId === id) {
      setSelectedId(null)
      setFocusPanel(false)
    }
    setPendingDelete(null)
  }

  const confirmDelete = () => {
    if (!selected) return
    if (pendingDelete === 'branch' || (pendingDelete === 'root' && hasBranch(shed.document, selected.id))) {
      shed.removeBranch(selected.id)
    } else {
      shed.remove(selected.id)
    }
    setSelectedId(null)
    setPendingDelete(null)
    setFocusPanel(false)
  }

  const setParam = (key: ParamKey, value: number) => {
    if (!selected) return
    shed.patch(selected.id, { params: { [key]: value } })
  }

  const chooseScene = (next: ShedSceneMode) => {
    setSceneMode(next)
    persistSceneMode(next)
  }

  const libraryEntries = useMemo(() => {
    if (!library || library.kind === 'free') return []
    const source =
      library.kind === 'foundation'
        ? CATALOG.filter((entry) => entry.foundation)
        : (() => {
            const parent = shed.document.scene.elements.find((element) => element.id === library.parentId)
            return parent?.role ? entriesFor(parent.role, library.direction) : []
          })()
    return source.map((entry) => ({
      id: entry.id,
      name: t.shed.pieces[entry.id],
      group: entry.group,
    }))
  }, [library, shed.document.scene.elements, t])

  const forms = useMemo(() => {
    if (!construction || !selected?.role) return []
    return CATALOG.filter((entry) => entry.role === selected.role).map((entry) => ({
      id: entry.id,
      name: t.shed.pieces[entry.id],
    }))
  }, [construction, selected, t])

  const attachments = useMemo(() => {
    if (!construction || !selected) return []
    const bounds = sceneBounds(selected)
    const spot = {
      LEFT: { x: bounds.left - 20, y: (bounds.top + bounds.bottom) / 2 },
      RIGHT: { x: bounds.right + 20, y: (bounds.top + bounds.bottom) / 2 },
      TOP: { x: bounds.cx, y: bounds.top - 20 },
    }
    return directions.map((direction) => ({
      direction,
      label: direction === 'LEFT' ? t.shed.addLeft : direction === 'RIGHT' ? t.shed.addRight : t.shed.addAbove,
      x: spot[direction].x,
      y: spot[direction].y,
    }))
  }, [construction, directions, selected, t])

  if (SketchCompare && sketchPreviewRequested()) {
    return (
      <section className={styles.root} data-shed-view="" data-sketch-preview="" aria-label={t.view.shed}>
        <Suspense fallback={null}>
          <SketchCompare />
        </Suspense>
      </section>
    )
  }

  const notice = shed.notice ? t.shed.errors[shed.notice] : null
  const emptyBuild = construction && shed.document.scene.elements.length === 0

  return (
    <section
      className={styles.root}
      data-shed-view=""
      data-shed-scene-mode={sceneMode}
      data-construction={construction ? 'true' : 'false'}
      aria-label={t.view.shed}
      onKeyDown={(event) => {
        if (sceneMode !== 'architecture') return
        if (construction && selected && event.altKey && !library) {
          const direction = event.key === 'ArrowLeft' ? 'LEFT' : event.key === 'ArrowRight' ? 'RIGHT' : event.key === 'ArrowUp' ? 'TOP' : null
          if (direction && directions.includes(direction)) {
            event.preventDefault()
            openDirection(direction)
            return
          }
        }
        if (event.key !== 'Escape' || !selectedId || library) return
        if (event.target instanceof Element && event.target.closest('[data-shed-panel]')) return
        event.preventDefault()
        deselect()
      }}
    >
      <div className={styles.modeBar} role="group" aria-label={t.shed.city.modeGroup}>
        <button
          type="button"
          className={styles.tool}
          aria-pressed={sceneMode === 'architecture'}
          onClick={() => chooseScene('architecture')}
        >
          {t.shed.city.modeArchitecture}
        </button>
        <button type="button" className={styles.tool} aria-pressed={sceneMode === 'city'} onClick={() => chooseScene('city')}>
          {t.shed.city.modeCity}
        </button>
      </div>
      {sceneMode === 'city' ? (
        <CityView />
      ) : (
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
            attachments={attachments}
            onAttach={openDirection}
          />
          {emptyBuild && !library ? (
            <div className={styles.start}>
              <p>{t.shed.startBuild}</p>
              <button type="button" className={styles.tool} onClick={() => setLibrary({ kind: 'foundation' })}>
                {t.shed.startBuild}
              </button>
            </div>
          ) : null}
          <SceneToolbar
            copy={copy}
            status={shed.status}
            libraryOpen={library != null}
            transparent={transparent}
            showAdd={!construction || emptyBuild}
            addLabel={emptyBuild ? t.shed.startBuild : copy.addElement}
            migration={
              construction && shed.legacy
                ? { label: t.shed.restoreFree, onClick: () => shed.restoreFree() }
                : !construction
                  ? { label: t.shed.startConnected, onClick: () => shed.beginBuild() }
                  : null
            }
            onToggleTransparency={() => shed.setTransparency(!transparent)}
            onZoomIn={() => zoomBy('in')}
            onZoomOut={() => zoomBy('out')}
            onResetView={() => zoomBy('reset')}
            onPan={(direction) => setCamera((current) => panView(current, direction))}
            onAdd={() => {
              setLibrary((open) => (open ? null : construction ? { kind: 'foundation' } : { kind: 'free' }))
              setFocusPanel(false)
            }}
          />
          {library ? (
            <div id="shed-library">
              <ElementLibrary
                copy={copy}
                panelRef={libraryRef}
                onAdd={add}
                onClose={() => setLibrary(null)}
                entries={library.kind === 'free' ? undefined : libraryEntries}
                groupLabel={(group: CatalogGroup) => t.shed.groups[group]}
                onPick={library.kind === 'free' ? undefined : pickCatalog}
              />
            </div>
          ) : null}
          {selected && !library ? (
            <ElementPanel
              element={selected}
              status={shed.status}
              copy={copy}
              panelRef={panelRef}
              focusOnOpen={focusPanel}
              construction={construction}
              directions={directions}
              onDirection={openDirection}
              forms={forms}
              onForm={(catalogId) => shed.chooseForm(selected.id, catalogId)}
              notice={notice}
              pendingDelete={pendingDelete}
              onConfirmDelete={confirmDelete}
              onCancelDelete={() => setPendingDelete(null)}
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
      )}
    </section>
  )
})
