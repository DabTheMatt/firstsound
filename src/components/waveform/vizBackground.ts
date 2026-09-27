/**
 * Optional photo behind the Wave / FFT / EQ graph.
 *
 * Persistence: opacity and grain are small numbers in localStorage.
 * The image bytes stay in a session object URL only. This app has no binary
 * asset store, and a base64 photo in localStorage would blow the quota.
 * Removing the background, or reloading the page, restores the theme field.
 * The source file is never rewritten; grayscale is a CSS filter.
 */

export const VIZ_BG_OPACITY_DEFAULT = 0.3
export const VIZ_BG_OPACITY_MAX = 0.62
export const VIZ_BG_GRAIN_DEFAULT = 0
export const VIZ_BG_GRAIN_MAX = 0.34
/** Longest edge kept for the session bitmap. Larger files are scaled down for display only. */
export const VIZ_BG_MAX_EDGE = 1920
export const VIZ_BG_OPACITY_KEY = 'field.vizBg.opacity'
export const VIZ_BG_GRAIN_KEY = 'field.vizBg.grain'
/** Applied at paint time. The file the user picked stays in color on disk. */
export const VIZ_BG_GRAYSCALE_FILTER = 'grayscale(1)'

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/x-png'])
const ACCEPTED_EXT = /\.(jpe?g|png)$/i

export type VizBackgroundState = {
  imageUrl: string | null
  fileName: string | null
  opacity: number
  grain: number
}

export type CoverCrop = {
  sx: number
  sy: number
  sw: number
  sh: number
}

export type CoverFrame = {
  width: number
  height: number
  left: number
  top: number
}

export function clampVizBgOpacity(value: number): number {
  if (!Number.isFinite(value)) return VIZ_BG_OPACITY_DEFAULT
  return Math.min(VIZ_BG_OPACITY_MAX, Math.max(0, value))
}

export function clampVizBgGrain(value: number): number {
  if (!Number.isFinite(value)) return VIZ_BG_GRAIN_DEFAULT
  return Math.min(VIZ_BG_GRAIN_MAX, Math.max(0, value))
}

/**
 * Automatic scrim between the photo and the graph.
 * Stronger as the photo gets louder, never a solid black plate.
 */
export function veilOpacity(imageOpacity: number): number {
  if (!(imageOpacity > 0)) return 0
  return Math.min(0.52, 0.2 + imageOpacity * 0.42)
}

/** Source rect for object-fit: cover, centered, aspect preserved. */
export function coverCrop(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
): CoverCrop {
  const iw = Math.max(0, imageWidth)
  const ih = Math.max(0, imageHeight)
  const vw = Math.max(0, viewWidth)
  const vh = Math.max(0, viewHeight)
  if (iw === 0 || ih === 0 || vw === 0 || vh === 0) return { sx: 0, sy: 0, sw: iw, sh: ih }
  const scale = Math.max(vw / iw, vh / ih)
  const sw = vw / scale
  const sh = vh / scale
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

/** CSS pixel box for an <img> clipped by the view. Same geometry as coverCrop. */
export function coverFrame(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
): CoverFrame {
  const crop = coverCrop(imageWidth, imageHeight, viewWidth, viewHeight)
  if (crop.sw <= 0 || crop.sh <= 0) return { width: viewWidth, height: viewHeight, left: 0, top: 0 }
  const scale = viewWidth / crop.sw
  return {
    width: Math.ceil(imageWidth * scale - 1e-4),
    height: Math.ceil(imageHeight * scale - 1e-4),
    left: -crop.sx * scale,
    top: -crop.sy * scale,
  }
}

/** Display size for a large photo. Aspect is preserved; the file on disk is not touched. */
export function displaySize(
  width: number,
  height: number,
  maxEdge = VIZ_BG_MAX_EDGE,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width) || 1)
  const h = Math.max(1, Math.round(height) || 1)
  const edge = Math.max(w, h)
  if (!(maxEdge > 0) || edge <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export function acceptVizBackgroundFile(file: { type?: string; name?: string }): boolean {
  const type = (file.type ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (ACCEPTED_MIME.has(type)) return true
  if (!type || type === 'application/octet-stream') return ACCEPTED_EXT.test(file.name ?? '')
  return false
}

/** Deterministic monochrome tile. Drawn once, then repeated — not per-pixel DOM noise. */
export function fillGrainTile(size: number, seed = 0x1a2b3c4d): Uint8ClampedArray<ArrayBuffer> {
  const n = Math.max(1, Math.floor(size))
  const data = new Uint8ClampedArray(new ArrayBuffer(n * n * 4))
  let s = seed >>> 0
  for (let i = 0; i < data.length; i += 4) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const v = s >>> 24
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
  return data
}

function readStoredNumber(key: string, fallback: number, clamp: (value: number) => number): number {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (raw == null || raw === '') return fallback
    return clamp(Number(raw))
  } catch {
    return fallback
  }
}

function writeStoredNumber(key: string, value: number): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, String(value))
  } catch {
    /* private mode or quota — settings still apply for this session */
  }
}

