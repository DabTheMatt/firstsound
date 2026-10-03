import { fxLfoIsActive, lfoBinding, lfoDrivesInstance, lfoRangeNormalized } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { useEngine } from '../../hooks/useEngine'
import { Knob } from './Knob'
import { LfoParamShell, useModulationScope } from './LfoParamShell'
import { ParamSlider } from './ParamSlider'

type Props = {
  id: ParamId
  value: number
  variant: 'knob' | 'slider'
}

export function ParamControl({ id, value, variant }: Props) {
  const snap = useEngine()
  const scope = useModulationScope()
  const binding = lfoBinding(snap.fxLfos, id)
  const drives = Boolean(
    binding &&
      fxLfoIsActive(binding.lfo) &&
      lfoDrivesInstance(binding.lfo, scope.instanceId, scope.includeUnscoped !== false),
  )
  const lane = snap.automation.lanes.find((item) => item.paramId === id)
  const automated = Boolean(snap.playing && lane && lane.nodes.length > 0)
  const record =
    scope.instanceId && snap.liveByInstance[scope.instanceId]
      ? snap.liveByInstance[scope.instanceId]
      : snap.liveParams
  const live = drives || automated ? record[id] : undefined
  const range =
    drives && binding ? lfoRangeNormalized(toNormalized(value, PARAMS[id]), binding.lfo.depth) : undefined
  return (
    <LfoParamShell id={id}>
      {variant === 'slider' ? (
        <ParamSlider id={id} value={value} liveValue={live} modulationRange={range} />
      ) : (
        <Knob
          id={id}
          value={value}
          liveValue={live}
          lfoDepth={drives ? binding?.lfo.depth : undefined}
        />
      )}
    </LfoParamShell>
  )
}
