import { useEffect, useId, type RefObject } from 'react'
import { radioGroupKey } from '../a11y/keyboard'
import { focusInitial } from '../a11y/dialogFocus'
import { showsField } from './fields'
import {
  ARCHITECTURE_SWATCHES,
  ORNAMENT_IDS,
  VARIANT_COUNT,
  type ArchitecturalElement,
  type ElementType,
  type OrnamentId,
  type ParamKey,
  type SwatchId,
} from './model'
import type { ShedLoadStatus } from './persistence'
import styles from './ShedView.module.css'

export type ShedCopy = {
  categories: Record<ElementType, string>
  descriptions: Record<ElementType, string>
  variants: Record<ElementType, readonly string[]>
  swatches: Record<SwatchId, string>
  elementType: string
  height: string
  width: string
  helmet: string
  primary: string
  secondary: string
  detail: string
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
  variant: string
  duplicate: string
  deleteElement: string
  proportion: string
  windows: string
  floors: string
  entrance: string
  gable: string
  arches: string
  archHeight: string
  column: string
  pitch: string
  roofline: string
  ridge: string
  parapet: string
  density: string
  passage: string
  crenellation: string
}

type Props = {
  element: ArchitecturalElement
  status: ShedLoadStatus
  copy: ShedCopy
  panelRef: RefObject<HTMLElement | null>
  focusOnOpen: boolean
  onClose: () => void
  onHeight: (value: number) => void
  onWidth: (value: number) => void
  onRoof: (value: number) => void
  onPrimary: (value: string) => void
  onSecondary: (value: string) => void
  onDetail: (value: string) => void
  onOrnament: (value: OrnamentId) => void
  onVariant: (value: number) => void
  onParam: (key: ParamKey, value: number) => void
  onX: (value: number) => void
  onY: (value: number) => void
  onForward: () => void
  onBackward: () => void
  onReset: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const PARAM_FIELDS: readonly ParamKey[] = [
  'proportion',
  'windows',
  'floors',
  'entrance',
  'gable',
  'arches',
  'archHeight',
  'column',
  'pitch',
  'roofline',
  'ridge',
  'parapet',
  'density',
  'passage',
  'crenellation',
]

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
  onDetail,
  onOrnament,
  onVariant,
  onParam,
  onX,
  onY,
  onForward,
  onBackward,
  onReset,
  onDuplicate,
  onDelete,
}: Props) {
  const titleId = useId()
  const ornamentLabel = useId()
  const variantLabel = useId()
  const name = copy.categories[element.type]

  useEffect(() => {
    if (!focusOnOpen) return
    focusInitial(panelRef.current)
  }, [focusOnOpen, element.id, panelRef])

  const range = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    bounds: { min: number; max: number } = { min: 0, max: 1 },
    key?: string,
  ) => (
    <label key={key} className={styles.field}>
      <span>{label}</span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={0.01}
        value={value}
        aria-label={label}
        aria-valuemin={Math.round(bounds.min * 100)}
        aria-valuemax={Math.round(bounds.max * 100)}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${label} ${Math.round(value * 100)}%`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )

  const variantNames = copy.variants[element.type]
  const variantCount = VARIANT_COUNT[element.type]

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      role="region"
      aria-labelledby={titleId}
      data-shed-panel=""
      data-inspector-for={element.type}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
    >
      <div className={styles.panelHead}>
        <h2 id={titleId} tabIndex={-1} data-dialog-initial="">
          {name}
        </h2>
        <button type="button" onClick={onClose}>
          {copy.close}
        </button>
      </div>
      <p className={styles.meta}>
        {copy.elementType}: {name}
      </p>
      <fieldset className={styles.group}>
        <legend>{copy.geometry}</legend>
        {showsField(element.type, 'height') ? range(copy.height, element.height, onHeight) : null}
        {showsField(element.type, 'width') ? range(copy.width, element.width, onWidth) : null}
        {showsField(element.type, 'roof') ? range(copy.helmet, element.roof, onRoof) : null}
        {PARAM_FIELDS.filter((key) => showsField(element.type, key)).map((key) =>
          range(copy[key], element.params[key], (value) => onParam(key, value), { min: 0, max: 1 }, key),
        )}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{copy.appearance}</legend>
        <div className={styles.choices} role="radiogroup" aria-labelledby={variantLabel} onKeyDown={(event) => radioGroupKey(event)}>
          <span id={variantLabel} className={styles.field}>
            <span>{copy.variant}</span>
          </span>
          {Array.from({ length: variantCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={styles.choice}
              role="radio"
              aria-checked={element.variant === index}
              onClick={() => onVariant(index)}
            >
              {variantNames[index] ?? String(index + 1)}
            </button>
          ))}
        </div>
        <div className={styles.colors}>
          <label className={styles.colorLabel}>
            {copy.primary}
            <input type="color" value={element.primary} aria-label={copy.primary} onChange={(event) => onPrimary(event.target.value)} />
          </label>
          <label className={styles.colorLabel}>
            {copy.secondary}
            <input type="color" value={element.secondary} aria-label={copy.secondary} onChange={(event) => onSecondary(event.target.value)} />
          </label>
          <label className={styles.colorLabel}>
            {copy.detail}
            <input type="color" value={element.detail} aria-label={copy.detail} onChange={(event) => onDetail(event.target.value)} />
          </label>
        </div>
        <div className={styles.swatches}>
          {ARCHITECTURE_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              className={styles.swatch}
              style={{ background: swatch.value }}
              aria-label={copy.swatches[swatch.id]}
              aria-pressed={element.primary === swatch.value}
              onClick={() => onPrimary(swatch.value)}
            />
          ))}
        </div>
        {showsField(element.type, 'ornament') ? (
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
        ) : null}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{copy.position}</legend>
        {range(copy.positionX, element.x, onX, { min: 0.04, max: 0.96 })}
        {range(copy.positionY, element.y, onY, { min: 0.04, max: 0.96 })}
        <p className={styles.srOnly}>{copy.moveHint}</p>
        <div className={styles.row}>
          <button type="button" onClick={onBackward}>
            {copy.layerBack}
          </button>
          <span className={styles.layerValue} aria-label={copy.layer}>
            {element.layer}
          </span>
          <button type="button" onClick={onForward}>
            {copy.layerForward}
          </button>
        </div>
      </fieldset>
      <div className={styles.row}>
        <button type="button" onClick={onDuplicate}>
          {copy.duplicate}
        </button>
        <button type="button" onClick={onDelete}>
          {copy.deleteElement}
        </button>
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
