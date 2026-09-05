import { useEffect, useRef } from 'react'
import { formatRangeClock, formatSensoryClock } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import styles from './PlayheadClock.module.css'

type Props = {
  duration: number
  compact?: boolean
}

export function PlayheadClock({ duration, compact = false }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (ref.current) {
        const fmt = compact ? formatRangeClock : formatSensoryClock
        const now = fmt(engine.getPlayheadSeconds())
        const total = fmt(duration)
        ref.current.textContent = `${now}  /  ${total}`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, compact])
  return <p ref={ref} className={styles.clock} aria-hidden="true" />
}
