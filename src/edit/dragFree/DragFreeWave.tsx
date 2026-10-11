import { useEffect, useId, useRef, useState } from 'react'
import { patchAttentionSignals } from '../../a11y/attention/signals'
import { announce } from '../../a11y/liveRegion'
import { assistedEditorsEnabled } from '../../a11y/settings'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { guideTargetAttrs } from '../../guide/targets'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import {
  FADE_STEP_SEC,
  stepFade,
  stepPlayhead,
  validateFade,
  validatePlayhead,
  validateSelection,
  type EditError,
} from './edits'
import { formatEditTime, parseEditTime, speakEditTime } from './timeEntry'
import { TimeField } from './TimeField'
import styles from './DragFree.module.css'

type FadePatch = { fadeIn?: number; fadeOut?: number; fadeFocus?: 'in' | 'out' }

type Props = {
  fadeIn: number
  fadeOut: number
  onFades: (patch: FadePatch) => void
  onFadesCommit: () => void
  onRegionCommit: () => void
  onTrim?: () => void
  showTrim?: boolean
  showFades?: boolean
}

type Section = 'times' | 'playhead' | 'trim' | null

export function DragFreeWave({
  fadeIn,
  fadeOut,
  onFades,
  onFadesCommit,
  onRegionCommit,
  onTrim,
  showTrim = true,
  showFades = true,
}: Props) {
  const { settings } = useA11ySettings()
  if (!assistedEditorsEnabled(settings)) return null
  return (
    <DragFreeWaveBody
      fadeIn={fadeIn}
      fadeOut={fadeOut}
      onFades={onFades}
      onFadesCommit={onFadesCommit}
      onRegionCommit={onRegionCommit}
      onTrim={onTrim}
      showTrim={showTrim}
      showFades={showFades}
    />
  )
}

