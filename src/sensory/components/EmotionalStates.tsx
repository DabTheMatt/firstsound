import { EMOTIONAL_STATES, type EmotionalStateId } from '../emotionalStates'
import styles from './EmotionalStates.module.css'

type Props = {
  open: boolean
  onPick: (id: EmotionalStateId) => void
  onSurprise: () => void
}

export function EmotionalStates({ open, onPick, onSurprise }: Props) {
  if (!open) return null
  return (
    <div className={styles.panel} role="listbox" aria-label="Starting places">
      {EMOTIONAL_STATES.map((state) => (
        <button key={state.id} type="button" className={styles.item} role="option" onClick={() => onPick(state.id)}>
          {state.label}
        </button>
      ))}
      <button type="button" className={styles.surprise} onClick={onSurprise}>
        surprise me
      </button>
    </div>
  )
}
