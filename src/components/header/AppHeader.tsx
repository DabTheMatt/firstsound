import { anyFxLfoActive } from '../../audio/fx/lfo'
import { formatTimecode } from '../../audio/engine/formatTime'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import type { ReactNode } from 'react'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { RuntimeStatus } from '../chrome/RuntimeStatus'
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
  minimal?: boolean
  modeSwitch?: ReactNode
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
  minimal = false,
  modeSwitch,
}: Props) {
  const { t } = useI18n()
  const rate = snap.sampleRate ? `${Math.round(snap.sampleRate / 1000)} kHz` : '—'
  const folded = snap.params.makeMono > 0.5
  const ch = folded
    ? t.header.mono
    : snap.channelCount === 1
      ? 'M'
      : snap.channelCount === 2
        ? t.header.stereo
        : snap.channelCount
          ? t.header.channels(snap.channelCount)
          : '—'
  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''} ${minimal ? styles.minimal : ''}`}>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Field</span>
        <button type="button" className={styles.file} onClick={onLoadSample}>
          {snap.fileName || t.header.loadSample}
        </button>
        {!minimal ? (
          <button
            type="button"
            className={`${styles.rec} ${snap.recording ? styles.recOn : ''}`}
            aria-pressed={snap.recording}
            onClick={onRecord}
          >
            {snap.recording ? t.header.stop : t.header.record}
          </button>
        ) : null}
        {!minimal ? <MonitorMix value={snap.recMonitor} label={t.mix.monitor} hint={t.mix.monitorHint} /> : null}
        {!minimal ? <ThemePicker /> : null}
        {!minimal ? (
          <button
            type="button"
            className={`${styles.lfo} ${lfoCenterOpen ? styles.lfoOn : ''} ${anyFxLfoActive(snap.fxLfos) ? styles.lfoLive : ''}`}
            aria-label={t.header.lfoCenter}
            aria-expanded={lfoCenterOpen}
            title={t.header.lfoCenter}
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
        ) : null}
      </div>
      <div className={styles.trailing}>
        <div className={styles.runtime}>
          <RuntimeStatus />
        </div>
        {!minimal ? (
          <p className={styles.meta}>
            <span>{rate}</span>
            <span>{ch}</span>
            <span>{snap.sampleLoaded ? formatTimecode(snap.duration) : '00:00.000'}</span>
          </p>
        ) : null}
        {modeSwitch}
        {minimal ? <ThemePicker compact /> : null}
        {minimal ? (
          <button
            type="button"
            className={`${styles.lfo} ${lfoCenterOpen ? styles.lfoOn : ''} ${anyFxLfoActive(snap.fxLfos) ? styles.lfoLive : ''}`}
            aria-label={t.header.lfoCenter}
            aria-expanded={lfoCenterOpen}
            title={t.header.lfoCenter}
            onClick={onToggleLfoCenter}
          >
            <svg viewBox="0 0 20 12" width="16" height="10" aria-hidden="true">
              <path
                d="M1 6c1.6 0 1.6-4 3.2-4S6.4 10 8 10s1.6-8 3.2-8S12.8 10 14.4 10 16.4 6 19 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {minimal ? (
          <button
            type="button"
            className={`${styles.rec} ${snap.recording ? styles.recOn : ''}`}
            aria-pressed={snap.recording}
            onClick={onRecord}
          >
            {snap.recording ? t.header.stop : t.header.rec}
          </button>
        ) : null}
        {minimal ? <MonitorMix value={snap.recMonitor} label={t.mix.monitor} hint={t.mix.monitorHint} compact /> : null}
        <button
          type="button"
          className={styles.settings}
          aria-label={t.header.settings}
          aria-expanded={settingsOpen}
          data-settings-toggle=""
          onClick={onToggleSettings}
        >
          {compact ? '☰' : t.header.settings}
        </button>
      </div>
    </header>
  )
}

function MonitorMix({
  value,
  label,
  hint,
  compact = false,
}: {
  value: number
  label: string
  hint: string
  compact?: boolean
}) {
  const pct = Math.round(value * 100)
  return (
    <label className={`${styles.monitor} ${compact ? styles.monitorCompact : ''}`} title={hint}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        aria-label={label}
        aria-valuetext={`${pct}%`}
        onChange={(event) => engine.setRecMonitor(Number(event.target.value) / 100)}
      />
      <em>{pct}%</em>
    </label>
  )
}