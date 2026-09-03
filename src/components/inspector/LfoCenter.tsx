import { PARAMS } from '../../audio/parameters/definitions'
import {
  FX_LFO_KIND_LABELS,
  FX_LFO_KINDS,
  FX_LFO_SLOTS,
  LFO_SHAPES,
  fxLfoIsActive,
  fxLfoSlotName,
  lfoConnectCopy,
  type FxLfo,
  type FxLfoKind,
} from '../../audio/fx/lfo'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { engine } from '../../hooks/useEngine'
import { useFxLfoConnect } from './FxLfoConnect'
import styles from './LfoCenter.module.css'

type Props = {
  snap: EngineSnapshot
  onReveal?: (kind: FxLfoKind, slot: number) => void
}

function lfoConnectScore(lfo: FxLfo | undefined): number {
  if (!lfo) return 0
  // Connected first, then running modulators.
  return (lfo.target ? 2 : 0) + (fxLfoIsActive(lfo) ? 1 : 0)
}

function kindConnectScore(snap: EngineSnapshot, kind: FxLfoKind): number {
  const bank = snap.fxLfos[kind] ?? []
  let best = 0
  for (const lfo of bank) best = Math.max(best, lfoConnectScore(lfo))
  return best
}

export function LfoCenter({ snap, onReveal }: Props) {
  const { armed, setArmed } = useFxLfoConnect()
  const kinds = [...FX_LFO_KINDS].sort((a, b) => {
    const diff = kindConnectScore(snap, b) - kindConnectScore(snap, a)
    if (diff !== 0) return diff
    return FX_LFO_KINDS.indexOf(a) - FX_LFO_KINDS.indexOf(b)
  })
  return (
    <div className={styles.panel} role="dialog" aria-label="LFO control center">
      <header className={styles.head}>
        <h2 className={styles.title}>LFO center</h2>
        <p className={styles.lead}>
          Running modulators and their targets. Up to {FX_LFO_SLOTS} LFOs on each effect.
        </p>
      </header>
      {kinds.map((kind) => (
        <KindBlock
          key={kind}
          kind={kind}
          snap={snap}
          armed={armed}
          setArmed={setArmed}
          onReveal={onReveal}
        />
      ))}
    </div>
  )
}

function KindBlock({
  kind,
  snap,
  armed,
  setArmed,
  onReveal,
}: {
  kind: FxLfoKind
  snap: EngineSnapshot
  armed: { kind: FxLfoKind; slot: number } | null
  setArmed: (next: { kind: FxLfoKind; slot: number } | null) => void
  onReveal?: (kind: FxLfoKind, slot: number) => void
}) {
  const shown = Math.max(1, Math.min(FX_LFO_SLOTS, snap.lfoShown[kind] ?? 1))
  const canAdd = shown < FX_LFO_SLOTS
  return (
    <section className={styles.kind}>
      <div className={styles.kindHead}>
        <h3>{FX_LFO_KIND_LABELS[kind]}</h3>
        {canAdd ? (
          <button type="button" className={styles.ghost} onClick={() => engine.addFxLfo(kind)}>
            Add LFO
          </button>
        ) : null}
      </div>
      <ul className={styles.list}>
        {Array.from({ length: shown }, (_, slot) => slot)
          .sort((a, b) => {
            const la = snap.fxLfos[kind][a]
            const lb = snap.fxLfos[kind][b]
            return lfoConnectScore(lb) - lfoConnectScore(la) || a - b
          })
          .map((slot) => {
            const lfo = snap.fxLfos[kind][slot]
            if (!lfo) return null
            const connecting = armed?.kind === kind && armed.slot === slot
            const shape = LFO_SHAPES.find((s) => s.value === lfo.shape)?.label ?? lfo.shape
            const target = lfo.target ? PARAMS[lfo.target].label : null
            const connect = lfoConnectCopy(connecting, target)
            const running = fxLfoIsActive(lfo)
            const name = fxLfoSlotName(kind, slot)
            return (
              <li key={slot} className={running ? styles.rowOn : styles.row}>
                <button
                  type="button"
                  className={styles.meta}
                  onClick={() => onReveal?.(kind, slot)}
                >
                  <strong>{name}</strong>
                  <span>
                    {shape} · {lfo.rateHz < 10 ? lfo.rateHz.toFixed(2) : lfo.rateHz.toFixed(1)} Hz ·{' '}
                    {Math.round(lfo.depth)}%
                  </span>
                  <em>{running && target ? `→ ${target}` : target ?? 'Unassigned'}</em>
                </button>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={connecting || target ? styles.ghostOn : styles.ghost}
                    aria-pressed={connecting}
                    onClick={() => setArmed(connecting ? null : { kind, slot })}
                  >
                    <span>{connect.label}</span>
                    {connect.detail ? <small className={styles.connectDetail}>{connect.detail}</small> : null}
                  </button>
                  {lfo.target ? (
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => engine.setFxLfoTarget(kind, slot, null)}
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
      </ul>
    </section>
  )
}
