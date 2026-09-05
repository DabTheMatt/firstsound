import { useEffect, useRef, useState } from 'react'
import { THEME_OPTIONS, useTheme, type ThemePreference } from '../../theme'
import { SENSORY_ATMOSPHERES } from '../sensoryAtmospheres'
import type { SensorySceneId } from '../sensoryScene'
import styles from './SensoryThemePicker.module.css'

type Props = {
  scene: SensorySceneId
  onScene: (scene: SensorySceneId) => void
  onPlaces: () => void
}

export function SensoryThemePicker({ scene, onScene, onPlaces }: Props) {
  const { preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const active =
    SENSORY_ATMOSPHERES.find((a) => a.scene === scene && a.theme === preference) ??
    SENSORY_ATMOSPHERES.find((a) => a.scene === scene) ??
    SENSORY_ATMOSPHERES[0]!

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
          <span className={styles.dot} style={{ background: active.preview.bg }} />
          <span className={styles.dot} style={{ background: active.preview.surface }} />
          <span className={styles.dot} style={{ background: active.preview.accent }} />
        </span>
      </button>
      {open ? (
        <div className={styles.menu} role="listbox" aria-label="Themes">
          <p className={styles.title}>Atmosphere</p>
          {SENSORY_ATMOSPHERES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              className={styles.option}
              aria-selected={opt.id === active.id}
              onClick={() => {
                setPreference(opt.theme)
                onScene(opt.scene)
                setOpen(false)
              }}
            >
              <span className={styles.swatches} aria-hidden="true">
                <span className={styles.dot} style={{ background: opt.preview.bg }} />
                <span className={styles.dot} style={{ background: opt.preview.surface }} />
                <span className={styles.dot} style={{ background: opt.preview.accent }} />
              </span>
              {opt.label}
            </button>
          ))}
          <p className={styles.title}>Color</p>
          {THEME_OPTIONS.filter((opt) => opt.id !== 'system' && opt.id !== 'custom').map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              className={styles.option}
              aria-selected={preference === opt.id}
              onClick={() => {
                setPreference(opt.id as ThemePreference)
                setOpen(false)
              }}
            >
              <span className={styles.swatches} aria-hidden="true">
                <span className={styles.dot} style={{ background: opt.preview.bg }} />
                <span className={styles.dot} style={{ background: opt.preview.surface }} />
                <span className={styles.dot} style={{ background: opt.preview.accent }} />
              </span>
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={styles.places}
            onClick={() => {
              setOpen(false)
              onPlaces()
            }}
          >
            Places
          </button>
        </div>
      ) : null}
    </div>
  )
}
