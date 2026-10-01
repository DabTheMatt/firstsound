import { fxLfoIsActive, lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
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
  const active = Boolean(binding && fxLfoIsActive(binding.lfo))
  const range =
    active && binding ? lfoRangeNormalized(toNormalized(value, PARAMS[id]), binding.lfo.depth) : undefined
  return (
    <LfoParamShell id={id}>
      {variant === 'slider' ? (
        <ParamSlider id={id} value={value} modulationRange={range} />
      ) : (
        <Knob
          id={id}
          value={value}
          liveValue={active ? snap.liveParams[id] : undefined}
          lfoDepth={active ? binding?.lfo.depth : undefined}
        />
      )}
    </LfoParamShell>
  )
}
