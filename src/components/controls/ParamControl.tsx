import type { ParamId } from '../../audio/parameters/types'
import { Knob } from './Knob'
import { ParamSlider } from './ParamSlider'

type Props = {
  id: ParamId
  value: number
  variant: 'knob' | 'slider'
}

export function ParamControl({ id, value, variant }: Props) {
  if (variant === 'slider') return <ParamSlider id={id} value={value} />
  return <Knob id={id} value={value} />
}
