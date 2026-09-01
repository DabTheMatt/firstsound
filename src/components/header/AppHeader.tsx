import { formatTimecode } from '../../audio/engine/formatTime'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { ThemePicker } from './ThemePicker'
import styles from './AppHeader.module.css'

type Props = {
  snap: EngineSnapshot
  settingsOpen: boolean
  onToggleSettings: () => void
  onLoadSample: () => void
  onRecord: () => void
  compact: boolean
}

export function AppHeader({
  snap,
  settingsOpen,
  onToggleSettings,
  onLoadSample,
  onRecord,
  compact,
}: Props) {
  const rate = snap.sampleRate ? `${Math.round(snap.sampleRate / 1000)} kHz` : '—'
  const ch = snap.channelCount === 1 ? 'M' : snap.channelCount === 2 ? 'Stereo' : snap.channelCount ? `${snap.channelCount} ch` : '—'
  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Field</span>
        <button type="button" className={styles.file} onClick={onLoadSample}>
          {snap.fileName || 'Load sample'}
        </button>
        <button
          type="button"
          className={`${styles.rec} ${snap.recording ? styles.recOn : ''}`}
          aria-pressed={snap.recording}
          onClick={onRecord}
        >
          {snap.recording ? 'Stop' : 'Record'}
        </button>
        <ThemePicker />
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
        data-settings-toggle=""
        onClick={onToggleSettings}
      >
        {compact ? '☰' : 'Settings'}
      </button>
    </header>
  )
}