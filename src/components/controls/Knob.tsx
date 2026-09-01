import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, parseTypedParam, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ValueKnob } from './ValueKnob'

type Props = {
  id: ParamId
  value: number
}

export function Knob({ id, value }: Props) {
  const def = PARAMS[id]
  return (
    <ValueKnob
      label={def.label}
      valueText={formatParamValue(value, def)}
      normalized={toNormalized(value, def)}
      min={def.min}
      max={def.max}
      now={Number(value.toFixed(3))}
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
