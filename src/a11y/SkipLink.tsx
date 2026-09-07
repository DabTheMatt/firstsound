import { useI18n } from '../i18n'
import styles from './SkipLink.module.css'

export function SkipLink() {
  const { t } = useI18n()
  return (
    <a className={styles.skip} href="#main-controls">
      {t.a11y.skipToMain}
    </a>
  )
}
