import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dbToMeterPct } from '../../app/editorState'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { timeDomainPeakDb } from '../../audio/engine/timePeak'
import { formatMixerDb, formatPan } from '../../audio/mix/mixerParams'
import { arcPath, knobAngleDeg, polar } from '../controls/knobGeom'
import {
  anyTrackSoloed,
  faderNormalized,
  mixFromFaderNormalized,
  mixToDbLabel,
  TRACK_FADER_MIN_DB,
  trackColorVar,
  trackFaderMaxDb,
  type MixTrack,
} from '../../audio/mix/tracks'
import { meterChannelCount } from '../../audio/mix/sourcePosition'
import { LfoParamShell } from '../controls/LfoParamShell'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './TrackMixer.module.css'

const METER_FLOOR_DB = -48

type MeterBind = {
  el: HTMLElement
  shown: number
  axis: 'x' | 'y'
  read: () => number
  scratch: { data: Float32Array | null }
}
const meterBinds = new Set<MeterBind>()
let meterFrame = 0
let meterLast = 0

function paintMeters(now: number): void {
  if (meterBinds.size === 0) {
    meterFrame = 0
    return
  }
  meterFrame = requestAnimationFrame(paintMeters)
  if (isDocumentHidden() || now - meterLast < paintIntervalMs(engine.getSnapshot().playing)) return
  meterLast = now
  for (const bind of meterBinds) {
    const db = bind.read()
    const target = dbToMeterPct(db, METER_FLOOR_DB)
    bind.shown = target > bind.shown ? target : bind.shown * 0.82
    const level = Math.max(0, bind.shown) / 100
    bind.el.style.transform = bind.axis === 'y' ? `scaleY(${level})` : `scaleX(${level})`
  }
}

/** One shared painter for every track meter and the mixer master meter. */
export function bindLevelMeter(
  el: HTMLElement | null,
  read: (scratch: { data: Float32Array | null }) => number,
  axis: 'x' | 'y' = 'y',
): () => void {
  if (!el) return () => {}
  const scratch = { data: null as Float32Array | null }
  const bind: MeterBind = { el, shown: 0, axis, scratch, read: () => read(scratch) }
  meterBinds.add(bind)
  if (!meterFrame) meterFrame = requestAnimationFrame(paintMeters)
  return () => {
    meterBinds.delete(bind)
  }
}