function revokeSessionUrl(url: string | null): void {
  if (!url) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    /* not a blob URL */
  }
}

let imageUrl: string | null = null
let fileName: string | null = null
let opacity = readStoredNumber(VIZ_BG_OPACITY_KEY, VIZ_BG_OPACITY_DEFAULT, clampVizBgOpacity)
let grain = readStoredNumber(VIZ_BG_GRAIN_KEY, VIZ_BG_GRAIN_DEFAULT, clampVizBgGrain)
let snapshot: VizBackgroundState = { imageUrl, fileName, opacity, grain }
const listeners = new Set<() => void>()
let grainTile: string | null = null

function publish(): void {
  snapshot = { imageUrl, fileName, opacity, grain }
  for (const listener of listeners) listener()
}

export function getVizBackground(): VizBackgroundState {
  return snapshot
}

export function subscribeVizBackground(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setVizBackgroundOpacity(value: number): void {
  opacity = clampVizBgOpacity(value)
  writeStoredNumber(VIZ_BG_OPACITY_KEY, opacity)
  publish()
}

export function setVizBackgroundGrain(value: number): void {
  grain = clampVizBgGrain(value)
  writeStoredNumber(VIZ_BG_GRAIN_KEY, grain)
  publish()
}

export function clearVizBackgroundImage(): void {
  const prev = imageUrl
  imageUrl = null
  fileName = null
  publish()
  revokeSessionUrl(prev)
}

export function grainTileUrl(): string {
  if (grainTile) return grainTile
  if (typeof document === 'undefined') return ''
  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.putImageData(new ImageData(fillGrainTile(size), size, size), 0, 0)
  grainTile = canvas.toDataURL('image/png')
  return grainTile
}

type BitmapLike = { width: number; height: number; close?: () => void }

async function decodeBitmap(file: File): Promise<BitmapLike | null> {
  if (typeof createImageBitmap !== 'function') return null
  try {
    return await createImageBitmap(file)
  } catch {
    return null
  }
}

async function sessionUrlForFile(file: File): Promise<string> {
  const bitmap = await decodeBitmap(file)
  const canUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
  if (!bitmap) {
    if (!canUrl) throw new Error('no object url')
    return URL.createObjectURL(file)
  }
  const fitted = displaySize(bitmap.width, bitmap.height)
  const needsScale = fitted.width !== bitmap.width || fitted.height !== bitmap.height
  if (!needsScale || typeof document === 'undefined') {
    bitmap.close?.()
    if (!canUrl) throw new Error('no object url')
    return URL.createObjectURL(file)
  }
  const canvas = document.createElement('canvas')
  canvas.width = fitted.width
  canvas.height = fitted.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    if (!canUrl) throw new Error('no object url')
    return URL.createObjectURL(file)
  }
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, fitted.width, fitted.height)
  bitmap.close?.()
  const mime = (file.type || '').toLowerCase().includes('png') ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.86))
  if (!blob) {
    if (!canUrl) throw new Error('no object url')
    return URL.createObjectURL(file)
  }
  return URL.createObjectURL(blob)
}

/** Load a JPG or PNG for this session. Returns false when the file is rejected. */
export async function loadVizBackgroundFile(file: File): Promise<boolean> {
  if (!acceptVizBackgroundFile(file)) return false
  let next: string
  try {
    next = await sessionUrlForFile(file)
  } catch {
    return false
  }
  const prev = imageUrl
  imageUrl = next
  fileName = file.name || 'image'
  publish()
  if (prev && prev !== next) revokeSessionUrl(prev)
  return true
}

/** Test helper. Drops the session image and restores default opacity and grain in memory. */
export function resetVizBackgroundState(): void {
  const prev = imageUrl
  imageUrl = null
  fileName = null
  opacity = VIZ_BG_OPACITY_DEFAULT
  grain = VIZ_BG_GRAIN_DEFAULT
  publish()
  revokeSessionUrl(prev)
}
