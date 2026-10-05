import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import styles from './Workspace.module.css'

export type ContextLevel = 'closed' | 'compact' | 'open'

type Props = {
  level: ContextLevel
  hiddenCount: number
  onClose: () => void
  onCompact: () => void
  onOpen: () => void
  children: ReactNode
}

export function ContextBar({ level, hiddenCount, onClose, onCompact, onOpen, children }: Props) {
  const { t } = useI18n()
  const badge = hiddenCount > 0 ? ` · ${hiddenCount}` : ''
  return (
    <section className={styles.context} data-context-level={level} aria-label={t.workspace.context}>
      <div className={styles.contextBar}>
        <button type="button" className={styles.textButton} onClick={onClose} aria-label={t.workspace.closeContext}>
          {t.workspace.close}
        </button>
        {level === 'open' ? (
          <button type="button" className={styles.textButton} onClick={onCompact}>
            {t.workspace.less}
          </button>
        ) : (
          <button type="button" className={styles.textButton} onClick={onOpen} aria-label={`${t.workspace.more}${badge}`}>
            {t.workspace.more}
            {hiddenCount > 0 ? <span className={styles.badge}>{hiddenCount}</span> : null}
          </button>
        )}
      </div>
      <div className={styles.contextBody}>{children}</div>
    </section>
  )
}
