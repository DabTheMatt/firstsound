import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { markerPanelState, markerTrigger, registerMarkerTrigger, setMarkerPanelOpen, subscribeMarkerPanel } from '../../audio/markers/panel'
import { setMarkerPreview } from '../../audio/markers/preview'
import { TRACK_COLOR_IDS, trackColorVar, type TrackColorId } from '../../audio/mix/tracks'
import { nextMarkerName } from '../../audio/markers/markers'
import { readLandmarkCache, recordingKey } from '../../a11y/waveform/cache'
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
type FocusField = 'name' | 'time' | 'description'
type Place = { kind: 'anchor'; top: number; left: number } | { kind: 'sheet' }

const SUGGESTION_PAGE = 12

type Props = {
  mode: Mode
  onCommit: () => void
}

function cachedSuggestionCount(): number | null {
  const snap = engine.getSnapshot()
  if (!snap.sampleLoaded || !(snap.duration > 0)) return null
  const frames = engine.audibleChannel(0)?.length ?? 0
  if (frames < 1) return null
  const marks = readLandmarkCache(
    recordingKey({
      revision: snap.bufferRev,
      sampleRate: snap.sampleRate,
      frames,
      channels: snap.channelCount,
    }),
  )
  return marks ? marks.length : null
}

function measurePlace(): Place {
  const anchor = markerTrigger()?.getBoundingClientRect()
  if (window.innerWidth <= 720) return { kind: 'sheet' }
  const width = Math.min(320, window.innerWidth - 16)
  if (!anchor) return { kind: 'anchor', top: 56, left: Math.max(8, window.innerWidth - width - 8) }
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
  const below = anchor.bottom + 6
  const top = below + 220 > window.innerHeight - 72 ? Math.max(8, anchor.top - 6 - 360) : below
  return { kind: 'anchor', top, left }
}

