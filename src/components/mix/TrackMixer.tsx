import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { dbToMeterPct } from '../../app/editorState'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { timeDomainPeakDb } from '../../audio/engine/timePeak'
import { formatMixerDb, formatPan } from '../../audio/mix/mixerParams'
import { TRACK_MIX_MAX, anyTrackSoloed, mixToDbLabel, trackColorVar, type MixTrack } from '../../audio/mix/tracks'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ValueKnob } from '../controls/ValueKnob'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './TrackMixer.module.css'

const METER_FLOOR_DB = -60
const CLIP_DB = -0.1
/** Ticks that fit the existing 0…150 mix law. +6 dB is above that law, so it is not drawn. */
const FADER_DB = [0, -6, -12, -24, -48, -60]

type MeterBind = {
  id: string
  stereo: boolean
  left: HTMLElement
  right: HTMLElement | null
  shownL: number
  shownR: number
  clipped: boolean
  onClip: () => void
}

const meterBinds = new Set<MeterBind>()
let meterFrame = 0
let meterLast = 0
const scratchL = { data: null as Float32Array | null }
const scratchR = { data: null as Float32Array | null }

function paintMeters(now: number): void {
  if (meterBinds.size === 0) {
    meterFrame = 0
    return
  }
  meterFrame = requestAnimationFrame(paintMeters)
  if (isDocumentHidden() || now - meterLast < paintIntervalMs(engine.getSnapshot().playing)) return
  meterLast = now
  for (const bind of meterBinds) {
    const pair = engine.getTrackMeterPair(bind.id)
    const leftDb = timeDomainPeakDb(pair?.left ?? engine.getTrackAnalyser(bind.id), scratchL)
    const rightDb = bind.stereo ? timeDomainPeakDb(pair?.right ?? null, scratchR) : leftDb
    if (!bind.clipped && (leftDb >= CLIP_DB || rightDb >= CLIP_DB)) {
      bind.clipped = true
      bind.onClip()
    }
    const targetL = dbToMeterPct(leftDb, METER_FLOOR_DB)
    const targetR = dbToMeterPct(rightDb, METER_FLOOR_DB)
    bind.shownL = targetL > bind.shownL ? targetL : bind.shownL * 0.82
    bind.shownR = targetR > bind.shownR ? targetR : bind.shownR * 0.82
    bind.left.style.height = `${Math.max(0, bind.shownL)}%`
    if (bind.right) bind.right.style.height = `${Math.max(0, bind.shownR)}%`
  }
}

function bindTrackMeter(
  id: string,
  stereo: boolean,
  left: HTMLElement | null,
  right: HTMLElement | null,
  onClip: () => void,
): () => void {
  if (!left) return () => {}
  const bind: MeterBind = { id, stereo, left, right, shownL: 0, shownR: 0, clipped: false, onClip }
  meterBinds.add(bind)
  if (!meterFrame) meterFrame = requestAnimationFrame(paintMeters)
  return () => {
    meterBinds.delete(bind)
  }
}

function mixFromDb(db: number): number {
  return 100 * 10 ** (db / 20)
}

function faderRatio(mix: number): number {
  return Math.min(1, Math.max(0, mix / TRACK_MIX_MAX))
}

type Props = {
  track: MixTrack
  tracks: readonly MixTrack[]
  phone?: boolean
  variant?: 'lane' | 'bar'
  selected?: boolean
}

export function TrackPanKnob({ track }: { track: MixTrack }) {
  const { t } = useI18n()
  return (
    <div className={styles.pan} style={{ ['--knob-arc' as string]: trackColorVar(track.color) }}>
      <ValueKnob
        dialOnly
        bipolar
        label={t.mix.pan}
        valueText={formatPan(track.pan)}
        valueTextAccessible={formatPan(track.pan)}
        description={t.mix.panTrack(track.name)}
        normalized={(track.pan + 100) / 200}
        min={-100}
        max={100}
        now={track.pan}
        onChange={(normalized) => engine.setTrack(track.id, { pan: Math.round(normalized * 200 - 100) })}
        onReset={() => engine.setTrack(track.id, { pan: 0 })}
      />
    </div>
  )
}

