import { useEffect, useId, type RefObject } from 'react'
import { focusInitial } from '../a11y/dialogFocus'
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

type Props = {
  copy: Copy
  panelRef: RefObject<HTMLElement | null>
  onAdd: (type: ElementType) => void
  onClose: () => void
}

function Preview({ type }: { type: ElementType }) {
  const graphic = buildElement(defaultElement(type, `preview-${type}`))
  return (
    <svg className={styles.preview} viewBox={`0 0 ${graphic.width} ${graphic.height}`} aria-hidden="true">
      <GraphicPaths parts={graphic.parts} />
    </svg>
  )
}

export function ElementLibrary({ copy, panelRef, onAdd, onClose }: Props) {
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
    </aside>
  )
}
