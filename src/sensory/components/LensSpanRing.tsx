import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { clamp01, lensWindowSeconds, wrapUnitDelta } from '../visualization/lensWindow'
import styles from './LensSpanRing.module.css'

type Props = {
  amount: number
  duration: number
  onChange: (amount: number) => void
  onCommit: () => void
}

function angle01(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const ang = Math.atan2(clientY - cy, clientX - cx)
  let t = (ang + Math.PI / 2) / (Math.PI * 2)
  if (t < 0) t += 1
  return t
}

export function LensSpanRing({ amount, duration, onChange, onCommit }: Props) {
  const drag = useRef<{ pointerId: number; originT: number; originAmount: number } | null>(null)
  const t = clamp01(amount)
  const deg = t * 360
  const seconds = lensWindowSeconds(t, duration)

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = {
      pointerId: event.pointerId,
      originT: angle01(event.clientX, event.clientY, rect),
      originAmount: t,
    }
  }

  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onCommit()
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (event.buttons === 0) {
      end(event)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const nextT = angle01(event.clientX, event.clientY, rect)
    onChange(clamp01(state.originAmount + wrapUnitDelta(nextT - state.originT)))
  }

  return (
    <svg
      className={styles.ring}
      viewBox="0 0 100 100"
      aria-label="How much sample the lens holds, five seconds to two minutes"
      role="slider"
      tabIndex={0}
      aria-valuemin={5}
      aria-valuemax={120}
      aria-valuenow={Math.round(seconds)}
      aria-valuetext={`${Math.round(seconds)} seconds in the lens`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.02 : 0.08
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          onChange(clamp01(t + step))
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          onChange(clamp01(t - step))
        }
      }}
      onKeyUp={(event) => {
        if (event.key.startsWith('Arrow')) onCommit()
      }}
    >
      <circle className={styles.track} cx="50" cy="50" r="46.5" />
      <circle className={styles.hit} cx="50" cy="50" r="46.5" />
      <circle
        className={styles.thumb}
        cx="50"
        cy="3.5"
        r="2.4"
        transform={`rotate(${deg} 50 50)`}
      />
    </svg>
  )
}
