import { useI18n } from '../../i18n'
import styles from './FocusToggle.module.css'

type Props = {
  expanded: boolean
  onClick: () => void
}

export function FocusToggle({ expanded, onClick }: Props) {
  const { t } = useI18n()
  const label = expanded ? t.focus.exit : t.focus.enter
  return (
    <button
      type="button"
      className={styles.hit}
      aria-pressed={expanded}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {expanded ? <CollapseIcon /> : <ExpandIcon />}
    </button>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 3v3H3M10 3v3h3M13 10h-3v3M3 10h3v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
