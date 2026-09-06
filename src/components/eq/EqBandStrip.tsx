import type { CSSProperties } from 'react'
import {
  bandUsesGain,
  bandUsesSlope,
  bandUsesWidth,
  bandwidthHz,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  formatEqHz,
  qFromBandwidth,
  slopeFromNormalized,
  slopeToNormalized,
  nearestFilterSlope,
  type EqBand,
} from '../../audio/engine/eqBands'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import { EQ_BAND_LFO_IDS, eqBandLfoKind, lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
import { engine } from '../../hooks/useEngine'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ValueKnob } from '../controls/ValueKnob'
import { FxLfoSection } from '../inspector/FxLfoSection'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import { eqBandAccentVars } from './eqBandStyle'
import styles from './EqConsole.module.css'

type Props = {
  snap: EngineSnapshot
  instanceId: string
  index: number
  band: EqBand
  label: string
}

export function EqBandStrip({ snap, instanceId, index, band, label }: Props) {
  const ids = EQ_BAND_LFO_IDS[index]
  if (!ids) return null
  const setBand = (patch: Partial<EqBand>) => engine.setEqBand(index, patch, instanceId)
  const liveFreq = snap.liveParams[ids.freq] ?? band.frequency
  const liveGain = snap.liveParams[ids.gain] ?? band.gain
  const liveQ = snap.liveParams[ids.q] ?? band.q
  const freqLfo = lfoRangeFor(snap, ids.freq, toNormalized(band.frequency, PARAMS.eq1Freq))
  const gainLfo = lfoRangeFor(snap, ids.gain, toNormalized(band.gain, PARAMS.eq1Gain))
  const qLfo = lfoRangeFor(snap, ids.q, toNormalized(band.q, PARAMS.eq1Q))
  const showGain = bandUsesGain(band.type) || band.type === 'off'
  const showWidth = bandUsesWidth(band.type)

  return (
    <article
      className={`${styles.strip} ${band.type === 'off' || band.bypassed ? styles.stripOff : ''}`}
      style={eqBandAccentVars(band.frequency) as CSSProperties}
    >
      <header className={styles.stripHead}>
        <span className={styles.stripLabel}>{label}</span>
      </header>
      <EqFilterTypeMenu
        value={band.type}
        onChange={(type) =>
          setBand(
            (type === 'highpass' || type === 'lowpass') && band.slope < 24
              ? { type, slope: 48 }
              : { type },
          )
        }
        bypassed={Boolean(band.bypassed)}
        onBypass={() => setBand({ bypassed: !band.bypassed })}
      />
      <div className={styles.params}>
      <LfoParamShell id={ids.freq}>
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
      </LfoParamShell>
      {bandUsesSlope(band.type) ? (
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
      ) : showGain ? (
        <LfoParamShell id={ids.gain}>
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
        </LfoParamShell>
      ) : (
        <div className={styles.slotPlaceholder} aria-hidden="true" />
      )}
      {showWidth ? (
        <LfoParamShell id={ids.q}>
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
        </LfoParamShell>
      ) : (
        <LfoParamShell id={ids.q}>
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
        </LfoParamShell>
      )}
      </div>
      <FxLfoSection snap={snap} kind={eqBandLfoKind(index)} variant="knob" compact />
    </article>
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
