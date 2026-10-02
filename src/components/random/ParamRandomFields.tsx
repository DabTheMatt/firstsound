import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { randomWindow } from '../../audio/random/distributions'
import {
  RANDOM_DIVISIONS,
  RANDOM_FREE_RATES,
  type ParamRandom,
  type RandomDivisionId,
  type RandomSync,
  type RandomTransition,
} from '../../audio/random/types'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Random.module.css'

type Props = {
  gen: ParamRandom
  chaos: boolean
  /** When set, turning Auto on without Chaos uses the existing per-parameter prompt. */
  autoId?: ParamId | null
  showAuto?: boolean
  showRange?: boolean
  onPatch: (patch: Partial<ParamRandom>) => void
}

/** Existing per-target Random fields. Callers decide whether the row is expanded. */
export function ParamRandomFields({ gen, chaos, autoId = null, showAuto = false, showRange = false, onPatch }: Props) {
  const { t } = useI18n()
  const autoOn = Boolean(gen.auto && chaos)
  const span = autoId && showRange ? randomWindow(autoId, chaos) : null
  const def = autoId ? PARAMS[autoId] : null
  return (
    <>
      {span && def ? (
        <p className={styles.rangeLine}>
          <span>{t.random.range}</span>
          <span>
            {formatParamValue(span.min, def)} … {formatParamValue(span.max, def)}
          </span>
        </p>
      ) : null}
      <label className={styles.field}>
        {t.random.intensity}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(gen.intensity * 100)}
          aria-label={t.random.intensity}
          onChange={(event) => onPatch({ intensity: Number(event.target.value) / 100 })}
        />
        <span>{Math.round(gen.intensity * 100)}%</span>
      </label>
      <div className={styles.row} role="group" aria-label={t.random.transition}>
        {(['step', 'smooth'] as RandomTransition[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={styles.choice}
            aria-pressed={gen.transition === mode}
            onClick={() => onPatch({ transition: mode })}
          >
            {mode === 'step' ? t.random.step : t.random.smooth}
          </button>
        ))}
      </div>
      {showAuto ? (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.choice}
            aria-pressed={autoOn}
            onClick={() => {
              if (autoOn) onPatch({ auto: false })
              else if (chaos) onPatch({ auto: true })
              else if (autoId) engine.requestChaos(autoId)
            }}
          >
            {t.random.auto} {autoOn ? t.random.autoAllowed : t.random.off}
          </button>
        </div>
      ) : null}
      <p className={styles.sectionLabel}>{t.random.timing}</p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.choice}
          aria-pressed={gen.sync === 'free'}
          onClick={() => onPatch({ sync: 'free' satisfies RandomSync })}
        >
          {t.random.free}
        </button>
        <button type="button" className={styles.choice} aria-pressed={gen.sync === 'tempo'} onClick={() => onPatch({ sync: 'tempo' })}>
          {t.random.sync}
        </button>
      </div>
      {gen.sync === 'free' ? (
        <div className={styles.row} role="group" aria-label={t.random.rate}>
          {RANDOM_FREE_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              className={styles.choice}
              aria-pressed={gen.rateHz === rate}
              onClick={() => onPatch({ rateHz: rate })}
            >
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
            onChange={(event) => onPatch({ division: event.target.value as RandomDivisionId })}
          >
            {RANDOM_DIVISIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
