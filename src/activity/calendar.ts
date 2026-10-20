/**
 * Activity days are Europe/Warsaw calendar dates.
 * A new upload is the Drive createdTime instant, never modifiedTime.
 * The calendar date is formatted in Europe/Warsaw. Day arithmetic uses
 * UTC midnights of those dates so a DST change does not skip a day.
 */

export const ACTIVITY_TIMEZONE = 'Europe/Warsaw'
export const DAY_MS = 86_400_000

export function warsawCalendarDate(ms: number): string | null {
  if (!Number.isFinite(ms)) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACTIVITY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms))
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}

export function addCalendarDays(ymd: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return ymd
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + delta * DAY_MS
  return new Date(utc).toISOString().slice(0, 10)
}

/** Inclusive Warsaw calendar window ending on the day of `asOfMs`. */
export function calendarWindow(days: number, asOfMs: number): { start: string; end: string } | null {
  if (!Number.isFinite(days) || days < 1) return null
  const end = warsawCalendarDate(asOfMs)
  if (!end) return null
  return { start: addCalendarDays(end, -(Math.floor(days) - 1)), end }
}

export function dateInWindow(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end
}

/** UTC midnight ISO for a calendar date, so labels stay on that Warsaw day. */
export function calendarDateToIso(ymd: string): string {
  return `${ymd}T00:00:00.000Z`
}
