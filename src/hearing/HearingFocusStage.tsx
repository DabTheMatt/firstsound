import { useEffect, useRef, useState } from 'react'
import { useEngine } from '../hooks/useEngine'
import { emptyDescriptorMemory, localDescriptors, updateDescriptors, type Descriptor } from './descriptors'
import { HearingTagList } from './HearingTagList'
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
    const time = hearing.playhead ?? analysis.originSec
    setTags(
      updateDescriptors(analysis, tagMemory.current, performance.now()).concat(
        localDescriptors(analysis, time, settings.toneSensitivity),
      ),
    )
  }, [analysis, hearing.playhead, settings.layers.descriptors, settings.toneSensitivity])
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
            Attacks on the sound map are thin vertical lines at the time they happen. The band rows sit edge to edge on a fixed loudness scale, so a quieter high band stays visible beside a louder bass band. Drag across the wave to select a fragment. Releasing that drag makes it the loop. A click only moves the playhead. Note tags and character tags follow the playhead: a partial is listed while that moment is heard. Click a note tag to hear a quiet synthesized tone. High frequencies are kept much quieter, and a limiter caps the preview. The Notes slider lists quieter partials in the current moment. The same note is listed once. The tag list keeps four rows reserved, so extra tags do not move the sound map. There is no scrollbar. Clicking an attack on the sound map draws a line at the start of that attack. The line icon under the time scale shows or hides it. The waveform line is the same dashed mark as Input → Mark transients, and it stays hidden until that control is on. Sensitivity for it sits on its own row under the tempo buttons. The legend under the time scale turns those lines and the strip symbols on or off. The strip is slice level: bar height is the peak of that moment, a triangle is a short attack, and an exclamation mark is full-scale clipping. The loudness rail on the right follows the output while audio plays. When playback is stopped the bars rest at silence, and the sample peak stays listed as a number. The head and the space field follow pan, mid/side, and delay. A larger reverb size or a greater distance draws a smaller head. The source moves toward the front as distance grows. Wet does not move the source or the head. When wet is above zero, the sound map smears forward and dulls the high rows, and the space field draws a short tail under each mark. Spread is stereo width. A hollow mark is low correlation.
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
        <NoteSensitivity value={settings.toneSensitivity} onChange={(toneSensitivity) => patch({ toneSensitivity })} />
        <HearingTagList tags={shownTags} />
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
