import { useRef } from 'react'
import { PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import { TRACK_COLOR_IDS, trackColorVar, type TrackColorId } from '../../audio/mix/tracks'
import type { ParamId } from '../../audio/parameters/types'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './TrackInputPanel.module.css'

const INPUT_IDS: ParamId[] = ['gain', 'speed', 'pitch', 'stretchInterp']

/**
 * Track Input edits the selected track's rack. Opening the panel selects that
 * track so Automation, LFO, and Random keep using the existing parameter path.
 * Speed, pitch, overlap, and direction are stored on the track, before FX.
 */
export function TrackInputPanel({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const { t } = useI18n()
  const snap = useEngine()
  const track = snap.tracks.find((item) => item.id === trackId) ?? null
  const nameRef = useRef<HTMLInputElement>(null)

  if (!track || snap.selectedTrackId !== trackId) return null

  return (
    <section className={styles.panel} aria-label={`${t.mix.trackInput} ${track.name}`} data-track-input={track.id}>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>{t.mix.trackInput}</p>
          <h2 className={styles.title}>{track.name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          {t.modulation.close}
        </button>
      </header>
      <label className={styles.name}>
        {t.mix.trackName}
        <input
          ref={nameRef}
          defaultValue={track.name}
          key={track.name}
          onBlur={(event) => {
            const name = event.target.value.trim()
            if (name) engine.setTrack(track.id, { name })
          }}
        />
      </label>
      <div className={styles.swatches} role="listbox" aria-label={t.mix.color}>
        {TRACK_COLOR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.swatch}
            style={{ background: trackColorVar(id) }}
            aria-label={id}
            aria-pressed={track.color === id}
            onClick={() => engine.setTrack(track.id, { color: id as TrackColorId })}
          />
        ))}
      </div>
      <Segmented
        label={t.mix.direction}
        value={track.direction}
        options={PLAYBACK_DIRECTIONS}
        wrap
        onChange={(direction) => engine.setDirection(direction)}
      />
      <div className={styles.params}>
        {INPUT_IDS.map((id) => (
          <ParamControl key={id} id={id} value={snap.params[id]} variant="slider" />
        ))}
      </div>
    </section>
  )
}
