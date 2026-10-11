import { useEffect, useId, useRef, useState } from 'react'
import { engine, useEngine } from '../../hooks/useEngine'
import { announce } from '../liveRegion'
import { useA11ySettings } from '../useA11ySettings'
import { validatePlayhead, validateSelection, type EditError } from '../../edit/dragFree/edits'
import { formatEditTime, parseEditTime, speakEditTime } from '../../edit/dragFree/timeEntry'
import { TimeField } from '../../edit/dragFree/TimeField'
import { dispatchGuide } from '../../guide/store'
import { useI18n } from '../../i18n'
import { waveNavCopy } from './copy'
import { assembleLandmarks, neighborLandmark, visibleLandmarks } from './landmarks'
import { formatLevel, measureWindow, type SignalReading } from './measure'
import { formatAccessibleClock, kilohertzLabel, navStepSeconds, speakAccessibleTime, stepTimeline } from './time'
import type { LandmarkFilter, NavStepId } from './types'
import { useDetectedLandmarks } from './useLandmarks'
import styles from './AccessibleWaveform.module.css'

type Work = () => void | boolean | Promise<void | boolean>

export type WaveformNavMode = 'simple' | 'technical' | 'sensory'

type Props = {
  mode: WaveformNavMode
  onRegionCommit: () => void
  onTrim?: Work
  onNormalize?: Work
  onExport?: Work
  onFadeIn?: Work
  onFadeOut?: Work
  onUndo?: Work
  canUndo?: boolean
}

export function AccessibleWaveform(props: Props) {
  const { settings } = useA11ySettings()
  if (!settings.accessibleWaveform) return null
  return <AccessibleWaveformBody {...props} />
}

