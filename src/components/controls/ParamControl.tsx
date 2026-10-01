import type { ParamId } from '../../audio/parameters/types'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import { modulationCenterValue } from '../../audio/parameters/evaluation'
import { lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
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
  const live = snap.liveParams[id]
  const showLive = mapped || live !== value
  const center = modulationCenterValue(id, value, snap.paramCenters[id] ?? value, snap.automation, snap.playing)
  const lfoRange =
    mapped && binding ? lfoRangeNormalized(toNormalized(center, PARAMS[id]), binding.lfo.depth) : undefined
  return (
    <LfoParamShell id={id}>
      {variant === 'slider' ? (
        <ParamSlider id={id} value={value} liveValue={showLive ? live : undefined} />
      ) : (
        <Knob
          id={id}
          value={value}
          liveValue={showLive ? live : undefined}
          lfoDepth={mapped ? binding?.lfo.depth : undefined}
          lfoRange={lfoRange}
        />
      )}
    </LfoParamShell>
  )
}
