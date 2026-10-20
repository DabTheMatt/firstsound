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

export const DAY_MS = 86_400_000
const MAX_TIMELINE_DAYS = 366
export const METER_SEGMENTS = 16

export function utcDayStart(ms: number): number {
  const date = new Date(ms)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function fixedWindow(days: number, now: Date): { start: number; end: number } {
  const end = utcDayStart(now.getTime())
  return { start: end - (days - 1) * DAY_MS, end }
}

function allWindow(times: number[]): { start: number; end: number } | null {
  if (times.length === 0) return null
  let start = utcDayStart(Math.min(...times))
  let end = utcDayStart(Math.max(...times))
  if (end < start) return null
  if (end - start > (MAX_TIMELINE_DAYS - 1) * DAY_MS) start = end - (MAX_TIMELINE_DAYS - 1) * DAY_MS
  return { start, end }
}

function windowFor(range: ActivityRange, now: Date, times: number[]): { start: number; end: number } | null {
  if (range === '7d') return fixedWindow(7, now)
  if (range === '30d') return fixedWindow(30, now)
  return allWindow(times)
}

function inWindow(iso: string, start: number, end: number): boolean {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return false
  const day = utcDayStart(time)
  return day >= start && day <= end
}

export function activityMetrics(snapshot: ActivitySnapshot, now: Date): ActivityMetrics {
  const recent = fixedWindow(7, now)
  const known = new Set(snapshot.students.map((student) => student.id))
  const active = new Set<string>()
  let totalBytes = 0
  let last7Days = 0
  for (const recording of snapshot.recordings) {
    if (Number.isFinite(recording.sizeBytes) && recording.sizeBytes >= 0) totalBytes += recording.sizeBytes
    if (!inWindow(recording.createdTime, recent.start, recent.end)) continue
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
  const times = recordings.map((recording) => Date.parse(recording.createdTime)).filter(Number.isFinite)
  const bounds = windowFor(range, now, times)
  if (!bounds) return []
  const counts = new Map<number, number>()
  for (let day = bounds.start; day <= bounds.end; day += DAY_MS) counts.set(day, 0)
  for (const recording of recordings) {
    const time = Date.parse(recording.createdTime)
    if (!Number.isFinite(time)) continue
    const day = utcDayStart(time)
    if (!counts.has(day)) continue
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts.entries()].map(([ms, count]) => ({ day: new Date(ms).toISOString(), count }))
}

export function activityState(lastUpload: string | null, now: Date): ActivityState {
  if (!lastUpload) return 'none'
  const recent = fixedWindow(7, now)
  return inWindow(lastUpload, recent.start, recent.end) ? 'recent' : 'earlier'
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
