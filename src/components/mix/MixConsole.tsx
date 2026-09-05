import { useRef } from 'react'
import { MAX_TRACKS, trackIsAudible } from '../../audio/mix/tracks'
import { AUDIO_FILE_ACCEPT, readAudioFile } from '../../features/sample/files'
import { engine, useEngine } from '../../hooks/useEngine'
import styles from './MixConsole.module.css'

export function MixConsole() {
  const snap = useEngine()
  const tracks = snap.tracks
  const selectedId = snap.selectedTrackId
  const canAdd = tracks.length < MAX_TRACKS

  return (
    <div className={styles.console} aria-label="Mixer">
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>Mixer</h2>
          <p className={styles.lead}>
            Every unmuted track plays together. Mute and solo are per strip. Effects sit after the
            mix, on Output.
          </p>
        </div>
        <button
          type="button"
          className={styles.recipe}
          disabled={!canAdd}
          onClick={() => engine.addTrack()}
        >
          Add track
        </button>
      </header>
      <div className={styles.strips}>
        <div className={styles.channelRow}>
          {tracks.map((track) => {
            const audible = trackIsAudible(track, tracks)
            const selected = track.id === selectedId
            return (
              <article
                key={track.id}
                className={`${styles.strip} ${audible ? '' : styles.stripOff} ${track.solo ? styles.stripSolo : ''} ${selected ? styles.stripSelected : ''}`}
                onClick={() => engine.selectTrack(track.id)}
              >
                <header className={styles.stripHead}>
                  <input
                    className={styles.name}
                    value={track.name}
                    aria-label="Track name"
                    onChange={(event) => engine.setTrack(track.id, { name: event.target.value })}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span className={styles.sampleName}>{track.fileName ?? 'No sample'}</span>
                </header>
                <label className={styles.faderWrap}>
                  <span className={styles.faderValue}>{Math.round(track.mix)}</span>
                  <input
                    className={styles.fader}
                    type="range"
                    min={0}
                    max={150}
                    step={1}
                    value={track.mix}
                    aria-label={`${track.name} mix`}
                    onChange={(event) => engine.setTrack(track.id, { mix: Number(event.target.value) })}
                    onClick={(event) => event.stopPropagation()}
                  />
                </label>
                <div className={styles.toggles}>
                  <button
                    type="button"
                    className={track.muted ? styles.toggleOn : styles.toggle}
                    aria-pressed={track.muted}
                    onClick={(event) => {
                      event.stopPropagation()
                      engine.setTrack(track.id, { muted: !track.muted })
                    }}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    className={track.solo ? styles.toggleSolo : styles.toggle}
                    aria-pressed={track.solo}
                    onClick={(event) => {
                      event.stopPropagation()
                      engine.setTrack(track.id, { solo: !track.solo })
                    }}
                  >
                    S
                  </button>
                </div>
                <TrackSampleButton trackId={track.id} />
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={tracks.length <= 1}
                  onClick={(event) => {
                    event.stopPropagation()
                    engine.removeTrack(track.id)
                  }}
                >
                  Remove
                </button>
              </article>
            )
          })}
        </div>
        <article className={`${styles.strip} ${styles.stripMaster}`}>
          <header className={styles.stripHead}>
            <span className={styles.masterName}>Output</span>
            <span className={styles.sampleName}>After FX</span>
          </header>
          <label className={styles.faderWrap}>
            <span className={styles.faderValue}>{Math.round(snap.masterMix)}</span>
            <input
              className={styles.fader}
              type="range"
              min={0}
              max={150}
              step={1}
              value={snap.masterMix}
              aria-label="Output mix"
              onChange={(event) => engine.setMasterMix(Number(event.target.value))}
            />
          </label>
          <p className={styles.masterHint}>Master level for the summed mix.</p>
        </article>
      </div>
    </div>
  )
}

function TrackSampleButton({ trackId }: { trackId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={styles.sampleRow}>
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_FILE_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void readAudioFile(file).then((data) => engine.loadTrackArrayBuffer(trackId, data, file.name))
        }}
      />
      <button
        type="button"
        className={styles.ghost}
        onClick={(event) => {
          event.stopPropagation()
          inputRef.current?.click()
        }}
      >
        Sample
      </button>
    </div>
  )
}
