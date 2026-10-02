import { useEffect, useEffectEvent, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  LFO_RATE_DEFAULT,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  type LfoShape,
} from '../../audio/fx/lfo'
import { fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ParamDef, ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { LfoShapePicker } from '../controls/LfoShapePicker'
import { classifyGesture } from '../mobile/gestureIntent'
import { connectParameterLfo, removeParameterLfo, setParameterLfoPrimary } from './modulationActions'
import { formatModulationDepth, parameterModulationState } from './modulationModel'
import styles from './Modulation.module.css'

const RATE_DEF: ParamDef = {
  id: 'delayModRate',
  label: 'Rate',
  min: LFO_RATE_MIN,
  max: LFO_RATE_MAX,
  defaultValue: LFO_RATE_DEFAULT,
  unit: 'Hz',
  mapping: 'log',
}

type Props = {
  id: ParamId
  label: string
  onClose: () => void
}

/**
 * Touch sheet over the current effect.
 * Mounting it only reads the shared LFO bank. Close does not clear the route.
 */
export function MobileModulationSheet({ id, label, onClose }: Props) {
  const snap = useEngine()
  const { t } = useI18n()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  const modulation = parameterModulationState({
    lfos: snap.fxLfos,
    automation: snap.automation,
    paramId: id,
    baseNormalized: toNormalized(snap.params[id], PARAMS[id]),
    editorOpen: true,
  })
  const lfo = modulation.binding ? snap.fxLfos[modulation.binding.kind][modulation.binding.slot] ?? null : null
  const connected = modulation.isLfoConnected && lfo != null

  const close = useEffectEvent(() => onClose())
  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const rateHz = lfo?.rateHz ?? LFO_RATE_DEFAULT
  const depth = lfo?.depth ?? 0
  const rateText = `${rateHz < 10 ? rateHz.toFixed(2) : rateHz.toFixed(1)} Hz`

  return createPortal(
    <div
      className={styles.scrim}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        onClose()
      }}
    >
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-modulation-sheet="true"
        data-modulation-for={id}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.grab} aria-hidden="true" />
        <header className={styles.sheetHead}>
          <h2 id={titleId} className={styles.sheetTitle}>
            {t.modulation.title(label)}
          </h2>
          <button type="button" className={styles.sheetClose} onClick={onClose}>
            {t.modulation.close}
          </button>
        </header>
        {connected && lfo ? (
          <div className={styles.sheetPrimary}>
            <SheetSlider
              label={t.modulation.rate}
              valueText={rateText}
              normalized={toNormalized(rateHz, RATE_DEF)}
              min={LFO_RATE_MIN}
              max={LFO_RATE_MAX}
              now={rateHz}
              onChange={(next) => setParameterLfoPrimary(engine, id, { rateHz: fromNormalized(next, RATE_DEF) })}
            />
            <SheetSlider
              label={t.modulation.depth}
              valueText={formatModulationDepth(depth)}
              normalized={depth / 100}
              min={0}
              max={100}
              now={depth}
              onChange={(next) => setParameterLfoPrimary(engine, id, { depth: next * 100 })}
            />
            <div className={styles.sheetField}>
              <span className={styles.sheetLabel}>{t.modulation.shape}</span>
              <LfoShapePicker
                value={lfo.shape}
                touch
                onChange={(shape: LfoShape) => setParameterLfoPrimary(engine, id, { shape })}
              />
            </div>
          </div>
        ) : (
          <button type="button" className={styles.lfoChoose} onClick={() => connectParameterLfo(engine, id)}>
            {t.modulation.lfo}
          </button>
        )}
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.ghost}
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          >
            {t.modulation.more}
          </button>
          {connected ? (
            <button type="button" className={styles.remove} onClick={() => removeParameterLfo(engine, id)}>
              {t.modulation.remove}
            </button>
          ) : null}
        </div>
        {more ? (
          <div className={styles.moreBody}>
            <p className={styles.note}>
              {modulation.automationActive ? t.modulation.automationOn : t.modulation.automationOff}
            </p>
            {modulation.automationActive ? null : (
              <button type="button" className={styles.ghost} onClick={() => engine.armAutomation(id)}>
                {t.modulation.addAutomation}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function SheetSlider({
  label,
  valueText,
  normalized,
  min,
  max,
  now,
  onChange,
}: {
  label: string
  valueText: string
  normalized: number
  min: number
  max: number
  now: number
  onChange: (normalized: number) => void
}) {
  const gesture = useRef<{ x: number; y: number; intent: 'pending' | 'scroll' | 'edit'; pointerId: number } | null>(
    null,
  )
  const shown = Math.min(1, Math.max(0, normalized))

  const apply = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)))
    onChange(t)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const coarse = event.pointerType === 'touch' || event.pointerType === 'pen'
    if (!coarse) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      apply(event.clientX, event.currentTarget)
      gesture.current = { x: event.clientX, y: event.clientY, intent: 'edit', pointerId: event.pointerId }
      return
    }
    gesture.current = { x: event.clientX, y: event.clientY, intent: 'pending', pointerId: event.pointerId }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId || active.intent === 'scroll') return
    if (active.intent === 'pending') {
      const next = classifyGesture(event.clientX - active.x, event.clientY - active.y)
      if (next === 'pending') return
      active.intent = next
      if (next === 'scroll') return
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    apply(event.clientX, event.currentTarget)
  }

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return
    gesture.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  return (
    <div className={styles.sheetField}>
      <div className={styles.sheetMeta}>
        <span className={styles.sheetLabel}>{label}</span>
        <span className={styles.sheetValue}>{valueText}</span>
      </div>
      <div
        className={styles.sheetTrack}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(now.toFixed(3))}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span className={styles.sheetFill} style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  )
}
