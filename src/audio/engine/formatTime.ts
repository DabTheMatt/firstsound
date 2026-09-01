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

/** Millisecond digits that match the current zoom (never claims sample accuracy). */
export function timecodeDigits(viewSpanSeconds: number): number {
  return viewSpanSeconds > 0 && viewSpanSeconds < 0.4 ? 4 : 3
}
