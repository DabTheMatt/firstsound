import type { ParamId } from '../../audio/parameters/types'
import { lfoBinding } from '../../audio/fx/lfo'
import { useEngine } from '../../hooks/useEngine'
import { Knob } from './Knob'
import { LfoParamShell } from './LfoParamShell'
import { ParamSlider } from './ParamSlider'

type Props = {
  id: ParamId
  value: number
  variant: 'knob' | 'slider'
}

export function ParamControl({ id, value, variant }: Props) {
  const snap = useEngine()
  const binding = lfoBinding(snap.fxLfos, id)
  const mapped = Boolean(binding)
  const live = mapped ? snap.liveParams[id] : value
  return (
    <LfoParamShell id={id}>
      {variant === 'slider' ? (
        <ParamSlider id={id} value={value} liveValue={mapped ? live : undefined} />
      ) : (
        <Knob
          id={id}
          value={value}
          liveValue={mapped ? live : undefined}
          lfoDepth={mapped ? binding?.lfo.depth : undefined}
        />
      )}
    </LfoParamShell>
  )
}
