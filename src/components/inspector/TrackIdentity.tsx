import type { CSSProperties } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { trackColorVar } from '../../audio/mix/tracks'
import { useI18n } from '../../i18n'
import styles from './Inspector.module.css'

export function inspectorTrack(snap: EngineSnapshot) {
  return snap.tracks.find((track) => track.id === snap.selectedTrackId) ?? snap.tracks[0] ?? null
}

/** Track color drives inspector accents. The default accent token is already that color. */
export function inspectorAccentStyle(snap: EngineSnapshot): CSSProperties | undefined {
  const track = inspectorTrack(snap)
  if (!track) return undefined
  const accent = trackColorVar(track.color)
  return {
    ['--inspector-accent' as string]: accent,
  }
}

/** Track color, name, and source for every track-related inspector. */
export function TrackIdentity({ snap }: { snap: EngineSnapshot }) {
  const { t } = useI18n()
  const track = inspectorTrack(snap)
  if (!track) return null
  const index = Math.max(0, snap.tracks.findIndex((item) => item.id === track.id))
  const kicker = `${t.mix.track} ${index + 1}`
  const source = track.fileName?.trim() ?? ''
  const showName = track.name.trim().toLowerCase() !== kicker.toLowerCase()
  return (
    <div className={styles.identity} data-inspector-track={track.id} data-inspector-name={track.name} data-inspector-source={source}>
      <span className={styles.identitySwatch} style={{ background: trackColorVar(track.color) }} aria-hidden />
      <div className={styles.identityCopy}>
        <p className={styles.identityKicker}>{kicker}</p>
        {showName ? <p className={styles.identityName}>{track.name}</p> : null}
        {source ? <p className={styles.identitySource}>{source}</p> : null}
      </div>
    </div>
  )
}
