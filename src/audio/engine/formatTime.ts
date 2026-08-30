export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  const mm = String(m).padStart(2, '0')
  const whole = Math.floor(s)
  const frac = Math.round((s - whole) * 1000)
  const ss = String(whole).padStart(2, '0')
  const fff = String(frac).padStart(3, '0')
  return `${mm}:${ss}.${fff}`
}

export function formatDuration(seconds: number): string {
  return formatTimecode(seconds)
}
