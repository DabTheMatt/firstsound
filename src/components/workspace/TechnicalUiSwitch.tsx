import { useI18n } from '../../i18n'
import {
  TECHNICAL_INTERFACES,
  type TechnicalInterface,
} from '../../app/technicalInterface'
import styles from './Workspace.module.css'

type Props = {
  value: TechnicalInterface
  onChange: (next: TechnicalInterface) => void
}

/** Quiet A/B switch. Not a top-level mode and not a primary toolbar action. */
export function TechnicalUiSwitch({ value, onChange }: Props) {
  const { t } = useI18n()
  return (
    <div className={styles.uiSwitch} role="group" aria-label={t.workspace.interface}>
      <span className={styles.uiKicker}>UI</span>
      {TECHNICAL_INTERFACES.map((id) => (
        <button
          key={id}
          type="button"
          className={value === id ? styles.uiOn : styles.uiOff}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {id === 'classic' ? t.workspace.classic : t.workspace.workspace}
        </button>
      ))}
    </div>
  )
}
