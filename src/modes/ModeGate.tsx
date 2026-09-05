import styles from './ModeGate.module.css'
import type { UiMode } from './uiMode'

type Props = {
  onChoose: (mode: UiMode) => void
}

export function ModeGate({ onChoose }: Props) {
  return (
    <div className={styles.gate}>
      <div className={styles.inner}>
        <p className={styles.mark}>Firstsound</p>
        <h1 className={styles.title}>How do you want to shape sound?</h1>
        <div className={styles.choices}>
          <button type="button" className={styles.choice} onClick={() => onChoose('sensory')}>
            <span className={styles.choiceName}>Listen</span>
            <span className={styles.choiceCopy}>Shape sound by feeling.</span>
          </button>
          <button type="button" className={styles.choice} onClick={() => onChoose('technical')}>
            <span className={styles.choiceName}>Control</span>
            <span className={styles.choiceCopy}>Shape sound by parameters.</span>
          </button>
        </div>
      </div>
    </div>
  )
}
