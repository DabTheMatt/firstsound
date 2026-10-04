import type { SoundMapColumn } from './analyze'
import type { ReverbSpacePicture } from './reverbDepth'

/**
 * Visual tail for the sound map. Wet 0, or a bypassed reverb, returns the same columns.
 * Wet carries energy into later columns by the decay, and distance dulls the high rows.
 */
export function smearSoundMap(
  columns: SoundMapColumn[] | null,
  picture: ReverbSpacePicture,
): SoundMapColumn[] | null {
  if (!columns) return null
  if (!picture.engaged || !(picture.wet > 0.001) || columns.length === 0) return columns
  const wet = Math.min(1, picture.wet)
  const decay = Math.min(1, Math.max(0, picture.decay))
  const distance = Math.min(1, Math.max(0, picture.distance))
  const keep = Math.exp(-1 / (0.45 + decay * 7))
  const bands = columns[0]?.power.length ?? 0
  const tails = new Array<number>(bands).fill(0)
  return columns.map((column) => ({
    time: column.time,
    power: column.power.map((direct, band) => {
      const highCut = band >= 5 ? 1 - distance * 0.7 : band >= 4 ? 1 - distance * 0.35 : 1
      const colored = direct * highCut
      const tail = (tails[band] ?? 0) * keep + colored
      tails[band] = tail
      return direct * (1 - wet) + tail * wet
    }),
  }))
}
