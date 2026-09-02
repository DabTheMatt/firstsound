import { anyFxLfoActive } from '../../audio/fx/lfo'
import { formatTimecode } from '../../audio/engine/formatTime'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { ThemePicker } from './ThemePicker'
import styles from './AppHeader.module.css'

type Props = {
  snap: EngineSnapshot
  settingsOpen: boolean
  lfoCenterOpen: boolean
  onToggleSettings: () => void
  onToggleLfoCenter: () => void
  onLoadSample: () => void
  onRecord: () => void
  compact: boolean
}

export function AppHeader({
  snap,
  settingsOpen,
  lfoCenterOpen,
  onToggleSettings,
  onToggleLfoCenter,
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
        <button
          type="button"
          className={`${styles.lfo} ${lfoCenterOpen ? styles.lfoOn : ''} ${anyFxLfoActive(snap.fxLfos) ? styles.lfoLive : ''}`}
          aria-label="LFO control center"
          aria-expanded={lfoCenterOpen}
          title="LFO control center"
          onClick={onToggleLfoCenter}
        >
          <svg viewBox="0 0 20 12" width="18" height="12" aria-hidden="true">
            <path
              d="M1 6c1.6 0 1.6-4 3.2-4S6.4 10 8 10s1.6-8 3.2-8S12.8 10 14.4 10 16.4 6 19 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
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
        data-settings-toggle=""
        onClick={onToggleSettings}
      >
        {compact ? '☰' : 'Settings'}
      </button>
    </header>
  )
}