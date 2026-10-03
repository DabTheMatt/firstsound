import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isFixedType, type ChainModule } from '../../audio/chain/chain'
import { dbToMeterPct } from '../../app/editorState'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import { timeDomainPeakDb } from '../../audio/engine/timePeak'
import { trackColorVar, type MixTrack } from '../../audio/mix/tracks'
import { formatAccessibleValue, paramDescription } from '../../a11y'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { ValueKnob } from '../controls/ValueKnob'
import { MeterScale, TrackLevelMeter, TrackMuteSolo, TrackPanKnob, TrackVolumeFader } from './TrackMixer'
import { LfoParamShell } from '../controls/LfoParamShell'
import strip from './TrackMixer.module.css'
import styles from './MixerView.module.css'

const OUTPUT_TICKS = [-24, -12, 0, 6]

type Props = {
  tracks: readonly MixTrack[]
  selectedId: string
  onSelectTrack: (trackId: string) => void
  onInspectEffect: (trackId: string, instanceId: string) => void
}

/** Presentation of the existing tracks. Switching here does not rebuild DSP. */
export function MixerView({ tracks, selectedId, onSelectTrack, onInspectEffect }: Props) {
  const { t, moduleName } = useI18n()
  return (
    <div className={styles.desk} data-mixer-view="" role="list">
      {tracks.map((track, index) => {
        const chain = engine.trackChain(track.id) as ChainModule[]
        const effects = chain.filter((mod) => !isFixedType(mod.type))
        const selected = track.id === selectedId
        const loaded = track.channelCount > 0 || Boolean(track.fileName)
        return (
          <article
            key={track.id}
            className={`${styles.channel} ${selected ? styles.channelOn : ''}`}
            data-mixer-channel={track.id}
            data-selected={selected ? 'true' : 'false'}
            style={{ ['--lane' as string]: trackColorVar(track.color) }}
            role="listitem"
            onClick={() => onSelectTrack(track.id)}
          >
            <header className={styles.identity}>
              <span className={styles.swatch} style={{ background: trackColorVar(track.color) }} />
              <span className={styles.index}>{index + 1}</span>
              <span className={styles.name}>{track.name}</span>
              <span className={styles.kind}>{loaded ? (track.channelCount >= 2 ? t.mix.stereo : t.mix.mono) : t.mix.empty}</span>
            </header>
            {selected ? (
              <LfoParamShell id="mixPan">
                <TrackPanKnob track={track} />
              </LfoParamShell>
            ) : (
              <TrackPanKnob track={track} />
            )}
            <div className={styles.faderRow}>
              {selected ? (
                <LfoParamShell id="mixVolume" fill>
                  <TrackVolumeFader track={track} />
                </LfoParamShell>
              ) : (
                <TrackVolumeFader track={track} />
              )}
              <MeterScale />
              <TrackLevelMeter track={track} />
            </div>
            <TrackMuteSolo track={track} />
            <button
              type="button"
              className={styles.input}
              onClick={(event) => {
                event.stopPropagation()
                onSelectTrack(track.id)
              }}
            >
              {t.mix.input}
            </button>
            <ul className={styles.fx}>
              {effects.map((mod) => (
                <li key={mod.instanceId}>
                  <button
                    type="button"
                    className={mod.bypassed ? styles.fxBypass : styles.fxBtn}
                    data-mixer-effect={mod.instanceId}
                    onClick={(event) => {
                      event.stopPropagation()
                      onInspectEffect(track.id, mod.instanceId)
                    }}
                  >
                    {moduleName(mod.type)}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
      <MasterStrip />
    </div>
  )
}

function MasterStrip() {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const gain = PARAMS.outputGain
  return (
    <article className={`${styles.channel} ${styles.master}`} data-mixer-master="">
      <header className={styles.identity}>
        <span className={styles.swatch} style={{ background: 'var(--text-secondary)' }} />
        <span className={styles.index}>Σ</span>
        <span className={styles.name}>{t.mix.master}</span>
        <span className={styles.kind}>{t.mix.output}</span>
      </header>
      <div className={strip.pan}>
        <ValueKnob
          dialOnly
          label={t.mix.out}
          valueText={formatParamValue(snap.params.outputGain, gain)}
          valueTextAccessible={formatAccessibleValue(snap.params.outputGain, gain, locale)}
          description={paramDescription('outputGain', locale)}
          normalized={toNormalized(snap.params.outputGain, gain)}
          min={gain.min}
          max={gain.max}
          now={Number(snap.params.outputGain.toFixed(3))}
          onChange={(n) => engine.setParam('outputGain', fromNormalized(n, gain))}
          onReset={() => engine.resetParam('outputGain')}
        />
      </div>
      <div className={styles.faderRow}>
        <OutputFader />
        <MeterScale />
        <MasterMeters />
      </div>
      <div className={strip.flags} aria-hidden>
        <span className={styles.flagGhost} />
        <span className={styles.flagGhost} />
      </div>
      <div className={styles.input}>{t.mix.output}</div>
    </article>
  )
}

function OutputFader() {
  const { t } = useI18n()
  const snap = useEngine()
  const gain = PARAMS.outputGain
  const ratio = toNormalized(snap.params.outputGain, gain)
  const setFromClient = (clientY: number, rect: DOMRect) => {
    if (!(rect.height >= 24)) return
    const normalized = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height))
    engine.setParam('outputGain', fromNormalized(normalized, gain))
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    const apply = (ev: PointerEvent) => setFromClient(ev.clientY, el.getBoundingClientRect())
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
    <div className={strip.faderCol}>
      <div
        className={strip.fader}
        role="slider"
        tabIndex={0}
        aria-label={t.mix.out}
        aria-valuemin={gain.min}
        aria-valuemax={gain.max}
        aria-valuenow={Number(snap.params.outputGain.toFixed(1))}
        aria-valuetext={formatParamValue(snap.params.outputGain, gain)}
        onPointerDown={onPointerDown}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 1 : 0.5
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
            event.preventDefault()
            engine.setParam('outputGain', Math.min(gain.max, snap.params.outputGain + step))
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
            event.preventDefault()
            engine.setParam('outputGain', Math.max(gain.min, snap.params.outputGain - step))
          } else if (event.key === 'Home') engine.setParam('outputGain', gain.min)
          else if (event.key === 'End') engine.setParam('outputGain', gain.defaultValue)
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          engine.resetParam('outputGain')
        }}
      >
        <span className={strip.faderSlot} />
        <span className={strip.faderTicks} aria-hidden>
          {OUTPUT_TICKS.map((db) => (
            <span key={db} style={{ bottom: `${toNormalized(db, gain) * 100}%` }}>
              <i />
              {db === 0 ? <em>0</em> : null}
            </span>
          ))}
        </span>
        <span className={strip.faderCap} style={{ bottom: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function MasterMeters() {
  const { t } = useI18n()
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let frame = 0
    const scratchL = { data: null as Float32Array | null }
    const scratchR = { data: null as Float32Array | null }
    let shownL = 0
    let shownR = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const { left, right } = engine.getChannelAnalysers()
      const l = timeDomainPeakDb(left, scratchL)
      const r = timeDomainPeakDb(right ?? left, scratchR)
      const targetL = dbToMeterPct(l, -60)
      const targetR = dbToMeterPct(r, -60)
      shownL = targetL > shownL ? targetL : shownL * 0.82
      shownR = targetR > shownR ? targetR : shownR * 0.82
      if (leftRef.current) leftRef.current.style.height = `${Math.max(0, shownL)}%`
      if (rightRef.current) rightRef.current.style.height = `${Math.max(0, shownR)}%`
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div className={strip.meterCol} data-master-meter="">
      <span className={strip.clip} aria-hidden>
        {t.meters.clip}
      </span>
      <div className={strip.meters} role="group" aria-label={t.meters.peak('L R')}>
        <div className={strip.meterLane}>
          <div ref={leftRef} className={strip.meterFill} />
          <span>L</span>
        </div>
        <div className={strip.meterLane}>
          <div ref={rightRef} className={strip.meterFill} />
          <span>R</span>
        </div>
      </div>
    </div>
  )
}
