import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { announce } from '../a11y'
import type { FocusWorkspace } from '../app/phoneWorkspace'
import { PARAMS } from '../audio/parameters/definitions'
import { formatTimecode } from '../audio/engine/formatTime'
import { getEqBandSelection, subscribeEqBandSelection, type EqBandSelection } from '../audio/engine/eqBandSelection'
import { engine, useEngine } from '../hooks/useEngine'
import { dismissHearingAlert, getHearingAlerts, pushHearingAlert, subscribeHearingAlerts, type HearingAlert } from './alerts'
import { analyzePcm, type BufferAnalysis } from './analyze'
import { scopeLabel, transientMarkers } from './events'
import { eqReadout, affectedRegion, shiftSoundMap } from './eqAssist'
import {
  compressorCompare,
  delayCompare,
  eqCompare,
  gainCompare,
  reverbCompare,
  stereoCompare,
} from './compare'
import { emptyDescriptorMemory, localDescriptors, simpleSummary, updateDescriptors, type Descriptor } from './descriptors'
import { EarIcon } from './EarIcon'
import { HearingTagList } from './HearingTagList'
import { compressorPicture, delayPicture, paramRecord, reverbPicture, stereoAfterBalance, stereoAfterMidSide } from './effectViz'
import { fireHaptic, vibrationSupported, type HapticKind } from './haptics'
import { AfterEqChart } from './AfterEqChart'
import { EnterFocusButton } from '../components/focus/EnterFocusButton'
import { InfoTip } from './InfoTip'
import { SoundMap } from './SoundMap'
import { HeadSpace } from './HeadSpace'
import { SpaceField } from './SpaceField'
import { revealHearingSpan, showTransientOnWave } from './reveal'
import type { HearingBandId } from './bands'
import { getHearingView, subscribeHearingView, useHearingAnalysis, type HearingView } from './session'
import { useHearingSettings } from './useHearingSettings'
import { HEARING_SECTIONS, HAPTIC_INTENSITIES, PANEL_HEIGHT_MIN, PANEL_WIDTH_MIN, clampPanelSize, type HearingSection, type HapticIntensity } from './settings'
import { balanceLabel, nearestSpaceBucket } from './spaceLive'
import { useHeardSpace } from './useHeardSpace'
import { useReverbSpace } from './useImageDepth'
import { distanceWord, roomWord } from './reverbDepth'
import { voiceEstimate } from './voiceEstimate'
import styles from './HearingAccessLayer.module.css'

type Surface = 'simple' | 'technical' | 'sensory'

const SECTION_LABEL: Record<HearingSection, string> = {
  sound: 'Sound',
  events: 'Events',
  space: 'Space',
  dynamics: 'Dynamics',
  compare: 'Compare',
  haptics: 'Haptics',
}

function nextPanelSize(width: number): { panelWidth: number; panelHeight: number } {
  if (width >= 640) return clampPanelSize(420, 560)
  const availableW = typeof window === 'undefined' ? 760 : window.innerWidth - 48
  const availableH = typeof window === 'undefined' ? 820 : window.innerHeight - 96
  return clampPanelSize(Math.max(720, availableW), Math.max(760, availableH))
}

function nudgePanelSize(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  width: number,
  height: number,
  narrow: boolean,
  patch: (partial: { panelWidth: number; panelHeight: number }) => void,
): void {
  const step = event.shiftKey ? 48 : 24
  let nextWidth = width
  let nextHeight = height
  if (event.key === 'ArrowLeft') nextWidth += step
  else if (event.key === 'ArrowRight') nextWidth -= step
  else if (event.key === 'ArrowUp') nextHeight += step
  else if (event.key === 'ArrowDown') nextHeight -= step
  else return
  event.preventDefault()
  patch(clampPanelSize(narrow ? width : nextWidth, nextHeight))
}

