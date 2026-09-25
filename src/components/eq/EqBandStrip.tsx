import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { eqColorIndex } from '../../audio/chain/chain'
import {
  bandUsesGain,
  bandUsesWidth,
  bandwidthHz,
  EQ_FILTER_TYPES,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  formatEqHz,
  qFromBandwidth,
  slopeFromNormalized,
  slopeToNormalized,
  nearestFilterSlope,
  type EqBand,
} from '../../audio/engine/eqBands'
import { selectEqBand } from '../../audio/engine/eqBandSelection'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import { EQ_BAND_LFO_IDS, eqBandLfoKind, lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { engine } from '../../hooks/useEngine'
import { loadSpectrumPrefs, subscribeSpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import { eqTone, readThemeColors } from '../../theme'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ValueKnob } from '../controls/ValueKnob'
import { FxLfoSection } from '../inspector/FxLfoSection'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import { eqStripAccentVars } from './eqBandStyle'
import styles from './EqConsole.module.css'

type Props = {
  snap: EngineSnapshot
  instanceId: string
  index: number
  band: EqBand
  label: string
  selected?: boolean
}

export function EqBandStrip({ snap, instanceId, index, band, label, selected = false }: Props) {
  const ids = EQ_BAND_LFO_IDS[index]
  const setBand = (patch: Partial<EqBand>) => engine.setEqBand(index, patch, instanceId)
  const modulate = eqInstanceUsesSharedLfo(snap.chain, instanceId)
  const liveFreq = modulate && ids ? (snap.liveParams[ids.freq] ?? band.frequency) : band.frequency
  const liveGain = modulate && ids ? (snap.liveParams[ids.gain] ?? band.gain) : band.gain
  const liveQ = modulate && ids ? (snap.liveParams[ids.q] ?? band.q) : band.q
  const freqLfo = modulate && ids ? lfoRangeFor(snap, ids.freq, toNormalized(band.frequency, PARAMS.eq1Freq)) : undefined
  const gainLfo = modulate && ids ? lfoRangeFor(snap, ids.gain, toNormalized(band.gain, PARAMS.eq1Gain)) : undefined
  const qLfo = modulate && ids ? lfoRangeFor(snap, ids.q, toNormalized(band.q, PARAMS.eq1Q)) : undefined
  const showGain = bandUsesGain(band.type) || band.type === 'off'
  const showWidth = bandUsesWidth(band.type)
  const [freqColors, setFreqColors] = useState(() => loadSpectrumPrefs().eqFreqColors)
  useEffect(() => subscribeSpectrumPrefs((prefs) => setFreqColors(prefs.eqFreqColors)), [])
  const instanceCurve = eqTone(eqColorIndex(snap.chain, instanceId), readThemeColors()).curve
  const accent = eqStripAccentVars({
    frequencyHz: liveFreq,
    instanceCurve,
    freqColors,
  }) as CSSProperties
  const typeLabel = EQ_FILTER_TYPES.find((item) => item.value === band.type)?.short ?? band.type

  return (
    <article
      className={`${styles.strip} ${selected ? styles.stripOn : ''} ${band.type === 'off' || band.bypassed ? styles.stripOff : ''}`}
      style={accent}
      onPointerDown={() => selectEqBand({ instanceId, index })}
    >
      <header className={styles.stripHead}>
        <span className={styles.stripMeta}>
          <span className={styles.stripLabel}>{label}</span>
          <span className={styles.stripType}>{typeLabel}</span>
        </span>
        <button
          type="button"
          className={`${styles.power} ${styles.powerHeader} ${band.bypassed ? styles.powerOff : styles.powerOn}`}
          aria-label={band.bypassed ? 'Enable filter' : 'Bypass filter'}
          title={band.bypassed ? 'Enable' : 'Bypass'}
          onClick={() => setBand({ bypassed: !band.bypassed })}
        >
          <PowerMark />
        </button>
      </header>
      <div className={styles.typeRow}>
        <EqFilterTypeMenu
          value={band.type}
          showBypass={false}
          onChange={(type) =>
            setBand(
              (type === 'highpass' || type === 'lowpass') && band.slope < 24
                ? { type, slope: 48 }
                : { type },
            )
          }
        />
      </div>
      <div className={styles.params}>
      <ParamSlot id={ids?.freq}>
        <ValueKnob
          compact
          label="Freq"
          valueText={formatEqHz(liveFreq)}
          baseValueText={freqLfo ? formatEqHz(band.frequency) : undefined}
          normalized={toNormalized(band.frequency, PARAMS.eq1Freq)}
          visualNormalized={toNormalized(liveFreq, PARAMS.eq1Freq)}
          lfoRange={freqLfo}
          min={EQ_MIN_HZ}
          max={EQ_MAX_HZ}
          now={band.frequency}
          onChange={(n) => setBand({ frequency: fromNormalized(n, PARAMS.eq1Freq) })}
          onTypedValue={(text) => {
            const next = parseTypedRange(text, EQ_MIN_HZ, EQ_MAX_HZ, 'Hz')
            if (next == null) return false
            setBand({ frequency: next })
            return true
          }}
        />
      </ParamSlot>
      {band.type === 'highpass' || band.type === 'lowpass' ? (
        <div className={styles.knobSlot}>
          <ValueKnob
            compact
            label="Slope"
            valueText={`${band.slope} dB`}
            normalized={slopeToNormalized(band.slope)}
            min={12}
            max={96}
            now={band.slope}
            onChange={(n) => setBand({ slope: slopeFromNormalized(n) })}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 12, 96, 'dB')
              if (next == null) return false
              setBand({ slope: nearestFilterSlope(next) })
              return true
            }}
          />
        </div>
      ) : showGain ? (
        <ParamSlot id={ids?.gain}>
          <ValueKnob
            compact
            label="Gain"
            valueText={`${liveGain.toFixed(1)} dB`}
            baseValueText={gainLfo ? `${band.gain.toFixed(1)} dB` : undefined}
            normalized={toNormalized(band.gain, PARAMS.eq1Gain)}
            visualNormalized={toNormalized(liveGain, PARAMS.eq1Gain)}
            lfoRange={gainLfo}
            min={-18}
            max={18}
            now={band.gain}
            onChange={(n) => setBand({ gain: fromNormalized(n, PARAMS.eq1Gain) })}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, -18, 18, 'dB')
              if (next == null) return false
              setBand({ gain: next })
              return true
            }}
          />
        </ParamSlot>
      ) : (
        <div className={styles.slotPlaceholder} aria-hidden="true" />
      )}
      {showWidth ? (
        <ParamSlot id={ids?.q}>
          <ValueKnob
            compact
            label="Width"
            valueText={formatEqHz(bandwidthHz(liveFreq, liveQ))}
            baseValueText={qLfo ? formatEqHz(bandwidthHz(band.frequency, band.q)) : undefined}
            normalized={widthToN(bandwidthHz(band.frequency, band.q))}
            visualNormalized={widthToN(bandwidthHz(liveFreq, liveQ))}
            lfoRange={qLfo}
            min={10}
            max={10000}
            now={bandwidthHz(band.frequency, band.q)}
            onChange={(n) => setBand({ q: qFromBandwidth(band.frequency, nToWidth(n)) })}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 10, 10000, 'Hz')
              if (next == null) return false
              setBand({ q: qFromBandwidth(band.frequency, next) })
              return true
            }}
          />
        </ParamSlot>
      ) : (
        <ParamSlot id={ids?.q}>
          <ValueKnob
            compact
            label="Q"
            valueText={liveQ.toFixed(2)}
            baseValueText={qLfo ? band.q.toFixed(2) : undefined}
            normalized={toNormalized(band.q, PARAMS.eq1Q)}
            visualNormalized={toNormalized(liveQ, PARAMS.eq1Q)}
            lfoRange={qLfo}
            min={0.1}
            max={20}
            now={band.q}
            onChange={(n) => setBand({ q: fromNormalized(n, PARAMS.eq1Q) })}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 0.1, 20)
              if (next == null) return false
              setBand({ q: next })
              return true
            }}
          />
        </ParamSlot>
      )}
      </div>
      {modulate && ids ? (
        <div className={styles.lfoSlot}>
          <FxLfoSection snap={snap} kind={eqBandLfoKind(index)} variant="knob" compact />
        </div>
      ) : null}
    </article>
  )
}

function PowerMark() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M8 2.5v5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5.15 4.35a4.2 4.2 0 1 0 5.7 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ParamSlot({ id, children }: { id?: ParamId; children: ReactNode }) {
  if (!id) return <div className={styles.knobSlot}>{children}</div>
  return (
    <LfoParamShell id={id}>
      <div className={styles.knobSlot}>{children}</div>
    </LfoParamShell>
  )
}

function lfoRangeFor(snap: EngineSnapshot, id: (typeof EQ_BAND_LFO_IDS)[number]['freq'], baseN: number) {
  const binding = lfoBinding(snap.fxLfos, id)
  return binding ? lfoRangeNormalized(baseN, binding.lfo.depth) : undefined
}

function widthToN(hz: number): number {
  const min = Math.log(10)
  const max = Math.log(10000)
  return (Math.log(Math.min(10000, Math.max(10, hz))) - min) / (max - min)
}

function nToWidth(n: number): number {
  return 10 * (10000 / 10) ** Math.min(1, Math.max(0, n))
}
