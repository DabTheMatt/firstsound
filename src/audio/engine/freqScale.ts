export type FreqScaleKind = 'log' | 'linear' | 'mel'

export const FREQ_SCALE_OPTIONS: { value: FreqScaleKind; label: string; title: string }[] = [
  { value: 'log', label: 'Log', title: 'Logarithmic frequency axis (octaves)' },
  { value: 'linear', label: 'Lin', title: 'Linear Hertz axis' },
  { value: 'mel', label: 'Mel', title: 'Mel axis — denser around speech frequencies' },
]

export function hzToUnit(hz: number, kind: FreqScaleKind): number {
  const f = Math.max(1e-6, hz)
  if (kind === 'linear') return f
  if (kind === 'mel') return 2595 * Math.log10(1 + f / 700)
  return Math.log(f)
}

export function hzToX(
  hz: number,
  minHz: number,
  maxHz: number,
  left: number,
  right: number,
  kind: FreqScaleKind = 'log',
): number {
  const lo = hzToUnit(minHz, kind)
  const hi = hzToUnit(maxHz, kind)
  const span = hi - lo
  const t = span === 0 ? 0 : (hzToUnit(hz, kind) - lo) / span
  return left + Math.min(1, Math.max(0, t)) * (right - left)
}

export function unitToHz(unit: number, kind: FreqScaleKind): number {
  if (kind === 'linear') return Math.max(1e-6, unit)
  if (kind === 'mel') return 700 * (10 ** (unit / 2595) - 1)
  return Math.exp(unit)
}

export function xToHz(
  x: number,
  minHz: number,
  maxHz: number,
  left: number,
  right: number,
  kind: FreqScaleKind = 'log',
): number {
  const span = Math.max(1e-6, right - left)
  const t = Math.min(1, Math.max(0, (x - left) / span))
  const lo = hzToUnit(minHz, kind)
  const hi = hzToUnit(maxHz, kind)
  return unitToHz(lo + t * (hi - lo), kind)
}

export const FFT_FREQ_SCALE_KEY = 'field.fftFreqScale'

export function parseFreqScale(raw: string | null | undefined): FreqScaleKind {
  if (raw === 'linear' || raw === 'mel' || raw === 'log') return raw
  return 'log'
}

export function loadFreqScale(): FreqScaleKind {
  try {
    return parseFreqScale(localStorage.getItem(FFT_FREQ_SCALE_KEY))
  } catch {
    return 'log'
  }
}

export function persistFreqScale(kind: FreqScaleKind): void {
  try {
    localStorage.setItem(FFT_FREQ_SCALE_KEY, kind)
  } catch {
    /* private mode */
  }
}
