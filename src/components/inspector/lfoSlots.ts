/** Visual tone for one cell in the compact 1 / 2 / 3 / + row. Tone never changes geometry. */
export type LfoSlotTone = 'active' | 'idle' | 'empty'

export function lfoNumberTone(index: number, shown: number, selected: number): LfoSlotTone {
  if (index < 0 || index >= shown) return 'empty'
  return index === selected ? 'active' : 'idle'
}

export function lfoAddTone(shown: number, maxSlots: number): 'idle' | 'empty' {
  return shown >= maxSlots ? 'empty' : 'idle'
}
