import { useEffect, useId, type RefObject } from 'react'
import { focusInitial } from '../a11y/dialogFocus'
import { catalogById, type CatalogGroup } from './construction/catalog'
import { elementFromCatalog } from './construction/element'
import { buildElement } from './geometry'
import { ELEMENT_TYPES, defaultElement, type ElementType } from './model'
import { GraphicPaths } from './parts'
import styles from './ShedView.module.css'

type Copy = {
  library: string
  close: string
  categories: Record<ElementType, string>
  descriptions: Record<ElementType, string>
}

export type LibraryEntry = {
  id: string
  name: string
  group: CatalogGroup
}

type Props = {
  copy: Copy
  panelRef: RefObject<HTMLElement | null>
  onAdd: (type: ElementType) => void
  onClose: () => void
  entries?: readonly LibraryEntry[]
  groupLabel?: (group: CatalogGroup) => string
  onPick?: (id: string) => void
}

function Preview({ type }: { type: ElementType }) {
  const graphic = buildElement(defaultElement(type, `preview-${type}`))
  return (
    <svg className={styles.preview} viewBox={`0 0 ${graphic.width} ${graphic.height}`} aria-hidden="true">
      <GraphicPaths parts={graphic.parts} />
    </svg>
  )
}

function CatalogPreview({ id }: { id: string }) {
  const entry = catalogById(id)
  if (!entry) return null
  const graphic = buildElement(elementFromCatalog(entry, `library-${id}`, { parentId: null, attachmentType: null }))
  return (
    <svg className={styles.preview} viewBox={`0 0 ${graphic.width} ${graphic.height}`} aria-hidden="true">
      <GraphicPaths parts={graphic.parts} />
    </svg>
  )
}

export function ElementLibrary({ copy, panelRef, onAdd, onClose, entries, groupLabel, onPick }: Props) {
  const titleId = useId()

  useEffect(() => {
    focusInitial(panelRef.current)
  }, [panelRef])

  return (
    <aside
      ref={panelRef}
      className={styles.library}
      role="dialog"
      aria-labelledby={titleId}
      data-shed-library=""
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
    >
      <div className={styles.panelHead}>
        <h2 id={titleId} tabIndex={-1} data-dialog-initial="">
          {copy.library}
        </h2>
        <button type="button" onClick={onClose}>
          {copy.close}
        </button>
      </div>
      {entries && onPick ? (
        <div className={styles.libraryList}>
          {entries.map((entry, index) => {
            const previous = entries[index - 1]
            const heading = !previous || previous.group !== entry.group
            return (
              <div key={entry.id} className={styles.libraryGroup}>
                {heading ? <h3 className={styles.libraryGroupTitle}>{groupLabel?.(entry.group) ?? entry.group}</h3> : null}
                <button type="button" className={styles.libraryItem} onClick={() => onPick(entry.id)}>
                  <CatalogPreview id={entry.id} />
                  <span className={styles.libraryName}>{entry.name}</span>
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
      {entries ? null : (
      <div className={styles.libraryList}>
        {ELEMENT_TYPES.map((type) => {
          const name = copy.categories[type]
          const description = copy.descriptions[type]
          return (
            <button
              key={type}
              type="button"
              className={styles.libraryItem}
              aria-label={`${name}. ${description}`}
              onClick={() => onAdd(type)}
            >
              <Preview type={type} />
              <span className={styles.libraryText}>
                <span className={styles.libraryName}>{name}</span>
                <span className={styles.libraryDescription}>{description}</span>
              </span>
            </button>
          )
        })}
      </div>
      )}
    </aside>
  )
}
