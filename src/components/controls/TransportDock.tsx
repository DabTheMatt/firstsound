import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import { scrubBounds } from '../../audio/parameters/mapping'
import type { PlaybackDirection, ScrubMode } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import {
  angleToTime,
  pointerAngle,
  regionArcDash,
  timeToFraction,
  wheelToTimeDelta,
} from './scrub'
import styles from './TransportDock.module.css'

type Props = {
  playing: boolean
  loop: boolean
  direction: PlaybackDirection
  start: number
  end: number
  duration: number
  disabled: boolean
}

const SIZE = 120
const CENTER = SIZE / 2
const RADIUS = 53
const CIRC = 2 * Math.PI * RADIUS
const TICK = 8

const SCRUB_MODES: { value: ScrubMode; label: string }[] = [
  { value: 'region', label: 'Region' },
  { value: 'sample', label: 'Sample' },
]

export function TransportDock({
  playing,
  loop,
  direction,
  start,
  end,
  duration,
  disabled,
}: Props) {
  const [scrubMode, setScrubMode] = useState<ScrubMode>('region')
  const tickRef = useRef<SVGLineElement>(null)
  const playWrapRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ start, end, duration, scrubMode })

  useEffect(() => {
    stateRef.current = { start, end, duration, scrubMode }
  }, [start, end, duration, scrubMode])

  // Playhead tick is refs + rAF only, so it never re-renders the transport.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = tickRef.current
      const dur = stateRef.current.duration
      if (el) {
        const frac = timeToFraction(engine.getPlayheadSeconds(), dur)
        const angle = frac * 360
        el.setAttribute('transform', `rotate(${angle} ${CENTER} ${CENTER})`)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const applyTime = (time: number) => {
    const { start: s, end: e, duration: dur, scrubMode: mode } = stateRef.current
    const { min, max } = scrubBounds(mode, s, e, dur)
    const span = Math.max(max - min, 0)
    if (span <= 0) return
    engine.seekSeconds(time, mode)
  }

  const scrub = (clientX: number, clientY: number, target: Element) => {
    const rect = target.getBoundingClientRect()
    applyTime(angleToTime(pointerAngle(clientX, clientY, rect), stateRef.current.duration))
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

  useEffect(() => {
    const wrap = playWrapRef.current
    if (!wrap) return
    const onWheel = (event: WheelEvent) => {
      if (disabled) return
      event.preventDefault()
      const { start: s, end: e, duration: dur, scrubMode: mode } = stateRef.current
      const { min, max } = scrubBounds(mode, s, e, dur)
      engine.nudgePlayhead(wheelToTimeDelta(event.deltaY, event.shiftKey, max - min), mode)
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [disabled])

  const regionDash = regionArcDash(start, end, duration, CIRC)

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
              aria-label={opt.label}
              className={`${styles.dir} ${direction === opt.value ? styles.dirActive : ''}`}
              onClick={() => engine.setDirection(opt.value)}
            >
              {opt.value === 'pingpong' ? 'P-P' : opt.label}
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
        <div className={styles.directions} role="radiogroup" aria-label="Scrub mode">
          {SCRUB_MODES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={scrubMode === opt.value}
              className={`${styles.dir} ${scrubMode === opt.value ? styles.dirActive : ''}`}
              onClick={() => setScrubMode(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={playWrapRef}
        className={styles.playWrap}
        onPointerDown={onRingPointerDown}
      >
        <svg className={styles.ring} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#34383b" strokeWidth="4" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="color-mix(in srgb, var(--accent) 55%, #34383b)"
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray={regionDash.dashArray}
            strokeDashoffset={regionDash.dashOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
          <line
            ref={tickRef}
            x1={CENTER}
            y1={CENTER - RADIUS - 1}
            x2={CENTER}
            y2={CENTER - RADIUS + TICK}
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(0 ${CENTER} ${CENTER})`}
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
