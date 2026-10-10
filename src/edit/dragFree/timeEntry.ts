import { formatTimecode } from '../../audio/engine/formatTime'

/** Display resolution of the editor clock. Not a sample period. */
export const EDIT_TIME_MS = 1000

export type TimeParseError = 'format' | 'negative'

export type TimeParse = { ok: true; seconds: number } | { ok: false; error: TimeParseError }

/**
 * Clock used by drag-free editing: `mm:ss.mmm`.
 * Uses the project timecode so the field and the ruler share one rounding.
 */
export function formatEditTime(seconds: number): string {
  return formatTimecode(seconds, 3)
}

function fractionMilliseconds(frac: string): number {
  const scale = 10 ** frac.length
  return Math.round((Number(frac) / scale) * EDIT_TIME_MS)
}

/**
 * Parse one user-entered time into seconds.
 * Milliseconds stay integer until the final divide, so typing the same clock
 * twice does not walk the value.
 */
export function parseEditTime(raw: string): TimeParse {
  const text = raw.trim().toLowerCase().replace(',', '.')
  if (!text) return { ok: false, error: 'format' }
  if (text.startsWith('-')) return { ok: false, error: 'negative' }

  const millis = /^(\d+(?:\.\d+)?)\s*ms$/.exec(text)
  if (millis) {
    const ms = Number(millis[1])
    if (!Number.isFinite(ms)) return { ok: false, error: 'format' }
    return { ok: true, seconds: ms / EDIT_TIME_MS }
  }

  const clock = /^(\d+):([0-5]?\d)(?:\.(\d{1,4}))?$/.exec(text)
  if (clock) {
    const minutes = Number(clock[1])
    const seconds = Number(clock[2])
    if (seconds >= 60) return { ok: false, error: 'format' }
    const fracMs = clock[3] ? fractionMilliseconds(clock[3]) : 0
    return { ok: true, seconds: (minutes * 60 * EDIT_TIME_MS + seconds * EDIT_TIME_MS + fracMs) / EDIT_TIME_MS }
  }

  const plain = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text)
  if (plain) {
    const whole = Number(plain[1])
    const fracMs = plain[2] ? fractionMilliseconds(plain[2]) : 0
    return { ok: true, seconds: (whole * EDIT_TIME_MS + fracMs) / EDIT_TIME_MS }
  }

  return { ok: false, error: 'format' }
}

/** Spoken clock for labels. Milliseconds, matching the field, not samples. */
export function speakEditTime(seconds: number, locale: 'en' | 'pl'): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const ms = Math.round(safe * EDIT_TIME_MS)
  const minutes = Math.floor(ms / 60000)
  const rest = ms - minutes * 60000
  const whole = Math.floor(rest / 1000)
  const frac = rest - whole * 1000
  const sec = frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(3, '0').replace(/0+$/, '')}`
  if (locale === 'pl') {
    return minutes > 0 ? `${minutes} min ${sec} s` : `${sec} sekund`
  }
  return minutes > 0 ? `${minutes} minutes ${sec} seconds` : `${sec} seconds`
}
