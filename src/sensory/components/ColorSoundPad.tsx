import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  approachColorSound,
  clampColorSound,
  colorSoundIsNeutral,
  colorSoundRgb,
  colorSoundsEqual,
  NEUTRAL_COLOR_SOUND,
  type ColorSound,
} from '../colorSound'
import { useI18n } from '../../i18n'
import styles from './ColorSoundPad.module.css'

type Props = {
  color: ColorSound
  onChange: (color: ColorSound) => void
  onCommit: () => void
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function rgbText(color: ColorSound): string {
  const { r, g, b } = colorSoundRgb(color)
  return `rgb(${r} ${g} ${b})`
}

function padStartsOpen(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerHeight >= 740
}

function ColorSoundIcon({ color }: { color: ColorSound }) {
  const { r, g, b } = colorSoundRgb(color)
  return (
    <svg className={styles.icon} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7.2 15.2c1.15-3.1 2.15-3.1 3.2 0s2.05 3.1 3.2 0 2.05-3.1 3.2 0 2.05 3.1 3.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="18.4" cy="9.1" r="1.7" fill={`rgb(${r} ${g} ${b})`} stroke="currentColor" strokeWidth="0.6" />
    </svg>
  )
}

export function ColorSoundPad({ color, onChange, onCommit }: Props) {
  const { t } = useI18n()
  const fieldRef = useRef<HTMLCanvasElement>(null)
  const targetRef = useRef<ColorSound>(color)
  const smoothRef = useRef<ColorSound>(color)
  const dragId = useRef<number | null>(null)
  const frame = useRef(0)
  const lastStamp = useRef(0)
  const dirty = useRef(false)
  const followThumb = useRef(true)
  const [thumb, setThumb] = useState<ColorSound>(color)
  const [open, setOpen] = useState(padStartsOpen)
  const valueText =
    color.y > 0.66 ? t.sensory.colorSoundLight : color.y < 0.34 ? t.sensory.colorSoundDark : t.sensory.colorSoundRest

  useEffect(() => {
    if (dirty.current || dragId.current != null) return
    targetRef.current = color
    smoothRef.current = color
    setThumb(color)
  }, [color])

  useEffect(() => {
    const canvas = fieldRef.current
    if (!canvas) return
    const paint = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(32, Math.floor(rect.width * dpr))
      const height = Math.max(32, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const image = ctx.createImageData(width, height)
      const data = image.data
      for (let y = 0; y < height; y++) {
        const light = 1 - y / Math.max(1, height - 1)
        for (let x = 0; x < width; x++) {
          const hue = x / Math.max(1, width - 1)
          const rgb = colorSoundRgb({ x: hue, y: light })
          const i = (y * width + x) * 4
          data[i] = rgb.r
          data[i + 1] = rgb.g
          data[i + 2] = rgb.b
          data[i + 3] = 255
        }
      }
      ctx.putImageData(image, 0, 0)
    }
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  const stopPump = () => {
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
    lastStamp.current = 0
  }

  const finish = () => {
    stopPump()
    dirty.current = false
    followThumb.current = true
    onCommit()
  }

  const pump = (now: number) => {
    const dt = lastStamp.current === 0 ? 16 : Math.min(48, now - lastStamp.current)
    lastStamp.current = now
    const next = approachColorSound(smoothRef.current, targetRef.current, dt)
    const moved = !colorSoundsEqual(smoothRef.current, next, 1e-4)
    smoothRef.current = next
    if (followThumb.current) setThumb(next)
    if (moved) onChange(next)
    const settled = colorSoundsEqual(next, targetRef.current, 0.0015) && dragId.current == null
    if (!settled) {
      frame.current = requestAnimationFrame(pump)
      return
    }
    frame.current = 0
    lastStamp.current = 0
    if (dirty.current) finish()
  }

  const startPump = () => {
    if (frame.current) return
    lastStamp.current = 0
    frame.current = requestAnimationFrame(pump)
  }

  const seek = (next: ColorSound, thumbFollowsFinger: boolean) => {
    const point = clampColorSound(next)
    dirty.current = true
    followThumb.current = !thumbFollowsFinger
    targetRef.current = point
    if (thumbFollowsFinger) setThumb(point)
    startPump()
  }

  const rest = () => {
    seek(NEUTRAL_COLOR_SOUND, false)
  }

  const at = (event: ReactPointerEvent<HTMLCanvasElement>): ColorSound => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp01((event.clientX - rect.left) / Math.max(1, rect.width)),
      y: clamp01(1 - (event.clientY - rect.top) / Math.max(1, rect.height)),
    }
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      rest()
      return
    }
    const fine = event.shiftKey ? 0.012 : 0.04
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowRight') dx = fine
    else if (event.key === 'ArrowLeft') dx = -fine
    else if (event.key === 'ArrowUp') dy = fine
    else if (event.key === 'ArrowDown') dy = -fine
    else return
    event.preventDefault()
    const current = targetRef.current
    seek({ x: clamp01(current.x + dx), y: clamp01(current.y + dy) }, false)
  }

  const neutral = colorSoundIsNeutral(thumb)

  return (
    <div
      className={styles.dock}
      data-open={open ? 'true' : 'false'}
      data-color-x={color.x.toFixed(3)}
      data-color-y={color.y.toFixed(3)}
    >
      <div className={styles.panel} inert={!open}>
      <div
        className={styles.field}
        tabIndex={0}
        role="slider"
        aria-label={t.sensory.colorSoundAria}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(color.y * 100)}
        aria-valuetext={valueText}
        onKeyDown={onKey}
        onDoubleClick={(event) => {
          event.preventDefault()
          rest()
        }}
      >
        <canvas
          ref={fieldRef}
          className={styles.canvas}
          aria-hidden="true"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              /* capture is optional; the gesture still tracks this pointer */
            }
            dragId.current = event.pointerId
            seek(at(event), true)
          }}
          onPointerMove={(event) => {
            if (dragId.current !== event.pointerId) return
            if (event.buttons === 0 && event.pointerType === 'mouse') {
              dragId.current = null
              startPump()
              return
            }
            seek(at(event), true)
          }}
          onPointerUp={(event) => {
            if (dragId.current !== event.pointerId) return
            dragId.current = null
            try {
              event.currentTarget.releasePointerCapture(event.pointerId)
            } catch {
              /* already released */
            }
            startPump()
          }}
          onPointerCancel={() => {
            dragId.current = null
            startPump()
          }}
        />
        <span
          className={styles.thumb}
          style={{
            left: `${thumb.x * 100}%`,
            top: `${(1 - thumb.y) * 100}%`,
            background: rgbText(thumb),
          }}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        className={styles.rest}
        aria-label={t.sensory.colorSoundRestAria}
        disabled={neutral && colorSoundIsNeutral(color)}
        onClick={rest}
      >
        {t.sensory.colorSoundRest}
      </button>
      </div>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={open}
        aria-expanded={open}
        aria-label={t.sensory.colorSoundLabel}
        title={t.sensory.colorSoundLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <ColorSoundIcon color={thumb} />
      </button>
    </div>
  )
}
