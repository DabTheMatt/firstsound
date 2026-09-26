import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { applySliderKey } from '../../a11y/keyboard'
import { useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { feelFromPitch, feelFromSpeed, pitchFromFeel, speedFromFeel } from '../playbackFeel'
import styles from './PlaybackFeel.module.css'

type Props = {
  disabled: boolean
  onChange: (patch: { speed?: number; pitch?: number }) => void
  onCommit: () => void
}

function clampFeel(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

function FeelAxis({
  feel,
  from,
  to,
  aria,
  rest,
  disabled,
  testId,
  onFeel,
  onCommit,
}: {
  feel: number
  from: string
  to: string
  aria: string
  rest: string
  disabled: boolean
  testId: string
  onFeel: (feel: number) => void
  onCommit: () => void
}) {
  const drag = useRef<number | null>(null)
  const t = (feel + 1) / 2
  const valueText = feel > 0.06 ? to : feel < -0.06 ? from : rest

  const feelAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const frac = (event.clientX - rect.left) / Math.max(1, rect.width)
    return clampFeel(frac * 2 - 1)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = event.pointerId
    onFeel(feelAt(event))
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current !== event.pointerId) return
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      end(event)
      return
    }
    onFeel(feelAt(event))
  }

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onCommit()
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const next = applySliderKey(event, t)
    if (!next) return
    event.preventDefault()
    if (next.kind === 'reset') onFeel(0)
    else onFeel(clampFeel(next.normalized * 2 - 1))
  }

  return (
    <div
      className={styles.field}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={aria}
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(feel * 100)}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      data-playback={testId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={(event) => {
        event.preventDefault()
        if (disabled) return
        onFeel(0)
        onCommit()
      }}
      onKeyDown={onKey}
      onKeyUp={(event) => {
        if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'Delete' || event.key === 'Backspace') {
          onCommit()
        }
      }}
    >
      <span className={`${styles.word} ${feel < -0.08 ? styles.active : ''}`}>{from}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.center} />
        <span className={styles.bead} style={{ left: `${t * 100}%` }} />
      </span>
      <span className={`${styles.word} ${styles.wordEnd} ${feel > 0.08 ? styles.active : ''}`}>{to}</span>
    </div>
  )
}

export function PlaybackFeel({ disabled, onChange, onCommit }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const time = feelFromSpeed(snap.params.speed)
  const pitch = feelFromPitch(snap.params.pitch)

  return (
    <div className={styles.feels}>
      <FeelAxis
        feel={time}
        from={t.sensory.timeShorter}
        to={t.sensory.timeLonger}
        aria={t.sensory.timeAria}
        rest={t.sensory.balanced}
        disabled={disabled}
        testId="time"
        onFeel={(feel) => onChange({ speed: speedFromFeel(feel) })}
        onCommit={onCommit}
      />
      <FeelAxis
        feel={pitch}
        from={t.sensory.pitchLower}
        to={t.sensory.pitchHigher}
        aria={t.sensory.pitchAria}
        rest={t.sensory.balanced}
        disabled={disabled}
        testId="pitch"
        onFeel={(feel) => onChange({ pitch: pitchFromFeel(feel) })}
        onCommit={onCommit}
      />
    </div>
  )
}
