import { useSyncExternalStore } from 'react'
import { useI18n } from '../../i18n'
import { explainMarksOn, setExplainMarks, subscribeExplainMarks } from '../../help/marks'
import styles from './Workspace.module.css'

export function ExplainMarksSetting() {
  const { t } = useI18n()
  const on = useSyncExternalStore(subscribeExplainMarks, explainMarksOn, () => false)
  return (
    <fieldset className={styles.setting}>
      <legend className={styles.settingLegend}>{t.settings.explainMarks}</legend>
      <label className={styles.settingChoice}>
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => setExplainMarks(event.currentTarget.checked)}
        />
        <span>{t.settings.explainMarksLabel}</span>
      </label>
      <p className={styles.settingHint}>{t.settings.explainMarksHint}</p>
    </fieldset>
  )
}
