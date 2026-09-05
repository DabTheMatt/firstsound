import { MAX_TRACKS } from '../../audio/mix/tracks'
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
            One strip per track. Select a strip to edit that track's region in the lane view.
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
        {tracks.map((track) => {
          const audible = !track.muted && (tracks.every((item) => !item.solo || item.muted) || track.solo)
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
                <span className={styles.faderLabel}>Mix</span>
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
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={!canAdd}
                  onClick={(event) => {
                    event.stopPropagation()
                    engine.duplicateTrack(track.id)
                  }}
                >
                  Duplicate
                </button>
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
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
