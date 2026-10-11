import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { focusInitial, rememberTrigger, restoreTrigger, trapTab } from '../dialogFocus'
import { destinationIds, type DestinationId, type FieldMode } from './destinations'
import styles from './KeyboardDialog.module.css'

type Props = {
  mode: FieldMode
  onClose: () => void
  onSelect: (id: DestinationId) => void
}

export function WorkspaceNav({ mode, onClose, onSelect }: Props) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return destinationIds(mode).filter((id) => {
      if (!needle) return true
      return t.keyboard.destinations[id].toLowerCase().includes(needle)
    })
  }, [mode, query, t])

  useEffect(() => {
    focusInitial(panelRef.current)
  }, [])

  const choose = (id: DestinationId) => {
    onSelect(id)
  }

  const move = (delta: number) => {
    const buttons = [...(panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-destination]') ?? [])]
    if (!buttons.length) return
    const index = buttons.findIndex((button) => button === document.activeElement)
    const next = buttons[index < 0 ? (delta > 0 ? 0 : buttons.length - 1) : (index + delta + buttons.length) % buttons.length]
    next?.focus()
  }

  return (
    <div className={styles.layer}>
      <button type="button" className={styles.scrim} aria-label={t.keyboard.close} onClick={onClose} />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.keyboard.jump}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose()
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            move(1)
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            move(-1)
            return
          }
          trapTab(event)
        }}
      >
        <header className={styles.head}>
          <h2 tabIndex={-1} data-dialog-initial="">
            {t.keyboard.jump}
          </h2>
          <button type="button" className={styles.close} aria-label={t.keyboard.close} onClick={onClose}>
            ×
          </button>
        </header>
        <input
          className={styles.search}
          value={query}
          aria-label={t.keyboard.destSearch}
          placeholder={t.keyboard.destSearch}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const first = items[0]
              if (!first) return
              event.preventDefault()
              choose(first)
            }
          }}
        />
        <p className={styles.note}>{t.keyboard.browserChord}</p>
        {items.length ? (
          <ul className={`${styles.list} ${styles.scroll}`}>
            {items.map((id) => (
              <li key={id}>
                <button type="button" className={styles.option} data-destination={id} onClick={() => choose(id)}>
                  {t.keyboard.destinations[id]}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>{t.keyboard.destEmpty}</p>
        )}
      </div>
    </div>
  )
}

export function openWorkspaceNav(): void {
  rememberTrigger('workspace-nav')
}

export function closeWorkspaceNav(): void {
  restoreTrigger('workspace-nav', '[data-settings-toggle]')
}
