import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ParamId } from '../../audio/parameters/types'
import { fxLfoKindForParam, isFxLfoTarget } from '../../audio/fx/lfo'
import { engine, useEngine } from '../../hooks/useEngine'
import { useFxLfoConnect } from '../inspector/FxLfoConnect'
import { Knob } from './Knob'
import { ParamSlider } from './ParamSlider'
import styles from './ParamControl.module.css'

type Props = {
  id: ParamId
  value: number
  variant: 'knob' | 'slider'
}

export function ParamControl({ id, value, variant }: Props) {
  const snap = useEngine()
  const { armed, setArmed } = useFxLfoConnect()
  const kind = fxLfoKindForParam(id)
  const pickable = Boolean(armed && kind && armed === kind && isFxLfoTarget(kind, id))
  const mapped = Boolean(kind && snap.fxLfos[kind].target === id)
  const live = mapped ? snap.liveParams[id] : value
  const onPickCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pickable || !kind) return
    event.preventDefault()
    event.stopPropagation()
    engine.setFxLfoTarget(kind, id)
    setArmed(null)
  }
  const className = [
    styles.wrap,
    pickable ? styles.pickable : '',
    mapped ? styles.mapped : '',
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
      {variant === 'slider' ? (
        <ParamSlider id={id} value={value} liveValue={mapped ? live : undefined} />
      ) : (
        <Knob
          id={id}
          value={value}
          liveValue={mapped ? live : undefined}
          lfoDepth={mapped && kind ? snap.fxLfos[kind].depth : undefined}
        />
      )}
    </div>
  )
}
