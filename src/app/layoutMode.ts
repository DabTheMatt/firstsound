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
  if (width < 800) return 'sheet'
  // Phone landscape stays on the sheet. A short edge above this is a tablet.
  if (height > 0 && height < 520 && width < 1024) return 'sheet'
  const portrait = height >= width
  if (width < 1024 && portrait) return 'dock-bottom'
  if (width < 900) return 'dock-bottom'
  return 'dock-right'
}

export function inspectorWidth(mode: LayoutMode, viewportWidth: number): number {
  if (mode !== 'dock-right') return 0
  if (viewportWidth < 1180) return 304
  if (viewportWidth < 1440) return 368
  if (viewportWidth < 1720) return 408
  return 440
}

export function meterColumnWidth(mode: LayoutMode): number {
  return mode === 'dock-right' ? 78 : 0
}

/** Layout pixels for the shell. The visual viewport is the area not covered by
 * mobile browser chrome. When it is missing, keep the larger of inner and
 * client so a standalone PWA does not leave a gap under the transport. */
export function appViewportHeightPx(
  innerHeight: number,
  visualHeight?: number | null,
  clientHeight?: number | null,
): number {
  const inner = Math.max(0, innerHeight)
  const visual = visualHeight && visualHeight > 0 ? visualHeight : 0
  const client = clientHeight && clientHeight > 0 ? clientHeight : 0
  if (visual > 0) return Math.round(visual)
  return Math.round(Math.max(inner, client))
}
