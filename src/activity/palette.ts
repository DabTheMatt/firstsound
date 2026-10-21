/**
 * Stable activity colors. The index follows the sorted participant id,
 * so a sort of the list does not move a person to another color.
 * The thirteenth person reuses the first color.
 */

export const ACTIVITY_PALETTE = [
  '#c9841a',
  '#2f7f9a',
  '#3d8f5a',
  '#c45a28',
  '#8a4eaa',
  '#c44747',
  '#3d7a8a',
  '#a89020',
  '#4d5eab',
  '#a84d66',
  '#2f8f86',
  '#b56a22',
] as const

export function activityColors(ids: readonly string[]): Map<string, string> {
  const colors = new Map<string, string>()
  const ordered = [...ids].sort()
  for (let index = 0; index < ordered.length; index += 1) {
    const id = ordered[index]
    if (!id || colors.has(id)) continue
    colors.set(id, ACTIVITY_PALETTE[index % ACTIVITY_PALETTE.length] ?? ACTIVITY_PALETTE[0])
  }
  return colors
}
