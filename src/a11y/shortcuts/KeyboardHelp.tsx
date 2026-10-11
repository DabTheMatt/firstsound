import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { focusInitial, restoreTrigger, trapTab } from '../dialogFocus'
import { formatCombo, SHORTCUT_GROUPS, SHORTCUTS, shortcutPlatform, type ShortcutGroup } from './registry'
import styles from './KeyboardDialog.module.css'

type Props = {
  onClose: () => void
}

export function KeyboardHelp({ onClose }: Props) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const platform = shortcutPlatform()
  const needle = query.trim().toLowerCase()
  const groups = useMemo(() => {
    return SHORTCUT_GROUPS.map((group) => {
      const items = SHORTCUTS.filter((item) => item.group === group).filter((item) => {
        if (!needle) return true
        const label = t.keyboard.byId[item.id] ?? item.id
        const combo = formatCombo(item.combo, platform)
        return `${label} ${combo} ${group}`.toLowerCase().includes(needle)
      })
      return { group, items }
    }).filter((entry) => entry.items.length > 0)
  }, [needle, platform, t])

  useEffect(() => {
    focusInitial(panelRef.current)
  }, [])

  const groupName = (group: ShortcutGroup) => t.keyboard.groups[group]

  return (
    <div className={styles.layer}>
      <button type="button" className={styles.scrim} aria-label={t.keyboard.close} onClick={onClose} />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.keyboard.open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose()
            return
          }
          trapTab(event)
        }}
      >
        <header className={styles.head}>
          <h2 tabIndex={-1} data-dialog-initial="">
            {t.keyboard.open}
          </h2>
          <button type="button" className={styles.close} aria-label={t.keyboard.close} onClick={onClose}>
            ×
          </button>
        </header>
        <p className={styles.note}>{t.keyboard.alwaysOn}</p>
        <input
          className={styles.search}
          value={query}
          aria-label={t.keyboard.search}
          placeholder={t.keyboard.search}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={`${styles.list} ${styles.scroll}`}>
          {groups.length ? (
            groups.map((entry) => (
              <section key={entry.group} aria-label={groupName(entry.group)}>
                <h3 className={styles.group}>{groupName(entry.group)}</h3>
                <ul className={styles.list}>
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      <p className={styles.hit}>
                        <span>{t.keyboard.byId[item.id]}</span>
                        <span className={styles.combo}>{formatCombo(item.combo, platform)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className={styles.empty}>{t.keyboard.empty}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function closeKeyboardHelp(): void {
  restoreTrigger('keyboard-help', '[data-settings-toggle]')
}
