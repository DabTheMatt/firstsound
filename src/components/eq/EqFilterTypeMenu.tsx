import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EQ_FILTER_TYPES, type EqFilterType } from '../../audio/engine/eqBands'
import { useI18n } from '../../i18n'
import { filterTypeCopy } from '../../i18n/filterTypes'
import { FILTER_ICON_PATH } from './eqFilterIcons'
import styles from './EqConsole.module.css'

type Props = {
  value: EqFilterType
  onChange: (type: EqFilterType) => void
  bypassed?: boolean
  onBypass?: () => void
  showBypass?: boolean
}

export function EqFilterTypeMenu({ value, onChange, bypassed = false, onBypass, showBypass = true }: Props) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuHeight = 280
      const below = rect.bottom + 4
      const top = below + menuHeight > window.innerHeight && rect.top > menuHeight ? rect.top - menuHeight - 4 : below
      const menuWidth = 280
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))
      setMenuBox({ top, left })
    }
    place()
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node || wrapRef.current?.contains(node) || menuRef.current?.contains(node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={styles.typeWrap}>
      <div className={`${styles.typeTile} ${bypassed ? styles.typeBypassed : ''}`}>
        <button
          type="button"
          className={`${styles.typeBtn} ${value === 'off' ? styles.typeOff : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={filterTypeCopy(locale, value).aria}
          title={filterTypeCopy(locale, value).label}
          data-explain={`filter.${value}`}
          onClick={() => setOpen((v) => !v)}
        >
          <EqFilterIcon type={value} />
          <span>{filterTypeCopy(locale, value).short}</span>
        </button>
        {showBypass && onBypass ? (
          <button
            type="button"
            className={`${styles.power} ${bypassed ? styles.powerOff : styles.powerOn}`}
            aria-label={bypassed ? t.chain.enable(locale === 'pl' ? 'filtr' : 'filter') : t.chain.bypass(locale === 'pl' ? 'filtr' : 'filter')}
            title={bypassed ? t.chain.enableShort : t.chain.bypassShort}
            onClick={(event) => {
              event.stopPropagation()
              onBypass()
            }}
          >
            <PowerGlyph />
          </button>
        ) : null}
      </div>
      {open && menuBox
        ? createPortal(
            <ul
              ref={menuRef}
              className={`${styles.typeMenu} ${styles.typeMenuFixed}`}
              role="listbox"
              aria-label={t.dragFree.filterType}
              style={{ top: menuBox.top, left: menuBox.left }}
            >
              {EQ_FILTER_TYPES.map((opt) => (
                <li key={opt.value} role="option" aria-selected={opt.value === value}>
                  <button
                    type="button"
                    className={opt.value === value ? styles.typeItemOn : ''}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    <EqFilterIcon type={opt.value} />
                    <span>{filterTypeCopy(locale, opt.value).short}</span>
                    <em>{filterTypeCopy(locale, opt.value).label}</em>
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}

function PowerGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M8 2.5v5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5.15 4.35a4.2 4.2 0 1 0 5.7 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EqFilterIcon({ type }: { type: EqFilterType }) {
  const d = FILTER_ICON_PATH[type]
  return (
    <svg viewBox="0 0 24 16" width="28" height="18" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
