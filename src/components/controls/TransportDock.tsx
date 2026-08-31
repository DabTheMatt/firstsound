import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import type { PlaybackDirection } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import styles from './TransportDock.module.css'

type Props = {
  playing: boolean
  loop: boolean
  direction: PlaybackDirection
  start: number
  end: number
  disabled: boolean
}

const SIZE = 120
const CENTER = SIZE / 2
const RADIUS = 53
const CIRC = 2 * Math.PI * RADIUS

export function TransportDock({ playing, loop, direction, start, end, disabled }: Props) {
  const arcRef = useRef<SVGCircleElement>(null)
  const region = useRef({ start, end })

  useEffect(() => {
    region.current = { start, end }
  }, [start, end])

  // Playhead ring is refs + rAF only, so it never re-renders the transport.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = arcRef.current
      if (el) {
        const { start: s, end: e } = region.current
        const span = e - s
        const frac = span > 0 ? Math.min(1, Math.max(0, (engine.getPlayheadSeconds() - s) / span)) : 0
        el.style.strokeDasharray = `${CIRC * frac} ${CIRC}`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const scrub = (clientX: number, clientY: number, target: Element) => {
    const rect = target.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    // 0 at the top (12 o'clock), increasing clockwise.
    let angle = Math.atan2(dx, -dy)
    if (angle < 0) angle += Math.PI * 2
    engine.seek(angle / (Math.PI * 2))
  }

  const onRingPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    scrub(event.clientX, event.clientY, target)
    const up = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      target.removeEventListener('lostpointercapture', up)
    }
    const move = (e: PointerEvent) => {
      if (e.buttons === 0) {
        up(e)
        return
      }
      scrub(e.clientX, e.clientY, target)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    target.addEventListener('lostpointercapture', up)
  }

  return (
    <div className={styles.dock}>
      <div className={styles.switches}>
        <div className={styles.directions} role="radiogroup" aria-label="Playback direction">
          {PLAYBACK_DIRECTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={direction === opt.value}
              className={`${styles.dir} ${direction === opt.value ? styles.dirActive : ''}`}
              onClick={() => engine.setDirection(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={loop}
          className={`${styles.loop} ${loop ? styles.loopActive : ''}`}
          onClick={() => engine.setLoop(!loop)}
        >
          Loop
        </button>
      </div>

      <div className={styles.playWrap} onPointerDown={onRingPointerDown}>
        <svg className={styles.ring} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#34383b" strokeWidth="4" />
          <circle
            ref={arcRef}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`0 ${CIRC}`}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        </svg>
        <button
          type="button"
          className={styles.play}
          disabled={disabled}
          aria-label={playing ? 'Stop' : 'Play'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            void engine.unlock().then(() => engine.togglePlay())
          }}
        >
          {playing ? (
            <svg width="28" height="28" viewBox="0 0 18 18" aria-hidden="true">
              <rect x="3" y="3" width="5" height="12" rx="1" fill="currentColor" />
              <rect x="10" y="3" width="5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 2.8v12.4L15.2 9 4 2.8Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
