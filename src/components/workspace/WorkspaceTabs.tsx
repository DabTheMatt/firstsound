import { tabListKey } from '../../a11y/keyboard'
import { useI18n } from '../../i18n'
import { BackgroundControl } from '../waveform/BackgroundControl'
import { TECHNICAL_WORKSPACES, type TechnicalWorkspaceId } from './workspaces'
import styles from './Workspace.module.css'

type Props = {
  workspace: TechnicalWorkspaceId
  onWorkspace: (id: TechnicalWorkspaceId) => void
  contextClosed: boolean
  onOpenContext: () => void
  guideLabel?: string
  onOpenGuide?: () => void
}

const LABEL: Record<TechnicalWorkspaceId, 'wave' | 'eq' | 'fft' | 'auto' | 'hearing'> = {
  wave: 'wave',
  eq: 'eq',
  fft: 'fft',
  auto: 'auto',
  hearing: 'hearing',
}

export function WorkspaceTabs({
  workspace,
  onWorkspace,
  contextClosed,
  onOpenContext,
  guideLabel,
  onOpenGuide,
}: Props) {
  const { t } = useI18n()
  return (
    <div className={styles.tabs}>
      <div className={styles.tablist} role="tablist" aria-label={t.workspace.workspaces} data-stable-region="workspaces" onKeyDown={(event) => tabListKey(event)}>
      {TECHNICAL_WORKSPACES.map((id) => {
        const on = id === workspace
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={id === 'wave' ? t.focus.waveFull : t.focus[LABEL[id]]}
            title={id === 'wave' ? t.focus.waveFull : undefined}
            className={on ? styles.tabOn : styles.tab}
            onClick={() => onWorkspace(id)}
          >
            {t.focus[LABEL[id]]}
          </button>
        )
      })}
      </div>
      <span className={styles.tabSpacer} />
      <BackgroundControl appearance="text" />
      {contextClosed ? (
        <button type="button" className={styles.textButton} onClick={onOpenContext}>
          {t.workspace.context}
        </button>
      ) : null}
      {onOpenGuide && guideLabel ? (
        <button type="button" className={`${styles.textButton} ${styles.guideLink}`} onClick={onOpenGuide}>
          {guideLabel}
        </button>
      ) : null}
    </div>
  )
}
