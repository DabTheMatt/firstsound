/**
 * Layout is chosen from viewport metrics, not device names: a narrow desktop
 * window can use the tablet composition; a landscape tablet can use the dock.
 */

export type LayoutMode = 'dock-right' | 'dock-bottom' | 'sheet'

export type LayoutInput = {
  width: number
  height: number
  coarsePointer?: boolean
}

export function resolveLayoutMode(input: LayoutInput): LayoutMode {
  const width = Math.max(0, input.width)
  const height = Math.max(0, input.height)
  if (width < 640) return 'sheet'
  const portrait = height >= width
  if (width < 1024 && portrait) return 'dock-bottom'
  if (width < 900) return 'dock-bottom'
  return 'dock-right'
}

export function inspectorWidth(mode: LayoutMode, viewportWidth: number): number {
  if (mode !== 'dock-right') return 0
  if (viewportWidth < 1180) return 280
  if (viewportWidth < 1400) return 320
  return 360
}

export function meterColumnWidth(mode: LayoutMode): number {
  return mode === 'dock-right' ? 72 : 0
}
