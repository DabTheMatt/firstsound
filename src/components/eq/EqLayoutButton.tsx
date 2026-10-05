import type { EqWorkspaceLayout } from '../../app/eqWorkspaceLayout'
import { useI18n } from '../../i18n'
import styles from './EqConsole.module.css'

type Props = {
  /** The layout this button opens. */
  to: EqWorkspaceLayout
  onClick: () => void
}

/** Switches Workspace EQ between the side inspector and the strip panel. */
export function EqLayoutButton({ to, onClick }: Props) {
  const { t } = useI18n()
  const label = to === 'strips' ? t.workspace.eqStrips : t.workspace.eqInspector
  return (
    <button type="button" className={styles.layoutButton} aria-label={label} title={label} onClick={onClick}>
      {to === 'strips' ? <StripsIcon /> : <InspectorIcon />}
    </button>
  )
}

function StripsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="1.5" y="2" width="3" height="12" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="2" width="3" height="12" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11.5" y="2" width="3" height="12" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function InspectorIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="1.5" y="2" width="13" height="12" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 2.5v11" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
