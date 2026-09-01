import { exportBaseName } from './wav'
import type { SamplePrepState } from './types'

export type SampleVariation = {
  id: string
  name: string
  prep: SamplePrepState
}

export function nextVariationName(sourceFileName: string, existing: string[]): string {
  const base = exportBaseName(sourceFileName)
  const used = new Set(existing)
  let n = 1
  for (;;) {
    const name = `${base}_${String(n).padStart(2, '0')}`
    if (!used.has(name)) return name
    n += 1
  }
}
