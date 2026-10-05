import type { FocusWorkspace } from '../../app/phoneWorkspace'
import { useI18n } from '../../i18n'
import { EnterFocusButton } from '../focus/EnterFocusButton'
import { TECHNICAL_WORKSPACES, type TechnicalWorkspaceId } from './workspaces'
import styles from './Workspace.module.css'

type Props = {
  workspace: TechnicalWorkspaceId
  onWorkspace: (id: TechnicalWorkspaceId) => void
  contextClosed: boolean
  onOpenContext: () => void
  onEnterFocus: () => void
}

const LABEL: Record<TechnicalWorkspaceId, 'wave' | 'eq' | 'fft' | 'auto' | 'hearing'> = {
  wave: 'wave',
  eq: 'eq',
  fft: 'fft',
  auto: 'auto',
  hearing: 'hearing',
}

export function WorkspaceTabs({ workspace, onWorkspace, contextClosed, onOpenContext, onEnterFocus }: Props) {
  const { t } = useI18n()
  return (
    <div className={styles.tabs} role="tablist" aria-label={t.workspace.workspaces}>
      {TECHNICAL_WORKSPACES.map((id) => {
        const on = id === workspace
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            className={on ? styles.tabOn : styles.tab}
            onClick={() => onWorkspace(id)}
          >
            {t.focus[LABEL[id]]}
          </button>
        )
      })}
      <span className={styles.tabSpacer} />
      {contextClosed ? (
        <button type="button" className={styles.textButton} onClick={onOpenContext}>
          {t.workspace.context}
        </button>
      ) : null}
      <EnterFocusButton label={t.focus[LABEL[workspace as FocusWorkspace]]} accessibleName={t.focus.enter} onClick={onEnterFocus} />
    </div>
  )
}
