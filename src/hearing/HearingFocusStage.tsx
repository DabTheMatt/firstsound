import { useEffect, useRef, useState } from 'react'
import { useEngine } from '../hooks/useEngine'
import { emptyDescriptorMemory, updateDescriptors, type Descriptor } from './descriptors'
import { scopeLabel, transientMarkers } from './events'
import { shiftSoundMap } from './eqAssist'
import { HeadSpace } from './HeadSpace'
import { InfoTip } from './InfoTip'
import { SoundMap } from './SoundMap'
import { SpaceField } from './SpaceField'
import { requestWaveZoom, setHearingMapDemand, showTransientOnWave } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { balanceLabel, nearestSpaceBucket } from './spaceLive'
import { useHeardSpace } from './useHeardSpace'
import { useReverbSpace } from './useImageDepth'
import { distanceWord, roomWord } from './reverbDepth'
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
        <li key={`${item.id}:${item.label}`} data-tag={item.id} title={item.detail}>
          {item.label}
        </li>
      ))}
    </ul>
  )
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
    setTags(updateDescriptors(analysis, tagMemory.current, performance.now(), settings.toneSensitivity))
  }, [analysis, settings.layers.descriptors, settings.toneSensitivity])
  const shownTags = analysis && settings.layers.descriptors ? tags : []
  const pitch = snap.params.pitch
  const pitched = Math.abs(pitch) >= 0.05
  const columns = shiftSoundMap(analysis?.soundMap ?? null, pitch)
  const mono = analysis ? !analysis.stereo : false
  const heardBuckets = useHeardSpace(analysis)
  const room = useReverbSpace()
  const liveBucket = nearestSpaceBucket(heardBuckets, hearing.playhead) ?? heardBuckets[0] ?? null
  const heardBalance = liveBucket?.balance ?? 0
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
            Attacks on the sound map are thin vertical lines at the time they happen. The band rows sit edge to edge on a fixed loudness scale, so a quieter high band stays visible beside a louder bass band. Drag across the wave to select a fragment. Releasing that drag makes it the loop. A click only moves the playhead. The Notes slider lists detected partials: strict keeps the loudest, sensitive adds quieter ones, and the same note is listed once. The waveform line is the same dashed mark as Input → Mark transients, and it stays hidden until that control is on. Sensitivity for it sits on its own row under the tempo buttons. The legend under the time scale turns those lines and the strip symbols on or off. The strip is slice level: bar height is the peak of that moment, a triangle is a short attack, and an exclamation mark is full-scale clipping. The loudness rail on the right follows the output while audio plays. When playback is stopped the bars rest at silence, and the sample peak stays listed as a number. The head and the space field follow pan, mid/side, and delay. On the head, a larger reverb size draws a smaller head. The source sits in front of the head and moves to the front wall with reverb distance. Wet does not move the source. When wet is above zero, the sound map smears forward and dulls the high rows, and the space field draws a short tail under each mark. Spread is stereo width. A hollow mark is low correlation.
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
      <div className={styles.tagBar}>
        <TagRow tags={shownTags} />
        <NoteSensitivity value={settings.toneSensitivity} onChange={(toneSensitivity) => patch({ toneSensitivity })} />
      </div>
      <SoundMap
        columns={columns}
        playhead={hearing.playhead}
        origin={analysis?.originSec ?? 0}
        duration={analysis?.durationSec ?? 0}
        transients={marks}
        onTransient={showTransientOnWave}
        space={room}
      />
      {analysis && liveBucket ? (
        <>
          {mono ? <p style={{ margin: 0, fontSize: 12 }}>This sample is mono. Pan still places that one image.</p> : null}
          <div className={styles.focusSpace}>
            <HeadSpace balance={heardBalance} width={liveBucket.width} correlation={liveBucket.correlation} space={room} fill />
            <SpaceField
              buckets={heardBuckets}
              playhead={hearing.playhead}
              origin={analysis.originSec}
              duration={analysis.durationSec}
              space={room}
              fill
            />
          </div>
          <dl className={styles.focusFacts}>
            <div><dt>Heard</dt><dd>{balanceLabel(heardBalance)}</dd></div>
            <div><dt>Width</dt><dd>{Math.round(liveBucket.width * 100)}%</dd></div>
            <div><dt>Correlation</dt><dd>{liveBucket.correlation.toFixed(2)}</dd></div>
            <div><dt>Room</dt><dd>{room.engaged ? roomWord(room.size) : '—'}</dd></div>
            <div><dt>Distance</dt><dd>{room.engaged ? distanceWord(room.distance) : '—'}</dd></div>
          </dl>
        </>
      ) : (
        <p style={{ margin: 0 }}>Load a sample to see the map and the stereo field.</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>Turn Hearing Access on to measure this sample.</p> : null}
    </section>
  )
}