function DragFreeWaveBody({
  fadeIn,
  fadeOut,
  onFades,
  onFadesCommit,
  onRegionCommit,
  onTrim,
  showTrim = true,
  showFades = true,
}: Props) {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const copy = t.dragFree
  const titleId = useId()
  const [section, setSection] = useState<Section>(null)
  useEffect(() => {
    patchAttentionSignals({
      dragSection: section === 'trim' || section === 'times' || section === 'playhead' ? section : null,
    })
    return () => patchAttentionSignals({ dragSection: null })
  }, [section])
  const [error, setError] = useState<EditError | null>(null)
  const [startDraft, setStartDraft] = useState('')
  const [endDraft, setEndDraft] = useState('')
  const [headDraft, setHeadDraft] = useState('')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const trimRef = useRef<HTMLButtonElement | null>(null)
  const duration = snap.duration
  const start = snap.params.start
  const end = snap.params.end
  const loaded = snap.sampleLoaded && duration > 0
  const spoken = (seconds: number) => speakEditTime(seconds, locale)

  useEffect(() => {
    if (!section) return
    if (section === 'trim') trimRef.current?.focus()
    else firstFieldRef.current?.focus()
    if (section !== 'trim') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setSection(null)
      setError(null)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [section])

  const closeSection = () => {
    setSection(null)
    setError(null)
    triggerRef.current?.focus()
  }

  const open = (next: Section, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger
    setError(null)
    if (section === next) {
      closeSection()
      return
    }
    setStartDraft(formatEditTime(start))
    setEndDraft(formatEditTime(end))
    setHeadDraft(formatEditTime(engine.getSourcePlayheadSeconds()))
    setSection(next)
  }

  const explain = (kind: EditError | 'format' | 'negative') => {
    setError(kind)
  }

  const readTime = (raw: string) => {
    const parsed = parseEditTime(raw)
    if (!parsed.ok) {
      explain(parsed.error)
      return null
    }
    return parsed.seconds
  }

  const applySelection = () => {
    const nextStart = readTime(startDraft)
    if (nextStart == null) return
    const nextEnd = readTime(endDraft)
    if (nextEnd == null) return
    const result = validateSelection(nextStart, nextEnd, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.setRegion(result.value.start, result.value.end)
    onRegionCommit()
    setError(null)
    announce(copy.appliedSelection)
  }

  const setEdge = (edge: 'start' | 'end') => {
    const head = engine.getSourcePlayheadSeconds()
    const result = validateSelection(edge === 'start' ? head : start, edge === 'end' ? head : end, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.setRegion(result.value.start, result.value.end)
    onRegionCommit()
    setError(null)
    announce(copy.appliedSelection)
  }

  const clear = () => {
    if (!engine.clearSampleSelection()) return
    onRegionCommit()
    setError(null)
    announce(copy.cleared)
  }

  const goTo = (time: number) => {
    const result = validatePlayhead(time, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.seekSeconds(result.value, 'sample')
    setError(null)
    announce(copy.appliedPlayhead)
  }

  const applyHead = () => {
    const time = readTime(headDraft)
    if (time == null) return
    goTo(time)
  }

  const nudgeHead = (direction: -1 | 1) => {
    const result = stepPlayhead(engine.getSourcePlayheadSeconds(), direction, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.seekSeconds(result.value, 'sample')
    setError(null)
    announce(copy.appliedPlayhead)
  }

  const preview = () => {
    engine.seekSeconds(start, 'region')
    if (!snap.playing) void engine.unlock().then(() => engine.play())
    announce(copy.appliedPlayhead)
  }

  const applyFade = (side: 'in' | 'out', seconds: number) => {
    const result = validateFade(seconds, start, end)
    if (!result.ok) {
      explain(result.error)
      return
    }
    onFades(side === 'in' ? { fadeIn: result.value, fadeFocus: 'in' } : { fadeOut: result.value, fadeFocus: 'out' })
    onFadesCommit()
    setError(null)
    announce(copy.appliedFade)
  }

  const readFadeMs = (raw: string) => {
    const parsed = parseEditTime(`${raw.trim()} ms`)
    if (!parsed.ok) {
      explain(parsed.error)
      return null
    }
    return parsed.seconds
  }

  const confirmTrim = () => {
    onTrim?.()
    setSection(null)
    setError(null)
    announce(copy.appliedTrim)
    triggerRef.current?.focus()
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
              : error === 'fade'
                ? copy.errFade
                : error === 'missing'
                  ? copy.noSample
                  : null

  return (
    <section className={styles.panel} aria-labelledby={titleId} data-drag-free="wave" data-drag-free-section={section ?? 'idle'}>
      <h2 id={titleId} className={styles.note}>
        {copy.selection}
      </h2>
      <p className={styles.clock}>
        <span aria-label={copy.selectionStartSr(spoken(start))}>{formatEditTime(start)}</span>
        <span aria-hidden="true"> – </span>
        <span aria-label={copy.selectionEndSr(spoken(end))}>{formatEditTime(end)}</span>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={!loaded} onClick={() => setEdge('start')}>
          {copy.setStart}
        </button>
        <button type="button" className={styles.button} disabled={!loaded} onClick={() => setEdge('end')}>
          {copy.setEnd}
        </button>
        <button type="button" className={styles.button} aria-expanded={section === 'times'} disabled={!loaded} onClick={(event) => open('times', event.currentTarget)}>
          {copy.editTimes}
        </button>
        <button type="button" className={styles.button} disabled={!loaded || !snap.canClearSelection} onClick={clear}>
          {copy.clear}
        </button>
        <button type="button" className={styles.button} aria-expanded={section === 'playhead'} disabled={!loaded} onClick={(event) => open('playhead', event.currentTarget)}>
          {copy.goToTime}
        </button>
        <button type="button" className={styles.button} disabled={!loaded} aria-label={copy.stepBack} onClick={() => nudgeHead(-1)}>
          −100 ms
        </button>
        <button type="button" className={styles.button} disabled={!loaded} aria-label={copy.stepForward} onClick={() => nudgeHead(1)}>
          +100 ms
        </button>
        <button type="button" className={styles.button} disabled={!loaded} onClick={() => goTo(start)}>
          {copy.toStart}
        </button>
        <button type="button" className={styles.button} disabled={!loaded} onClick={() => goTo(end)}>
          {copy.toEnd}
        </button>
        {showTrim && onTrim ? (
          <button type="button" className={styles.button} disabled={!loaded || !snap.canClearSelection} {...guideTargetAttrs('edit.trim')} onClick={(event) => open('trim', event.currentTarget)}>
            {copy.trim}
          </button>
        ) : null}
        {loaded ? (
          <button type="button" className={styles.button} onClick={preview}>
            {copy.preview}
          </button>
        ) : null}
      </div>
      {!loaded ? <p className={styles.note}>{copy.noSample}</p> : <p className={styles.note}>{copy.timeNote}</p>}
      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}

      {section === 'times' ? (
        <div className={styles.form}>
          <TimeField label={copy.start} spoken={copy.selectionStartSr(spoken(start))} value={startDraft} inputRef={(node) => { firstFieldRef.current = node }} onChange={setStartDraft} onEnter={applySelection} />
          <TimeField label={copy.end} spoken={copy.selectionEndSr(spoken(end))} value={endDraft} onChange={setEndDraft} onEnter={applySelection} />
          <div className={styles.actions}>
            <button type="button" className={styles.apply} onClick={applySelection}>
              {copy.apply}
            </button>
            <button type="button" className={styles.button} onClick={closeSection}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {section === 'playhead' ? (
        <div className={styles.form}>
          <TimeField
            label={copy.goToTime}
            spoken={copy.playheadSr(spoken(engine.getSourcePlayheadSeconds()))}
            value={headDraft}
            inputRef={(node) => {
              firstFieldRef.current = node
            }}
            onChange={setHeadDraft}
            onEnter={applyHead}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.apply} onClick={applyHead}>
              {copy.go}
            </button>
            <button type="button" className={styles.button} onClick={closeSection}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {showFades ? (
        <div className={styles.form}>
          <FadeRow
            label={copy.fadeIn}
            guide="edit.fadeIn"
            seconds={fadeIn}
            disabled={!loaded}
            lessLabel={`${copy.fadeIn}, ${copy.fadeLess}`}
            moreLabel={`${copy.fadeIn}, ${copy.fadeMore}`}
            onStep={(direction) => {
              const result = stepFade(fadeIn, direction, start, end)
              if (!result.ok) explain(result.error)
              else applyFade('in', result.value)
            }}
            onApply={(raw) => {
              const seconds = readFadeMs(raw)
              if (seconds == null) return
              applyFade('in', seconds)
            }}
          />
          <FadeRow
            label={copy.fadeOut}
            guide="edit.fadeOut"
            seconds={fadeOut}
            disabled={!loaded}
            lessLabel={`${copy.fadeOut}, ${copy.fadeLess}`}
            moreLabel={`${copy.fadeOut}, ${copy.fadeMore}`}
            onStep={(direction) => {
              const result = stepFade(fadeOut, direction, start, end)
              if (!result.ok) explain(result.error)
              else applyFade('out', result.value)
            }}
            onApply={(raw) => {
              const seconds = readFadeMs(raw)
              if (seconds == null) return
              applyFade('out', seconds)
            }}
          />
        </div>
      ) : null}

      {section === 'trim' ? (
        <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="drag-free-trim-title">
          <h3 id="drag-free-trim-title">{copy.trim}</h3>
          <p>{copy.trimWarn}</p>
          <div className={styles.actions}>
            <button ref={trimRef} type="button" className={styles.apply} onClick={confirmTrim}>
              {copy.trimApply}
            </button>
            <button type="button" className={styles.button} onClick={closeSection}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function FadeRow({
  label,
  guide,
  seconds,
  disabled,
  lessLabel,
  moreLabel,
  onStep,
  onApply,
}: {
  label: string
  guide: 'edit.fadeIn' | 'edit.fadeOut'
  seconds: number
  disabled: boolean
  lessLabel: string
  moreLabel: string
  onStep: (direction: -1 | 1) => void
  onApply: (raw: string) => void
}) {
  const { t } = useI18n()
  const inputId = useId()
  const ms = Math.round(seconds * 1000)
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(ms)
  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <span className={styles.clock} aria-hidden="true">
        {ms} ms
      </span>
      <input
        id={inputId}
        value={shown}
        disabled={disabled}
        inputMode="numeric"
        aria-label={`${label}, ${t.dragFree.duration}, ${ms} ms`}
        {...guideTargetAttrs(guide)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onApply(event.currentTarget.value)
            setDraft(null)
          }
          if (event.key === 'Escape') setDraft(null)
        }}
      />
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={disabled} aria-label={lessLabel} onClick={() => onStep(-1)}>
          −{Math.round(FADE_STEP_SEC * 1000)} ms
        </button>
        <button type="button" className={styles.button} disabled={disabled} aria-label={moreLabel} onClick={() => onStep(1)}>
          +{Math.round(FADE_STEP_SEC * 1000)} ms
        </button>
        <button type="button" className={styles.apply} disabled={disabled} onClick={() => { onApply(shown); setDraft(null) }}>
          {t.dragFree.apply}
        </button>
      </div>
    </div>
  )
}
