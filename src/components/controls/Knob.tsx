import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, parseTypedParam, toNormalized } from '../../audio/parameters/mapping'
import { lfoRangeNormalized } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ValueKnob } from './ValueKnob'

const BIPOLAR: ReadonlySet<ParamId> = new Set([
  'pan',
  'msBalance',
  'msMidTilt',
  'msSideTilt',
  'msRotate',
  'msMidLowGain',
  'msMidPeakGain',
  'msMidHighGain',
  'msSideLowGain',
  'msSidePeakGain',
  'msSideHighGain',
])

type Props = {
  id: ParamId
  value: number
  liveValue?: number
  lfoDepth?: number
}

export function Knob({ id, value, liveValue, lfoDepth }: Props) {
  const def = PARAMS[id]
  const live = liveValue ?? value
  const mapped = liveValue != null
  const baseN = toNormalized(value, def)
  return (
    <ValueKnob
      label={def.label}
      valueText={formatParamValue(value, def)}
      visualValueText={mapped ? formatParamValue(live, def) : undefined}
      baseValueText={mapped ? formatParamValue(value, def) : undefined}
      normalized={baseN}
      visualNormalized={mapped ? toNormalized(live, def) : undefined}
      lfoRange={mapped && lfoDepth != null ? lfoRangeNormalized(baseN, lfoDepth) : undefined}
      min={def.min}
      max={def.max}
      now={Number(live.toFixed(3))}
      bipolar={BIPOLAR.has(id)}
      markerNormalized={id === 'msWidth' ? 0.5 : undefined}
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