function AccessibleWaveformBody({
  mode,
  onRegionCommit,
  onTrim,
  onNormalize,
  onExport,
  onFadeIn,
  onFadeOut,
  onUndo,
  canUndo = false,
}: Props) {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const copy = waveNavCopy(locale)
  const titleId = useId()
  const panelId = useId()
  const listId = useId()
  const technical = mode === 'technical'
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<NavStepId>(technical ? '100ms' : '1s')
  const [filter, setFilter] = useState<LandmarkFilter>('all')
  const [detail, setDetail] = useState(false)
  const [error, setError] = useState<EditError | 'format' | 'negative' | null>(null)
  const [headDraft, setHeadDraft] = useState('00:00.000')
  const [startDraft, setStartDraft] = useState('00:00.000')
  const [endDraft, setEndDraft] = useState('00:00.000')
  const [reading, setReading] = useState<SignalReading | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const firstRef = useRef<HTMLButtonElement | null>(null)
  const emptyRef = useRef<HTMLParagraphElement | null>(null)
  const stepTimer = useRef(0)
  const analysis = useDetectedLandmarks(open && snap.sampleLoaded)
  const duration = snap.duration
  const loaded = snap.sampleLoaded && duration > 0 && snap.sampleRate > 0
  const start = snap.params.start
  const end = snap.params.end
  const fileName = snap.fileName || (locale === 'pl' ? 'nagranie' : 'recording')
  const track = snap.tracks.find((item) => item.id === snap.selectedTrackId)
  const landmarks = loaded
    ? visibleLandmarks(
        assembleLandmarks(
          {
            duration,
            selectionStart: start,
            selectionEnd: end,
            selectionPartial: snap.canClearSelection,
            loopOn: Boolean(track?.loop),
            loopStart: track?.loopStart ?? 0,
            loopEnd: track?.loopEnd ?? 0,
          },
          analysis.marks,
        ),
        filter,
        detail,
      )
    : []

  useEffect(() => {
    if (!open) return
    if (loaded) firstRef.current?.focus()
    else emptyRef.current?.focus()
  }, [open, loaded])

  useEffect(() => () => window.clearTimeout(stepTimer.current), [])

  const explain = (kind: EditError | 'format' | 'negative') => {
    setError(kind)
    const message =
      kind === 'format'
        ? t.dragFree.errFormat
        : kind === 'negative'
          ? t.dragFree.errNegative
          : kind === 'past'
            ? t.dragFree.errPast
            : kind === 'order'
              ? t.dragFree.errOrder
              : kind === 'short'
                ? t.dragFree.errShort
                : kind === 'missing'
                  ? copy.empty
                  : t.dragFree.errFormat
    announce(message)
  }

  const say = (message: string, throttled: boolean) => {
    window.clearTimeout(stepTimer.current)
    if (!throttled) {
      announce(message)
      return
    }
    stepTimer.current = window.setTimeout(() => announce(message), 320)
  }

  const seek = (time: number, throttled: boolean) => {
    const result = validatePlayhead(time, duration)
    if (!result.ok) {
      explain(result.error)
      return false
    }
    engine.seekSeconds(result.value, 'sample')
    setError(null)
    say(copy.moved(speakAccessibleTime(result.value, locale)), throttled)
    return true
  }

  const stepBy = (direction: -1 | 1) => {
    const size = navStepSeconds(step, snap.sampleRate)
    if (size == null) return
    const result = stepTimeline(engine.getSourcePlayheadSeconds(), direction, duration, size, snap.sampleRate)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.seekSeconds(result.value, 'sample')
    setError(null)
    say(copy.moved(speakAccessibleTime(result.value, locale)), true)
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
    announce(t.dragFree.appliedSelection)
  }

  const applyTimes = () => {
    const nextStart = parseEditTime(startDraft)
    if (!nextStart.ok) {
      explain(nextStart.error)
      return
    }
    const nextEnd = parseEditTime(endDraft)
    if (!nextEnd.ok) {
      explain(nextEnd.error)
      return
    }
    const result = validateSelection(nextStart.seconds, nextEnd.seconds, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.setRegion(result.value.start, result.value.end)
    onRegionCommit()
    setError(null)
    announce(t.dragFree.appliedSelection)
  }

  const goTyped = () => {
    const parsed = parseEditTime(headDraft)
    if (!parsed.ok) {
      explain(parsed.error)
      return
    }
    seek(parsed.seconds, false)
  }

  const clear = () => {
    if (!engine.clearSampleSelection()) {
      announce(copy.clearedNone)
      return
    }
    onRegionCommit()
    setError(null)
    announce(t.dragFree.cleared)
  }

  const run = (work: Work | undefined, done: string) => {
    if (!work) return
    void Promise.resolve(work()).then((ok) => {
      if (ok === false) return
      announce(done)
    })
  }

  const goToLandmark = (time: number, type: (typeof landmarks)[number]['type']) => {
    const result = validatePlayhead(time, duration)
    if (!result.ok) {
      explain(result.error)
      return
    }
    engine.seekSeconds(result.value, 'sample')
    setError(null)
    announce(copy.spoken[type](speakAccessibleTime(result.value, locale)))
  }

  const jumpLandmark = (direction: -1 | 1) => {
    const mark = neighborLandmark(landmarks, engine.getSourcePlayheadSeconds(), direction)
    if (!mark) {
      announce(copy.none)
      return
    }
    goToLandmark(mark.time, mark.type)
  }

  const inspect = () => {
    const channels: Float32Array[] = []
    for (let index = 0; index < snap.channelCount; index++) {
      const data = engine.audibleChannel(index)
      if (data) channels.push(data)
    }
    const next = measureWindow(channels, snap.sampleRate, engine.getSourcePlayheadSeconds(), duration)
    if (!next) {
      announce(copy.unavailable)
      return
    }
    setReading(next)
    const parts = next.channels.flatMap((level, index) => {
      const name = channelName(index, next.channels.length, locale)
      return [copy.peak(name, formatLevel(level.peakDbfs)), copy.rms(name, formatLevel(level.rmsDbfs))]
    })
    announce(`${parts.join(' ')} ${next.lowLevel ? copy.quiet : copy.activity}`)
  }

  const close = () => {
    setOpen(false)
    setError(null)
    triggerRef.current?.focus()
  }

  const channelLine = snap.channelCount <= 1 ? copy.mono : snap.channelCount === 2 ? copy.stereo : copy.channels(snap.channelCount)
  const selectionLine = snap.canClearSelection
    ? copy.selection(formatAccessibleClock(start), formatAccessibleClock(end), formatAccessibleClock(Math.max(0, end - start)))
    : copy.noSelection
  const stepLabel = copy.steps[step]
  const showSampleStep = loaded && snap.sampleRate > 0

  return (
    <section className={styles.wrap} data-accessible-waveform="" aria-labelledby={titleId} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !open) return
      event.preventDefault()
      event.stopPropagation()
      close()
    }}>
      <h2 id={titleId} className="sr-only">
        {copy.title}
      </h2>
      <button
        ref={triggerRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) close()
          else {
            setHeadDraft(formatEditTime(engine.getSourcePlayheadSeconds()))
            setStartDraft(formatEditTime(start))
            setEndDraft(formatEditTime(end))
            setOpen(true)
          }
        }}
      >
        {open ? copy.close : copy.open}
      </button>
      {open ? (
        <div className={styles.panel} id={panelId} role="region" aria-label={copy.region(fileName)}>
          <button type="button" className={styles.button} onClick={close}>
            {copy.close}
          </button>
          {loaded ? (
            <>
              <p className={styles.meta}>
                {copy.meta(channelLine, formatAccessibleClock(duration), copy.rate(kilohertzLabel(snap.sampleRate)))}
              </p>
              <p className={styles.clock}>
                <span className="sr-only">{copy.position}. </span>
                {formatAccessibleClock(engine.getSourcePlayheadSeconds())}
              </p>
              <p className={styles.note}>{selectionLine}</p>
              <div className={styles.row}>
                <button ref={firstRef} type="button" className={styles.button} onClick={() => seek(0, false)}>
                  {copy.goStart}
                </button>
                <button type="button" className={styles.button} onClick={() => seek(duration, false)}>
                  {copy.goEnd}
                </button>
                <button type="button" className={styles.button} onClick={() => stepBy(-1)}>
                  {copy.stepBack(stepLabel)}
                </button>
                <button type="button" className={styles.button} onClick={() => stepBy(1)}>
                  {copy.stepForward(stepLabel)}
                </button>
              </div>
              <label className={styles.field}>
                {copy.step}
                <select value={step} onChange={(event) => setStep(event.target.value as NavStepId)}>
                  {(['10s', '1s', '100ms', '10ms'] as const).map((id) => (
                    <option key={id} value={id}>
                      {copy.steps[id]}
                    </option>
                  ))}
                  {showSampleStep ? <option value="sample">{copy.steps.sample}</option> : null}
                </select>
              </label>
              <div className={styles.row}>
                <TimeField
                  label={copy.goTime}
                  spoken={copy.goTime}
                  value={headDraft}
                  onChange={setHeadDraft}
                  onEnter={goTyped}
                />
                <button type="button" className={styles.button} onClick={goTyped}>
                  {copy.go}
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => announce(copy.positionNow(speakAccessibleTime(engine.getSourcePlayheadSeconds(), locale)))}
                >
                  {copy.readPosition}
                </button>
              </div>
              <div className={styles.row}>
                <button type="button" className={styles.button} onClick={() => seek(start, false)}>
                  {copy.goSelectionStart}
                </button>
                <button type="button" className={styles.button} onClick={() => seek(end, false)}>
                  {copy.goSelectionEnd}
                </button>
                <button type="button" className={styles.button} onClick={() => setEdge('start')}>
                  {copy.setStart}
                </button>
                <button type="button" className={styles.button} onClick={() => setEdge('end')}>
                  {copy.setEnd}
                </button>
                <button type="button" className={styles.button} onClick={clear}>
                  {copy.clear}
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    void engine.playSelection()
                    announce(copy.previewed)
                  }}
                >
                  {copy.preview}
                </button>
              </div>
              <details
                className={styles.times}
                onToggle={(event) => {
                  if (!(event.currentTarget instanceof HTMLDetailsElement) || !event.currentTarget.open) return
                  setStartDraft(formatEditTime(start))
                  setEndDraft(formatEditTime(end))
                }}
              >
                <summary>{copy.editTimes}</summary>
                <TimeField
                  label={copy.selectionStart}
                  spoken={`${copy.selectionStart}, ${speakEditTime(start, locale)}`}
                  value={startDraft}
                  onChange={setStartDraft}
                  onEnter={applyTimes}
                />
                <TimeField
                  label={copy.selectionEnd}
                  spoken={`${copy.selectionEnd}, ${speakEditTime(end, locale)}`}
                  value={endDraft}
                  onChange={setEndDraft}
                  onEnter={applyTimes}
                />
                <button type="button" className={styles.apply} onClick={applyTimes}>
                  {t.dragFree.apply}
                </button>
              </details>
              <div className={styles.row}>
                {onTrim && mode !== 'sensory' ? (
                  <button type="button" className={styles.button} onClick={() => run(onTrim, copy.appliedTrim)}>
                    {copy.trim}
                  </button>
                ) : null}
                {onFadeIn && mode !== 'sensory' ? (
                  <button type="button" className={styles.button} onClick={() => run(onFadeIn, copy.appliedFade)}>
                    {copy.fadeIn}
                  </button>
                ) : null}
                {onFadeOut && mode !== 'sensory' ? (
                  <button type="button" className={styles.button} onClick={() => run(onFadeOut, copy.appliedFade)}>
                    {copy.fadeOut}
                  </button>
                ) : null}
                {onNormalize && mode !== 'sensory' ? (
                  <button type="button" className={styles.button} onClick={() => run(onNormalize, copy.appliedNormalize)}>
                    {copy.normalize}
                  </button>
                ) : null}
                {technical ? (
                  <button
                    type="button"
                    className={styles.button}
                    aria-pressed={snap.loop}
                    onClick={() => {
                      const next = !engine.getSnapshot().loop
                      engine.setLoop(next)
                      announce(next ? copy.loopOn : copy.loopOff)
                    }}
                  >
                    {copy.loop}
                  </button>
                ) : null}
                {onExport && mode !== 'sensory' ? (
                  <button type="button" className={styles.button} onClick={() => run(onExport, copy.appliedExport)}>
                    {copy.exportSelection}
                  </button>
                ) : null}
                {onUndo ? (
                  <button type="button" className={styles.button} disabled={!canUndo} onClick={() => run(onUndo, copy.appliedUndo)}>
                    {copy.undo}
                  </button>
                ) : null}
              </div>
              <div className={styles.row}>
                <button type="button" className={styles.button} onClick={() => jumpLandmark(-1)}>
                  {copy.previous}
                </button>
                <button type="button" className={styles.button} onClick={() => jumpLandmark(1)}>
                  {copy.next}
                </button>
              </div>
              <label className={styles.field}>
                {copy.filter}
                <select value={filter} onChange={(event) => setFilter(event.target.value as LandmarkFilter)}>
                  {(Object.keys(copy.filters) as LandmarkFilter[]).map((id) => (
                    <option key={id} value={id}>
                      {copy.filters[id]}
                    </option>
                  ))}
                </select>
              </label>
              {technical ? (
                <button type="button" className={styles.button} aria-pressed={detail} onClick={() => setDetail((value) => !value)}>
                  {copy.detail}
                </button>
              ) : null}
              <p className={styles.note}>{analysis.status === 'running' ? copy.analysing : analysis.status === 'error' ? copy.unavailable : null}</p>
              <ul className={styles.list} id={listId} aria-label={copy.list}>
                {landmarks.length === 0 ? <li className={styles.note}>{copy.emptyList}</li> : null}
                {landmarks.map((mark) => (
                  <li key={mark.id}>
                    <button type="button" className={styles.landmark} onClick={() => goToLandmark(mark.time, mark.type)}>
                      <span className={styles.landmarkTime}>{formatAccessibleClock(mark.time)}</span> {copy.labels[mark.type]}
                    </button>
                  </li>
                ))}
              </ul>
              {technical ? (
                <div className={styles.row}>
                  <button type="button" className={styles.button} onClick={inspect}>
                    {copy.inspect}
                  </button>
                  <p className={styles.note}>{copy.inspectWindow}</p>
                </div>
              ) : null}
              {technical && reading ? (
                <div>
                  <p className={styles.note}>{copy.units}</p>
                  {reading.channels.map((level, index) => {
                    const name = channelName(index, reading.channels.length, locale)
                    return (
                      <p key={name} className={styles.note}>
                        {copy.peak(name, formatLevel(level.peakDbfs))} {copy.rms(name, formatLevel(level.rmsDbfs))}
                      </p>
                    )
                  })}
                  <p className={styles.note}>{reading.lowLevel ? copy.quiet : copy.activity}</p>
                </div>
              ) : null}
              <div className={styles.row}>
                <button type="button" className={styles.learn} onClick={() => dispatchGuide({ type: 'open-topic', id: 'transient' })}>
                  {copy.learnTransient}
                </button>
                <button type="button" className={styles.learn} onClick={() => dispatchGuide({ type: 'open-topic', id: 'silence-detection' })}>
                  {copy.learnSilence}
                </button>
                {technical ? (
                  <button type="button" className={styles.learn} onClick={() => dispatchGuide({ type: 'open-topic', id: 'rms' })}>
                    {copy.learnRms}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p ref={emptyRef} className={styles.note} tabIndex={-1}>
              {copy.empty}
            </p>
          )}
          {error ? (
            <p className={styles.error} role="alert">
              {error === 'format'
                ? t.dragFree.errFormat
                : error === 'negative'
                  ? t.dragFree.errNegative
                  : error === 'past'
                    ? t.dragFree.errPast
                    : error === 'order'
                      ? t.dragFree.errOrder
                      : error === 'short'
                        ? t.dragFree.errShort
                        : copy.empty}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function channelName(index: number, count: number, locale: 'en' | 'pl'): string {
  if (count <= 1) return locale === 'pl' ? 'Sygnał' : 'Signal'
  if (count === 2) return index === 0 ? (locale === 'pl' ? 'Lewy' : 'Left') : locale === 'pl' ? 'Prawy' : 'Right'
  return locale === 'pl' ? `Kanał ${index + 1}` : `Channel ${index + 1}`
}
