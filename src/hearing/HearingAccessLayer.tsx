import { useEffect, useMemo, useRef, useState } from 'react'
import { announce } from '../a11y'
import type { FocusWorkspace } from '../app/phoneWorkspace'
import { PARAMS } from '../audio/parameters/definitions'
import { formatTimecode } from '../audio/engine/formatTime'
import { getEqBandSelection, subscribeEqBandSelection, type EqBandSelection } from '../audio/engine/eqBandSelection'
import { engine, useEngine } from '../hooks/useEngine'
import { dismissHearingAlert, getHearingAlerts, pushHearingAlert, subscribeHearingAlerts, type HearingAlert } from './alerts'
import { analyzePcm, type BufferAnalysis } from './analyze'
import { scopeLabel } from './events'
import { eqReadout, affectedRegion, eqBandDeltas } from './eqAssist'
import {
  compressorCompare,
  delayCompare,
  eqCompare,
  gainCompare,
  reverbCompare,
  stereoCompare,
} from './compare'
import { emptyDescriptorMemory, simpleSummary, updateDescriptors, type Descriptor } from './descriptors'
import { compressorPicture, delayPicture, paramRecord, reverbPicture, stereoAfterBalance, stereoAfterMidSide } from './effectViz'
import { fireHaptic, vibrationSupported, type HapticKind } from './haptics'
import { SoundMap } from './SoundMap'
import { getHearingView, subscribeHearingView, useHearingAnalysis, type HearingView } from './session'
import { useHearingSettings } from './useHearingSettings'
import { HEARING_SECTIONS, type HearingSection } from './settings'
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

function bars(share: number): string {
  const n = Math.round(Math.max(0, Math.min(1, share)) * 8)
  return `${'▓'.repeat(n)}${'░'.repeat(8 - n)}`
}

function balanceMeter(balance: number): string {
  const pos = Math.round(((balance + 1) / 2) * 10)
  const cells = Array.from({ length: 11 }, (_, index) => (index === pos ? '●' : '─'))
  return `L ${cells.join('')} R`
}

