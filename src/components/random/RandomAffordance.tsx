import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { fxLfoKindForParam } from '../../audio/fx/lfo'
import { eqParamIndex } from '../../audio/random/groups'
import {
  RANDOM_DIVISIONS,
  RANDOM_FREE_RATES,
  defaultParamRandom,
  type ParamRandom,
  type RandomDivisionId,
  type RandomSync,
  type RandomTransition,
} from '../../audio/random/types'
import { isRandomizable } from '../../audio/random/distributions'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Random.module.css'

type Props = {
  id: ParamId
  compact?: boolean
  touch?: boolean
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5" cy="5" r="1" fill="currentColor" />
      <circle cx="11" cy="5" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="5" cy="11" r="1" fill="currentColor" />
      <circle cx="11" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}

export function RandomAffordance({ id, compact = false, touch = false }: Props) {
  const snap = useEngine()
  const { paramLabel, t } = useI18n()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const held = useRef(false)
  const timer = useRef(0)
  if (!isRandomizable(id)) return null
  const gen = snap.random.generators[id] ?? defaultParamRandom()
  const auto = Boolean(gen.auto && snap.random.chaos)
  const label = paramLabel(id)
  const tip = auto ? t.random.autoFor(label) : t.random.onceFor(label)

  const openEditor = () => setOpen(true)
  const closeEditor = () => setOpen(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    held.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      held.current = true
      openEditor()
    }, 480)
  }
  const clearHold = () => window.clearTimeout(timer.current)

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    clearHold()
    if (held.current) {
      held.current = false
      return
    }
    engine.randomizeParam(id)
  }

  const className = touch ? styles.touch : compact ? `${styles.button} ${styles.buttonCompact}` : styles.button
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        data-active={auto ? 'true' : 'false'}
        data-open={open ? 'true' : 'false'}
        data-random-for={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={tip}
        title={compact || touch ? undefined : tip}
        onPointerDown={onPointerDown}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openEditor()
        }}
        onClick={onClick}
      >
        <DiceIcon />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            touch ? (
              <RandomSheet id={id} label={label} gen={gen} chaos={snap.random.chaos} budget={snap.random.budgetLimited} onClose={closeEditor} />
            ) : (
              <RandomEditor buttonRef={buttonRef} id={id} label={label} gen={gen} chaos={snap.random.chaos} budget={snap.random.budgetLimited} onClose={closeEditor} />
            ),
            document.body,
          )
        : null}
    </>
  )
}

function useDismiss(onClose: () => void, panelRef: RefObject<HTMLElement | null>, buttonRef?: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || buttonRef?.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [buttonRef, onClose, panelRef])
}

function RandomEditor({
  buttonRef,
  id,
  label,
  gen,
  chaos,
  budget,
  onClose,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>
  id: ParamId
  label: string
  gen: ParamRandom
  chaos: boolean
  budget: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  useDismiss(onClose, panelRef, buttonRef)
  useEffect(() => {
    const place = () => {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const width = 280
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
      const panelHeight = panelRef.current?.offsetHeight ?? 280
      const below = rect.bottom + 6
      const top = below + panelHeight > window.innerHeight - 8 ? Math.max(8, rect.top - panelHeight - 6) : below
      setBox({ top, left })
    }
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
    }
  }, [buttonRef])
  if (!box) return <div ref={panelRef} />
  return (
    <div ref={panelRef} className={styles.editor} style={{ top: box.top, left: box.left }} role="dialog" aria-label={label}>
      <RandomFields id={id} label={label} gen={gen} chaos={chaos} budget={budget} onClose={onClose} />
    </div>
  )
}

function RandomSheet({
  id,
  label,
  gen,
  chaos,
  budget,
  onClose,
}: {
  id: ParamId
  label: string
  gen: ParamRandom
  chaos: boolean
  budget: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDismiss(onClose, panelRef)
  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-label={label}>
        <RandomFields id={id} label={label} gen={gen} chaos={chaos} budget={budget} onClose={onClose} />
      </div>
    </>
  )
}

function RandomFields({
  id,
  label,
  gen,
  chaos,
  budget,
  onClose,
}: {
  id: ParamId
  label: string
  gen: ParamRandom
  chaos: boolean
  budget: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const titleId = useId()
  const kind = fxLfoKindForParam(id)
  const band = eqParamIndex(id)
  const set = (patch: Partial<ParamRandom>) => engine.setParamRandom(id, patch)
  return (
    <>
      <h2 id={titleId} className={styles.title}>
        {t.random.title(label)}
      </h2>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            engine.randomizeParam(id)
          }}
        >
          {t.random.now}
        </button>
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.choice}
          aria-pressed={gen.auto && chaos}
          onClick={() => {
            if (gen.auto && chaos) set({ auto: false })
            else if (chaos) set({ auto: true })
            else engine.requestChaos(id)
          }}
        >
          {t.random.auto} {gen.auto && chaos ? t.random.on : t.random.off}
        </button>
        <button type="button" className={styles.choice} aria-pressed={gen.sync === 'free'} onClick={() => set({ sync: 'free' satisfies RandomSync })}>
          {t.random.free}
        </button>
        <button type="button" className={styles.choice} aria-pressed={gen.sync === 'tempo'} onClick={() => set({ sync: 'tempo' })}>
          {t.random.sync}
        </button>
      </div>
      {gen.sync === 'free' ? (
        <div className={styles.row} role="group" aria-label={t.random.rate}>
          {RANDOM_FREE_RATES.map((rate) => (
            <button key={rate} type="button" className={styles.choice} aria-pressed={gen.rateHz === rate} onClick={() => set({ rateHz: rate })}>
              {rate} Hz
            </button>
          ))}
        </div>
      ) : (
        <label className={styles.field}>
          {t.random.division}
          <select
            value={gen.division}
            aria-label={t.random.division}
            onChange={(event) => set({ division: event.target.value as RandomDivisionId })}
          >
            {RANDOM_DIVISIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={styles.field}>
        {t.random.intensity}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(gen.intensity * 100)}
          aria-label={t.random.intensity}
          onChange={(event) => set({ intensity: Number(event.target.value) / 100 })}
        />
        <span>{Math.round(gen.intensity * 100)}%</span>
      </label>
      <div className={styles.row} role="group" aria-label={t.random.transition}>
        {(['step', 'smooth'] as RandomTransition[]).map((mode) => (
          <button key={mode} type="button" className={styles.choice} aria-pressed={gen.transition === mode} onClick={() => set({ transition: mode })}>
            {mode === 'step' ? t.random.step : t.random.smooth}
          </button>
        ))}
      </div>
      {budget ? <p className={styles.note}>{t.random.budget}</p> : null}
      {!chaos ? <p className={styles.note}>{t.random.chaosHint}</p> : null}
      {chaos && kind ? (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => engine.randomizeEffect(kind)}>
            {t.random.randomizeEffect}
          </button>
        </div>
      ) : null}
      {chaos && band != null ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              engine.randomizeEqBand(band)
              onClose()
            }}
          >
            {t.random.randomizeBand}
          </button>
        </div>
      ) : null}
    </>
  )
}