export function TrackVolumeFader({ track, orientation = 'vertical' }: { track: MixTrack; orientation?: 'vertical' | 'horizontal' }) {
  const { t } = useI18n()
  const ratio = faderRatio(track.mix)
  const setFromClient = (client: number, rect: DOMRect) => {
    const span = orientation === 'vertical' ? rect.height : rect.width
    // A collapsed track used to map every click to silence. Ignore it.
    if (!(span >= 24)) return
    const local = orientation === 'vertical' ? rect.bottom - client : client - rect.left
    const next = Math.round(Math.min(1, Math.max(0, local / span)) * TRACK_MIX_MAX)
    engine.setTrack(track.id, { mix: next })
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    const apply = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      setFromClient(orientation === 'vertical' ? ev.clientY : ev.clientX, rect)
    }
    apply(event.nativeEvent)
    const move = (ev: PointerEvent) => apply(ev)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
  return (
    <div className={orientation === 'vertical' ? styles.faderCol : styles.faderRow}>
      {orientation === 'vertical' ? (
        <div className={styles.dbScale} aria-hidden>
          {FADER_DB.map((db) => (
            <span key={db} style={{ bottom: `${faderRatio(mixFromDb(db)) * 100}%` }}>
              {db === 0 ? '0' : db}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={orientation === 'vertical' ? styles.fader : styles.faderH}
        role="slider"
        tabIndex={0}
        aria-label={t.mix.volumeTrack(track.name)}
        aria-valuemin={0}
        aria-valuemax={TRACK_MIX_MAX}
        aria-valuenow={track.mix}
        aria-valuetext={mixToDbLabel(track.mix)}
        onPointerDown={onPointerDown}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 2
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
            event.preventDefault()
            engine.setTrack(track.id, { mix: Math.min(TRACK_MIX_MAX, track.mix + step) })
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
            event.preventDefault()
            engine.setTrack(track.id, { mix: Math.max(0, track.mix - step) })
          } else if (event.key === 'Home') engine.setTrack(track.id, { mix: 0 })
          else if (event.key === 'End') engine.setTrack(track.id, { mix: 100 })
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          engine.setTrack(track.id, { mix: 100 })
        }}
      >
        <span className={styles.faderFill} style={orientation === 'vertical' ? { height: `${ratio * 100}%` } : { width: `${ratio * 100}%` }} />
        <span
          className={styles.faderCap}
          style={orientation === 'vertical' ? { bottom: `${ratio * 100}%` } : { left: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}

export function TrackLevelMeter({ track }: { track: MixTrack }) {
  const { t } = useI18n()
  const stereo = track.channelCount >= 2
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const [clipped, setClipped] = useState(false)
  useEffect(
    () => bindTrackMeter(track.id, stereo, leftRef.current, stereo ? rightRef.current : null, () => setClipped(true)),
    [track.id, stereo],
  )
  return (
    <div className={styles.meterCol} aria-hidden={false}>
      <button
        type="button"
        className={`${styles.clip} ${clipped ? styles.clipOn : ''}`}
        aria-pressed={clipped}
        aria-label={t.meters.clip}
        onClick={(event) => {
          event.stopPropagation()
          setClipped(false)
        }}
      >
        {t.meters.clip}
      </button>
      <div className={styles.meters} role="group" aria-label={t.meters.peak(stereo ? 'L R' : 'M')}>
        <div className={styles.meterLane}>
          <div ref={leftRef} className={styles.meterFill} />
          <span>{stereo ? 'L' : 'M'}</span>
        </div>
        {stereo ? (
          <div className={styles.meterLane}>
            <div ref={rightRef} className={styles.meterFill} />
            <span>R</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function TrackMuteSolo({ track }: { track: MixTrack }) {
  const { t } = useI18n()
  return (
    <div className={styles.flags}>
      <button
        type="button"
        className={`${styles.flag} ${track.muted ? styles.muteOn : ''}`}
        aria-pressed={track.muted}
        aria-label={t.mix.muteTrack(track.name)}
        onClick={() => engine.setTrack(track.id, { muted: !track.muted })}
      >
        M
      </button>
      <button
        type="button"
        className={`${styles.flag} ${track.solo ? styles.soloOn : ''}`}
        aria-pressed={track.solo}
        aria-label={t.mix.soloTrack(track.name)}
        onClick={() => engine.setTrack(track.id, { solo: !track.solo })}
      >
        S
      </button>
    </div>
  )
}

function MsPopover({ track, anchor, onClose }: { track: MixTrack; anchor: HTMLElement; onClose: () => void }) {
  const { t } = useI18n()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const width = 180
      let left = rect.left
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
      let top = rect.top - 72
      if (top < 8) top = rect.bottom + 6
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (node && (anchor.contains(node) || menuRef.current?.contains(node))) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [anchor, onClose])
  if (!pos) return null
  return createPortal(
    <div ref={menuRef} className={styles.msPop} style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={t.mix.midSide}>
      <label>
        <span>{t.mix.mid}</span>
        <input
          type="range"
          min={-60}
          max={12}
          step={0.1}
          value={track.midDb}
          aria-label={t.mix.midTrack(track.name)}
          onChange={(event) => engine.setTrack(track.id, { midDb: Number(event.target.value) })}
        />
        <em>{formatMixerDb(track.midDb)}</em>
      </label>
      <label>
        <span>{t.mix.side}</span>
        <input
          type="range"
          min={-60}
          max={12}
          step={0.1}
          value={track.sideDb}
          aria-label={t.mix.sideTrack(track.name)}
          onChange={(event) => engine.setTrack(track.id, { sideDb: Number(event.target.value) })}
        />
        <em>{formatMixerDb(track.sideDb)}</em>
      </label>
    </div>,
    document.body,
  )
}

/** Lane strip and the waveform mixer bar. Both edit the same MixTrack. */
export function TrackMixer({ track, tracks, phone = false, variant = 'lane', selected = false }: Props) {
  const { t } = useI18n()
  const stereo = track.channelCount >= 2
  const dimmed = anyTrackSoloed(tracks) && !track.solo
  const [msAnchor, setMsAnchor] = useState<HTMLElement | null>(null)
  const horizontal = variant === 'bar'
  const pan = <TrackPanKnob track={track} />
  const fader = <TrackVolumeFader track={track} orientation={horizontal ? 'horizontal' : 'vertical'} />
  const volume = selected ? (
    <LfoParamShell id="mixVolume" fill={!horizontal}>
      {fader}
    </LfoParamShell>
  ) : (
    fader
  )
  return (
    <div
      className={`${styles.strip} ${variant === 'bar' ? styles.bar : ''} ${phone ? styles.phone : ''}`}
      data-track-strip={track.id}
      data-track-mixer={track.id}
      data-audible={dimmed ? 'false' : 'true'}
      style={{ ['--lane' as string]: trackColorVar(track.color) }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {variant === 'bar' ? <span className={styles.kicker}>{track.name}</span> : null}
      {selected ? <LfoParamShell id="mixPan">{pan}</LfoParamShell> : pan}
      <div className={styles.faderMeter}>
        {volume}
        <TrackLevelMeter track={track} />
      </div>
      <div className={styles.bottom}>
        <TrackMuteSolo track={track} />
        {stereo ? (
          <button
            type="button"
            className={`${styles.flag} ${msAnchor ? styles.msOn : ''}`}
            aria-expanded={Boolean(msAnchor)}
            aria-label={t.mix.midSideTrack(track.name)}
            onClick={(event) => setMsAnchor((cur) => (cur ? null : event.currentTarget))}
          >
            MS
          </button>
        ) : null}
      </div>
      {msAnchor ? <MsPopover track={track} anchor={msAnchor} onClose={() => setMsAnchor(null)} /> : null}
    </div>
  )
}

/** Compact lane strip. Same controls as the mixer bar. */
export function TrackStrip({ track, tracks, selected }: { track: MixTrack; tracks: readonly MixTrack[]; selected: boolean }) {
  return <TrackMixer track={track} tracks={tracks} selected={selected} variant="lane" />
}
