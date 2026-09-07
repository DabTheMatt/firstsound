import { useI18n } from './I18nProvider'
import type { Locale } from './locale'
import styles from './LanguageSwitch.module.css'

type Props = {
  variant?: 'pill' | 'editorial' | 'gate'
}

export function LanguageSwitch({ variant = 'pill' }: Props) {
  const { locale, setLocale, t } = useI18n()
  const className = `${styles.switch} ${variant === 'editorial' ? styles.editorial : ''} ${variant === 'gate' ? styles.gate : ''}`
  return (
    <div className={className} role="radiogroup" aria-label={t.lang.group}>
      {(['en', 'pl'] as const).map((id: Locale) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={locale === id}
          className={`${styles.opt} ${locale === id ? styles.on : ''}`}
          onClick={() => setLocale(id)}
        >
          {id === 'en' ? t.lang.en : t.lang.pl}
        </button>
      ))}
    </div>
  )
}
