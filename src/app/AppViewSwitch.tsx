import { radioGroupKey } from '../a11y/keyboard'
import { useI18n } from '../i18n'
import { ACTIVITY_VISIBLE, SHED_VISIBLE, type AppView } from './appView'
import styles from './AppViewSwitch.module.css'

type Props = {
  view: AppView
  onChange: (view: AppView) => void
  compact?: boolean
  variant?: 'pill' | 'editorial'
}

export function AppViewSwitch({ view, onChange, compact = false, variant = 'pill' }: Props) {
  const { t } = useI18n()
  const options: { id: AppView; label: string }[] = [
    ...(ACTIVITY_VISIBLE ? [{ id: 'activity' as const, label: t.view.activity }] : []),
    ...(SHED_VISIBLE ? [{ id: 'shed' as const, label: t.view.shed }] : []),
  ]
  if (options.length === 0) return null
  return (
    <div
      className={`${styles.switch} ${variant === 'editorial' ? styles.editorial : ''} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label={t.view.group}
      data-app-destination=""
      onKeyDown={(event) => radioGroupKey(event)}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={view === option.id}
          data-app-view={option.id}
          className={`${styles.opt} ${view === option.id ? styles.on : ''}`}
          onClick={() => onChange(option.id)}
        >
          {variant === 'editorial' ? <span className={`${styles.dot} ${view === option.id ? '' : styles.dotOff}`} aria-hidden="true" /> : null}
          {option.label}
        </button>
      ))}
    </div>
  )
}
