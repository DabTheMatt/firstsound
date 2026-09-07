import { EMOTIONAL_STATES, type EmotionalStateId } from '../emotionalStates'
import { useI18n } from '../../i18n'
import styles from './EmotionalStates.module.css'

type Props = {
  open: boolean
  onPick: (id: EmotionalStateId) => void
  onSurprise: () => void
}

export function EmotionalStates({ open, onPick, onSurprise }: Props) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className={styles.panel} role="listbox" aria-label={t.sensory.startingPlaces}>
      {EMOTIONAL_STATES.map((state) => (
        <button key={state.id} type="button" className={styles.item} role="option" onClick={() => onPick(state.id)}>
          {t.sensory.emotions[state.id]}
        </button>
      ))}
      <button type="button" className={styles.surprise} onClick={onSurprise}>
        {t.sensory.surprise}
      </button>
    </div>
  )
}