function bindTrackMeter(id: string, el: HTMLElement | null, channel: 'mono' | 'left' | 'right'): () => void {
  return bindLevelMeter(el, (scratch) => {
    const meters = engine.getTrackMeters(id)
    const node = channel === 'right' ? meters.right : meters.left
    return timeDomainPeakDb(node, scratch)
  }, 'y')
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

  useEffect(() => bindTrackMeter(track.id, meterRef.current, 'mono'), [track.id])

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
      <span className={phone ? styles.meterY : styles.meter} aria-hidden>
        <span ref={meterRef} className={phone ? styles.meterFillY : styles.meterFill} />
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

/** Compact right-side mixer. Pan is a knob, volume is a fader, the meter is separate. */
export function TrackStrip({
  track,
  tracks,
  selected,
  tall = false,
}: {
  track: MixTrack
  tracks: readonly MixTrack[]
  selected: boolean
  tall?: boolean
}) {
  const dimmed = anyTrackSoloed(tracks) && !track.solo
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()
  return (
    <div
      className={`${styles.strip} ${tall ? styles.stripTall : ''}`}
      data-track-strip={track.id}
      data-audible={dimmed ? 'false' : 'true'}
      style={{ ['--lane' as string]: trackColorVar(track.color) }}
      onClick={stop}
      onPointerDown={stop}
    >
      <TrackPan track={track} selected={selected} />
      <div className={styles.faderRow}>
        <TrackVolume track={track} selected={selected} />
        <TrackLevelMeter trackId={track.id} channels={track.channelCount} />
      </div>
      <MuteSolo track={track} />
    </div>
  )
}

export function TrackPan({ track, selected }: { track: MixTrack; selected: boolean }) {
  const { t } = useI18n()
  const knob = (
    <PanKnob
      value={track.pan}
      label={t.mix.panTrack(track.name)}
      onChange={(pan) => engine.setTrack(track.id, { pan })}
    />
  )
  return selected ? <LfoParamShell id="mixPan">{knob}</LfoParamShell> : knob
}

export function TrackVolume({ track, selected }: { track: MixTrack; selected: boolean }) {
  const { t } = useI18n()
  const fader = (
    <VolumeFader
      mix={track.mix}
      label={t.mix.volumeTrack(track.name)}
      onChange={(mix) => engine.setTrack(track.id, { mix })}
    />
  )
  return selected ? <LfoParamShell id="mixVolume">{fader}</LfoParamShell> : fader
}

export function MuteSolo({ track }: { track: MixTrack }) {
  const { t } = useI18n()
  return (
    <div className={styles.flags}>
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
    </div>
  )
}

export function TrackLevelMeter({ trackId, channels }: { trackId: string; channels: number }) {
  const stereo = meterChannelCount(channels) === 2
  const leftRef = useRef<HTMLSpanElement>(null)
  const rightRef = useRef<HTMLSpanElement>(null)
  useEffect(() => bindTrackMeter(trackId, leftRef.current, stereo ? 'left' : 'mono'), [trackId, stereo])
  useEffect(() => bindTrackMeter(trackId, stereo ? rightRef.current : null, 'right'), [trackId, stereo])
  return (
    <span className={styles.meterGroup} data-level-meter="" data-meter-channels={stereo ? 2 : 1} aria-hidden>
      <span className={styles.meterY}>
        <span ref={leftRef} className={styles.meterFillY} />
      </span>
      {stereo ? (
        <span className={styles.meterY}>
          <span ref={rightRef} className={styles.meterFillY} />
        </span>
      ) : null}
    </span>
  )
}

function PanKnob({
  value,
  label,
  onChange,
}: {
  value: number
  label: string
  onChange: (pan: number) => void
}) {
  const normalized = (Math.min(100, Math.max(-100, value)) + 100) / 200
  const angle = knobAngleDeg(normalized)
  const tip = polar(20, 20, 11, angle)
  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const startY = event.clientY
    const start = value
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const move = (ev: PointerEvent) => {
      const next = Math.round(Math.min(100, Math.max(-100, start + (startY - ev.clientY) * 0.8)))
      onChange(next)
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }
  return (
    <button
      type="button"
      className={styles.panKnob}
      data-pan-knob=""
      role="slider"
      aria-label={label}
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={formatPan(value)}
      onPointerDown={drag}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onChange(0)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 1
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          onChange(Math.min(100, value + step))
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          onChange(Math.max(-100, value - step))
        }
        if (event.key === 'Home') onChange(-100)
        if (event.key === 'End') onChange(100)
      }}
    >
      <svg className={styles.panSvg} viewBox="0 0 40 40" aria-hidden>
        <path d={arcPath(20, 20, 14, 135, 405)} className={styles.panTrack} />
        <path d={arcPath(20, 20, 14, 135, angle)} className={styles.panValue} />
        <line x1="20" y1="20" x2={tip.x} y2={tip.y} className={styles.panNeedle} />
      </svg>
      <span className={styles.panRead}>{formatPan(value)}</span>
    </button>
  )
}

function VolumeFader({
  mix,
  label,
  onChange,
}: {
  mix: number
  label: string
  onChange: (mix: number) => void
}) {
  const maxDb = trackFaderMaxDb()
  const unity = (0 - TRACK_FADER_MIN_DB) / (maxDb - TRACK_FADER_MIN_DB)
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const rail = event.currentTarget
    const apply = (clientY: number) => {
      const rect = rail.getBoundingClientRect()
      if (rect.height <= 0) return
      const normalized = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
      onChange(Math.round(mixFromFaderNormalized(normalized)))
    }
    apply(event.clientY)
    rail.setPointerCapture(event.pointerId)
    const move = (ev: PointerEvent) => apply(ev.clientY)
    const up = () => {
      rail.removeEventListener('pointermove', move)
      rail.removeEventListener('pointerup', up)
    }
    rail.addEventListener('pointermove', move)
    rail.addEventListener('pointerup', up)
  }
  return (
    <div
      className={styles.fader}
      data-volume-fader=""
      role="slider"
      aria-label={label}
      aria-valuemin={Math.round(TRACK_FADER_MIN_DB)}
      aria-valuemax={Math.round(maxDb)}
      aria-valuenow={Math.round(mix)}
      aria-valuetext={mixToDbLabel(mix)}
      tabIndex={0}
      onPointerDown={drag}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onChange(100)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 5 : 1
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
          event.preventDefault()
          onChange(Math.min(150, mix + step))
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
          event.preventDefault()
          onChange(Math.max(0, mix - step))
        }
        if (event.key === 'Home') onChange(0)
        if (event.key === 'End') onChange(100)
      }}
    >
      <span className={styles.faderUnity} style={{ bottom: `${unity * 100}%` }} />
      <span className={styles.faderCap} style={{ bottom: `${faderNormalized(mix) * 100}%` }} />
    </div>
  )
}
