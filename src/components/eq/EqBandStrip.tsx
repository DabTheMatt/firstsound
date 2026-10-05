import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { eqColorIndex } from '../../audio/chain/chain'
import {
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
import { EQ_BAND_LFO_IDS, fxLfoIsActive, lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
import { liveControlNormalized, liveWidthNormalized, widthModulationRange } from '../modulation/modulationModel'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { engine } from '../../hooks/useEngine'
import { loadSpectrumPrefs, subscribeSpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import { eqTone, readThemeColors } from '../../theme'
import { LfoParamShell, ModulationScopeProvider } from '../controls/LfoParamShell'
import { ValueKnob } from '../controls/ValueKnob'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import { eqStripAccentVars } from './eqBandStyle'
import { eqStripParamSlots, type EqStripSlot } from './eqStripSlots'
import styles from './EqConsole.module.css'

type Props = {
  snap: EngineSnapshot
  instanceId: string
  index: number
  band: EqBand
  label: string
  selected?: boolean
  /** One horizontal card: type selector and small knobs. Used in the EQ inspector. */
  inline?: boolean
}

export function EqBandStrip({ snap, instanceId, index, band, label, selected = false, inline = false }: Props) {
  const ids = EQ_BAND_LFO_IDS[index]
  const setBand = (patch: Partial<EqBand>) => engine.setEqBand(index, patch, instanceId)
  const includeUnscoped = eqInstanceUsesSharedLfo(snap.chain, instanceId)
  const live = snap.liveByInstance[instanceId] ?? snap.liveParams
  const drives = (id: ParamId | undefined) => {
    if (!id) return false
    const binding = lfoBinding(snap.fxLfos, id)
    return Boolean(binding && fxLfoIsActive(binding.lfo) && (!binding.lfo.instanceId ? includeUnscoped : binding.lfo.instanceId === instanceId) && (!binding.lfo.bandId || binding.lfo.bandId === band.id))
  }
  const freqLfo = ids && drives(ids.freq) ? lfoRangeFor(snap, ids.freq, toNormalized(band.frequency, PARAMS.eq1Freq)) : undefined
  const gainLfo = ids && drives(ids.gain) ? lfoRangeFor(snap, ids.gain, toNormalized(band.gain, PARAMS.eq1Gain)) : undefined
  const qLfo = ids && drives(ids.q) ? lfoRangeFor(snap, ids.q, toNormalized(band.q, PARAMS.eq1Q)) : undefined
  const widthLfo = ids && drives(ids.q) ? widthModulationRange(snap.fxLfos, ids.q, band.frequency, band.q) : undefined
  const freqLive = ids ? liveControlNormalized(live[ids.freq], ids.freq, Boolean(freqLfo)) : undefined
  const gainLive = ids ? liveControlNormalized(live[ids.gain], ids.gain, Boolean(gainLfo)) : undefined
  const qLive = ids ? liveControlNormalized(live[ids.q], ids.q, Boolean(qLfo)) : undefined
  const widthLive = widthLfo && ids ? liveWidthNormalized(band.frequency, live[ids.q]) : undefined
  const [freqColors, setFreqColors] = useState(() => loadSpectrumPrefs().eqFreqColors)
  useEffect(() => subscribeSpectrumPrefs((prefs) => setFreqColors(prefs.eqFreqColors)), [])
  const instanceCurve = eqTone(eqColorIndex(snap.chain, instanceId), readThemeColors()).curve
  const accent = eqStripAccentVars({
    frequencyHz: band.frequency,
    instanceCurve,
    freqColors,
  }) as CSSProperties
  const typeLabel = EQ_FILTER_TYPES.find((item) => item.value === band.type)?.short ?? band.type
  const slots = eqStripParamSlots(band.type)

  const knob = (slot: EqStripSlot, mini: boolean) => {
    const size = mini
      ? { mini: true as const, actionsBelow: true as const }
      : { compact: true as const }
    if (slot === 'freq') {
      return (
        <ParamSlot id={ids?.freq} afford>
          <ValueKnob
            {...size}
            reserveBase
            label="Freq"
            valueText={formatEqHz(freqLive != null ? fromNormalized(freqLive, PARAMS.eq1Freq) : band.frequency)}
            baseValueText={freqLive != null ? formatEqHz(band.frequency) : undefined}
            normalized={toNormalized(band.frequency, PARAMS.eq1Freq)}
            lfoRange={freqLfo}
            liveNormalized={freqLive}
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
      )
    }
    if (slot === 'slope') {
      return (
        <ParamSlot afford={false}>
          <ValueKnob
            {...size}
            reserveBase
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
        </ParamSlot>
      )
    }
    if (slot === 'gain') {
      return (
        <ParamSlot id={ids?.gain} afford>
          <ValueKnob
            {...size}
            reserveBase
            label="Gain"
            valueText={`${(gainLive != null ? fromNormalized(gainLive, PARAMS.eq1Gain) : band.gain).toFixed(1)} dB`}
            baseValueText={gainLive != null ? `${band.gain.toFixed(1)} dB` : undefined}
            normalized={toNormalized(band.gain, PARAMS.eq1Gain)}
            lfoRange={gainLfo}
            liveNormalized={gainLive}
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
      )
    }
    if (slot === 'width') {
      return (
        <ParamSlot id={ids?.q} afford>
          <ValueKnob
            {...size}
            reserveBase
            label="Width"
            valueText={formatEqHz(bandwidthHz(band.frequency, band.q))}
            normalized={widthToN(bandwidthHz(band.frequency, band.q))}
            lfoRange={widthLfo}
            liveNormalized={widthLive}
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
      )
    }
    if (slot === 'q') {
      return (
        <ParamSlot id={ids?.q} afford>
          <ValueKnob
            {...size}
            reserveBase
            label="Q"
            valueText={(qLive != null ? fromNormalized(qLive, PARAMS.eq1Q) : band.q).toFixed(2)}
            baseValueText={qLive != null ? band.q.toFixed(2) : undefined}
            normalized={toNormalized(band.q, PARAMS.eq1Q)}
            lfoRange={qLfo}
            liveNormalized={qLive}
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
      )
    }
    return null
  }

  const typeMenu = (
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
  )

  return (
    <ModulationScopeProvider instanceId={instanceId} bandId={band.id} includeUnscoped={includeUnscoped}>
    <article
      className={`${inline ? styles.inlineStrip : styles.strip} ${selected ? styles.stripOn : ''} ${band.type === 'off' || band.bypassed ? styles.stripOff : ''}`}
      style={accent}
      data-eq-strip=""
      data-eq-filter={band.type}
      data-eq-inline={inline ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      onPointerDown={() => selectEqBand({ instanceId, index })}
    >
      {inline ? (
        <>
          <header className={styles.inlineHead}>
            <span className={styles.stripLabel}>{label}</span>
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
          {typeMenu}
          <div className={styles.inlineKnobs}>
            {slots.map((slot) =>
              slot === 'empty' ? null : (
                <div key={slot} className={styles.inlineSlot}>
                  {knob(slot, true)}
                </div>
              ),
            )}
          </div>
        </>
      ) : (
        <>
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
      <div className={styles.typeRow}>{typeMenu}</div>
      <div className={styles.params} data-eq-params="">
        {slots.map((slot) => (
          <KnobSlotFrame key={slot} slot={slot}>
            {knob(slot, false)}
          </KnobSlotFrame>
        ))}
      </div>
        </>
      )}
    </article>
    </ModulationScopeProvider>
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

function KnobSlotFrame({ slot, children }: { slot: EqStripSlot; children?: ReactNode }) {
  return (
    <div className={styles.paramSlot} data-eq-slot={slot}>
      {children}
    </div>
  )
}

function ParamSlot({ id, afford, children }: { id?: ParamId; afford: boolean; children: ReactNode }) {
  if (!id) return <div className={styles.knobSlot}>{children}</div>
  return (
    <LfoParamShell id={id} afford={afford}>
      <div className={styles.knobSlot}>{children}</div>
    </LfoParamShell>
  )
}

function lfoRangeFor(snap: EngineSnapshot, id: (typeof EQ_BAND_LFO_IDS)[number]['freq'], baseN: number) {
  const binding = lfoBinding(snap.fxLfos, id)
  if (!binding || !fxLfoIsActive(binding.lfo)) return undefined
  return lfoRangeNormalized(baseN, binding.lfo.depth)
}

function widthToN(hz: number): number {
  const min = Math.log(10)
  const max = Math.log(10000)
  return (Math.log(Math.min(10000, Math.max(10, hz))) - min) / (max - min)
}

function nToWidth(n: number): number {
  return 10 * (10000 / 10) ** Math.min(1, Math.max(0, n))
}
