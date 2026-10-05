import { useI18n } from '../../i18n'
import type { TechnicalInterface } from '../../app/technicalInterface'
import styles from './Workspace.module.css'

type Props = {
  value: TechnicalInterface
  onChange: (next: TechnicalInterface) => void
}

export function TechnicalInterfaceSetting({ value, onChange }: Props) {
  const { t } = useI18n()
  return (
    <fieldset className={styles.setting}>
      <legend className={styles.settingLegend}>{t.workspace.interface}</legend>
      <label className={styles.settingChoice}>
        <input
          type="radio"
          name="technical-interface"
          checked={value === 'classic'}
          onChange={() => onChange('classic')}
        />
        <span>{t.workspace.classic}</span>
      </label>
      <label className={styles.settingChoice}>
        <input
          type="radio"
          name="technical-interface"
          checked={value === 'workspace'}
          onChange={() => onChange('workspace')}
        />
        <span>
          {t.workspace.workspace}
          <span className={styles.experimental}>{t.workspace.experimental}</span>
        </span>
      </label>
      <p className={styles.settingHint}>{t.workspace.settingHint}</p>
    </fieldset>
  )
}
