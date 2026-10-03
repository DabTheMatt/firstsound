import { useEffect, useRef } from 'react'
import { isFixedType, type ChainModule } from '../../audio/chain/chain'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import { timeDomainPeakDb } from '../../audio/engine/timePeak'
import { trackColorVar, type MixTrack } from '../../audio/mix/tracks'
import { formatAccessibleValue, paramDescription } from '../../a11y'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { ValueKnob } from '../controls/ValueKnob'
import { TrackLevelMeter, TrackMuteSolo, TrackPanKnob, TrackVolumeFader } from './TrackMixer'
import { LfoParamShell } from '../controls/LfoParamShell'
import styles from './MixerView.module.css'

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
                <LfoParamShell id="mixVolume">
                  <TrackVolumeFader track={track} />
                </LfoParamShell>
              ) : (
                <TrackVolumeFader track={track} />
              )}
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
  const leftRef = useRef<HTMLSpanElement>(null)
  const rightRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frame = 0
    const scratchL = { data: null as Float32Array | null }
    const scratchR = { data: null as Float32Array | null }
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const { left, right } = engine.getChannelAnalysers()
      const l = timeDomainPeakDb(left, scratchL)
      const r = timeDomainPeakDb(right ?? left, scratchR)
      if (leftRef.current) leftRef.current.style.height = `${Math.max(0, Math.min(100, ((l + 60) / 60) * 100))}%`
      if (rightRef.current) rightRef.current.style.height = `${Math.max(0, Math.min(100, ((r + 60) / 60) * 100))}%`
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <article className={`${styles.channel} ${styles.master}`} data-mixer-master="">
      <header className={styles.identity}>
        <span className={styles.name}>{t.mix.master}</span>
        <span className={styles.kind}>{t.mix.output}</span>
      </header>
      <ValueKnob
        compact
        label={t.mix.out}
        valueText={formatParamValue(snap.params.outputGain, PARAMS.outputGain)}
        valueTextAccessible={formatAccessibleValue(snap.params.outputGain, PARAMS.outputGain, locale)}
        description={paramDescription('outputGain', locale)}
        normalized={toNormalized(snap.params.outputGain, PARAMS.outputGain)}
        min={PARAMS.outputGain.min}
        max={PARAMS.outputGain.max}
        now={Number(snap.params.outputGain.toFixed(3))}
        onChange={(n) => engine.setParam('outputGain', fromNormalized(n, PARAMS.outputGain))}
        onReset={() => engine.resetParam('outputGain')}
      />
      <span className={styles.masterMeters} data-master-meter="" aria-hidden>
        <span className={styles.meter}>
          <span ref={leftRef} className={styles.meterFill} />
        </span>
        <span className={styles.meter}>
          <span ref={rightRef} className={styles.meterFill} />
        </span>
      </span>
    </article>
  )
}
