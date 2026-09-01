import { useEffect, useRef, useState } from 'react'
import {
  CUSTOM_COLOR_FIELDS,
  THEME_OPTIONS,
  isUserThemePreference,
  nextSavedThemeName,
  useTheme,
  userThemePreference,
  type ThemePreference,
} from '../../theme'
import styles from './ThemePicker.module.css'

export function ThemePicker() {
  const {
    preference,
    setPreference,
    customColors,
    setCustomColor,
    savedThemes,
    saveCurrentTheme,
    removeSavedTheme,
  } = useTheme()
  const [open, setOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const editing = preference === 'custom' || isUserThemePreference(preference)

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

  const active =
    THEME_OPTIONS.find((opt) => opt.id === preference) ??
    savedThemes.find((t) => userThemePreference(t.id) === preference)
  const triggerLabel = active && 'label' in active ? active.label : active && 'name' in active ? active.name : 'Theme'
  const preview =
    editing || isUserThemePreference(preference)
      ? { bg: customColors.bgApp, surface: customColors.bgElevated, accent: customColors.accent }
      : (THEME_OPTIONS.find((opt) => opt.id === preference) ?? THEME_OPTIONS[1]!).preview

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${triggerLabel}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.swatches} aria-hidden="true">
          <span className={styles.dot} style={{ background: preview.bg }} />
          <span className={styles.dot} style={{ background: preview.surface }} />
          <span className={styles.dot} style={{ background: preview.accent }} />
        </span>
        <span className={styles.triggerLabel}>{triggerLabel}</span>
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
          {savedThemes.length > 0 ? (
            <>
              <p className={styles.customTitle}>My themes</p>
              {savedThemes.map((theme) => {
                const id = userThemePreference(theme.id)
                return (
                  <div key={theme.id} className={styles.savedRow}>
                    <button
                      type="button"
                      role="option"
                      className={styles.option}
                      aria-selected={preference === id}
                      onClick={() => setPreference(id)}
                    >
                      <span className={styles.swatches} aria-hidden="true">
                        <span className={styles.dot} style={{ background: theme.colors.bgApp }} />
                        <span className={styles.dot} style={{ background: theme.colors.bgElevated }} />
                        <span className={styles.dot} style={{ background: theme.colors.accent }} />
                      </span>
                      {theme.name}
                    </button>
                    <button
                      type="button"
                      className={styles.delete}
                      aria-label={`Delete ${theme.name}`}
                      onClick={() => removeSavedTheme(theme.id)}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </>
          ) : null}
          {editing ? (
            <div className={styles.custom}>
              <p className={styles.customTitle}>Element colors</p>
              <p className={styles.help}>Starts from the theme you had open. Save to keep it in My themes.</p>
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
              <form
                className={styles.saveRow}
                onSubmit={(event) => {
                  event.preventDefault()
                  saveCurrentTheme(saveName.trim() || nextSavedThemeName(savedThemes))
                  setSaveName('')
                }}
              >
                <input
                  className={styles.name}
                  value={saveName}
                  maxLength={40}
                  aria-label="Theme name"
                  placeholder={nextSavedThemeName(savedThemes)}
                  onChange={(event) => setSaveName(event.target.value)}
                />
                <button type="submit" className={styles.save}>
                  Save
                </button>
              </form>
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
