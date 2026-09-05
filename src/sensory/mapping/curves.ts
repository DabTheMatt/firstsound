export type CurveKind = 'linear' | 'easeIn' | 'easeOut' | 'sigmoid' | 'exponential'

function clamp01(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t
}

/** Map 0…1 through a named curve. */
export function applyCurve(t: number, kind: CurveKind): number {
  const x = clamp01(t)
  switch (kind) {
    case 'linear':
      return x
    case 'easeIn':
      return x * x
    case 'easeOut':
      return 1 - (1 - x) * (1 - x)
    case 'sigmoid': {
      const k = 8
      const y = 1 / (1 + Math.exp(-k * (x - 0.5)))
      const a = 1 / (1 + Math.exp(k * 0.5))
      const b = 1 / (1 + Math.exp(-k * 0.5))
      return (y - a) / (b - a)
    }
    case 'exponential':
      return x ** 2.4
  }
}

/** Amount in −1…+1 after polarity, gate, and curve. */
export function shapedAmount(
  value: number,
  curve: CurveKind,
  polarity: 'pos' | 'neg' | 'both',
  gate = 0,
): number {
  if (!Number.isFinite(value) || value === 0) return 0
  if (polarity === 'pos' && value < 0) return 0
  if (polarity === 'neg' && value > 0) return 0
  const sign = value < 0 ? -1 : 1
  const mag = Math.abs(value)
  const g = Math.min(0.95, Math.max(0, gate))
  if (mag <= g) return 0
  const t = g > 0 ? (mag - g) / (1 - g) : mag
  const shaped = applyCurve(t, curve)
  if (polarity === 'both') return sign * shaped
  return shaped
}
