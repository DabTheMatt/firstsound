import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import type { ParamDef } from '../../audio/parameters/types'
import {
  LFO_RATE_DEFAULT,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  LFO_SHAPES,
  type FxLfoKind,
} from '../../audio/fx/lfo'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { engine } from '../../hooks/useEngine'
import { Segmented } from '../controls/Segmented'
import { ValueKnob } from '../controls/ValueKnob'
import { useFxLfoConnect } from './FxLfoConnect'
import styles from './Inspector.module.css'

const RATE_DEF: ParamDef = {
  id: 'delayModRate',
  label: 'Rate',
  min: LFO_RATE_MIN,
  max: LFO_RATE_MAX,
  defaultValue: LFO_RATE_DEFAULT,
  unit: 'Hz',
  mapping: 'log',
}

type Props = {
  snap: EngineSnapshot
  kind: FxLfoKind
  variant: 'knob' | 'slider'
}

export function FxLfoSection({ snap, kind, variant }: Props) {
  const lfo = snap.fxLfos[kind]
  const { armed, setArmed } = useFxLfoConnect()
  const connecting = armed === kind
  const targetLabel = lfo.target ? PARAMS[lfo.target].label : 'None'
  const rateText = `${lfo.rateHz < 10 ? lfo.rateHz.toFixed(2) : lfo.rateHz.toFixed(1)} Hz`

  const setRate = (hz: number) => engine.setFxLfo(kind, { rateHz: hz })
  const setDepth = (depth: number) => engine.setFxLfo(kind, { depth })

  const knobs =
    variant === 'knob' ? (
      <div className={styles.knobs}>
        <ValueKnob
          label="Rate"
          valueText={rateText}
          normalized={toNormalized(lfo.rateHz, RATE_DEF)}
          min={LFO_RATE_MIN}
          max={LFO_RATE_MAX}
          now={lfo.rateHz}
          onChange={(n) => setRate(fromNormalized(n, RATE_DEF))}
          onReset={() => setRate(LFO_RATE_DEFAULT)}
          onTypedValue={(text) => {
            const next = parseTypedRange(text, LFO_RATE_MIN, LFO_RATE_MAX, 'Hz')
            if (next == null) return false
            setRate(next)
            return true
          }}
        />
        <ValueKnob
          label="Depth"
          valueText={`${Math.round(lfo.depth)} %`}
          normalized={lfo.depth / 100}
          min={0}
          max={100}
          now={lfo.depth}
          onChange={(n) => setDepth(n * 100)}
          onReset={() => setDepth(35)}
          onTypedValue={(text) => {
            const next = parseTypedRange(text, 0, 100, '%')
            if (next == null) return false
            setDepth(next)
            return true
          }}
        />
      </div>
    ) : (
      <>
        <label className={styles.field}>
          Rate
          <input
            className={styles.range}
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={toNormalized(lfo.rateHz, RATE_DEF)}
            aria-label="LFO rate"
            onChange={(e) => setRate(fromNormalized(Number(e.target.value), RATE_DEF))}
          />
          <span>{rateText}</span>
        </label>
        <label className={styles.field}>
          Depth
          <input
            className={styles.range}
            type="range"
            min={0}
            max={100}
            value={Math.round(lfo.depth)}
            aria-label="LFO depth"
            onChange={(e) => setDepth(Number(e.target.value))}
          />
          <span>{Math.round(lfo.depth)} %</span>
        </label>
      </>
    )

  return (
    <section className={styles.lfo} data-lfo-kind={kind}>
      <h3 className={styles.sub}>Modulation / LFO</h3>
      <p className={styles.help}>
        Connect pins this LFO to a knob on this effect. The stored value is oscillator
        zero. Depth is how far it swings up and down (20% = ±20% of the parameter range).
      </p>
      <Segmented
        label="LFO shape"
        value={lfo.shape}
        options={LFO_SHAPES}
        wrap
        onChange={(shape) => engine.setFxLfo(kind, { shape })}
      />
      {knobs}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.ghost} ${connecting ? styles.presetOn : ''}`}
          aria-pressed={connecting}
          onClick={() => setArmed(connecting ? null : kind)}
        >
          {connecting ? 'Click a parameter' : 'Connect'}
        </button>
        {lfo.target ? (
          <button type="button" className={styles.ghost} onClick={() => engine.setFxLfoTarget(kind, null)}>
            Disconnect
          </button>
        ) : null}
      </div>
      <p className={styles.help}>
        Target: {targetLabel}
        {connecting ? ' — click a knob on this effect, or press Escape to cancel.' : ''}
      </p>
    </section>
  )
}
