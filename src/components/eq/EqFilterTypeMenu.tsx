import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EQ_FILTER_TYPES, type EqFilterType } from '../../audio/engine/eqBands'
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
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const current = EQ_FILTER_TYPES.find((t) => t.value === value) ?? EQ_FILTER_TYPES[0]!

  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuHeight = 280
      const below = rect.bottom + 4
      const top = below + menuHeight > window.innerHeight && rect.top > menuHeight ? rect.top - menuHeight - 4 : below
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 188))
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
          aria-label={`Filter type ${current.label}`}
          title={current.label}
          onClick={() => setOpen((v) => !v)}
        >
          <EqFilterIcon type={value} />
          <span>{current.short}</span>
        </button>
        {showBypass && onBypass ? (
          <button
            type="button"
            className={`${styles.power} ${bypassed ? styles.powerOff : styles.powerOn}`}
            aria-label={bypassed ? 'Enable filter' : 'Bypass filter'}
            title={bypassed ? 'Enable' : 'Bypass'}
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
              aria-label="EQ filter type"
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
                    <span>{opt.short}</span>
                    <em>{opt.label}</em>
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
