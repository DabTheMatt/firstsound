import { useEffect, useRef } from 'react'
import { formatSensoryClock } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import styles from './PlayheadClock.module.css'

type Props = {
  duration: number
}

export function PlayheadClock({ duration }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (ref.current) {
        const now = formatSensoryClock(engine.getPlayheadSeconds())
        const total = formatSensoryClock(duration)
        ref.current.textContent = `${now}  /  ${total}`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration])
  return <p ref={ref} className={styles.clock} aria-hidden="true" />
}
