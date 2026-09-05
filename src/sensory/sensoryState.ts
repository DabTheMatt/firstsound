import { SENSORY_AXIS_IDS, SENSORY_AXES, type SensoryAxisId } from './sensoryParameters'

export type SensoryValues = Record<SensoryAxisId, number>

export function defaultSensoryValues(): SensoryValues {
  const values = {} as SensoryValues
  for (const id of SENSORY_AXIS_IDS) values[id] = 0
  return values
}

export function clampSensoryValue(idOrValue: SensoryAxisId | number, maybeValue?: number): number {
  if (typeof idOrValue === 'number') {
    if (!Number.isFinite(idOrValue)) return 0
    return Math.min(1, Math.max(-1, idOrValue))
  }
  const value = maybeValue ?? 0
  if (!Number.isFinite(value)) return 0
  if (SENSORY_AXES[idOrValue].kind === 'bipolar') return Math.min(1, Math.max(-1, value))
  return Math.min(1, Math.max(0, value))
}

export function clampSensoryValues(values: Partial<SensoryValues>): SensoryValues {
  const next = defaultSensoryValues()
  for (const id of SENSORY_AXIS_IDS) {
    const v = values[id]
    next[id] = typeof v === 'number' ? clampSensoryValue(id, v) : 0
  }
  return next
}

export function sensoryValuesEqual(a: SensoryValues, b: SensoryValues, eps = 1e-4): boolean {
  return SENSORY_AXIS_IDS.every((id) => Math.abs(a[id] - b[id]) <= eps)
}

export function patchSensoryValue(values: SensoryValues, id: SensoryAxisId, value: number): SensoryValues {
  return { ...values, [id]: clampSensoryValue(id, value) }
}

export function dialAmount(value: number, pole: 'pos' | 'neg'): number {
  return pole === 'pos' ? Math.max(0, value) : Math.max(0, -value)
}

export function valueFromDial(amount: number, pole: 'pos' | 'neg'): number {
  const mag = Math.min(1, Math.max(0, amount))
  return pole === 'pos' ? mag : -mag
}

export function sensoryIsAtRest(values: SensoryValues, eps = 1e-3): boolean {
  return SENSORY_AXIS_IDS.every((id) => Math.abs(values[id]) <= eps)
}
