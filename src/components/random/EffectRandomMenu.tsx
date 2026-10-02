import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLayoutMode } from '../../app/useLayoutMode'
import type { ModuleType } from '../../audio/chain/chain'
import { moduleRandomKind } from '../../audio/random/groups'
import { useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { DiceIcon, GearIcon } from './icons'
import {
  RandomSetupPanel,
  effectSetupGroups,
  eqSetupGroups,
  randomizeConfiguredEffect,
  randomizeConfiguredEq,
} from './RandomSetup'
import styles from './Random.module.css'

type Props = {
  type: ModuleType
  instanceId?: string
}

/** Effect header: randomize now, then open the shared Random setup. */
export function EffectRandomMenu({ type, instanceId }: Props) {
  const snap = useEngine()
  const { t } = useI18n()
  const { mode } = useLayoutMode()
  const kind = moduleRandomKind(type)
  const eq = type === 'eq'
  const [open, setOpen] = useState(false)
  const gearRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  if (!kind && !eq) return null
  const eqState = instanceId ? snap.eqById[instanceId] : undefined
  const bands = eqState?.bands ?? snap.eqBands
  const comb = eqState?.comb ?? snap.comb
  const name = t.modules[type]
  const groups = eq ? eqSetupGroups(bands, comb.enabled) : effectSetupGroups(kind!)
  const close = () => setOpen(false)
  const randomize = () => {
    if (eq) randomizeConfiguredEq(bands, comb.enabled, snap.random)
    else if (kind) randomizeConfiguredEffect(kind, snap.random.chaos)
  }
  const panel = (
    <RandomSetupPanel
      name={name}
      titleId={titleId}
      groups={groups}
      doc={snap.random}
      chaos={snap.random.chaos}
      budget={snap.random.budgetLimited}
      eq={eq}
    />
  )
  return (
    <div className={styles.pair}>
      <button
        type="button"
        className={styles.icon}
        data-random-action="dice"
        aria-label={eq ? t.random.randomizeEq : t.random.effectAria(name)}
        title={eq ? t.random.randomizeEq : t.random.randomizeEffect}
        onClick={randomize}
      >
        <DiceIcon />
      </button>
      <button
        ref={gearRef}
        type="button"
        className={styles.icon}
        data-random-action="setup"
        data-open={open ? 'true' : 'false'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? titleId : undefined}
        aria-label={t.random.setupAria}
        title={t.random.setupTip}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            mode === 'sheet' ? (
              <SetupSheet titleId={titleId} gearRef={gearRef} onClose={close}>
                {panel}
              </SetupSheet>
            ) : (
              <SetupPopover titleId={titleId} gearRef={gearRef} onClose={close}>
                {panel}
              </SetupPopover>
            ),
            document.body,
          )
        : null}
    </div>
  )
}

function useDismiss(onClose: () => void, panelRef: RefObject<HTMLElement | null>, gearRef: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || gearRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      gearRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [gearRef, onClose, panelRef])
}

function SetupPopover({
  titleId,
  gearRef,
  onClose,
  children,
}: {
  titleId: string
  gearRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  useDismiss(onClose, panelRef, gearRef)
  useEffect(() => {
    const place = () => {
      const button = gearRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const width = 320
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      const panelHeight = panelRef.current?.offsetHeight ?? 360
      const below = rect.bottom + 6
      const top = below + panelHeight > window.innerHeight - 8 ? Math.max(8, rect.top - panelHeight - 6) : below
      setBox((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
    }
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [gearRef, children])
  return (
    <div
      ref={panelRef}
      className={styles.editor}
      style={box ? { top: box.top, left: box.left } : { top: -9999, left: 0 }}
      role="dialog"
      aria-labelledby={titleId}
      data-random-setup="true"
    >
      {children}
    </div>
  )
}

function SetupSheet({
  titleId,
  gearRef,
  onClose,
  children,
}: {
  titleId: string
  gearRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDismiss(onClose, panelRef, gearRef)
  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-labelledby={titleId} data-random-setup="true">
        {children}
      </div>
    </>
  )
}
