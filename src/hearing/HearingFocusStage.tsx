import { useEffect, useRef, useState } from 'react'
import { useEngine } from '../hooks/useEngine'
import { useI18n } from '../i18n'
import { hearingUi } from '../i18n/hearingUi'
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
  minHeight: 28,
  padding: '0 8px',
  border: 0,
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text-secondary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  fontSize: 'var(--type-11)',
}

function useHearingView() {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

function NoteSensitivity({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const copy = hearingUi(useI18n().locale)
  return (
    <label className={styles.toneSensitivity}>
      <span>{copy.notes}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        aria-label={copy.notesAria}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  )
}

/** Graph-first Hearing Access surface. EQ stays in the floating panel so this view is the picture of the sound. */
export function HearingFocusStage() {
  const { settings, patch } = useHearingSettings()
  const copy = hearingUi(useI18n().locale)
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
    <section aria-label={copy.focusStage} className={`${styles.palette} ${styles.focusStage}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={styles.sectionTitle}>
          <p style={{ margin: 0, fontSize: 'var(--type-12)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {analysis ? copy.scope(scopeLabel(analysis.scope)) : copy.noSample}
            {pitched ? copy.heardAt(`${pitch > 0 ? '+' : ''}${pitch.toFixed(1)}`) : copy.originalPitch}
          </p>
          <InfoTip label={copy.focusTipLabel}>{copy.focusTip}</InfoTip>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={zoomButton} aria-pressed={settings.panelOpen} onClick={() => patch({ panelOpen: !settings.panelOpen })}>
            {copy.panelButton}
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('out')}>
            {copy.zoomOut}
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('in')}>
            {copy.zoomIn}
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('fit')}>
            {copy.fit}
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
          {mono ? <p style={{ margin: 0, fontSize: 'var(--type-12)' }}>{copy.monoImage}</p> : null}
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
            <div><dt>{copy.heard}</dt><dd>{copy.balance(balanceLabel(heardBalance))}</dd></div>
            <div><dt>{copy.width}</dt><dd>{Math.round(liveBucket.width * 100)}%</dd></div>
            <div><dt>{copy.correlation}</dt><dd>{liveBucket.correlation.toFixed(2)}</dd></div>
            <div><dt>{copy.room}</dt><dd>{room.engaged ? copy.roomWord(roomWord(room.size)) : '—'}</dd></div>
            <div><dt>{copy.distance}</dt><dd>{room.engaged ? copy.distanceWord(distanceWord(room.distance)) : '—'}</dd></div>
          </dl>
        </>
      ) : (
        <p style={{ margin: 0 }}>{copy.loadMap}</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>{copy.turnOn}</p> : null}
    </section>
  )
}
