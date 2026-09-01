/** Parse #rgb / #rrggbb / rgb() / rgba() into RGB 0–255. */
export function parseCssColor(color: string): { r: number; g: number; b: number; a: number } | null {
  const t = color.trim()
  if (!t) return null
  if (t.startsWith('#')) {
    const hex = t.slice(1)
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16)
      const g = Number.parseInt(hex[1] + hex[1], 16)
      const b = Number.parseInt(hex[2] + hex[2], 16)
      if ([r, g, b].some((n) => Number.isNaN(n))) return null
      return { r, g, b, a: 1 }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
      if ([r, g, b, a].some((n) => Number.isNaN(n))) return null
      return { r, g, b, a }
    }
    return null
  }
  const m = t.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i)
  if (!m) return null
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  const a = m[4] === undefined ? 1 : Number(m[4])
  if ([r, g, b, a].some((n) => Number.isNaN(n))) return null
  return { r, g, b, a }
}

export function colorWithAlpha(color: string, alpha: number): string {
  const parsed = parseCssColor(color)
  if (!parsed) return color
  const a = Math.min(1, Math.max(0, alpha))
  return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${a})`
}

export function toCssHex(color: string): string | null {
  const parsed = parseCssColor(color)
  if (!parsed) return null
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${h(parsed.r)}${h(parsed.g)}${h(parsed.b)}`
}

export function mixCssColor(a: string, b: string, t: number): string {
  const pa = parseCssColor(a)
  const pb = parseCssColor(b)
  if (!pa || !pb) return a
  const u = Math.min(1, Math.max(0, t))
  const r = pa.r + (pb.r - pa.r) * u
  const g = pa.g + (pb.g - pa.g) * u
  const bl = pa.b + (pb.b - pa.b) * u
  return toCssHex(`rgb(${r}, ${g}, ${bl})`) ?? a
}

export function isDarkColor(color: string): boolean {
  const p = parseCssColor(color)
  if (!p) return true
  const luma = (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255
  return luma < 0.55
}
