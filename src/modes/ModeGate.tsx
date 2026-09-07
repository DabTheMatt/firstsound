import { RuntimeStatus } from '../components/chrome/RuntimeStatus'
import { LanguageSwitch, useI18n } from '../i18n'
import styles from './ModeGate.module.css'
import type { UiMode } from './uiMode'

type Props = {
  onChoose: (mode: UiMode) => void
}

export function ModeGate({ onChoose }: Props) {
  const { t } = useI18n()
  return (
    <div className={styles.gate}>
      <LanguageSwitch variant="gate" />
      <div className={styles.inner}>
        <p className={styles.mark}>Field</p>
        <h1 className={styles.title}>{t.gate.title}</h1>
        <div className={styles.choices}>
          <button type="button" className={styles.choice} onClick={() => onChoose('sensory')}>
            <span className={styles.choiceName}>{t.gate.listen}</span>
            <span className={styles.choiceCopy}>{t.gate.listenCopy}</span>
          </button>
          <button type="button" className={styles.choice} onClick={() => onChoose('technical')}>
            <span className={styles.choiceName}>{t.gate.control}</span>
            <span className={styles.choiceCopy}>{t.gate.controlCopy}</span>
          </button>
        </div>
        <RuntimeStatus variant="gate" />
      </div>
    </div>
  )
}
