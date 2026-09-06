import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { fxLfoKindForParam, fxLfoSlotName, isFxLfoTarget, lfoBinding } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useFxLfoConnect } from '../inspector/FxLfoConnect'
import styles from './ParamControl.module.css'

type Props = {
  id: ParamId
  children: ReactNode
  linked?: boolean
}

export function LfoParamShell({ id, children, linked = false }: Props) {
  const snap = useEngine()
  const { armed, setArmed } = useFxLfoConnect()
  const kind = fxLfoKindForParam(id)
  const pickable = Boolean(armed && kind && armed.kind === kind && isFxLfoTarget(kind, id))
  const binding = lfoBinding(snap.fxLfos, id)
  const mapped = Boolean(binding)
  const onPickCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pickable || !kind || !armed) return
    event.preventDefault()
    event.stopPropagation()
    engine.setFxLfoTarget(kind, armed.slot, id)
    setArmed(null)
  }
  const className = [
    styles.wrap,
    pickable ? styles.pickable : '',
    mapped ? styles.mapped : '',
    linked ? styles.linked : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={className}
      data-param-id={id}
      data-lfo-pickable={pickable ? 'true' : 'false'}
      data-lfo-mapped={mapped ? 'true' : 'false'}
      onPointerDownCapture={onPickCapture}
    >
      {children}
      {binding ? <span className={styles.lfoTag}>{fxLfoSlotName(binding.kind, binding.slot)}</span> : null}
    </div>
  )
}
