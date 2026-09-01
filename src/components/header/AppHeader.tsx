import { formatTimecode } from '../../audio/engine/formatTime'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import styles from './AppHeader.module.css'

type Props = {
  snap: EngineSnapshot
  settingsOpen: boolean
  onToggleSettings: () => void
  onLoadSample: () => void
  compact: boolean
}

export function AppHeader({ snap, settingsOpen, onToggleSettings, onLoadSample, compact }: Props) {
  const rate = snap.sampleRate ? `${Math.round(snap.sampleRate / 1000)} kHz` : '—'
  const ch = snap.channelCount === 1 ? 'M' : snap.channelCount === 2 ? 'Stereo' : snap.channelCount ? `${snap.channelCount} ch` : '—'
  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Field</span>
        <button type="button" className={styles.file} onClick={onLoadSample}>
          {snap.fileName || 'Load sample'}
        </button>
      </div>
      <p className={styles.meta}>
        <span>{rate}</span>
        <span>{ch}</span>
        <span>{snap.sampleLoaded ? formatTimecode(snap.duration) : '00:00.000'}</span>
      </p>
      <button
        type="button"
        className={styles.settings}
        aria-label="Settings"
        aria-expanded={settingsOpen}
        onClick={onToggleSettings}
      >
        {compact ? '☰' : 'Settings'}
      </button>
    </header>
  )
}