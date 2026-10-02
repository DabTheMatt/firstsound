import type { ParamId } from '../../audio/parameters/types'
import { ModulationAffordance } from '../modulation/ModulationAffordance'
import { RandomAffordance } from './RandomAffordance'

type Props = {
  id: ParamId
  compact?: boolean
  touch?: boolean
}

/** Modulation and Random share the existing parameter action slot. */
export function ParamActionPair({ id, compact = false, touch = false }: Props) {
  return (
    <>
      <ModulationAffordance id={id} compact={compact} touch={touch} />
      <RandomAffordance id={id} compact={compact} touch={touch} />
    </>
  )
}
