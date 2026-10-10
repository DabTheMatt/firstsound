import { useId, useRef, useState } from 'react'
import { announce } from '../../a11y/liveRegion'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { validateLoop, type EditError } from './edits'
import { formatEditTime, parseEditTime, speakEditTime } from './timeEntry'
import { TimeField } from './TimeField'
import styles from './DragFree.module.css'

type Props = {
  trackId: string
  selected: boolean
  duration: number
  loopStart: number
  loopEnd: number
}

export function DragFreeLoop({ trackId, selected, duration, loopStart, loopEnd }: Props) {
  const { settings } = useA11ySettings()
  if (!settings.dragFreeEditing) return null
  return (
    <LoopBody
      trackId={trackId}
      selected={selected}
      duration={duration}
      loopStart={loopStart}
      loopEnd={loopEnd}
    />
  )
}

function LoopBody({ trackId, selected, duration, loopStart, loopEnd }: Props) {
  const { t, locale } = useI18n()
  const copy = t.dragFree
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [startDraft, setStartDraft] = useState(formatEditTime(loopStart))
  const [endDraft, setEndDraft] = useState(formatEditTime(loopEnd))
  const [error, setError] = useState<EditError | 'format' | 'negative' | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const spoken = (seconds: number) => speakEditTime(seconds, locale)

  const apply = (start: number, end: number) => {
    const result = validateLoop(start, end, duration)
    if (!result.ok) {
      setError(result.error)
      return
    }
    engine.setTrackLoop(trackId, result.value.start, result.value.end, true)
    setError(null)
    announce(copy.appliedLoop)
  }

  const atPlayhead = (edge: 'start' | 'end') => {
    if (!selected) return
    const head = engine.getSourcePlayheadSeconds()
    apply(edge === 'start' ? head : loopStart, edge === 'end' ? head : loopEnd)
  }

  const applyDrafts = () => {
    const start = parseEditTime(startDraft)
    if (!start.ok) {
      setError(start.error)
      return
    }
    const end = parseEditTime(endDraft)
    if (!end.ok) {
      setError(end.error)
      return
    }
    apply(start.seconds, end.seconds)
  }

  const message =
    error === 'format'
      ? copy.errFormat
      : error === 'negative'
        ? copy.errNegative
        : error === 'past'
          ? copy.errPast
          : error === 'order'
            ? copy.errOrder
            : error === 'short'
              ? copy.errShort
              : error === 'missing'
                ? copy.noSample
                : null

  return (
    <div className={styles.panel} aria-labelledby={titleId} data-drag-free="loop">
      <h3 id={titleId} className={styles.note}>
        {copy.loop}
      </h3>
      <p className={styles.clock}>
        <span>{formatEditTime(loopStart)}</span>
        <span aria-hidden="true"> – </span>
        <span>{formatEditTime(loopEnd)}</span>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={!selected} onClick={() => atPlayhead('start')}>
          {copy.setLoopStart}
        </button>
        <button type="button" className={styles.button} disabled={!selected} onClick={() => atPlayhead('end')}>
          {copy.setLoopEnd}
        </button>
        <button
          type="button"
          className={styles.button}
          aria-expanded={open}
          onClick={(event) => {
            triggerRef.current = event.currentTarget
            setStartDraft(formatEditTime(loopStart))
            setEndDraft(formatEditTime(loopEnd))
            setOpen((value) => !value)
          }}
        >
          {copy.editLoop}
        </button>
      </div>
      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
      {open ? (
        <div className={styles.form}>
          <TimeField label={copy.start} spoken={copy.selectionStartSr(spoken(loopStart))} value={startDraft} onChange={setStartDraft} onEnter={applyDrafts} />
          <TimeField label={copy.end} spoken={copy.selectionEndSr(spoken(loopEnd))} value={endDraft} onChange={setEndDraft} onEnter={applyDrafts} />
          <div className={styles.actions}>
            <button type="button" className={styles.apply} onClick={applyDrafts}>
              {copy.apply}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
