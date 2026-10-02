import type { PointerEvent as ReactPointerEvent } from 'react'
import { defaultParamRandom } from '../../audio/random/types'
import { isRandomizable } from '../../audio/random/distributions'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { DiceIcon } from './icons'
import styles from './Random.module.css'

type Props = {
  id: ParamId
  compact?: boolean
  touch?: boolean
}

/** One-shot random for this parameter. Setup lives on the effect. */
export function RandomAffordance({ id, compact = false, touch = false }: Props) {
  const snap = useEngine()
  const { paramLabel, t } = useI18n()
  if (!isRandomizable(id)) return null
  const gen = snap.random.generators[id] ?? defaultParamRandom()
  const auto = Boolean(gen.auto && snap.random.chaos)
  const label = paramLabel(id)
  const className = touch ? styles.touch : compact ? `${styles.button} ${styles.buttonCompact} ${styles.diceSlot}` : styles.button
  return (
    <button
      type="button"
      className={className}
      data-active={auto ? 'true' : 'false'}
      data-random-for={id}
      data-random-action="dice"
      aria-label={t.random.onceFor(label)}
      title={t.random.parameterTip}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        engine.randomizeParam(id)
      }}
    >
      <DiceIcon />
    </button>
  )
}