export function HearingAccessLayer({ surface, focus = null }: { surface: Surface; focus?: FocusWorkspace | null }) {
  const { settings, patch } = useHearingSettings()
  const snap = useEngine()
  useHearingAnalysis(settings, snap)
  const hearing = useSyncHearing()
  const alerts = useSyncAlerts()
  const [eqPick, setEqPick] = useState<EqBandSelection | null>(() => getEqBandSelection())
  const [live, setLive] = useState<Descriptor[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [narrow, setNarrow] = useState(false)
  const memory = useRef(emptyDescriptorMemory())
  const edge = useRef({ recording: snap.recording, loop: snap.loop, blocked: snap.audioStatus === 'blocked', error: snap.recordError })
  const hapticsOk = vibrationSupported()

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
      const hit = getHearingView().events.find(
        (event) =>
          prev <= event.time &&
          head >= event.time &&
          (event.kind === 'transient' || event.kind === 'possibleClip' || event.kind === 'possibleClick' || event.kind === 'loud'),
      )
      if (hit) {
        const kind: HapticKind = hit.kind === 'possibleClip' ? 'clip' : 'transient'
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
  useEffect(() => {
    if (!settings.enabled) return
    const current = engine.getSnapshot()
    const active = selectedBand(current, getEqBandSelection())
    const text = active
      ? `EQ ${active.frequency.toFixed(0)} Hz · ${active.gain.toFixed(1)} dB · Q ${active.q.toFixed(2)}`
      : `GAIN ${current.params.gain.toFixed(1)} dB`
    const handle = window.setTimeout(() => setNote(text), 700)
    return () => window.clearTimeout(handle)
  }, [settings.enabled, confirmKey])

  const analysis = hearing.analysis
  const summary = analysis ? simpleSummary(analysis) : null
  const voice = analysis && settings.layers.voiceEstimate ? voiceEstimate(analysis) : null
  const eq = useMemo(() => selectedEq(snap, eqPick), [snap, eqPick])

  if (!settings.enabled) return null

  const showDetails = surface !== 'simple' || settings.simpleDetails

  const focusText = focusLine(focus, analysis, eq, snap)

  return (
    <div className={focus ? `${styles.host} ${styles.hostFocus}` : styles.host} data-surface={surface}>
      {focusText ? (
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
      <button
        type="button"
        className={styles.launcher}
        aria-pressed={settings.panelOpen}
        aria-label="Hearing Access"
        onClick={() => patch({ panelOpen: !settings.panelOpen })}
      >
        <span aria-hidden="true" className={styles.mark}>
          ♪
        </span>
        Hearing Access
      </button>
      {settings.panelOpen ? (
        <section
          className={narrow ? styles.sheet : styles.panel}
          role="dialog"
          aria-label="Hearing Access panel"
        >
          <header className={styles.head}>
            <h2>Hearing Access</h2>
            <button type="button" onClick={() => patch({ panelOpen: false })}>
              Close
            </button>
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
                disabled={section === 'haptics' && !hapticsOk}
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
                showFingerprint={settings.layers.fingerprint}
                showAssistant={settings.layers.assistant}
              />
            ) : null}
            {settings.section === 'events' ? <EventsSection hearing={hearing} /> : null}
            {settings.section === 'space' ? <SpaceSection analysis={analysis} /> : null}
            {settings.section === 'dynamics' ? <DynamicsSection analysis={analysis} /> : null}
            {settings.section === 'compare' ? <CompareSection analysis={analysis} snap={snap} /> : null}
            {settings.section === 'haptics' ? (
              <div>
                {hapticsOk ? (
                  <p>Optional pulses for transients, clipping, loop boundaries, and selection edges. Intensity {settings.hapticIntensity}.</p>
                ) : (
                  <p>This browser does not provide vibration. Haptic feedback is unavailable.</p>
                )}
                {settings.frequencyHaptics ? <p>Frequency haptics are experimental and can be turned off in Accessibility settings.</p> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
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
  showFingerprint: boolean
  showAssistant: boolean
}) {
  const { analysis } = props.hearing
  const autoId = props.snap.automation.selectedParamId
  const stored = props.snap.params[autoId]
  const liveValue = props.snap.liveParams[autoId]
  return (
    <div>
      <p className={styles.scope}>{analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'}</p>
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
      {props.live.length ? (
        <ul className={styles.chips}>
          {props.live.map((item) => (
            <li key={item.id} title={item.detail}>
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      {props.showDetails && props.showFingerprint && analysis ? <Fingerprint analysis={analysis} /> : null}
      {props.showDetails && props.showMap ? (
        <SoundMap
          columns={analysis?.soundMap ?? null}
          playhead={props.hearing.playhead}
          origin={analysis?.originSec ?? 0}
          duration={analysis?.durationSec ?? 0}
        />
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
      {props.showDetails && props.showAssistant ? <Assistant findings={props.hearing.findings} /> : null}
    </div>
  )
}

function Fingerprint({ analysis }: { analysis: BufferAnalysis }) {
  return (
    <div>
      <h3>Sound fingerprint</h3>
      <ul className={styles.bands}>
        {analysis.bands.map((band) => (
          <li key={band.id} data-hatch={band.hatch}>
            <span>{band.label}</span>
            <span aria-hidden="true">{bars(band.share)}</span>
            <span>{Math.round(band.share * 100)}%</span>
          </li>
        ))}
      </ul>
      <dl className={styles.grid}>
        <div><dt>Peak</dt><dd>{analysis.peakDbfs === null ? '—' : `${analysis.peakDbfs.toFixed(1)} dBFS`}</dd></div>
        <div><dt>RMS</dt><dd>{analysis.rmsDbfs === null ? '—' : `${analysis.rmsDbfs.toFixed(1)} dBFS`}</dd></div>
        <div><dt>Crest</dt><dd>{analysis.crestDb === null ? '—' : `${analysis.crestDb.toFixed(1)} dB`}</dd></div>
        <div><dt>Dominant</dt><dd>{analysis.dominantHz ? `${Math.round(analysis.dominantHz)} Hz · ${analysis.dominantNote}` : '—'}</dd></div>
        <div><dt>Tonality</dt><dd>{analysis.tonality ?? '—'}</dd></div>
        <div><dt>Noise</dt><dd>{analysis.noise ?? '—'}</dd></div>
        <div><dt>Transients</dt><dd>{analysis.transientLevel ?? '—'}</dd></div>
      </dl>
    </div>
  )
}

function EventsSection({ hearing }: { hearing: HearingView }) {
  return (
    <ul className={styles.events}>
      {hearing.events.length === 0 ? <li>No events in this scope.</li> : null}
      {hearing.events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => engine.seekSeconds(event.time, 'sample')}
          >
            <span>{formatTimecode(event.time)}</span>
            <span>{event.label}</span>
          </button>
          <small>{event.detail}</small>
        </li>
      ))}
    </ul>
  )
}

function SpaceSection({ analysis }: { analysis: BufferAnalysis | null }) {
  if (!analysis?.stereo) return <p>Space metrics need a stereo buffer.</p>
  const stereo = analysis.stereo
  return (
    <div>
      <p className={styles.meter} aria-label={`Balance ${stereo.balanceSide} ${Math.round(stereo.balancePct)} percent`}>
        {balanceMeter(stereo.balance)}
      </p>
      <dl className={styles.grid}>
        <div><dt>Balance</dt><dd>{stereo.balanceSide === 'C' ? 'CENTER' : `${stereo.balanceSide} ${Math.round(stereo.balancePct)}%`}</dd></div>
        <div><dt>Width</dt><dd>{Math.round(stereo.width * 100)}%</dd></div>
        <div><dt>Correlation</dt><dd>{stereo.correlation.toFixed(2)}</dd></div>
        <div><dt>Mid</dt><dd>{Math.round(stereo.midShare * 100)}%</dd></div>
        <div><dt>Side</dt><dd>{Math.round(stereo.sideShare * 100)}%</dd></div>
      </dl>
      {stereo.lowCorrelation ? <p>Low correlation. Possible mono compatibility issue.</p> : null}
    </div>
  )
}

function DynamicsSection({ analysis }: { analysis: BufferAnalysis | null }) {
  if (!analysis) return <p>No level map yet.</p>
  const clips = analysis.dynamics.filter((bucket) => bucket.clip).length
  const transients = analysis.dynamics.filter((bucket) => bucket.transient).length
  return (
    <div>
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
  const deltas = analysis ? eqBandDeltas(analysis, snap.eqBands, snap.sampleRate || analysis.sampleRate) : []
  return (
    <div>
      {rows.length === 0 ? <p>No measurable change for the current parameters.</p> : null}
      <ul className={styles.events}>
        {rows.map((row) => (
          <li key={`${row.group}-${row.id}`}>
            <span>{row.group}</span> {row.label} {row.before} → {row.after}
          </li>
        ))}
      </ul>
      {deltas.some((band) => band.deltaDb !== null && Math.abs(band.deltaDb) >= 0.4) ? (
        <div>
          <h3>Difference</h3>
          <ul className={styles.bands}>
            {deltas
              .filter((band) => band.deltaDb !== null && Math.abs(band.deltaDb) >= 0.4)
              .map((band) => (
                <li key={band.id}>
                  <span>{band.label}</span>
                  <span>{band.deltaDb?.toFixed(1)} dB</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
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

function Assistant({ findings }: { findings: HearingView['findings'] }) {
  if (findings.length === 0) return <p>No technical findings in this scope.</p>
  return (
    <div>
      <h3>Visual mixing assistant</h3>
      <ul className={styles.events}>
        {findings.map((finding) => (
          <li key={finding.id}>
            <strong>{finding.title}</strong>
            <span>{finding.detail}</span>
            {finding.time !== null ? (
              <button type="button" onClick={() => engine.seekSeconds(finding.time ?? 0, 'sample')}>
                Show
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
