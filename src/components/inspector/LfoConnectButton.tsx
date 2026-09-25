import type { FxLfoKind } from '../../audio/fx/lfo'
import { lfoConnectCopy } from '../../audio/fx/lfo'
import { engine } from '../../hooks/useEngine'
import { PlugGlyph } from '../controls/PlugGlyph'
import styles from './LfoConnectButton.module.css'

type Props = {
  kind: FxLfoKind
  slot: number
  targetLabel: string | null
  armed: boolean
  setArmed: (next: { kind: FxLfoKind; slot: number } | null) => void
}

export function LfoConnectButton({ kind, slot, targetLabel, armed, setArmed }: Props) {
  const copy = lfoConnectCopy(armed, targetLabel)
  const connected = copy.mode === 'disconnect'
  const onClick = () => {
    if (connected) {
      engine.setFxLfoTarget(kind, slot, null)
      setArmed(null)
      return
    }
    setArmed(armed ? null : { kind, slot })
  }
  const title = connected
    ? `Disconnect ${copy.detail ?? 'target'}`
    : armed
      ? 'Click a parameter on this effect, or press again to cancel'
      : 'Connect this LFO to a parameter'
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[copy.mode]}`}
      aria-pressed={armed && !connected}
      aria-label={connected ? `Disconnect ${copy.detail ?? 'LFO'}` : armed ? 'Cancel LFO connect' : 'Connect LFO'}
      title={title}
      data-lfo-connect={copy.mode}
      onClick={onClick}
    >
      <PlugGlyph />
      <span>{copy.label}</span>
    </button>
  )
}
