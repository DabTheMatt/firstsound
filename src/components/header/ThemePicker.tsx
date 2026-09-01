import { useEffect, useRef, useState } from 'react'
import type { ThemePreference } from '../../theme'
import { CUSTOM_COLOR_FIELDS, THEME_OPTIONS, useTheme } from '../../theme'
import styles from './ThemePicker.module.css'

export function ThemePicker() {
  const { preference, setPreference, customColors, setCustomColor } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (node && wrapRef.current?.contains(node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const active = THEME_OPTIONS.find((opt) => opt.id === preference) ?? THEME_OPTIONS[1]!
  const preview =
    preference === 'custom'
      ? { bg: customColors.bgApp, surface: customColors.bgElevated, accent: customColors.accent }
      : active.preview

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.swatches} aria-hidden="true">
          <span className={styles.dot} style={{ background: preview.bg }} />
          <span className={styles.dot} style={{ background: preview.surface }} />
          <span className={styles.dot} style={{ background: preview.accent }} />
        </span>
        <span className={styles.triggerLabel}>{active.label}</span>
      </button>
      {open ? (
        <div className={styles.menu} role="listbox" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => {
            const swatch =
              opt.id === 'custom'
                ? { bg: customColors.bgApp, surface: customColors.bgElevated, accent: customColors.accent }
                : opt.preview
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                className={styles.option}
                aria-selected={preference === opt.id}
                onClick={() => setPreference(opt.id as ThemePreference)}
              >
                <span className={styles.swatches} aria-hidden="true">
                  <span className={styles.dot} style={{ background: swatch.bg }} />
                  <span className={styles.dot} style={{ background: swatch.surface }} />
                  <span className={styles.dot} style={{ background: swatch.accent }} />
                </span>
                {opt.label}
              </button>
            )
          })}
          {preference === 'custom' ? (
            <div className={styles.custom}>
              <p className={styles.customTitle}>Element colors</p>
              {CUSTOM_COLOR_FIELDS.map((field) => (
                <label key={field.id} className={styles.colorRow}>
                  <span>{field.label}</span>
                  <input
                    type="color"
                    value={normalizeHex(customColors[field.id])}
                    aria-label={field.label}
                    onChange={(event) => setCustomColor(field.id, event.target.value)}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function normalizeHex(value: string): string {
  const t = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(t)) return t
  if (/^#[0-9a-f]{3}$/i.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`
  }
  return '#151616'
}