export function MarkerTrigger() {
  const { t } = useI18n()
  const snap = useEngine()
  const panel = useSyncExternalStore(subscribeMarkerPanel, markerPanelState, markerPanelState)
  const ref = useRef<HTMLButtonElement | null>(null)
  const count = snap.userMarkers.length

  useEffect(() => {
    const node = ref.current
    registerMarkerTrigger(node)
    return () => {
      if (markerTrigger() === node) registerMarkerTrigger(null)
    }
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      className={styles.trigger}
      data-marker-trigger=""
      aria-expanded={panel.open}
      aria-haspopup="true"
      aria-controls="field-marker-popover"
      aria-label={t.markers.openCount(count)}
      onClick={() => {
        if (panel.open) {
          setMarkerPanelOpen(false)
          return
        }
        setMarkerPanelOpen(true)
      }}
    >
      <span className={styles.gem} aria-hidden="true" />
      <span>{t.markers.list}</span>
      <span className={styles.count}>{count}</span>
    </button>
  )
}

export function MarkerHost({ mode, onCommit }: Props) {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const panel = useSyncExternalStore(subscribeMarkerPanel, markerPanelState, markerPanelState)
  const titleId = useId()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<FocusField>('name')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeDraft, setTimeDraft] = useState('00:00.000')
  const [error, setError] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionLimit, setSuggestionLimit] = useState(SUGGESTION_PAGE)
  const [appliedToken, setAppliedToken] = useState(0)
  const [colorDraft, setColorDraft] = useState<TrackColorId | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const timeRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const editingRef = useRef<string | null>(null)
  const menuRef = useRef<string | null>(null)
  const technical = mode === 'technical'
  const loaded = snap.sampleLoaded && snap.duration > 0
  const analysis = useDetectedLandmarks(technical && panel.open && suggestionsOpen && loaded)
  const copy = waveNavCopy(locale)
  const ssr = typeof document === 'undefined'

  if (panel.open && panel.editId && panel.focusToken !== appliedToken) {
    const marker = snap.userMarkers.find((item) => item.id === panel.editId)
    setAppliedToken(panel.focusToken)
    if (marker) {
      setEditingId(marker.id)
      setName(marker.name)
      setDescription(marker.description ?? '')
      setTimeDraft(formatEditTime(marker.timeSeconds))
      setColorDraft(marker.color ?? null)
      setFocusField('name')
      setError(null)
    }
  }

  if (!panel.open && (editingId || menuId || error || suggestionsOpen)) {
    setEditingId(null)
    setMenuId(null)
    setError(null)
    setSuggestionsOpen(false)
  }

  useEffect(() => {
    if (!panel.open || !suggestionsOpen) setMarkerPreview(null)
  }, [panel.open, suggestionsOpen])

  useEffect(() => {
    editingRef.current = editingId
  }, [editingId])

  useEffect(() => {
    menuRef.current = menuId
  }, [menuId])

  useLayoutEffect(() => {
    if (!panel.open || ssr) return
    const placeNow = () => setPlace(measurePlace())
    placeNow()
    window.addEventListener('resize', placeNow)
    window.addEventListener('scroll', placeNow, true)
    return () => {
      window.removeEventListener('resize', placeNow)
      window.removeEventListener('scroll', placeNow, true)
    }
  }, [panel.open, panel.focusToken, ssr])

  useEffect(() => {
    patchAttentionSignals({ markerEditing: Boolean(panel.open && editingId) })
    return () => patchAttentionSignals({ markerEditing: false })
  }, [panel.open, editingId])

  useEffect(() => {
    if (!panel.open) return
    const frame = window.requestAnimationFrame(() => {
      if (editingRef.current) {
        const field = focusField === 'description' ? descriptionRef.current : focusField === 'time' ? timeRef.current : nameRef.current
        field?.focus()
        if (field instanceof HTMLInputElement) field.select()
        return
      }
      ;(addRef.current ?? closeRef.current)?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [panel.focusToken, panel.open, focusField])

  useEffect(() => {
    if (!panel.open || ssr) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node) return
      if (popoverRef.current?.contains(node) || markerTrigger()?.contains(node)) return
      setMarkerPanelOpen(false)
      markerTrigger()?.focus()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      if (popoverRef.current?.contains(event.target as Node)) return
      event.preventDefault()
      setMarkerPanelOpen(false)
      markerTrigger()?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [panel.open, ssr])

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
    setMenuId(null)
    setError(null)
    setMarkerPanelOpen(false)
    markerTrigger()?.focus()
  }

  const beginEdit = (id: string, field: FocusField) => {
    const marker = engine.getSnapshot().userMarkers.find((item) => item.id === id)
    if (!marker) return
    engine.selectUserMarker(id)
    setMenuId(null)
    setEditingId(id)
    setFocusField(field)
    setName(marker.name)
    setDescription(marker.description ?? '')
    setTimeDraft(formatEditTime(marker.timeSeconds))
    setColorDraft(marker.color ?? null)
    setError(null)
    window.requestAnimationFrame(() => {
      const fieldNode = field === 'description' ? descriptionRef.current : field === 'time' ? timeRef.current : nameRef.current
      fieldNode?.focus()
      if (fieldNode instanceof HTMLInputElement) fieldNode.select()
    })
  }

  const add = () => {
    if (!loaded) {
      explain('missing')
      return
    }
    const markerName = nextMarkerName(engine.getSnapshot().userMarkers, t.markers.defaultName)
    const result = engine.addUserMarker(engine.getSourcePlayheadSeconds(), markerName)
    if (!result.ok) {
      explain(result.error)
      return
    }
    onCommit()
    setError(null)
    const marker = engine.getSnapshot().userMarkers.find((item) => item.id === result.id)
    announce(t.markers.added(marker?.name ?? markerName, speakEditTime(marker?.timeSeconds ?? 0, locale)))
    beginEdit(result.id, 'name')
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
      color: colorDraft,
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
    else if ((after.color ?? '') !== (before.color ?? '')) announce(t.markers.recolored(after.name, after.color ? t.markers.colors[after.color] : t.markers.color))
    else announce(t.markers.retimed(after.name, speakEditTime(after.timeSeconds, locale)))
  }

  const remove = (id: string) => {
    const marker = engine.getSnapshot().userMarkers.find((item) => item.id === id)
    if (!marker || !engine.deleteUserMarker(id)) return
    onCommit()
    if (editingId === id) setEditingId(null)
    setMenuId(null)
    setError(null)
    announce(t.markers.deleted(marker.name))
    closeRef.current?.focus()
  }

  const go = (id: string) => {
    const marker = engine.goToUserMarker(id)
    if (!marker) return
    setMenuId(null)
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

  const saveDetected = (time: number, label: string) => {
    const result = engine.addUserMarker(time, label)
    if (!result.ok) {
      explain(result.error)
      return
    }
    onCommit()
    announce(t.markers.savedDetected(label, speakEditTime(time, locale)))
    beginEdit(result.id, 'name')
  }

  const onPopoverKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    if (menuRef.current) {
      menuRef.current = null
      setMenuId(null)
      return
    }
    if (editingRef.current) {
      editingRef.current = null
      setEditingId(null)
      setError(null)
      closeRef.current?.focus()
      return
    }
    close()
  }

  if (!panel.open) return null

  const cachedCount = technical ? cachedSuggestionCount() : null
  const suggestionLabel =
    suggestionsOpen && analysis.status === 'ready'
      ? t.markers.suggestionsCount(analysis.marks.length)
      : cachedCount != null
        ? t.markers.suggestionsCount(cachedCount)
        : t.markers.suggestions
  const visibleSuggestions = analysis.marks.slice(0, suggestionLimit)
  const shown = ssr || place != null

  const popover = shown ? (
    <div
      ref={popoverRef}
      id="field-marker-popover"
      className={place?.kind === 'sheet' || ssr ? `${styles.popover} ${styles.sheet}` : styles.popover}
      style={place?.kind === 'anchor' ? { top: place.top, left: place.left } : undefined}
      role="region"
      aria-labelledby={titleId}
      data-marker-panel=""
      data-marker-popover=""
      data-marker-presentation={place?.kind === 'anchor' ? 'anchor' : 'sheet'}
      onKeyDown={onPopoverKey}
    >
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {t.markers.list}
        </h2>
        <button ref={addRef} type="button" className={styles.icon} data-marker-add="" data-explain="markers.user" aria-label={t.markers.addMarker} disabled={!loaded} onClick={add}>
          +
        </button>
        <button ref={closeRef} type="button" className={styles.icon} aria-label={t.markers.close} onClick={close}>
          ×
        </button>
      </div>
      <div className={styles.body}>
        {!loaded ? <p className={styles.note}>{t.markers.needAudio}</p> : null}
        {loaded && snap.userMarkers.length === 0 && !editingId ? (
          <div>
            <p className={styles.empty}>{t.markers.empty}</p>
            <p className={styles.note}>{t.markers.emptyHint}</p>
          </div>
        ) : null}
        {editingId ? (
          <form
            className={styles.editor}
            data-marker-editor=""
            data-explain="markers.edit"
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
            <div data-marker-time="">
              <TimeField
                label={t.markers.time}
                spoken={t.markers.time}
                value={timeDraft}
                inputRef={(node) => {
                  timeRef.current = node
                }}
                onChange={setTimeDraft}
                onEnter={save}
              />
            </div>
            <label className={styles.field}>
              {t.markers.description}
              <textarea
                ref={descriptionRef}
                className={styles.input}
                data-marker-description=""
                value={description}
                rows={2}
                aria-label={t.markers.description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <fieldset className={styles.colors}>
              <legend>{t.markers.color}</legend>
              <div className={styles.swatches} role="listbox" aria-label={t.markers.color}>
                {TRACK_COLOR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    className={styles.swatch}
                    aria-selected={colorDraft === id}
                    aria-label={t.markers.colors[id]}
                    style={{ background: trackColorVar(id) }}
                    onClick={() => setColorDraft(id)}
                  />
                ))}
              </div>
            </fieldset>
            <div className={styles.editorActions}>
              <button type="button" className={styles.text} onClick={() => { setEditingId(null); setError(null) }}>
                {t.markers.cancel}
              </button>
              <button type="submit" className={styles.text}>
                {t.markers.save}
              </button>
            </div>
          </form>
        ) : null}
        <ul className={styles.list}>
          {snap.userMarkers.map((marker) => {
            const selected = marker.id === snap.selectedMarkerId
            const spoken = speakEditTime(marker.timeSeconds, locale)
            const menuOpen = menuId === marker.id
            return (
              <li key={marker.id} className={styles.item} data-marker-selected={selected ? 'true' : undefined}>
                <button
                  type="button"
                  className={styles.row}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={t.markers.pointLabel(marker.name, spoken)}
                  data-explain="markers.navigate"
                  onClick={() => go(marker.id)}
                  onDoubleClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    beginEdit(marker.id, 'name')
                  }}
                >
                  <span
                    className={styles.gem}
                    aria-hidden="true"
                    style={marker.color ? { color: trackColorVar(marker.color), borderColor: trackColorVar(marker.color) } : undefined}
                  />
                  <span className={styles.time}>{formatEditTime(marker.timeSeconds)}</span>
                  <span className={styles.name}>{marker.name}</span>
                </button>
                <button
                  type="button"
                  className={styles.more}
                  aria-label={t.markers.actions(marker.name)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuId((current) => (current === marker.id ? null : marker.id))}
                >
                  ···
                </button>
                {menuOpen ? (
                  <div className={styles.menu} role="menu" aria-label={t.markers.actions(marker.name)}>
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => go(marker.id)}>
                      {t.markers.go}
                    </button>
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => beginEdit(marker.id, 'name')}>
                      {t.markers.edit}
                    </button>
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => beginEdit(marker.id, 'time')}>
                      {t.markers.editTime}
                    </button>
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => beginEdit(marker.id, 'description')}>
                      {t.markers.editDescription}
                    </button>
                    <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => remove(marker.id)}>
                      {t.markers.remove}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        {technical ? (
          <div>
            <button
              type="button"
              className={styles.disclosure}
              data-explain="markers.detected"
              aria-expanded={suggestionsOpen}
              disabled={!loaded}
              onClick={() => {
                setSuggestionsOpen((open) => !open)
                setSuggestionLimit(SUGGESTION_PAGE)
              }}
            >
              <span>{suggestionLabel}</span>
              <span aria-hidden="true">{suggestionsOpen ? '–' : '+'}</span>
            </button>
            {suggestionsOpen ? (
              <>
                <p className={styles.note}>{t.markers.suggestionsHelp}</p>
                {analysis.status === 'running' ? <p className={styles.note}>{t.markers.analysing}</p> : null}
                <ul className={styles.suggestions}>
                  {analysis.marks.length === 0 && analysis.status !== 'running' ? <li className={styles.note}>{t.markers.noSuggestions}</li> : null}
                  {visibleSuggestions.map((mark, index) => {
                    const label = copy.labels[mark.type]
                    return (
                      <li
                        key={`${mark.type}:${index}:${mark.time.toFixed(3)}`}
                        className={styles.suggestRow}
                        onPointerEnter={() => setMarkerPreview({ timeSeconds: mark.time, name: label })}
                        onPointerLeave={() => setMarkerPreview(null)}
                      >
                        <span className={styles.time}>{formatEditTime(mark.time)}</span>
                        <span className={styles.name} title={label}>{label}</span>
                        <button type="button" className={`${styles.text} ${styles.suggestSave}`} data-explain="markers.save" onClick={() => saveDetected(mark.time, label)}>
                          {t.markers.saveDetected}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {analysis.marks.length > suggestionLimit ? (
                  <button type="button" className={styles.text} onClick={() => setSuggestionLimit((limit) => limit + SUGGESTION_PAGE)}>
                    {t.markers.moreSuggestions}
                  </button>
                ) : null}
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
      <div className={styles.nav}>
        <button type="button" aria-label={t.markers.previousAction} disabled={!loaded || snap.userMarkers.length === 0} onClick={() => step(-1)}>
          ‹ {t.markers.prevShort}
        </button>
        <button type="button" aria-label={t.markers.nextAction} disabled={!loaded || snap.userMarkers.length === 0} onClick={() => step(1)}>
          {t.markers.nextShort} ›
        </button>
      </div>
    </div>
  ) : null

  if (!popover) return null
  if (ssr) return popover
  return createPortal(popover, document.body)
}

export function MarkerPanel({ mode, onCommit }: Props) {
  return (
    <>
      <MarkerTrigger />
      <MarkerHost mode={mode} onCommit={onCommit} />
    </>
  )
}
