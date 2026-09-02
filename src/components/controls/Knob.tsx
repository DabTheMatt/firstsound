import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, parseTypedParam, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ValueKnob } from './ValueKnob'

type Props = {
  id: ParamId
  value: number
  liveValue?: number
}

export function Knob({ id, value, liveValue }: Props) {
  const def = PARAMS[id]
  const live = liveValue ?? value
  const modulated = liveValue != null && liveValue !== value
  return (
    <ValueKnob
      label={def.label}
      valueText={formatParamValue(value, def)}
      visualValueText={modulated || liveValue != null ? formatParamValue(live, def) : undefined}
      normalized={toNormalized(value, def)}
      visualNormalized={liveValue != null ? toNormalized(live, def) : undefined}
      min={def.min}
      max={def.max}
      now={Number(live.toFixed(3))}
      bipolar={id === 'pan'}
      onChange={(n) => engine.setParam(id, fromNormalized(n, def))}
      onReset={() => engine.resetParam(id)}
      onTypedValue={(text) => {
        const next = parseTypedParam(text, def)
        if (next == null) return false
        engine.setParam(id, next)
        return true
      }}
    />
  )
}
