import { useEffect, useRef, useState } from 'react'
import { useEngine } from '../hooks/useEngine'
import { emptyDescriptorMemory, updateDescriptors, type Descriptor } from './descriptors'
import { applyPanToBalance } from './effectViz'
import { scopeLabel, transientMarkers } from './events'
import { shiftSoundMap } from './eqAssist'
import { HeadSpace } from './HeadSpace'
import { InfoTip } from './InfoTip'
import { LoudnessMeter } from './LoudnessMeter'
import { SoundMap } from './SoundMap'
import { SpaceField } from './SpaceField'
import { requestWaveZoom, setHearingMapDemand, showTransientOnWave } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { balanceLabel, nearestSpaceBucket } from './spaceLive'
import { useHearingSettings } from './useHearingSettings'
import styles from './HearingAccessLayer.module.css'

const zoomButton = {
  minHeight: 32,
  padding: '0 10px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--bg-control)',
  color: 'var(--text-primary)',
} as const

function useHearingView() {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

function TagRow({ tags }: { tags: Descriptor[] }) {
  return (
    <ul className={styles.chips} aria-label="Hearing tags">
      {tags.map((item) => (
        <li key={item.id} data-tag={item.id} title={item.detail}>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Graph-first Hearing Access surface. EQ stays in the floating panel so this view is the picture of the sound. */
export function HearingFocusStage() {
  const { settings, patch } = useHearingSettings()
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
        ? [{ time: analysis.originSec, balance: analysis.stereo?.balance ?? 0, width: analysis.stereo?.width ?? 0, correlation: analysis.stereo?.correlation ?? 1 }]
        : []
  const liveBucket = nearestSpaceBucket(buckets, hearing.playhead) ?? buckets[0] ?? null
  const heardBalance = applyPanToBalance(liveBucket?.balance ?? 0, snap.params.pan, snap.params.channelGainL, snap.params.channelGainR)
  const marks = transientMarkers(hearing.events, analysis?.dynamics)
  return (
    <section aria-label="Hearing Access focus" className={`${styles.palette} ${styles.focusStage}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={styles.sectionTitle}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'}
            {pitched ? ` · heard at ${pitch > 0 ? '+' : ''}${pitch.toFixed(1)} st` : ' · original pitch'}
          </p>
          <InfoTip label="More about Hearing Access focus">
            Squares on the T row are distinct attacks, one per hit. A line drops through the bands at that time. The strip under the wave is slice level: bar height is the peak of that moment, a triangle is a short attack, and an exclamation mark is full-scale clipping. One hit can light several triangles, so the wave shows more marks than the T row. A click on a square draws a line on the waveform and moves the playhead. The zoom stays put. The loudness meter uses words and a scale from −60 dBFS to 0. Quiet is under −40, medium is under −18, loud is under −8, and 0 is clipping. The head follows the playhead. Spread is stereo width. A hollow mark is low correlation.
          </InfoTip>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={zoomButton} aria-pressed={settings.panelOpen} onClick={() => patch({ panelOpen: !settings.panelOpen })}>
            Panel
          </button>
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
      <TagRow tags={shownTags} />
      <LoudnessMeter
        samplePeakDb={analysis?.peakDbfs ?? null}
        sampleRmsDb={analysis?.rmsDbfs ?? null}
        clipped={analysis?.clipped === true}
      />
      <SoundMap
        columns={columns}
        playhead={hearing.playhead}
        origin={analysis?.originSec ?? 0}
        duration={analysis?.durationSec ?? 0}
        transients={marks}
        onTransient={showTransientOnWave}
      />
      {analysis && liveBucket ? (
        <>
          {mono ? <p style={{ margin: 0, fontSize: 12 }}>This sample is mono. Pan still places that one image.</p> : null}
          <div className={styles.focusSpace}>
            <HeadSpace balance={heardBalance} width={liveBucket.width} correlation={liveBucket.correlation} fill />
            <SpaceField
              buckets={buckets}
              playhead={hearing.playhead}
              origin={analysis.originSec}
              duration={analysis.durationSec}
              panPct={snap.params.pan}
              leftDb={snap.params.channelGainL}
              rightDb={snap.params.channelGainR}
              fill
            />
          </div>
          <dl className={styles.focusFacts}>
            <div><dt>Heard</dt><dd>{balanceLabel(heardBalance)}</dd></div>
            <div><dt>Width</dt><dd>{Math.round(liveBucket.width * 100)}%</dd></div>
            <div><dt>Correlation</dt><dd>{liveBucket.correlation.toFixed(2)}</dd></div>
          </dl>
        </>
      ) : (
        <p style={{ margin: 0 }}>Load a sample to see the map and the stereo field.</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>Turn Hearing Access on to measure this sample.</p> : null}
    </section>
  )
}
