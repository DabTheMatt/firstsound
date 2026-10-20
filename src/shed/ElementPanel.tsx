import { useEffect, useId, useState, type RefObject } from 'react'
import { radioGroupKey } from '../a11y/keyboard'
import { focusInitial } from '../a11y/dialogFocus'
import { buildElement } from './geometry'
import { showsField } from './fields'
import { catalogById } from './construction/catalog'
import { elementFromCatalog } from './construction/element'
import {
  ARCHITECTURE_SWATCHES,
  ORNAMENT_IDS,
  VARIANT_COUNT,
  type ArchitecturalElement,
  type AttachmentType,
  type ElementType,
  type OrnamentId,
  type ParamKey,
  type SwatchId,
} from './model'
import type { ShedLoadStatus } from './persistence'
import styles from './ShedView.module.css'

export type InspectorSection = 'style' | 'geometry' | 'color' | 'details' | 'actions'

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
  tabs: Record<InspectorSection, string>
  pieces: Record<string, string>
  addLeft: string
  addRight: string
  addAbove: string
  deleteBranch: string
  deleteBranchHint: string
  deleteRoot: string
  deleteRootHint: string
  cancel: string
  connection: string
}

type FormChoice = { id: string; name: string }

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
  construction?: boolean
  directions?: readonly AttachmentType[]
  onDirection?: (direction: AttachmentType) => void
  forms?: readonly FormChoice[]
  onForm?: (id: string) => void
  notice?: string | null
  pendingDelete?: 'branch' | 'root' | null
  onConfirmDelete?: () => void
  onCancelDelete?: () => void
  initialSection?: InspectorSection
}

const GEOMETRY_FIELDS: readonly ParamKey[] = [
  'proportion',
  'floors',
  'pitch',
  'roofline',
  'ridge',
  'parapet',
  'passage',
  'arches',
  'archHeight',
  'column',
]
const DETAIL_FIELDS: readonly ParamKey[] = ['windows', 'entrance', 'gable', 'density', 'crenellation']

const SECTIONS: readonly InspectorSection[] = ['style', 'geometry', 'color', 'details', 'actions']

function FormPreview({ id }: { id: string }) {
  const entry = catalogById(id)
  if (!entry) return null
  const graphic = buildElement(elementFromCatalog(entry, `preview-${id}`, { parentId: null, attachmentType: null }))
  return (
    <svg className={styles.formPreview} viewBox={`0 0 ${graphic.width} ${graphic.height}`} aria-hidden="true">
      {graphic.parts.slice(0, 8).map((part) => (
        <path key={part.id} d={part.d} fill={part.fill} stroke={part.stroke} strokeWidth={part.strokeWidth} />
      ))}
    </svg>
  )
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
  construction = false,
  directions = [],
  onDirection,
  forms = [],
  onForm,
  notice = null,
  pendingDelete = null,
  onConfirmDelete,
  onCancelDelete,
  initialSection = 'style',
}: Props) {
  const titleId = useId()
  const ornamentLabel = useId()
  const variantLabel = useId()
  const name = element.catalogId ? (copy.pieces[element.catalogId] ?? copy.categories[element.type]) : copy.categories[element.type]
  const [picked, setPicked] = useState<{ id: string; section: InspectorSection } | null>(null)
  const section = picked?.id === element.id ? picked.section : initialSection

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
  const directionLabel: Record<AttachmentType, string> = {
    LEFT: copy.addLeft,
    RIGHT: copy.addRight,
    TOP: copy.addAbove,
  }

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      role="region"
      aria-labelledby={titleId}
      data-shed-panel=""
      data-inspector-for={element.type}
      data-inspector-section={section}
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
      {construction && onDirection ? (
        <div className={styles.row} role="group" aria-label={copy.connection}>
          {(['LEFT', 'RIGHT', 'TOP'] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              disabled={!directions.includes(direction)}
              onClick={() => onDirection(direction)}
            >
              {directionLabel[direction]}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.tabs} role="tablist" aria-label={name}>
        {SECTIONS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={section === item}
            tabIndex={section === item ? 0 : -1}
            onClick={() => setPicked({ id: element.id, section: item })}
          >
            {copy.tabs[item]}
          </button>
        ))}
      </div>
      {notice ? (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      ) : null}
      {section === 'style' ? (
        <div role="tabpanel">
          <div className={styles.choices} role="radiogroup" aria-labelledby={variantLabel} onKeyDown={(event) => radioGroupKey(event)}>
            <span id={variantLabel} className={styles.srOnly}>
              {copy.variant}
            </span>
            {forms.length > 0
              ? forms.map((form) => (
                  <button
                    key={form.id}
                    type="button"
                    className={styles.formChoice}
                    role="radio"
                    aria-checked={element.catalogId === form.id}
                    aria-label={form.name}
                    onClick={() => onForm?.(form.id)}
                  >
                    <FormPreview id={form.id} />
                    <span>{form.name}</span>
                  </button>
                ))
              : Array.from({ length: variantCount }, (_, index) => (
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
        </div>
      ) : null}
      {section === 'geometry' ? (
        <fieldset className={styles.group} role="tabpanel">
          <legend className={styles.srOnly}>{copy.geometry}</legend>
          {showsField(element.type, 'height') ? range(copy.height, element.height, onHeight) : null}
          {showsField(element.type, 'width') ? range(copy.width, element.width, onWidth) : null}
          {showsField(element.type, 'roof') ? range(copy.helmet, element.roof, onRoof) : null}
          {GEOMETRY_FIELDS.filter((key) => showsField(element.type, key)).map((key) =>
            range(copy[key], element.params[key], (value) => onParam(key, value), { min: 0, max: 1 }, key),
          )}
          {construction ? null : (
            <>
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
            </>
          )}
        </fieldset>
      ) : null}
      {section === 'color' ? (
        <div role="tabpanel">
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
        </div>
      ) : null}
      {section === 'details' ? (
        <fieldset className={styles.group} role="tabpanel">
          <legend className={styles.srOnly}>{copy.ornament}</legend>
          {DETAIL_FIELDS.filter((key) => showsField(element.type, key)).map((key) =>
            range(copy[key], element.params[key], (value) => onParam(key, value), { min: 0, max: 1 }, key),
          )}
          {showsField(element.type, 'ornament') ? (
            <div className={styles.choices} role="radiogroup" aria-labelledby={ornamentLabel} onKeyDown={(event) => radioGroupKey(event)}>
              <span id={ornamentLabel} className={styles.srOnly}>
                {copy.ornament}
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
      ) : null}
      {section === 'actions' ? (
        <div className={styles.row} role="tabpanel">
          {pendingDelete ? (
            <>
              <p className={styles.meta}>{pendingDelete === 'branch' ? copy.deleteBranchHint : copy.deleteRootHint}</p>
              <button type="button" onClick={onConfirmDelete}>
                {pendingDelete === 'branch' ? copy.deleteBranch : copy.deleteRoot}
              </button>
              <button type="button" onClick={onCancelDelete}>
                {copy.cancel}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onDuplicate}>
                {copy.duplicate}
              </button>
              <button type="button" onClick={onDelete}>
                {construction && element.parentId == null ? copy.deleteRoot : copy.deleteElement}
              </button>
              <button type="button" onClick={onReset}>
                {copy.reset}
              </button>
            </>
          )}
          <p className={styles.status} role="status">
            {status === 'restored' ? copy.restored : copy.saved}
          </p>
        </div>
      ) : null}
      <p className={styles.srOnly}>{copy.savedHint}</p>
    </aside>
  )
}
