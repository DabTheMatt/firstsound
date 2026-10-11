import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { markerPanelState, setMarkerPanelOpen, subscribeMarkerPanel } from '../../audio/markers/panel'
import { nextMarkerName } from '../../audio/markers/markers'
import { waveNavCopy } from '../../a11y/waveform/copy'
import { useDetectedLandmarks } from '../../a11y/waveform/useLandmarks'
import { announce } from '../../a11y/liveRegion'
import { patchAttentionSignals } from '../../a11y/attention/signals'
import { TimeField } from '../../edit/dragFree/TimeField'
import { formatEditTime, parseEditTime, speakEditTime } from '../../edit/dragFree/timeEntry'
import type { EditError } from '../../edit/dragFree/edits'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './MarkerPanel.module.css'

type Mode = 'simple' | 'technical' | 'sensory'

type Props = {
  mode: Mode
  onCommit: () => void
}

export function MarkerPanel({ mode, onCommit }: Props) {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const panel = useSyncExternalStore(subscribeMarkerPanel, markerPanelState, markerPanelState)
  const titleId = useId()
  const panelId = useId()
  const hintId = useId()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeDraft, setTimeDraft] = useState('00:00.000')
  const [addDraft, setAddDraft] = useState('00:00.000')
  const [error, setError] = useState<string | null>(null)
  const [describedId, setDescribedId] = useState<string | null>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const editingRef = useRef<string | null>(null)
  const [appliedEdit, setAppliedEdit] = useState<string | null>(null)
  const technical = mode === 'technical'
  const analysis = useDetectedLandmarks(technical && panel.open && suggestionsOpen && snap.sampleLoaded)
  const loaded = snap.sampleLoaded && snap.duration > 0
  const copy = waveNavCopy(locale)

  if (panel.open && panel.editId && panel.editId !== appliedEdit) {
    const marker = snap.userMarkers.find((item) => item.id === panel.editId)
    setAppliedEdit(panel.editId)
    if (marker) {
      setEditingId(marker.id)
      setName(marker.name)
      setDescription(marker.description ?? '')
      setTimeDraft(formatEditTime(marker.timeSeconds))
      setError(null)
    }
  } else if (!panel.editId && appliedEdit) {
    setAppliedEdit(null)
  }

  useEffect(() => {
    if (!panel.open) return
    const frame = window.requestAnimationFrame(() => {
      if (panel.editId) {
        nameRef.current?.focus()
        nameRef.current?.select()
        return
      }
      closeRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [panel.focusToken, panel.open, panel.editId])

  useEffect(() => {
    editingRef.current = editingId
  }, [editingId])

  useEffect(() => {
    patchAttentionSignals({ markerEditing: Boolean(panel.open && editingId) })
    return () => patchAttentionSignals({ markerEditing: false })
  }, [panel.open, editingId])

  useEffect(() => {
    if (!panel.open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      event.preventDefault()
      if (editingRef.current) {
        editingRef.current = null
        setEditingId(null)
        setError(null)
        closeRef.current?.focus()
        return
      }
      setEditingId(null)
      setError(null)
      setMarkerPanelOpen(false)
      toggleRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel.open])

  const explain = (kind: EditError | 'name') => {
    const message =
      kind === 'name'
        ? t.markers.needName
        : kind === 'missing'
          ? t.markers.needAudio
          : kind === 'negative'
            ? t.dragFree.errNegative
            : kind === 'past'
              ? t.dragFree.errPast
              : t.dragFree.errFormat
    setError(message)
    announce(message)
  }

  const close = () => {
    setEditingId(null)
    setError(null)
    setMarkerPanelOpen(false)
    toggleRef.current?.focus()
  }

  const beginEdit = (id: string) => {
    const marker = engine.getSnapshot().userMarkers.find((item) => item.id === id)
    if (!marker) return
    engine.selectUserMarker(id)
    setEditingId(id)
    setName(marker.name)
    setDescription(marker.description ?? '')
    setTimeDraft(formatEditTime(marker.timeSeconds))
    setError(null)
    window.requestAnimationFrame(() => {
      nameRef.current?.focus()
      nameRef.current?.select()
    })
  }

  const add = () => {
    if (!loaded) {
      explain('missing')
      return
    }
    const parsed = parseEditTime(addDraft)
    if (!parsed.ok) {
      explain(parsed.error)
      return
    }
    const markerName = nextMarkerName(engine.getSnapshot().userMarkers, t.markers.defaultName)
    const result = engine.addUserMarker(parsed.seconds, markerName)
    if (!result.ok) {
      explain(result.error)
      return
    }
    onCommit()
    setError(null)
    announce(t.markers.added(markerName, speakEditTime(parsed.seconds, locale)))
    beginEdit(result.id)
  }

  const save = () => {
    if (!editingId) return
    const before = engine.getSnapshot().userMarkers.find((item) => item.id === editingId)
    if (!before) return
    const parsed = parseEditTime(timeDraft)
    if (!parsed.ok) {
      explain(parsed.error)
      return
    }
    const result = engine.updateUserMarker(editingId, {
      name,
      description,
      timeSeconds: parsed.seconds,
    })
    if (!result.ok) {
      explain(result.error)
      return
    }
    onCommit()
    const after = engine.getSnapshot().userMarkers.find((item) => item.id === editingId)
    setError(null)
    setEditingId(null)
    if (!after) return
    if (after.name !== before.name) announce(t.markers.renamed(after.name))
    else if ((after.description ?? '') !== (before.description ?? '')) announce(t.markers.described(after.name))
    else announce(t.markers.retimed(after.name, speakEditTime(after.timeSeconds, locale)))
  }

  const remove = (id: string) => {
    const marker = engine.getSnapshot().userMarkers.find((item) => item.id === id)
    if (!marker || !engine.deleteUserMarker(id)) return
    onCommit()
    if (editingId === id) setEditingId(null)
    if (describedId === id) setDescribedId(null)
    setError(null)
    closeRef.current?.focus()
    announce(t.markers.deleted(marker.name))
  }

  const go = (id: string) => {
    const marker = engine.goToUserMarker(id)
    if (!marker) return
    announce(t.markers.pointLabel(marker.name, speakEditTime(marker.timeSeconds, locale)))
  }

  const step = (direction: -1 | 1) => {
    const marker = engine.goToNeighborMarker(direction)
    if (!marker) {
      announce(t.markers.none)
      return
    }
    const phrase = direction < 0 ? t.markers.previous : t.markers.next
    announce(phrase(marker.name, speakEditTime(marker.timeSeconds, locale)))
  }

  const draftSpoken = (draft: string) => {
    const parsed = parseEditTime(draft)
    return parsed.ok ? speakEditTime(parsed.seconds, locale) : t.markers.time
  }

  const saveDetected = (time: number, label: string) => {
    const result = engine.addUserMarker(time, label)
    if (!result.ok) {
      explain(result.error)
      return
    }
    onCommit()
    announce(t.markers.savedDetected(label, speakEditTime(time, locale)))
    beginEdit(result.id)
  }

  return (
    <section
      className={mode === 'sensory' ? `${styles.wrap} ${styles.sensoryEntry}` : styles.wrap}
      data-marker-panel=""
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !panel.open) return
        event.preventDefault()
        event.stopPropagation()
        if (editingRef.current) {
          editingRef.current = null
          setEditingId(null)
          setError(null)
          closeRef.current?.focus()
          return
        }
        close()
      }}
    >
      <h2 id={titleId} className="sr-only">
        {t.markers.list}
      </h2>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={panel.open}
        aria-controls={panelId}
        onClick={() => {
          if (panel.open) close()
          else {
            setAddDraft(formatEditTime(engine.getSourcePlayheadSeconds()))
            setMarkerPanelOpen(true)
          }
        }}
      >
        {panel.open ? t.markers.close : t.markers.open}
      </button>
      {panel.open ? (
        <div className={styles.panel} id={panelId} data-marker-sheet="">
          <button ref={closeRef} type="button" className={styles.button} onClick={close}>
            {t.markers.close}
          </button>
          <p id={hintId} className={styles.note}>
            {loaded ? t.markers.list : t.markers.needAudio}
          </p>
          <div className={styles.row}>
            <TimeField
              label={t.markers.time}
              spoken={t.markers.time}
              value={addDraft}
              disabled={!loaded}
              onChange={setAddDraft}
              onEnter={add}
            />
            <button type="button" className={styles.button} disabled={!loaded} aria-describedby={hintId} onClick={add}>
              {t.markers.add}
            </button>
            <button type="button" className={styles.button} disabled={!loaded || snap.userMarkers.length === 0} onClick={() => step(-1)}>
              {t.markers.previousAction}
            </button>
            <button type="button" className={styles.button} disabled={!loaded || snap.userMarkers.length === 0} onClick={() => step(1)}>
              {t.markers.nextAction}
            </button>
          </div>
          <ul className={styles.list} aria-label={t.markers.list}>
            {snap.userMarkers.length === 0 ? <li className={styles.note}>{t.markers.empty}</li> : null}
            {snap.userMarkers.map((marker) => {
              const selected = marker.id === snap.selectedMarkerId
              const spoken = speakEditTime(marker.timeSeconds, locale)
              return (
                <li key={marker.id} className={selected ? styles.selected : undefined} data-marker-selected={selected ? 'true' : undefined}>
                  <p className={styles.identity}>
                    <span className={styles.name}>{marker.name}</span>
                    <span className={styles.time}>{formatEditTime(marker.timeSeconds)}</span>
                    <span className="sr-only">{t.markers.pointLabel(marker.name, spoken)}</span>
                  </p>
                  <div className={styles.row}>
                    <button type="button" className={styles.button} aria-label={t.markers.goTo(marker.name)} onClick={() => go(marker.id)}>
                      {t.markers.go}
                    </button>
                    <button type="button" className={styles.button} aria-label={t.markers.editNamed(marker.name)} onClick={() => beginEdit(marker.id)}>
                      {t.markers.edit}
                    </button>
                    <button type="button" className={styles.button} aria-label={t.markers.deleteNamed(marker.name)} onClick={() => remove(marker.id)}>
                      {t.markers.remove}
                    </button>
                    {marker.description ? (
                      <button
                        type="button"
                        className={styles.button}
                        aria-expanded={describedId === marker.id}
                        onClick={() => setDescribedId((current) => (current === marker.id ? null : marker.id))}
                      >
                        {describedId === marker.id ? t.markers.hideDescription : t.markers.showDescription}
                      </button>
                    ) : null}
                  </div>
                  {marker.description && describedId === marker.id ? <p className={styles.note}>{marker.description}</p> : null}
                </li>
              )
            })}
          </ul>
          {editingId ? (
            <form
              className={styles.editor}
              data-marker-editor=""
              onSubmit={(event) => {
                event.preventDefault()
                save()
              }}
            >
              <label className={styles.field}>
                {t.markers.name}
                <input
                  ref={nameRef}
                  className={styles.input}
                  data-marker-name=""
                  value={name}
                  aria-label={t.markers.name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                {t.markers.description}
                <textarea
                  className={styles.input}
                  data-marker-description=""
                  value={description}
                  rows={2}
                  aria-label={t.markers.description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div data-marker-time="">
                <TimeField
                  label={t.markers.time}
                  spoken={`${t.markers.time}, ${draftSpoken(timeDraft)}`}
                  value={timeDraft}
                  onChange={setTimeDraft}
                  onEnter={save}
                />
              </div>
              <div className={styles.row}>
                <button type="submit" className={styles.button}>
                  {t.markers.save}
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    setEditingId(null)
                    setError(null)
                  }}
                >
                  {t.markers.cancel}
                </button>
              </div>
            </form>
          ) : null}
          {technical ? (
            <div className={styles.suggestions}>
              <button
                type="button"
                className={styles.button}
                aria-expanded={suggestionsOpen}
                disabled={!loaded}
                onClick={() => setSuggestionsOpen((open) => !open)}
              >
                {t.markers.suggestions}
              </button>
              {suggestionsOpen ? (
                <>
                  <p className={styles.note}>{t.markers.suggestionsHelp}</p>
                  {analysis.status === 'running' ? <p className={styles.note}>{t.markers.analysing}</p> : null}
                  <ul className={styles.list}>
                    {analysis.marks.length === 0 && analysis.status !== 'running' ? <li className={styles.note}>{t.markers.noSuggestions}</li> : null}
                    {analysis.marks.map((mark, index) => {
                      const label = copy.labels[mark.type]
                      return (
                        <li key={`${mark.type}:${index}:${mark.time.toFixed(3)}`}>
                          <p className={styles.identity}>
                            <span>{label}</span>
                            <span className={styles.time}>{formatEditTime(mark.time)}</span>
                          </p>
                          <button
                            type="button"
                            className={styles.button}
                            onClick={() => saveDetected(mark.time, label)}
                          >
                            {t.markers.saveDetected}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
