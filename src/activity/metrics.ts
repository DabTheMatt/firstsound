import type {
  ActivityMetrics,
  ActivityRange,
  ActivitySnapshot,
  ActivityState,
  RecentRecordingRow,
  RecordingReference,
  StudentActivityRow,
  StudentSort,
  TimelinePoint,
} from './types'
import { audioFormatLabel } from './format'
import { activityColors } from './palette'
import { addCalendarDays, calendarDateToIso, calendarWindow, dateInWindow, warsawCalendarDate } from './calendar'

export { DAY_MS } from './calendar'

const MAX_TIMELINE_DAYS = 366
export const METER_SEGMENTS = 16

export function utcDayStart(ms: number): number {
  const date = new Date(ms)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function recordingDay(iso: string): string | null {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return null
  return warsawCalendarDate(time)
}

function allWindow(days: string[]): { start: string; end: string } | null {
  if (days.length === 0) return null
  let start = days.reduce((earliest, day) => (day < earliest ? day : earliest))
  const end = days.reduce((latest, day) => (day > latest ? day : latest))
  const cap = addCalendarDays(end, -(MAX_TIMELINE_DAYS - 1))
  if (start < cap) start = cap
  return { start, end }
}

function windowFor(range: ActivityRange, now: Date, days: string[]): { start: string; end: string } | null {
  if (range === '7d') return calendarWindow(7, now.getTime())
  if (range === '30d') return calendarWindow(30, now.getTime())
  return allWindow(days)
}

export function recordingsInDays(recordings: RecordingReference[], days: number, now: Date): number {
  const bounds = calendarWindow(days, now.getTime())
  if (!bounds) return 0
  let count = 0
  for (const recording of recordings) {
    const day = recordingDay(recording.createdTime)
    if (day && dateInWindow(day, bounds.start, bounds.end)) count += 1
  }
  return count
}

export function activityMetrics(snapshot: ActivitySnapshot, now: Date): ActivityMetrics {
  const recent = calendarWindow(7, now.getTime())
  const known = new Set(snapshot.students.map((student) => student.id))
  const active = new Set<string>()
  let totalBytes = 0
  let last7Days = 0
  for (const recording of snapshot.recordings) {
    if (Number.isFinite(recording.sizeBytes) && recording.sizeBytes >= 0) totalBytes += recording.sizeBytes
    const day = recordingDay(recording.createdTime)
    if (!recent || !day || !dateInWindow(day, recent.start, recent.end)) continue
    last7Days += 1
    if (known.has(recording.studentId)) active.add(recording.studentId)
  }
  return {
    recordingCount: snapshot.recordings.length,
    totalBytes,
    activeStudents: active.size,
    last7Days,
  }
}

export function timelinePoints(recordings: RecordingReference[], range: ActivityRange, now: Date): TimelinePoint[] {
  const days = recordings.map((recording) => recordingDay(recording.createdTime)).filter((day): day is string => day !== null)
  const bounds = windowFor(range, now, days)
  if (!bounds) return []
  const counts = new Map<string, Map<string, number>>()
  for (let day = bounds.start; day <= bounds.end; day = addCalendarDays(day, 1)) {
    counts.set(day, new Map())
    if (counts.size > MAX_TIMELINE_DAYS) break
  }
  for (const recording of recordings) {
    const day = recordingDay(recording.createdTime)
    const bucket = day ? counts.get(day) : undefined
    if (!bucket) continue
    bucket.set(recording.studentId, (bucket.get(recording.studentId) ?? 0) + 1)
  }
  return [...counts.entries()].map(([day, bucket]) => {
    const segments = [...bucket.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([studentId, count]) => ({ studentId, count }))
    const count = segments.reduce((sum, segment) => sum + segment.count, 0)
    return { day: calendarDateToIso(day), count, segments }
  })
}

export function activityState(lastUpload: string | null, now: Date): ActivityState {
  if (!lastUpload) return 'none'
  const day = recordingDay(lastUpload)
  const recent = calendarWindow(7, now.getTime())
  if (!day || !recent) return 'earlier'
  return dateInWindow(day, recent.start, recent.end) ? 'recent' : 'earlier'
}

export function meterSegments(count: number, max: number, segments = METER_SEGMENTS): number {
  if (count <= 0 || max <= 0) return 0
  return Math.max(1, Math.min(segments, Math.round((count / max) * segments)))
}

function byName(a: string, b: string, locale: string): number {
  return a.localeCompare(b, locale, { sensitivity: 'base' })
}

export function studentRows(
  snapshot: ActivitySnapshot,
  now: Date,
  sort: StudentSort,
  locale: string,
  unknownLabel: string,
): StudentActivityRow[] {
  const totals = new Map<string, { count: number; bytes: number; last: string | null }>()
  for (const recording of snapshot.recordings) {
    const current = totals.get(recording.studentId) ?? { count: 0, bytes: 0, last: null }
    current.count += 1
    if (Number.isFinite(recording.sizeBytes) && recording.sizeBytes >= 0) current.bytes += recording.sizeBytes
    if (!current.last || Date.parse(recording.createdTime) > Date.parse(current.last)) current.last = recording.createdTime
    totals.set(recording.studentId, current)
  }
  const colors = activityColors(snapshot.students.map((student) => student.id))
  const rows: StudentActivityRow[] = snapshot.students.map((student) => {
    const total = totals.get(student.id) ?? { count: 0, bytes: 0, last: null }
    const displayName = student.displayName.trim() || unknownLabel
    return {
      id: student.id,
      displayName,
      recordingCount: total.count,
      totalBytes: total.bytes,
      lastUpload: total.last,
      state: activityState(total.last, now),
      segments: 0,
      color: colors.get(student.id) ?? '#c9841a',
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

export function recentRecordings(
  snapshot: ActivitySnapshot,
  unknownLabel: string,
  limit = 8,
): RecentRecordingRow[] {
  const names = new Map(snapshot.students.map((student) => [student.id, student.displayName.trim() || unknownLabel]))
  return [...snapshot.recordings]
    .sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((recording) => ({
      id: recording.id,
      filename: recording.filename,
      studentName: names.get(recording.studentId) ?? unknownLabel,
      uploaded: recording.createdTime,
      sizeBytes: recording.sizeBytes,
      mimeType: recording.mimeType,
      format: audioFormatLabel(recording.mimeType, recording.filename),
    }))
}
