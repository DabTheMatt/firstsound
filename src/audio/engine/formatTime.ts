export function formatTimecode(seconds: number, fractionDigits = 3): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const digits = Math.min(4, Math.max(3, Math.floor(fractionDigits)))
  const factor = 10 ** digits
  const m = Math.floor(seconds / 60)
  let s = seconds - m * 60
  let whole = Math.floor(s)
  let frac = Math.round((s - whole) * factor)
  if (frac >= factor) {
    frac = 0
    whole += 1
  }
  if (whole >= 60) {
    return `${String(m + 1).padStart(2, '0')}:00.${'0'.repeat(digits)}`
  }
  const mm = String(m).padStart(2, '0')
  const ss = String(whole).padStart(2, '0')
  const f = String(frac).padStart(digits, '0')
  return `${mm}:${ss}.${f}`
}

export function formatDuration(seconds: number, fractionDigits = 3): string {
  return formatTimecode(seconds, fractionDigits)
}

/** One-decimal clock used by Sensory Mode (`00:12.4`). */
export function formatSensoryClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  const tenth = Math.round(s * 10) / 10
  if (tenth >= 60) {
    return `${String(m + 1).padStart(2, '0')}:00.0`
  }
  const whole = Math.floor(tenth)
  const frac = Math.round((tenth - whole) * 10)
  return `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${frac}`
}

/** Compact clock for the range scene (`0:17 / 2:36`). */
export function formatRangeClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Millisecond digits that match the current zoom (never claims sample accuracy). */
export function timecodeDigits(viewSpanSeconds: number): number {
  return viewSpanSeconds > 0 && viewSpanSeconds < 0.4 ? 4 : 3
}
