import { useEffect, useRef, useState } from 'react'
import { THEME_OPTIONS, useTheme, type ThemePreference, type ThemeId } from '../../theme'
import { resolveSensoryAtmosphere, SENSORY_ATMOSPHERES } from '../sensoryAtmospheres'
import { useI18n } from '../../i18n'
import type { SensorySceneId } from '../sensoryScene'
import styles from './SensoryThemePicker.module.css'

type Props = {
  scene: SensorySceneId
  onScene: (scene: SensorySceneId) => void
  onPlaces: () => void
}

export function SensoryThemePicker({ scene, onScene, onPlaces }: Props) {
  const { t } = useI18n()
  const { preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const active = resolveSensoryAtmosphere(scene, preference)
  const named = SENSORY_ATMOSPHERES.some((a) => a.id === active.id)
  const namedLabel = t.sensory.atmospheres[active.id] ?? t.theme.names[active.theme as ThemeId] ?? active.label

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (node && wrapRef.current?.contains(node)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.sensory.atmosphereNamed(namedLabel)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.swatches} aria-hidden="true">
          <span className={styles.dot} style={{ background: active.preview.bg }} />
          <span className={styles.dot} style={{ background: active.preview.surface }} />
          <span className={styles.dot} style={{ background: active.preview.accent }} />
        </span>
        <span className={styles.name}>{namedLabel}</span>
      </button>
      {open ? (
        <div className={styles.menu} role="listbox" aria-label={t.sensory.themes}>
          <p className={styles.title}>{t.sensory.atmosphere}</p>
          {SENSORY_ATMOSPHERES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              className={styles.option}
              aria-selected={named && opt.id === active.id}
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
              {t.sensory.atmospheres[opt.id] ?? opt.label}
            </button>
          ))}
          <p className={styles.title}>{t.sensory.color}</p>
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
              {t.theme.names[opt.id as ThemeId] ?? opt.label}
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
            {t.sensory.places}
          </button>
        </div>
      ) : null}
    </div>
  )
}
