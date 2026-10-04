import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useEngine } from '../hooks/useEngine'
import { emptyDescriptorMemory, updateDescriptors, type Descriptor } from './descriptors'
import { applyPanToBalance } from './effectViz'
import { scopeLabel, transientMarkers } from './events'
import { shiftSoundMap } from './eqAssist'
import { HeadSpace } from './HeadSpace'
import { SoundMap } from './SoundMap'
import { SpaceField } from './SpaceField'
import { requestWaveZoom, setHearingMapDemand, showTransientOnWave } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { useHearingSettings } from './useHearingSettings'
import styles from './HearingAccessLayer.module.css'

const zoomButton: CSSProperties = {
  minHeight: 32,
  padding: '0 10px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--bg-control)',
  color: 'var(--text-primary)',
}

function useHearingView() {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

/** Graph-first Hearing Access surface. EQ stays in the floating panel so this view is the picture of the sound. */
export function HearingFocusStage() {
  const { settings } = useHearingSettings()
  const snap = useEngine()
  const hearing = useHearingView()
  useEffect(() => {
    setHearingMapDemand(true)
    return () => setHearingMapDemand(false)
  }, [])
  const analysis = hearing.analysis
  const tagMemory = useRef(emptyDescriptorMemory())
  const [tags, setTags] = useState<Descriptor[]>([])
  useEffect(() => {
    if (!analysis || !settings.layers.descriptors) return
    setTags(updateDescriptors(analysis, tagMemory.current, performance.now()))
  }, [analysis, settings.layers.descriptors])
  const shownTags = analysis && settings.layers.descriptors ? tags : []
  const pitch = snap.params.pitch
  const pitched = Math.abs(pitch) >= 0.05
  const columns = shiftSoundMap(analysis?.soundMap ?? null, pitch)
  const mono = analysis ? !analysis.stereo : false
  const buckets =
    analysis && analysis.spaceTimeline.length > 0
      ? analysis.spaceTimeline
      : analysis
        ? [{ time: analysis.originSec, balance: 0, width: 0, correlation: 1 }]
        : []
  const heardBalance = applyPanToBalance(analysis?.stereo?.balance ?? 0, snap.params.pan, snap.params.channelGainL, snap.params.channelGainR)
  const marks = transientMarkers(hearing.events, analysis?.dynamics)
  return (
    <section
      aria-label="Hearing Access focus"
      className={styles.palette}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto', padding: '8px 14px 12px 10px', overflow: 'auto', scrollbarGutter: 'stable' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'}
          {pitched ? ` · heard at ${pitch > 0 ? '+' : ''}${pitch.toFixed(1)} st` : ' · original pitch'}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('out')}>
            Zoom out
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('in')}>
            Zoom in
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('fit')}>
            Fit
          </button>
        </div>
      </div>
      {shownTags.length ? (
        <ul className={styles.chips} aria-label="Hearing tags">
          {shownTags.map((item) => (
            <li key={item.id} data-tag={item.id} title={item.detail}>
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <p style={{ margin: 0, fontSize: 12 }}>
        Drag the bar above to shrink the waveform. The map is the sound after pitch. Squares on the map are transients — click one to frame it on the wave. The head and the field place left on the left and right on the right.
      </p>
      <SoundMap
        columns={columns}
        playhead={hearing.playhead}
        origin={analysis?.originSec ?? 0}
        duration={analysis?.durationSec ?? 0}
        transients={marks}
        onTransient={showTransientOnWave}
      />
      {analysis ? (
        <>
          {mono ? <p style={{ margin: 0, fontSize: 12 }}>This sample is mono. Pan still places that one image left or right.</p> : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 180px) minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
            <HeadSpace balance={heardBalance} width={analysis.stereo?.width ?? 0} correlation={analysis.stereo?.correlation ?? 1} />
            <SpaceField
              buckets={buckets}
              playhead={hearing.playhead}
              origin={analysis.originSec}
              duration={analysis.durationSec}
              panPct={snap.params.pan}
              leftDb={snap.params.channelGainL}
              rightDb={snap.params.channelGainR}
            />
          </div>
        </>
      ) : (
        <p style={{ margin: 0 }}>Load a sample to see the map and the stereo field.</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>Turn Hearing Access on to measure this sample.</p> : null}
    </section>
  )
}
