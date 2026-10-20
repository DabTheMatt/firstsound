import { addCalendarDays, calendarDateToIso, calendarWindow, warsawCalendarDate } from '../calendar'
import { activityState, meterSegments } from '../metrics'
import { SNAPSHOT_STALE_AFTER_MS } from '../source'
import type { ActivityRange, StudentActivityRow, StudentSort, TimelinePoint } from '../types'
import type { PublicActivitySnapshot } from './schema'

const MAX_TIMELINE_DAYS = 366

function byName(a: string, b: string, locale: string): number {
  return a.localeCompare(b, locale, { sensitivity: 'base' })
}

export function isSnapshotStale(lastSynchronizationAt: string, now: Date, maxAge = SNAPSHOT_STALE_AFTER_MS): boolean {
  const time = Date.parse(lastSynchronizationAt)
  if (!Number.isFinite(time)) return true
  return now.getTime() - time > maxAge
}

export function publicStudentRows(
  snapshot: PublicActivitySnapshot,
  sort: StudentSort,
  locale: string,
  unknownLabel: string,
): StudentActivityRow[] {
  const asOf = new Date(snapshot.synchronization.lastSynchronizationAt)
  const rows: StudentActivityRow[] = snapshot.students.map((student) => {
    const displayName = student.displayName.trim() || unknownLabel
    return {
      id: student.studentId,
      displayName,
      recordingCount: student.recordingCount,
      totalBytes: student.totalBytes,
      lastUpload: student.lastActivityAt,
      state: activityState(student.lastActivityAt, asOf),
      segments: 0,
    }
  })
  const max = rows.reduce((peak, row) => Math.max(peak, row.recordingCount), 0)
  for (const row of rows) row.segments = meterSegments(row.recordingCount, max)
  rows.sort((a, b) => {
    if (sort === 'name') return byName(a.displayName, b.displayName, locale)
    if (sort === 'count') return b.recordingCount - a.recordingCount || byName(a.displayName, b.displayName, locale)
    const aTime = a.lastUpload ? Date.parse(a.lastUpload) : Number.NEGATIVE_INFINITY
    const bTime = b.lastUpload ? Date.parse(b.lastUpload) : Number.NEGATIVE_INFINITY
    return bTime - aTime || byName(a.displayName, b.displayName, locale)
  })
  return rows
}

export function publicTimeline(snapshot: PublicActivitySnapshot, range: ActivityRange): TimelinePoint[] {
  const asOf = Date.parse(snapshot.synchronization.lastSynchronizationAt)
  const counts = new Map(snapshot.dailyActivity.map((point) => [point.date, point.count]))
  let bounds: { start: string; end: string } | null
  if (range === '7d') bounds = calendarWindow(7, asOf)
  else if (range === '30d') bounds = calendarWindow(30, asOf)
  else {
    if (snapshot.dailyActivity.length === 0) return []
    const end = warsawCalendarDate(asOf) ?? snapshot.dailyActivity[snapshot.dailyActivity.length - 1]?.date
    if (!end) return []
    let start = snapshot.dailyActivity[0]?.date ?? end
    const cap = addCalendarDays(end, -(MAX_TIMELINE_DAYS - 1))
    if (start < cap) start = cap
    bounds = { start, end }
  }
  if (!bounds) return []
  const points: TimelinePoint[] = []
  for (let day = bounds.start; day <= bounds.end; day = addCalendarDays(day, 1)) {
    points.push({ day: calendarDateToIso(day), count: counts.get(day) ?? 0 })
    if (points.length > MAX_TIMELINE_DAYS) break
  }
  return points
}
