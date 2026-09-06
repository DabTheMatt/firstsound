import { useState } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import type { ParamDef } from '../../audio/parameters/types'
import {
  FX_LFO_SLOTS,
  LFO_RATE_DEFAULT,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  fxLfoIsActive,
  fxLfoSlotName,
  lfoConnectCopy,
  type FxLfoKind,
} from '../../audio/fx/lfo'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { engine } from '../../hooks/useEngine'
import { Segmented } from '../controls/Segmented'
import { LfoShapePicker } from '../controls/LfoShapePicker'
import { PlugGlyph } from '../controls/PlugGlyph'
import { useFxLfoConnect } from './FxLfoConnect'
import { readLfoOpen, writeLfoOpen } from './lfoOpen'
import { ValueKnob } from '../controls/ValueKnob'
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
  compact?: boolean
}

export function FxLfoSection({ snap, kind, variant, compact = false }: Props) {
  const shown = Math.max(1, Math.min(FX_LFO_SLOTS, snap.lfoShown[kind] ?? 1))
  const [slot, setSlot] = useState(0)
  const [open, setOpen] = useState(() => readLfoOpen(kind))
  const activeSlot = Math.min(slot, shown - 1)
  const lfo = snap.fxLfos[kind][activeSlot] ?? snap.fxLfos[kind][0]
  const live = snap.fxLfos[kind].some(fxLfoIsActive)
  const { armed, setArmed } = useFxLfoConnect()
  const connecting = armed?.kind === kind && armed.slot === activeSlot
  const targetLabel = lfo?.target ? PARAMS[lfo.target].label : null
  const connect = lfoConnectCopy(connecting, targetLabel)
  const rateHz = lfo?.rateHz ?? LFO_RATE_DEFAULT
  const depth = lfo?.depth ?? 0
  const rateText = `${rateHz < 10 ? rateHz.toFixed(2) : rateHz.toFixed(1)} Hz`

  const setRate = (hz: number) => engine.setFxLfo(kind, activeSlot, { rateHz: hz })
  const setDepth = (next: number) => engine.setFxLfo(kind, activeSlot, { depth: next })

  const knobs =
    variant === 'knob' ? (
      <div className={styles.knobs}>
        <ValueKnob
          label="Rate"
          compact={compact}
          valueText={rateText}
          normalized={toNormalized(rateHz, RATE_DEF)}
          min={LFO_RATE_MIN}
          max={LFO_RATE_MAX}
          now={rateHz}
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
          compact={compact}
          valueText={`${Math.round(depth)} %`}
          normalized={depth / 100}
          min={0}
          max={100}
          now={depth}
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
            value={toNormalized(rateHz, RATE_DEF)}
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
            value={Math.round(depth)}
            aria-label="LFO depth"
            onChange={(e) => setDepth(Number(e.target.value))}
          />
          <span>{Math.round(depth)} %</span>
        </label>
      </>
    )

  return (
    <section
      className={`${styles.lfo} ${compact ? styles.lfoCompact : ''} ${open ? '' : styles.lfoCollapsed}`}
      data-lfo-kind={kind}
    >
      <div className={styles.lfoHead}>
        <h3 className={styles.sub}>{compact ? 'LFO' : 'Modulation / LFO'}</h3>
        <button
          type="button"
          className={`${styles.lfoToggle} ${open ? styles.lfoToggleOn : ''} ${live ? styles.lfoToggleLive : ''}`}
          aria-pressed={open}
          aria-label={open ? 'Hide LFO' : 'Show LFO'}
          title={open ? 'Hide LFO' : 'Show LFO'}
          onClick={() => {
            const next = !open
            setOpen(next)
            writeLfoOpen(kind, next)
          }}
        >
          <LfoToggleIcon />
        </button>
      </div>
      {open ? (
      <>
      {compact ? null : (
      <p className={styles.help}>
        Connect pins this LFO to a knob on this effect. The stored value is oscillator
        zero. Depth is how far it swings up and down (20% = ±20% of the parameter range).
        Up to {FX_LFO_SLOTS} LFOs per effect.
      </p>
      )}
      {compact ? (
        <div className={styles.slotBar} role="radiogroup" aria-label="LFO slot">
          {Array.from({ length: FX_LFO_SLOTS }, (_, i) =>
            i < shown ? (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={i === activeSlot}
                aria-label={`LFO ${i + 1}`}
                title={fxLfoSlotName(kind, i)}
                className={`${styles.slotNum} ${i === activeSlot ? styles.slotNumOn : ''}`}
                onClick={() => setSlot(i)}
              >
                {i + 1}
              </button>
            ) : (
              <span key={i} className={styles.slotNumHold} aria-hidden="true" />
            ),
          )}
          <button
            type="button"
            className={`${styles.ghost} ${styles.addLfo} ${shown >= FX_LFO_SLOTS ? styles.addLfoHold : ''}`}
            tabIndex={shown >= FX_LFO_SLOTS ? -1 : undefined}
            aria-hidden={shown >= FX_LFO_SLOTS}
            aria-label="Add LFO"
            title="Add LFO"
            onClick={() => {
              const next = engine.addFxLfo(kind)
              if (next != null) setSlot(next)
            }}
          >
            +
          </button>
        </div>
      ) : (
        <div className={`${styles.row} ${styles.slotRow}`}>
          <Segmented
            label="LFO slot"
            value={String(activeSlot)}
            options={Array.from({ length: shown }, (_, i) => ({
              value: String(i),
              label: fxLfoSlotName(kind, i),
            }))}
            onChange={(value) => setSlot(Number(value))}
          />
          <button
            type="button"
            className={`${styles.ghost} ${styles.addLfo} ${shown >= FX_LFO_SLOTS ? styles.addLfoHold : ''}`}
            tabIndex={shown >= FX_LFO_SLOTS ? -1 : undefined}
            aria-hidden={shown >= FX_LFO_SLOTS}
            onClick={() => {
              const next = engine.addFxLfo(kind)
              if (next != null) setSlot(next)
            }}
          >
            Add LFO
          </button>
        </div>
      )}
      <LfoShapePicker
        value={lfo?.shape ?? 'sine'}
        compact={compact}
        onChange={(shape) => engine.setFxLfo(kind, activeSlot, { shape })}
      />
      {knobs}
      <div className={`${styles.row} ${styles.connectRow}`}>
        <div className={styles.connectTile}>
          <button
            type="button"
            className={`${styles.ghost} ${styles.connectBtn} ${connecting || lfo?.target ? styles.presetOn : ''}`}
            aria-pressed={connecting}
            title={connect.detail ?? connect.label}
            onClick={() => setArmed(connecting ? null : { kind, slot: activeSlot })}
          >
            <span>{connect.label}</span>
            {!compact && connect.detail ? <small>{connect.detail}</small> : null}
          </button>
          <button
            type="button"
            className={`${styles.plug} ${lfo?.target ? styles.plugOn : styles.plugOff}`}
            aria-label={lfo?.target ? 'Disconnect LFO' : 'Connect LFO'}
            title={lfo?.target ? 'Disconnect' : 'Connect'}
            onClick={(event) => {
              event.stopPropagation()
              if (lfo?.target) engine.setFxLfoTarget(kind, activeSlot, null)
              else setArmed(connecting ? null : { kind, slot: activeSlot })
            }}
          >
            <PlugGlyph />
          </button>
        </div>
      </div>
      {compact ? null : (
      <p className={styles.help}>
        {connecting ? 'Click a knob on this effect, or press Escape to cancel.' : connect.detail ? `Target: ${connect.detail}` : 'No target yet.'}
      </p>
      )}
      </>
      ) : null}
    </section>
  )
}

function LfoToggleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M1.5 8 C3.2 8 3.8 3.5 5.5 3.5 S7.8 12.5 9.5 12.5 12.2 8 14.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
