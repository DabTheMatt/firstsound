import { useId } from 'react'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Random.module.css'

export function ChaosControl() {
  const snap = useEngine()
  const { t } = useI18n()
  const titleId = useId()
  const on = snap.random.chaos
  return (
    <>
      <button
        type="button"
        className={styles.chaos}
        data-on={on ? 'true' : 'false'}
        data-chaos=""
        aria-pressed={on}
        aria-label={t.random.chaos}
        title={t.random.chaos}
        onClick={() => engine.requestChaos()}
      >
        {t.random.chaos}
      </button>
      {snap.random.prompt ? (
        <>
          <button type="button" className={styles.scrim} aria-label={t.random.cancel} onClick={() => engine.cancelChaos()} />
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} data-chaos-warning="">
            <h2 id={titleId} className={styles.title}>
              {t.random.chaos}
            </h2>
            <p className={styles.warn}>{t.random.warning}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={() => engine.cancelChaos()}>
                {t.random.cancel}
              </button>
              <button type="button" className={styles.primary} data-enable-chaos="" onClick={() => engine.confirmChaos()}>
                {t.random.enable}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