function startPanelResize(
  event: ReactPointerEvent<HTMLButtonElement>,
  width: number,
  height: number,
  narrow: boolean,
  patch: (partial: { panelWidth: number; panelHeight: number }) => void,
): void {
  if (event.button !== 0) return
  event.preventDefault()
  const pointer = event.pointerId
  const startX = event.clientX
  const startY = event.clientY
  const section = event.currentTarget.parentElement
  const move = (pointerEvent: PointerEvent) => {
    if (pointerEvent.pointerId !== pointer) return
    const next = clampPanelSize(
      narrow ? width : width + (startX - pointerEvent.clientX),
      height + (startY - pointerEvent.clientY),
    )
    section?.style.setProperty('--hearing-panel-w', `${next.panelWidth}px`)
    section?.style.setProperty('--hearing-panel-h', `${next.panelHeight}px`)
  }
  const up = (pointerEvent: PointerEvent) => {
    if (pointerEvent.pointerId !== pointer) return
    patch(
      clampPanelSize(
        narrow ? width : width + (startX - pointerEvent.clientX),
        height + (startY - pointerEvent.clientY),
      ),
    )
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function balanceMeter(balance: number): string {
  const pos = Math.round(((balance + 1) / 2) * 10)
  const cells = Array.from({ length: 11 }, (_, index) => (index === pos ? '●' : '─'))
  return `L ${cells.join('')} R`
}

export function HearingAccessLayer({
  surface,
  focus = null,
  onEnterFocus,
}: {
  surface: Surface
  focus?: FocusWorkspace | null
  onEnterFocus?: () => void
}) {
  const { settings, patch } = useHearingSettings()
  const snap = useEngine()
  useHearingAnalysis(settings, snap)
  const hearing = useSyncHearing()
  const alerts = useSyncAlerts()
  const [eqPick, setEqPick] = useState<EqBandSelection | null>(() => getEqBandSelection())
  const [live, setLive] = useState<Descriptor[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [narrow, setNarrow] = useState(false)
  const [floatAt, setFloatAt] = useState<{ left: number; top: number } | null>(null)
  const [resizeAt, setResizeAt] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const memory = useRef(emptyDescriptorMemory())
  const edge = useRef({ recording: snap.recording, loop: snap.loop, blocked: snap.audioStatus === 'blocked', error: snap.recordError })
  const hapticsOk = vibrationSupported()
  const [pulseNote, setPulseNote] = useState<string | null>(null)

  useEffect(() => subscribeEqBandSelection(setEqPick), [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const apply = () => setNarrow(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!settings.enabled || !settings.monitorEnabled) {
      engine.setHearingMonitor(null)
      return
    }
    engine.setHearingMonitor({
      low: settings.monitorLow,
      mid: settings.monitorMid,
      high: settings.monitorHigh,
    })
    return () => engine.setHearingMonitor(null)
  }, [settings.enabled, settings.monitorEnabled, settings.monitorLow, settings.monitorMid, settings.monitorHigh])

  useEffect(() => {
    if (!settings.enabled || !settings.layers.descriptors || !hearing.analysis) return
    if (snap.playing && settings.panelOpen) return
    setLive(updateDescriptors(hearing.analysis, memory.current, performance.now()))
  }, [settings.enabled, settings.layers.descriptors, settings.panelOpen, hearing.analysis, snap.playing])

  useEffect(() => {
    if (!settings.enabled || !settings.panelOpen || !settings.layers.descriptors || !snap.playing) return
    const id = window.setInterval(() => {
      const left = engine.audibleChannel(0)
      if (!left) return
      const rate = snap.sampleRate > 0 ? snap.sampleRate : 44100
      const frames = Math.floor(0.4 * rate)
      const head = Math.floor(engine.getPlayheadSeconds() * rate)
      const start = Math.max(0, Math.min(left.length - 8, head - Math.floor(frames / 2)))
      const current = analyzePcm({
        left,
        right: engine.audibleChannel(1),
        sampleRate: rate,
        startFrame: start,
        endFrame: Math.min(left.length, start + frames),
        originSec: start / rate,
        scope: 'current',
      })
      setLive(updateDescriptors(current, memory.current, performance.now()))
    }, 500)
    return () => window.clearInterval(id)
  }, [settings.enabled, settings.panelOpen, settings.layers.descriptors, snap.playing, snap.sampleRate, snap.bufferRev])

  useEffect(() => {
    if (!settings.enabled || settings.hapticIntensity === 'off' || !hapticsOk || !snap.playing) return
    let lastPulse = -1e9
    let prev = engine.getPlayheadSeconds()
    let lastBand = ''
    const id = window.setInterval(() => {
      const head = engine.getPlayheadSeconds()
      const now = performance.now()
      const vibrate = (pattern: number | number[]) => navigator.vibrate(pattern)
      const viewNow = getHearingView()
      const hit = viewNow.events.find(
        (event) =>
          prev <= event.time &&
          head >= event.time &&
          (event.kind === 'transient' || event.kind === 'possibleClip' || event.kind === 'possibleClick' || event.kind === 'loud'),
      )
      const onset =
        !hit &&
        viewNow.analysis?.dynamics.some((bucket) => bucket.transient && prev <= bucket.time && head >= bucket.time)
      if (hit || onset) {
        const kind: HapticKind = hit?.kind === 'possibleClip' ? 'clip' : 'transient'
        const fired = fireHaptic(kind, settings.hapticIntensity, now, lastPulse, vibrate)
        if (fired.result.fired) lastPulse = fired.lastPulseMs
      }
      if (prev > head + 0.25) {
        const fired = fireHaptic('loop', settings.hapticIntensity, now, lastPulse, vibrate)
        if (fired.result.fired) lastPulse = fired.lastPulseMs
      }
      const start = snap.params.start
      const end = snap.params.end
      if ((prev < start && head >= start) || (prev < end && head >= end)) {
        const fired = fireHaptic('selection', settings.hapticIntensity, now, lastPulse, vibrate)
        if (fired.result.fired) lastPulse = fired.lastPulseMs
      }
      if (settings.frequencyHaptics) {
        const band = getHearingView().analysis?.dominantBand
        if (band && band !== lastBand) {
          const fired = fireHaptic('frequency', settings.hapticIntensity, now, lastPulse, vibrate, band)
          if (fired.result.fired) {
            lastPulse = fired.lastPulseMs
            lastBand = band
          }
        }
      }
      prev = head
    }, 80)
    return () => window.clearInterval(id)
  }, [
    settings.enabled,
    settings.hapticIntensity,
    settings.frequencyHaptics,
    hapticsOk,
    snap.playing,
    snap.params.start,
    snap.params.end,
  ])

  useEffect(() => {
    if (!settings.enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settings.panelOpen) patch({ panelOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings.enabled, settings.panelOpen, patch])

  useEffect(() => {
    if (!settings.enabled) return
    const recording = snap.recording
    const loop = snap.loop
    const blocked = snap.audioStatus === 'blocked'
    const previous = edge.current
    if (recording !== previous.recording) {
      pushHearingAlert({
        id: 'record',
        title: recording ? 'RECORDING' : 'RECORDING STOPPED',
        detail: recording ? 'Capture is running.' : 'Capture stopped.',
        tone: 'info',
      })
      announce(recording ? 'Recording started' : 'Recording stopped')
    }
    if (loop !== previous.loop) {
      pushHearingAlert({
        id: 'loop',
        title: loop ? 'LOOP ON' : 'LOOP OFF',
        detail: 'Transport loop state.',
        tone: 'info',
      })
    }
    if (blocked && !previous.blocked) {
      pushHearingAlert({ id: 'audio', title: 'AUDIO BLOCKED', detail: 'The browser has not started audio.', tone: 'warn' })
    }
    if (snap.recordError && snap.recordError !== previous.error) {
      pushHearingAlert({ id: 'error', title: 'WARNING', detail: snap.recordError, tone: 'warn' })
    }
    edge.current = { recording, loop, blocked, error: snap.recordError }
  }, [settings.enabled, snap.recording, snap.loop, snap.audioStatus, snap.recordError])

  useEffect(() => {
    if (!settings.enabled || !hearing.analysis?.clipped) return
    pushHearingAlert({
      id: `clip-${snap.bufferRev}`,
      title: 'POSSIBLE CLIPPING',
      detail: hearing.analysis.peakDbfs === null ? 'Full-scale samples.' : `Peak ${hearing.analysis.peakDbfs.toFixed(1)} dBFS`,
      tone: 'warn',
    })
  }, [settings.enabled, hearing.analysis?.clipped, hearing.analysis?.peakDbfs, snap.bufferRev])

  const armedBand = selectedBand(snap, eqPick)
  const confirmKey = `${snap.params.gain}|${snap.params.pan}|${snap.params.delayTime}|${snap.params.delayTimeR}|${armedBand?.frequency ?? ''}|${armedBand?.gain ?? ''}|${armedBand?.q ?? ''}`
  const confirmReady = useRef(false)
  useEffect(() => {
    if (!settings.enabled) {
      confirmReady.current = false
      return
    }
    if (!confirmReady.current) {
      confirmReady.current = true
      return
    }
    const current = engine.getSnapshot()
    const active = selectedBand(current, getEqBandSelection())
    const text = active
      ? `EQ ${active.frequency.toFixed(0)} Hz · ${active.gain.toFixed(1)} dB · Q ${active.q.toFixed(2)}`
      : `GAIN ${current.params.gain.toFixed(1)} dB`
    const handle = window.setTimeout(() => setNote(text), 700)
    const clear = window.setTimeout(() => setNote(null), 4200)
    return () => {
      window.clearTimeout(handle)
      window.clearTimeout(clear)
    }
  }, [settings.enabled, confirmKey])

  const analysis = hearing.analysis
  const summary = analysis ? simpleSummary(analysis) : null
  const voice = analysis && settings.layers.voiceEstimate ? voiceEstimate(analysis) : null
  const eq = useMemo(() => selectedEq(snap, eqPick), [snap, eqPick])

  if (!settings.enabled) return null

  const showDetails = surface !== 'simple' || settings.simpleDetails
  const dockedPoint =
    settings.panelLeft !== null && settings.panelTop !== null ? { left: settings.panelLeft, top: settings.panelTop } : null
  const floating = narrow ? null : (floatAt ?? dockedPoint)

  const onHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (narrow || event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest('button')) return
    event.preventDefault()
    const section = event.currentTarget.parentElement
    if (!section) return
    const rect = section.getBoundingClientRect()
    const originX = event.clientX
    const originY = event.clientY
    const originLeft = rect.left
    const originTop = rect.top
    const pointer = event.pointerId
    const place = (clientX: number, clientY: number) => {
      const maxL = Math.max(0, window.innerWidth - 120)
      const maxT = Math.max(0, window.innerHeight - 64)
      return {
        left: Math.round(Math.min(maxL, Math.max(0, originLeft + clientX - originX))),
        top: Math.round(Math.min(maxT, Math.max(0, originTop + clientY - originY))),
      }
    }
    setFloatAt(place(event.clientX, event.clientY))
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointer) return
      setFloatAt(place(pointerEvent.clientX, pointerEvent.clientY))
    }
    const up = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointer) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const next = place(pointerEvent.clientX, pointerEvent.clientY)
      patch({ panelLeft: next.left, panelTop: next.top })
      setFloatAt(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const nudgeCorner = (event: ReactKeyboardEvent<HTMLButtonElement>, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    const step = event.shiftKey ? 48 : 24
    let dw = 0
    let dh = 0
    if (event.key === 'ArrowLeft') dw = corner.endsWith('w') ? step : -step
    else if (event.key === 'ArrowRight') dw = corner.endsWith('e') ? step : -step
    else if (event.key === 'ArrowUp') dh = corner.startsWith('n') ? step : -step
    else if (event.key === 'ArrowDown') dh = corner.startsWith('s') ? step : -step
    else return
    event.preventDefault()
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    const size = clampPanelSize(settings.panelWidth + dw, settings.panelHeight + dh)
    const anchorX = corner.endsWith('w') ? (rect?.right ?? size.panelWidth) : (rect?.left ?? 0)
    const anchorY = corner.startsWith('n') ? (rect?.bottom ?? size.panelHeight) : (rect?.top ?? 0)
    const maxL = Math.max(0, window.innerWidth - 80)
    const maxT = Math.max(0, window.innerHeight - 48)
    const left = Math.round(Math.min(maxL, Math.max(0, corner.endsWith('w') ? anchorX - size.panelWidth : anchorX)))
    const top = Math.round(Math.min(maxT, Math.max(0, corner.startsWith('n') ? anchorY - size.panelHeight : anchorY)))
    patch({ panelLeft: left, panelTop: top, panelWidth: size.panelWidth, panelHeight: size.panelHeight })
  }

  const startCornerResize = (event: ReactPointerEvent<HTMLButtonElement>, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const section = event.currentTarget.parentElement
    if (!section) return
    const rect = section.getBoundingClientRect()
    const anchorX = corner.endsWith('w') ? rect.right : rect.left
    const anchorY = corner.startsWith('n') ? rect.bottom : rect.top
    const pointer = event.pointerId
    const place = (clientX: number, clientY: number) => {
      const movingLeft = corner.endsWith('w')
      const movingTop = corner.startsWith('n')
      const size = clampPanelSize(Math.abs(clientX - anchorX), Math.abs(clientY - anchorY))
      const width = Math.max(PANEL_WIDTH_MIN, size.panelWidth)
      const height = Math.max(PANEL_HEIGHT_MIN, size.panelHeight)
      const maxL = Math.max(0, window.innerWidth - 80)
      const maxT = Math.max(0, window.innerHeight - 48)
      const left = Math.round(Math.min(maxL, Math.max(0, movingLeft ? anchorX - width : anchorX)))
      const top = Math.round(Math.min(maxT, Math.max(0, movingTop ? anchorY - height : anchorY)))
      return { left, top, width, height }
    }
    setResizeAt(place(event.clientX, event.clientY))
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointer) return
      setResizeAt(place(pointerEvent.clientX, pointerEvent.clientY))
    }
    const up = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointer) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const next = place(pointerEvent.clientX, pointerEvent.clientY)
      patch({ panelLeft: next.left, panelTop: next.top, panelWidth: next.width, panelHeight: next.height })
      setResizeAt(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const focusText = focusLine(focus, analysis, eq, snap)

  return (
    <div className={focus ? `${styles.host} ${styles.hostFocus} ${styles.palette}` : `${styles.host} ${styles.palette}`} data-surface={surface}>
      {focusText && focus !== 'hearing' && focus !== 'eq' ? (
        <p className={styles.focusChip} title={focusText}>
          {focusText}
        </p>
      ) : null}
      <div className={styles.alerts} aria-live="polite">
        {alerts.map((alert) => (
          <button key={alert.id} type="button" className={alert.tone === 'warn' ? styles.warn : styles.badge} onClick={() => dismissHearingAlert(alert.id)}>
            <strong>{alert.title}</strong>
            <span>{alert.detail}</span>
          </button>
        ))}
      </div>
      {narrow && focus !== 'hearing' ? (
        <button
          type="button"
          className={styles.launcher}
          aria-pressed={settings.panelOpen}
          aria-label="Hearing Access"
          title="Hearing Access"
          onClick={() => patch({ panelOpen: !settings.panelOpen })}
        >
          <EarIcon />
        </button>
      ) : null}
      {settings.panelOpen ? (
        <section
          className={narrow ? styles.sheet : styles.panel}
          role="dialog"
          aria-label="Hearing Access panel"
          style={{
            ['--hearing-panel-w' as string]: `${resizeAt?.width ?? settings.panelWidth}px`,
            ['--hearing-panel-h' as string]: `${resizeAt?.height ?? settings.panelHeight}px`,
            ...(resizeAt
              ? { position: 'fixed', left: resizeAt.left, top: resizeAt.top, right: 'auto', bottom: 'auto', zIndex: 41 }
              : floating
                ? { position: 'fixed', left: floating.left, top: floating.top, right: 'auto', bottom: 'auto', zIndex: 41 }
                : {}),
          }}
        >
          {narrow ? (
            <button
              type="button"
              className={styles.grip}
              aria-label="Resize panel height"
              onPointerDown={(event) => startPanelResize(event, settings.panelWidth, settings.panelHeight, narrow, patch)}
              onKeyDown={(event) => nudgePanelSize(event, settings.panelWidth, settings.panelHeight, narrow, patch)}
            />
          ) : (
            (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
              <button
                key={corner}
                type="button"
                className={styles.corner}
                data-corner={corner}
                aria-label={`Resize from the ${corner} corner`}
                title="Drag to resize"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  startCornerResize(event, corner)
                }}
                onKeyDown={(event) => nudgeCorner(event, corner)}
              />
            ))
          )}
          <header
            className={narrow ? styles.head : `${styles.head} ${styles.movable}`}
            title={narrow ? undefined : 'Drag to move this panel. Dock returns it to the corner.'}
            onPointerDown={onHeaderPointerDown}
          >
            <h2>Hearing Access</h2>
            <div className={styles.tools}>
              {dockedPoint && !narrow ? (
                <button type="button" onClick={() => patch({ panelLeft: null, panelTop: null })}>
                  Dock
                </button>
              ) : null}
              <button type="button" onClick={() => patch(nextPanelSize(settings.panelWidth))}>
                {settings.panelWidth >= 640 ? 'Restore' : 'Enlarge'}
              </button>
              {onEnterFocus && focus !== 'hearing' ? <EnterFocusButton label="Hearing Access" onClick={onEnterFocus} /> : null}
              <button type="button" onClick={() => patch({ panelOpen: false })}>
                Close
              </button>
            </div>
          </header>
          {settings.monitorEnabled ? (
            <p className={styles.monitor}>Monitoring only. Not included in export. Not a hearing aid.</p>
          ) : null}
          {note ? <p className={styles.note}>{note}</p> : null}
          <div className={styles.tabs} role="tablist" aria-label="Hearing Access sections">
            {HEARING_SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                role="tab"
                id={`hearing-tab-${section}`}
                aria-selected={settings.section === section}
                aria-controls={`hearing-panel-${section}`}
                onClick={() => patch({ section })}
              >
                {SECTION_LABEL[section]}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`hearing-panel-${settings.section}`}
            aria-labelledby={`hearing-tab-${settings.section}`}
            className={styles.body}
          >
            {settings.section === 'sound' ? (
              <SoundSection
                surface={surface}
                showDetails={showDetails}
                settingsDetails={settings.simpleDetails}
                onDetails={(value) => patch({ simpleDetails: value })}
                hearing={hearing}
                live={live}
                summary={summary}
                voice={voice}
                eq={eq}
                snap={snap}
                showMap={settings.layers.soundMap}
                showAssistant={settings.layers.assistant}
              />
            ) : null}
            {settings.section === 'events' ? <EventsSection hearing={hearing} /> : null}
            {settings.section === 'space' ? <SpaceSection analysis={analysis} playhead={hearing.playhead} /> : null}
            {settings.section === 'dynamics' ? <DynamicsSection analysis={analysis} /> : null}
            {settings.section === 'compare' ? <CompareSection analysis={analysis} snap={snap} /> : null}
            {settings.section === 'haptics' ? (
              <HapticsSection
                ok={hapticsOk}
                intensity={settings.hapticIntensity}
                frequency={settings.frequencyHaptics}
                note={pulseNote}
                onIntensity={(value) => patch({ hapticIntensity: value })}
                onTest={() => {
                  const intensity = settings.hapticIntensity === 'off' ? 'medium' : settings.hapticIntensity
                  const vibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? navigator.vibrate.bind(navigator) : null
                  const fired = fireHaptic('transient', intensity, performance.now(), -1e9, vibrate)
                  if (fired.result.fired) {
                    setPulseNote(settings.hapticIntensity === 'off' ? 'Pulse sent. Set intensity above off to pulse during playback.' : 'Pulse sent.')
                  } else if (fired.result.reason === 'unsupported') {
                    setPulseNote('This device rejected the pulse. FIELD does not imitate haptics on screen.')
                  } else {
                    setPulseNote('No pulse.')
                  }
                }}
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function HapticsSection({
  ok,
  intensity,
  frequency,
  note,
  onIntensity,
  onTest,
}: {
  ok: boolean
  intensity: HapticIntensity
  frequency: boolean
  note: string | null
  onIntensity: (value: HapticIntensity) => void
  onTest: () => void
}) {
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>Haptics</h3>
        <InfoTip label="More about haptics">
          Optional pulses on transients, clipping, loop edges, and selection edges. They are never a continuous buzz. Test sends one pulse. Intensity above off is what pulses during playback. FIELD does not imitate haptics on screen.
        </InfoTip>
      </div>
      {ok ? (
        <>
          <p>
            <label>
              Intensity{' '}
              <select aria-label="Haptic intensity" value={intensity} onChange={(event) => onIntensity(event.target.value as HapticIntensity)}>
                {HAPTIC_INTENSITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </p>
          <button type="button" onClick={onTest}>
            Test pulse
          </button>
          {note ? <p className={styles.note}>{note}</p> : null}
          {frequency ? <p>Frequency haptics are experimental and can be turned off in Accessibility settings.</p> : null}
        </>
      ) : (
        <p>This browser does not provide vibration. FIELD does not imitate haptics on screen.</p>
      )}
    </div>
  )
}

function focusLine(
  focus: FocusWorkspace | null,
  analysis: BufferAnalysis | null,
  eq: ReturnType<typeof selectedEq>,
  snap: ReturnType<typeof useEngine>,
): string | null {
  if (!focus) return null
  if (focus === 'eq') {
    if (!eq) return 'EQ · select a band'
    const span = eq.region ? ` · ${Math.round(eq.region.lo)}–${Math.round(eq.region.hi)} Hz` : ''
    return `EQ ${eq.readout.index + 1} · ${eq.readout.frequencyLabel} · ${eq.readout.note} · ${eq.readout.region} · ${eq.readout.gainDb.toFixed(1)} dB · Q ${eq.readout.q.toFixed(2)}${span}`
  }
  if (focus === 'auto') {
    const id = snap.automation.selectedParamId
    const stored = snap.params[id]
    const liveValue = snap.liveParams[id]
    return `${PARAMS[id]?.label ?? id} · stored ${stored.toFixed(2)} · effective ${liveValue.toFixed(2)}`
  }
  if (focus === 'fft') {
    if (!analysis) return 'FFT · no sample'
    const top = [...analysis.bands].sort((a, b) => b.share - a.share)[0]
    const tone = analysis.dominantHz ? `${Math.round(analysis.dominantHz)} Hz · ${analysis.dominantNote}` : 'no dominant tone'
    const region = top ? `${top.label} ${Math.round(top.share * 100)}%` : ''
    return `FFT · ${tone}${region ? ` · ${region}` : ''}`
  }
  if (!analysis) return 'WAVE · no sample'
  const level = analysis.peakDbfs === null ? 'silence' : `peak ${analysis.peakDbfs.toFixed(1)} dBFS`
  return `WAVE · ${scopeLabel(analysis.scope)} · ${level}`
}

function useSyncHearing(): HearingView {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

function useSyncAlerts(): readonly HearingAlert[] {
  const [value, setValue] = useState(getHearingAlerts)
  useEffect(() => subscribeHearingAlerts(() => setValue(getHearingAlerts())), [])
  return value
}

function selectedBand(snap: ReturnType<typeof useEngine>, pick: EqBandSelection | null) {
  if (!pick) return null
  const bands = snap.eqById[pick.instanceId]?.bands ?? snap.eqBands
  return bands[pick.index] ?? null
}

function selectedEq(snap: ReturnType<typeof useEngine>, pick: EqBandSelection | null) {
  const band = selectedBand(snap, pick)
  if (!band) return null
  const readout = eqReadout(band, pick?.index ?? 0)
  if (!readout) return null
  return { readout, region: affectedRegion(band, snap.sampleRate || 44100) }
}

function NoteSensitivity({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <label className={styles.toneSensitivity}>
      <span>Notes</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        aria-label="Note detection sensitivity"
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  )
}

function SoundSection(props: {
  surface: Surface
  showDetails: boolean
  settingsDetails: boolean
  onDetails: (value: boolean) => void
  hearing: HearingView
  live: Descriptor[]
  summary: ReturnType<typeof simpleSummary> | null
  voice: ReturnType<typeof voiceEstimate> | null
  eq: ReturnType<typeof selectedEq>
  snap: ReturnType<typeof useEngine>
  showMap: boolean
  showAssistant: boolean
}) {
  const { settings, patch } = useHearingSettings()
  const room = useReverbSpace()
  const { analysis } = props.hearing
  const autoId = props.snap.automation.selectedParamId
  const stored = props.snap.params[autoId]
  const liveValue = props.snap.liveParams[autoId]
  return (
    <div>
      <div className={styles.sectionTitle}>
        <p className={styles.scope}>{analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'}</p>
        <InfoTip label="More about Sound">
          Note and character tags follow the playhead, so a sound is listed while that moment is under the playhead. Click a note tag to hear a quiet synthesized tone. High frequencies are kept much quieter, and a limiter caps the preview. The Notes slider sets how far below the loudest partial still counts. The same note is listed once. Silence does not invent a note. Tags wrap on one height, with room for another row and no scrollbar. Original and heard levels share one bar per band.
        </InfoTip>
      </div>
      {props.summary && props.surface === 'simple' ? (
        <dl className={styles.grid}>
          <div><dt>Level</dt><dd>{props.summary.level}</dd></div>
          <div><dt>Low</dt><dd>{props.summary.low}</dd></div>
          <div><dt>Mid</dt><dd>{props.summary.mid}</dd></div>
          <div><dt>High</dt><dd>{props.summary.high}</dd></div>
          <div><dt>Space</dt><dd>{props.summary.space}</dd></div>
          <div><dt>Dynamics</dt><dd>{props.summary.dynamics}</dd></div>
          <div><dt>Transients</dt><dd>{props.summary.transients}</dd></div>
        </dl>
      ) : null}
      {props.surface === 'simple' ? (
        <button type="button" onClick={() => props.onDetails(!props.settingsDetails)}>
          {props.settingsDetails ? 'Hide details' : 'Details'}
        </button>
      ) : null}
      <div className={styles.tagBar}>
        <HearingTagList
          tags={
            analysis
              ? props.live.concat(localDescriptors(analysis, props.hearing.playhead ?? analysis.originSec, settings.toneSensitivity))
              : props.live
          }
        />
        <NoteSensitivity value={settings.toneSensitivity} onChange={(toneSensitivity) => patch({ toneSensitivity })} />
      </div>
      {props.showDetails && analysis ? (
        <AfterEqChart
          analysis={analysis}
          bands={props.snap.eqBands}
          sampleRate={props.snap.sampleRate}
          pitchSemitones={props.snap.params.pitch}
          engaged={props.snap.chain.some((mod) => mod.type === 'eq' && !mod.bypassed)}
        />
      ) : null}
      {props.showDetails && props.showMap ? (
        <>
          {Math.abs(props.snap.params.pitch) >= 0.05 ? (
            <p className={styles.help}>Sound map after pitch. The bars above compare the original with what you hear.</p>
          ) : null}
          <SoundMap
            columns={shiftSoundMap(analysis?.soundMap ?? null, props.snap.params.pitch)}
            playhead={props.hearing.playhead}
            origin={analysis?.originSec ?? 0}
            duration={analysis?.durationSec ?? 0}
            transients={transientMarkers(props.hearing.events, analysis?.dynamics)}
            onTransient={showTransientOnWave}
            space={room}
          />
        </>
      ) : null}
      {props.showDetails && props.voice ? (
        <p>
          <strong>{props.voice.label}</strong> {props.voice.detail}
          {props.voice.contrastDb !== null ? ` Voice contrast ${props.voice.contrastDb.toFixed(1)} dB.` : ''}
        </p>
      ) : null}
      {props.showDetails && props.eq ? (
        <p>
          EQ {props.eq.readout.index + 1} · {props.eq.readout.frequencyLabel} · {props.eq.readout.region} ·{' '}
          {props.eq.readout.gainDb.toFixed(1)} dB · Q {props.eq.readout.q.toFixed(2)}
          {props.eq.region
            ? ` · affected ${Math.round(props.eq.region.lo)}–${Math.round(props.eq.region.hi)} Hz`
            : ''}
        </p>
      ) : null}
      {props.showDetails ? (
        <p>
          Automation {PARAMS[autoId]?.label ?? autoId}: stored {stored.toFixed(2)} · effective {liveValue.toFixed(2)}
        </p>
      ) : null}
      {props.showDetails && props.showAssistant ? <Assistant findings={props.hearing.findings} analysis={analysis} /> : null}
    </div>
  )
}

function EventsSection({ hearing }: { hearing: HearingView }) {
  const [moved, setMoved] = useState<string | null>(null)
  const scope = hearing.analysis ? scopeLabel(hearing.analysis.scope) : 'THIS SCOPE'
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>{scope}</h3>
        <InfoTip label="More about events">
          Listed moments are transients, silence, loud peaks, low-frequency onsets, sustained tones, possible clicks, and possible clipping. Click a row to move the playhead. The audio is not edited.
        </InfoTip>
      </div>
      {hearing.events.length === 0 ? (
        <p className={styles.empty}>
          No qualifying events in {scope}. A short or steady selection often has none. Clear the selection to scan the full sample, or choose a passage with a clear attack or a gap.
        </p>
      ) : (
        <ul className={styles.events}>
          {hearing.events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className={styles.eventRow}
                onClick={() => {
                  engine.seekSeconds(event.time, 'sample')
                  setMoved(event.id)
                  announce(`Playhead ${formatTimecode(event.time)}. ${event.label}.`)
                }}
              >
                <span>{formatTimecode(event.time)}</span>
                <span>{event.label}</span>
                <span className={styles.eventDetail}>{event.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {moved ? <p className={styles.note}>Playhead moved. Press play to hear from that point.</p> : null}
    </div>
  )
}

function SpaceSection({
  analysis,
  playhead,
}: {
  analysis: BufferAnalysis | null
  playhead: number | null
}) {
  const buckets = useHeardSpace(analysis)
  const room = useReverbSpace()
  if (!analysis) {
    return (
      <div>
        <div className={styles.sectionTitle}>
          <h3>Space</h3>
          <InfoTip label="More about space">Balance, width, correlation, and mid/side energy for this scope.</InfoTip>
        </div>
        <p>Load a sample to place it in the field.</p>
      </div>
    )
  }
  const stereo = analysis.stereo
  const live = nearestSpaceBucket(buckets, playhead) ?? buckets[0]
  const heard = live?.balance ?? 0
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>Space</h3>
        <InfoTip label="More about space">
          The head follows the playhead. Spread is stereo width. A hollow mark is correlation below 0.2. The field is what you hear after pan, mid/side, and delay. A larger reverb size or a greater distance draws a smaller head. The source moves toward the front as distance grows. Wet does not move the head or the source. When wet is above zero, the sound map smears forward and the field draws a short tail under each mark. The right edge shows the room: a longer line is a larger room, and the dot is the source distance. Time runs from top to bottom.
        </InfoTip>
      </div>
      <div className={styles.spaceStack}>
        <HeadSpace balance={heard} width={live?.width ?? 0} correlation={live?.correlation ?? 1} space={room} />
        <SpaceField
          buckets={buckets}
          playhead={playhead}
          origin={analysis.originSec}
          duration={analysis.durationSec}
          space={room}
        />
      </div>
      {!stereo ? <p>This sample is mono, so width stays narrow. Pan still places it.</p> : null}
      <p className={styles.meter} aria-label={`Heard balance ${balanceLabel(heard)}`}>
        {balanceMeter(heard)}
      </p>
      <dl className={styles.grid}>
        <div><dt>Heard balance</dt><dd>{balanceLabel(heard)}</dd></div>
        <div><dt>Sample balance</dt><dd>{stereo ? balanceLabel(stereo.balance) : 'CENTER'}</dd></div>
        <div><dt>Width</dt><dd>{live ? `${Math.round(live.width * 100)}%` : '0%'}</dd></div>
        <div><dt>Correlation</dt><dd>{live ? live.correlation.toFixed(2) : '—'}</dd></div>
        <div><dt>Room</dt><dd>{room.engaged ? roomWord(room.size) : '—'}</dd></div>
        <div><dt>Distance</dt><dd>{room.engaged ? distanceWord(room.distance) : '—'}</dd></div>
        <div><dt>Mid</dt><dd>{stereo ? `${Math.round(stereo.midShare * 100)}%` : '—'}</dd></div>
        <div><dt>Side</dt><dd>{stereo ? `${Math.round(stereo.sideShare * 100)}%` : '—'}</dd></div>
      </dl>
      {stereo?.lowCorrelation ? <p>Low correlation. Possible mono compatibility issue.</p> : null}
    </div>
  )
}

function DynamicsSection({ analysis }: { analysis: BufferAnalysis | null }) {
  if (!analysis) return <p className={styles.help}>Dynamics needs a loaded sample.</p>
  const clips = analysis.dynamics.filter((bucket) => bucket.clip).length
  const transients = analysis.dynamics.filter((bucket) => bucket.transient).length
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>Dynamics</h3>
        <InfoTip label="More about dynamics">
          Levels for this scope. The thin strip on the waveform marks quiet, loud, and full-scale clipping. Loud audio below full scale is not clipping.
        </InfoTip>
      </div>
      <dl className={styles.grid}>
        <div><dt>Peak</dt><dd>{analysis.peakDbfs === null ? '—' : `${analysis.peakDbfs.toFixed(1)} dBFS`}</dd></div>
        <div><dt>RMS</dt><dd>{analysis.rmsDbfs === null ? '—' : `${analysis.rmsDbfs.toFixed(1)} dBFS`}</dd></div>
        <div><dt>Crest</dt><dd>{analysis.crestDb === null ? '—' : `${analysis.crestDb.toFixed(1)} dB`}</dd></div>
        <div><dt>Transients</dt><dd>{transients}</dd></div>
        <div><dt>Clipping blocks</dt><dd>{clips}</dd></div>
      </dl>
      <p>Quiet blocks are the low bars on the waveform strip. Clipping uses a full-scale sample threshold, not loudness.</p>
    </div>
  )
}

function CompareSection({ analysis, snap }: { analysis: BufferAnalysis | null; snap: ReturnType<typeof useEngine> }) {
  const revision = [
    snap.bufferRev,
    snap.sampleRate,
    snap.delayType,
    snap.reverbType,
    snap.params.gain,
    snap.params.pan,
    snap.params.channelGainL,
    snap.params.channelGainR,
    snap.params.compressorThreshold,
    snap.params.compressorRatio,
    snap.params.compressorKnee,
    snap.params.compressorMakeup,
    snap.params.compressorAutoMakeup,
    snap.params.delayTime,
    snap.params.delayTimeR,
    snap.params.delayFeedback,
    snap.params.delayWet,
    snap.params.delayStereo,
    snap.params.reverbWet,
    snap.params.reverbDecay,
    snap.params.reverbSize,
    snap.params.msWidth,
    snap.params.msMidGain,
    snap.params.msSideGain,
    snap.eqBands.map((band) => `${band.type}:${band.frequency}:${band.gain}:${band.q}:${band.bypassed ? 1 : 0}`).join(','),
    snap.chain.map((mod) => `${mod.type}:${mod.bypassed ? 1 : 0}`).join(','),
  ].join('|')
  const rows = useMemo(() => {
    if (!analysis) return []
    const engaged = (type: string) => snap.chain.some((mod) => mod.type === type && !mod.bypassed)
    const gain = gainCompare(analysis, snap.params.gain)
    const eqBands = snap.eqBands
    const eqRows = engaged('eq') ? eqCompare(analysis, eqBands, snap.sampleRate || analysis.sampleRate) : []
    const left = engine.audibleChannel(0)
    const picture =
      engaged('compressor') && left
        ? compressorPicture(left, analysis.sampleRate, 0, left.length, 0, paramRecord(snap.params))
        : null
    const compRows = picture ? compressorCompare(analysis, picture) : []
    const taps = engaged('delay') ? delayPicture(paramRecord(snap.params), snap.delayType, snap.params.bpm || 120) : []
    const delayRows = taps.length ? delayCompare(taps[0]?.time ?? null, snap.params.delayFeedback, snap.params.delayWet) : []
    const reverbRows = engaged('reverb')
      ? reverbCompare(reverbPicture(paramRecord(snap.params), snap.reverbType, snap.params.bpm || 120))
      : []
    const right = engine.audibleChannel(1)
    const before = analysis.stereo
    const afterPan = left
      ? stereoAfterBalance(left, right, 0, Math.min(left.length, 44100), snap.params.pan, snap.params.channelGainL, snap.params.channelGainR)
      : null
    const afterMs = left
      ? stereoAfterMidSide(left, right, 0, Math.min(left.length, 44100), snap.params.msWidth, snap.params.msMidGain, snap.params.msSideGain)
      : null
    const stereoRows = [
      ...stereoCompare(before, afterPan),
      ...(engaged('midside')
        ? stereoCompare(before, afterMs).map((row) => ({ ...row, id: `ms-${row.id}`, label: `M/S ${row.label}` }))
        : []),
    ]
    return [
      ...gain.map((row) => ({ group: 'Gain', ...row })),
      ...eqRows.map((row) => ({ group: 'EQ', ...row })),
      ...compRows.map((row) => ({ group: 'Compressor', ...row })),
      ...delayRows.map((row) => ({ group: 'Delay', ...row })),
      ...reverbRows.map((row) => ({ group: 'Reverb', ...row })),
      ...stereoRows.map((row) => ({ group: 'Stereo', ...row })),
    ]
    // `revision` already covers the parameter fields this picture reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, revision])
  const groups = rows.reduce<string[]>((list, row) => (list.includes(row.group) ? list : [...list, row.group]), [])
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>Compare</h3>
        <InfoTip label="More about compare">
          Each table is one active effect on this scope. A bypassed module is omitted. Delay times and the reverb tail follow the same parameters as the DSP. Nothing here rewrites the audio.
        </InfoTip>
      </div>
      {rows.length === 0 ? <p>No measurable change yet. Move gain, EQ, compressor, delay, reverb, or stereo width and the tables fill in.</p> : null}
      {groups.map((group) => (
        <section key={group} className={styles.compareGroup}>
          <h3>{group}</h3>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Measure</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((row) => row.group === group)
                .map((row) => (
                  <tr key={`${row.group}-${row.id}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.before}</td>
                    <td>{row.after}</td>
                    <td>{row.delta}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
      {snap.chain.some((mod) => mod.type === 'delay' && !mod.bypassed) ? <DelaySketch snap={snap} /> : null}
      {snap.chain.some((mod) => mod.type === 'reverb' && !mod.bypassed) ? <ReverbSketch snap={snap} /> : null}
    </div>
  )
}

function DelaySketch({ snap }: { snap: ReturnType<typeof useEngine> }) {
  const taps = delayPicture(paramRecord(snap.params), snap.delayType, snap.params.bpm || 120)
  if (taps.length === 0) return null
  const left = taps.filter((tap) => tap.channel !== 'R')
  const right = taps.filter((tap) => tap.channel === 'R')
  return (
    <div>
      <h3>Delay</h3>
      <p>Direct</p>
      <p>{left.map((tap) => `● ${Math.round(tap.time * 1000)} ms`).join('  ')}</p>
      {right.length ? <p>R {right.map((tap) => `● ${Math.round(tap.time * 1000)} ms`).join('  ')}</p> : null}
    </div>
  )
}

function ReverbSketch({ snap }: { snap: ReturnType<typeof useEngine> }) {
  const picture = reverbPicture(paramRecord(snap.params), snap.reverbType, snap.params.bpm || 120)
  return (
    <div>
      <h3>Reverb</h3>
      <p>Direct {Math.round(picture.direct * 100)}% · early {picture.early.length} · tail {picture.duration.toFixed(2)} s</p>
      <p>{picture.note}</p>
    </div>
  )
}

function bandsForFinding(id: string): HearingBandId[] {
  if (id === 'high-low-energy') return ['sub', 'bass']
  return []
}

function Assistant({ findings, analysis }: { findings: HearingView['findings']; analysis: BufferAnalysis | null }) {
  const [shown, setShown] = useState<string | null>(null)
  if (findings.length === 0) return <p>No technical findings in this scope.</p>
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>Visual mixing assistant</h3>
        <InfoTip label="More about the assistant">Show frames that span on the waveform and moves the playhead. It does not change the audio.</InfoTip>
      </div>
      <ul className={styles.events}>
        {findings.map((finding) => (
          <li key={finding.id} className={styles.finding}>
            <strong>{finding.title}</strong>
            <span>{finding.detail}</span>
            <button
              type="button"
              onClick={() => {
                const start = finding.time ?? analysis?.originSec ?? 0
                const fallbackEnd = analysis ? analysis.originSec + Math.max(analysis.durationSec, 0.05) : start + 0.2
                const end = Math.max(finding.end ?? fallbackEnd, start + 0.05)
                engine.seekSeconds(start, 'sample')
                revealHearingSpan({
                  id: finding.id,
                  start,
                  end,
                  label: finding.title,
                  bands: bandsForFinding(finding.id),
                })
                setShown(finding.id)
                announce(`Showing ${finding.title} at ${formatTimecode(start)}.`)
              }}
            >
              Show
            </button>
          </li>
        ))}
      </ul>
      {shown ? <p className={styles.note}>The waveform is framed on that span. The outline is the region. Audio is unchanged.</p> : null}
    </div>
  )
}
