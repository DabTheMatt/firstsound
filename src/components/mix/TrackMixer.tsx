import { useEffect, useRef, useState } from 'react'
import { dbToMeterPct } from '../../app/editorState'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { timeDomainPeakDb } from '../../audio/engine/timePeak'
import { formatMixerDb, formatPan } from '../../audio/mix/mixerParams'
import { anyTrackSoloed, mixToDbLabel, trackColorVar, type MixTrack } from '../../audio/mix/tracks'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './TrackMixer.module.css'

const METER_FLOOR_DB = -48

type MeterBind = { id: string; el: HTMLElement; shown: number }
const meterBinds = new Set<MeterBind>()
let meterFrame = 0
let meterLast = 0
const meterScratch = { data: null as Float32Array | null }

function paintMeters(now: number): void {
  if (meterBinds.size === 0) {
    meterFrame = 0
    return
  }
  meterFrame = requestAnimationFrame(paintMeters)
  if (isDocumentHidden() || now - meterLast < paintIntervalMs(engine.getSnapshot().playing)) return
  meterLast = now
  for (const bind of meterBinds) {
    const db = timeDomainPeakDb(engine.getTrackAnalyser(bind.id), meterScratch)
    const target = dbToMeterPct(db, METER_FLOOR_DB)
    bind.shown = target > bind.shown ? target : bind.shown * 0.82
    bind.el.style.transform = `scaleX(${Math.max(0, bind.shown) / 100})`
  }
}

function bindTrackMeter(id: string, el: HTMLElement | null): () => void {
  if (!el) return () => {}
  const bind: MeterBind = { id, el, shown: 0 }
  meterBinds.add(bind)
  if (!meterFrame) meterFrame = requestAnimationFrame(paintMeters)
  return () => {
    meterBinds.delete(bind)
  }
}

type Props = {
  track: MixTrack
  tracks: readonly MixTrack[]
  phone?: boolean
  variant?: 'lane' | 'bar'
}

export function TrackMixer({ track, tracks, phone = false, variant = 'lane' }: Props) {
  const { t } = useI18n()
  const stereo = track.channelCount >= 2
  const [msOpen, setMsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const meterRef = useRef<HTMLSpanElement>(null)
  const dimmed = anyTrackSoloed(tracks) && !track.solo
  const showPan = !phone
  const showMs = stereo && !phone && msOpen
  const showMore = phone && moreOpen

  useEffect(() => bindTrackMeter(track.id, meterRef.current), [track.id])

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <div
      className={`${styles.mixer} ${variant === 'bar' ? styles.bar : ''} ${phone ? styles.phone : ''}`}
      data-track-mixer={track.id}
      data-audible={dimmed ? 'false' : 'true'}
      style={{ ['--lane' as string]: trackColorVar(track.color) }}
      onClick={stop}
      onPointerDown={stop}
    >
      {variant === 'bar' ? <span className={styles.kicker}>{t.mix.trackMix}</span> : null}
      <button
        type="button"
        className={`${styles.flag} ${track.muted ? styles.muteOn : ''}`}
        aria-pressed={track.muted}
        aria-label={t.mix.muteTrack(track.name)}
        title={t.mix.muteTrack(track.name)}
        onClick={() => engine.setTrack(track.id, { muted: !track.muted })}
      >
        M
      </button>
      <button
        type="button"
        className={`${styles.flag} ${track.solo ? styles.soloOn : ''}`}
        aria-pressed={track.solo}
        aria-label={t.mix.soloTrack(track.name)}
        title={t.mix.soloTrack(track.name)}
        onClick={() => engine.setTrack(track.id, { solo: !track.solo })}
      >
        S
      </button>
      {showPan ? (
        <label className={styles.slider}>
          <span className={styles.caption}>{t.mix.pan}</span>
          <span className={`${styles.readout} ${track.pan === 0 ? styles.unity : ''}`}>{formatPan(track.pan)}</span>
          <span className={styles.range}>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={track.pan}
              aria-label={t.mix.panTrack(track.name)}
              aria-valuetext={formatPan(track.pan)}
              onChange={(event) => engine.setTrack(track.id, { pan: Number(event.target.value) })}
            />
            <span className={`${styles.tick} ${styles.tickCenter}`} aria-hidden />
          </span>
        </label>
      ) : null}
      <label className={styles.slider}>
        <span className={styles.caption}>{t.mix.volume}</span>
        <span className={`${styles.readout} ${track.mix === 100 ? styles.unity : ''}`}>{mixToDbLabel(track.mix)}</span>
        <span className={styles.range}>
          <input
            type="range"
            min={0}
            max={150}
            step={1}
            value={track.mix}
            aria-label={t.mix.volumeTrack(track.name)}
            aria-valuetext={mixToDbLabel(track.mix)}
            onChange={(event) => engine.setTrack(track.id, { mix: Number(event.target.value) })}
          />
          <span className={`${styles.tick} ${styles.tickUnity}`} aria-hidden />
        </span>
      </label>
      <span className={styles.meter} aria-hidden>
        <span ref={meterRef} className={styles.meterFill} />
      </span>
      {stereo && !phone ? (
        <button
          type="button"
          className={`${styles.flag} ${msOpen ? styles.msOn : ''}`}
          aria-expanded={msOpen}
          aria-label={t.mix.midSideTrack(track.name)}
          onClick={() => setMsOpen((open) => !open)}
        >
          MS
        </button>
      ) : null}
      {phone ? (
        <button
          type="button"
          className={`${styles.flag} ${moreOpen ? styles.msOn : ''}`}
          aria-expanded={moreOpen}
          aria-label={stereo ? t.mix.midSideTrack(track.name) : t.mix.panTrack(track.name)}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {stereo ? 'MS' : t.mix.pan}
        </button>
      ) : null}
      {showMs || (showMore && stereo) ? (
        <div className={styles.msRow}>
          <MsSlider
            label={t.mix.mid}
            value={track.midDb}
            ariaLabel={t.mix.midTrack(track.name)}
            onChange={(midDb) => engine.setTrack(track.id, { midDb })}
          />
          <MsSlider
            label={t.mix.side}
            value={track.sideDb}
            ariaLabel={t.mix.sideTrack(track.name)}
            onChange={(sideDb) => engine.setTrack(track.id, { sideDb })}
          />
        </div>
      ) : null}
      {showMore ? (
        <label className={`${styles.slider} ${styles.morePan}`}>
          <span className={styles.caption}>{t.mix.pan}</span>
          <span className={`${styles.readout} ${track.pan === 0 ? styles.unity : ''}`}>{formatPan(track.pan)}</span>
          <span className={styles.range}>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={track.pan}
              aria-label={t.mix.panTrack(track.name)}
              aria-valuetext={formatPan(track.pan)}
              onChange={(event) => engine.setTrack(track.id, { pan: Number(event.target.value) })}
            />
            <span className={`${styles.tick} ${styles.tickCenter}`} aria-hidden />
          </span>
        </label>
      ) : null}
    </div>
  )
}

function MsSlider({
  label,
  value,
  ariaLabel,
  onChange,
}: {
  label: string
  value: number
  ariaLabel: string
  onChange: (value: number) => void
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.caption}>{label}</span>
      <span className={`${styles.readout} ${value === 0 ? styles.unity : ''}`}>{formatMixerDb(value)}</span>
      <span className={styles.range}>
        <input
          type="range"
          min={-60}
          max={12}
          step={0.1}
          value={value}
          aria-label={ariaLabel}
          aria-valuetext={formatMixerDb(value)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className={`${styles.tick} ${styles.tickMs}`} aria-hidden />
      </span>
    </label>
  )
}
