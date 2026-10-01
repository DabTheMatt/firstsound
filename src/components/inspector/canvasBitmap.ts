/** Bitmap size for a canvas whose CSS box is already definite.
 * Callers must pass the layout box, not the previous bitmap, or the canvas
 * grows every frame when percentage height falls back to the bitmap size. */
export function canvasBitmapSize(
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  maxCss = 480,
): { width: number; height: number } {
  const scale = Number.isFinite(dpr) && dpr > 0 ? Math.min(2, dpr) : 1
  const limit = Math.max(1, maxCss)
  const width = Math.max(1, Math.min(limit, Math.floor(cssWidth)))
  const height = Math.max(1, Math.min(limit, Math.floor(cssHeight)))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
