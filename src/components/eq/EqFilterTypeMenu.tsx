import { useEffect, useRef, useState } from 'react'
import { EQ_FILTER_TYPES, type EqFilterType } from '../../audio/engine/eqBands'
import styles from './EqConsole.module.css'

type Props = {
  value: EqFilterType
  onChange: (type: EqFilterType) => void
  bypassed?: boolean
  onBypass?: () => void
}

export function EqFilterTypeMenu({ value, onChange, bypassed = false, onBypass }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const current = EQ_FILTER_TYPES.find((t) => t.value === value) ?? EQ_FILTER_TYPES[0]!

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node || wrapRef.current?.contains(node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
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
        {onBypass ? (
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
      {open ? (
        <ul className={styles.typeMenu} role="listbox" aria-label="EQ filter type">
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
        </ul>
      ) : null}
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
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const FILTER_ICON_PATH: Record<EqFilterType, string> = {
  off: 'M4 12h16',
  lowpass: 'M3 5h8c3 0 5 8 10 8',
  highpass: 'M3 13c5 0 7-8 10-8h8',
  lowshelf: 'M3 11h7l3-5h8',
  highshelf: 'M3 13h8l3-6h7',
  peaking: 'M3 10h6l3-6 3 12 3-6h3',
  notch: 'M3 8h6l2 6 2-6h8',
  bandpass: 'M3 13c4 0 5-9 9-9s5 9 9 9',
}
