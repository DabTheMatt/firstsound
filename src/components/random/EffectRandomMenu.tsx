import { useEffect, useId, useRef, useState } from 'react'
import type { ModuleType } from '../../audio/chain/chain'
import { FX_LFO_KIND_LABELS } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { defaultRandomTargets, moduleRandomKind, participatingTargets } from '../../audio/random/groups'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Random.module.css'

type Props = {
  type: ModuleType
}

/** Compact effect action. Visible only while Chaos is on. */
export function EffectRandomMenu({ type }: Props) {
  const snap = useEngine()
  const { t, paramLabel } = useI18n()
  const kind = moduleRandomKind(type)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target
      if (node instanceof Node && rootRef.current?.contains(node)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  if (!kind || !snap.random.chaos) return null
  const selected = participatingTargets(snap.random, kind)
  const all = defaultRandomTargets(kind)
  const armed = selected.length > 0 && selected.every((id) => snap.random.generators[id]?.auto)
  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={styles.more}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.random.effectMenu(FX_LFO_KIND_LABELS[kind])}
        onClick={() => setOpen((value) => !value)}
      >
        ...
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-labelledby={titleId} style={{ position: 'absolute', marginTop: 4 }}>
          <h2 id={titleId} className={styles.title}>
            {t.random.randomizeEffect}
          </h2>
          {all.map((id) => {
            const on = selected.includes(id)
            return (
              <label key={id} className={styles.check}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    const next = on ? selected.filter((item) => item !== id) : [...selected, id]
                    engine.setRandomParticipation(kind, next)
                  }}
                />
                {paramLabel(id) || PARAMS[id].label}
              </label>
            )
          })}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                engine.randomizeEffect(kind)
                setOpen(false)
              }}
            >
              {t.random.randomizeEffect}
            </button>
            <button
              type="button"
              className={styles.ghost}
              aria-pressed={armed}
              onClick={() => {
                engine.setEffectAuto(kind, !armed)
              }}
            >
              {t.random.auto} {armed ? t.random.on : t.random.off}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
