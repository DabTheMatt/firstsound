import { useEffect, useId, type RefObject } from 'react'
import { radioGroupKey } from '../a11y/keyboard'
import { focusInitial } from '../a11y/dialogFocus'
import { ORNAMENT_IDS, type ArchitecturalElement, type OrnamentId } from './model'
import type { ShedLoadStatus } from './persistence'
import styles from './ShedView.module.css'

type Copy = {
  tower: string
  elementType: string
  height: string
  width: string
  roof: string
  primary: string
  secondary: string
  ornament: string
  ornaments: Record<OrnamentId, string>
  position: string
  positionX: string
  positionY: string
  layer: string
  layerForward: string
  layerBack: string
  reset: string
  close: string
  geometry: string
  appearance: string
  saved: string
  restored: string
  savedHint: string
  moveHint: string
}

type Props = {
  element: ArchitecturalElement
  status: ShedLoadStatus
  copy: Copy
  panelRef: RefObject<HTMLElement | null>
  focusOnOpen: boolean
  onClose: () => void
  onHeight: (value: number) => void
  onWidth: (value: number) => void
  onRoof: (value: number) => void
  onPrimary: (value: string) => void
  onSecondary: (value: string) => void
  onOrnament: (value: OrnamentId) => void
  onX: (value: number) => void
  onY: (value: number) => void
  onLayer: (delta: number) => void
  onReset: () => void
}

export function ElementPanel({
  element,
  status,
  copy,
  panelRef,
  focusOnOpen,
  onClose,
  onHeight,
  onWidth,
  onRoof,
  onPrimary,
  onSecondary,
  onOrnament,
  onX,
  onY,
  onLayer,
  onReset,
}: Props) {
  const titleId = useId()
  const ornamentLabel = useId()

  useEffect(() => {
    if (!focusOnOpen) return
    focusInitial(panelRef.current)
  }, [focusOnOpen, element.id, panelRef])

  const range = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    bounds: { min: number; max: number } = { min: 0, max: 1 },
  ) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={0.01}
        value={value}
        aria-valuemin={Math.round(bounds.min * 100)}
        aria-valuemax={Math.round(bounds.max * 100)}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${label} ${Math.round(value * 100)}%`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      role="region"
      aria-labelledby={titleId}
      data-shed-panel=""
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
    >
      <div className={styles.panelHead}>
        <h2 id={titleId} tabIndex={-1} data-dialog-initial="">
          {copy.tower}
        </h2>
        <button type="button" onClick={onClose}>
          {copy.close}
        </button>
      </div>
      <p className={styles.meta}>
        {copy.elementType}: {copy.tower}
      </p>
      <fieldset className={styles.group}>
        <legend>{copy.geometry}</legend>
        {range(copy.height, element.height, onHeight)}
        {range(copy.width, element.width, onWidth)}
        {range(copy.roof, element.roof, onRoof)}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{copy.appearance}</legend>
        <div className={styles.colors}>
          <label className={styles.colorLabel}>
            {copy.primary}
            <input type="color" value={element.primary} aria-label={copy.primary} onChange={(event) => onPrimary(event.target.value)} />
          </label>
          <label className={styles.colorLabel}>
            {copy.secondary}
            <input type="color" value={element.secondary} aria-label={copy.secondary} onChange={(event) => onSecondary(event.target.value)} />
          </label>
        </div>
        <div className={styles.choices} role="radiogroup" aria-labelledby={ornamentLabel} onKeyDown={(event) => radioGroupKey(event)}>
          <span id={ornamentLabel} className={styles.field}>
            <span>{copy.ornament}</span>
          </span>
          {ORNAMENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.choice}
              role="radio"
              aria-checked={element.ornament === id}
              onClick={() => onOrnament(id)}
            >
              {copy.ornaments[id]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{copy.position}</legend>
        {range(copy.positionX, element.x, onX, { min: 0.04, max: 0.96 })}
        {range(copy.positionY, element.y, onY, { min: 0.04, max: 0.96 })}
        <p className={styles.srOnly}>{copy.moveHint}</p>
        <div className={styles.row}>
          <button type="button" onClick={() => onLayer(-1)}>
            {copy.layerBack}
          </button>
          <span className={styles.layerValue} aria-label={copy.layer}>
            {element.layer}
          </span>
          <button type="button" onClick={() => onLayer(1)}>
            {copy.layerForward}
          </button>
        </div>
      </fieldset>
      <div className={styles.row}>
        <button type="button" onClick={onReset}>
          {copy.reset}
        </button>
        <p className={styles.status} role="status">
          {status === 'restored' ? copy.restored : copy.saved}
        </p>
      </div>
      <p className={styles.srOnly}>{copy.savedHint}</p>
    </aside>
  )
}
