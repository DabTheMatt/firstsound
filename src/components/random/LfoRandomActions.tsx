import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lfoBinding } from '../../audio/fx/lfo'
import { withRandomHistory } from '../../audio/random/historyBridge'
import { LFO_RANDOM_DEFAULT_FIELDS, LFO_RANDOM_FIELDS } from '../../audio/random/lfoRandom'
import type { LfoRandomField } from '../../audio/random/types'
import { engine, useEngine } from '../../hooks/useEngine'
import type { ParamId } from '../../audio/parameters/types'
import { useI18n } from '../../i18n'
import { DiceIcon, GearIcon } from './icons'
import { RandomLayer } from './RandomLayer'
import styles from './Random.module.css'

type Props = {
  id: ParamId
}

const LABELS: Record<LfoRandomField, 'lfoRate' | 'lfoDepth' | 'lfoShape' | 'lfoPhase'> = {
  rate: 'lfoRate',
  depth: 'lfoDepth',
  shape: 'lfoShape',
  phase: 'lfoPhase',
}

/** Dice and setup for the LFO already bound to this parameter. */
export function LfoRandomActions({ id }: Props) {
  const snap = useEngine()
  const { t } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const stored = snap.random.lfo[id]
  const fields = stored?.fields ?? [...LFO_RANDOM_DEFAULT_FIELDS]
  const auto = Boolean(stored?.gen.auto && snap.random.chaos)

  const randomize = () => {
    withRandomHistory(() => {
      engine.randomizeParameterLfo(id)
    })
  }

  return (
    <div ref={rootRef} className={styles.pair} data-lfo-random={id}>
      <button type="button" className={styles.dice} aria-label={t.random.randomizeNow} title={t.random.randomize} onClick={randomize}>
        <DiceIcon />
      </button>
      <button
        type="button"
        className={styles.gear}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.random.setupAria}
        title={t.random.setup}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <RandomLayer
              anchorRef={rootRef}
              label={t.random.setup}
              title={t.random.title(t.modulation.lfo)}
              onClose={() => setOpen(false)}
              footer={
                <>
                  {!snap.random.chaos ? <p className={styles.note}>{t.random.chaosHint}</p> : null}
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={() => { randomize(); setOpen(false) }}>
                      {t.random.now}
                    </button>
                    <button type="button" className={styles.ghost} aria-pressed={auto} onClick={() => engine.armLfoAuto(id)}>
                      {t.random.auto} {auto ? t.random.on : t.random.off}
                    </button>
                  </div>
                </>
              }
            >
              <section className={styles.group}>
                <div className={styles.groupHead}>
                  <h3>{t.random.parameters}</h3>
                </div>
                {LFO_RANDOM_FIELDS.map((field) => (
                  <label key={field} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={fields.includes(field)}
                      onChange={() => {
                        const on = fields.includes(field)
                        const next = on ? fields.filter((item) => item !== field) : [...fields, field]
                        engine.setLfoRandom(id, { fields: next })
                      }}
                    />
                    <span>{t.random[LABELS[field]]}</span>
                  </label>
                ))}
              </section>
              {lfoBinding(snap.fxLfos, id) ? null : <p className={styles.note}>{t.random.lfoConnect}</p>}
            </RandomLayer>,
            document.body,
          )
        : null}
    </div>
  )
}
