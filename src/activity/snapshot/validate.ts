import { calendarWindow, dateInWindow, warsawCalendarDate } from '../calendar'
import { isPrivateLabel } from '../parse'
import {
  ACTIVITY_SNAPSHOT_SCHEMA_VERSION,
  PUBLIC_DAY_KEYS,
  PUBLIC_PROJECT_KEYS,
  PUBLIC_SNAPSHOT_KEYS,
  PUBLIC_STUDENT_KEYS,
  PUBLIC_SYNC_KEYS,
  type PublicActivitySnapshot,
  type PublicDailyActivity,
  type PublicStudent,
} from './schema'

const STUDENT_ID = /^stu_[a-f0-9]{16}$/
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

export type SnapshotValidation =
  | { ok: true; snapshot: PublicActivitySnapshot }
  | { ok: false; errors: string[] }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value)
  if (keys.length !== allowed.length) return false
  return allowed.every((key) => keys.includes(key))
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isIso(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) return false
  return Number.isFinite(Date.parse(value))
}

function isYmd(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = YMD.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
}

function containsPrivateText(value: string): boolean {
  if (value.includes('@')) return true
  if (/https?:\/\//i.test(value)) return true
  if (/drive\.google\.com/i.test(value)) return true
  if (/docs\.google\.com/i.test(value)) return true
  if (/ya29\./i.test(value)) return true
  return false
}

function fail(errors: string[]): SnapshotValidation {
  return { ok: false, errors }
}

/**
 * Strict public-snapshot check.
 * Extra fields are rejected. Incomplete synchronization is rejected.
 * Counts must agree with the student rows and the Warsaw createdTime days.
 */
export function validatePublicSnapshot(input: unknown): SnapshotValidation {
  const raw = asRecord(input)
  if (!raw) return fail(['snapshot'])
  if (!exactKeys(raw, PUBLIC_SNAPSHOT_KEYS)) return fail(['extra-field'])
  if (raw.schemaVersion !== ACTIVITY_SNAPSHOT_SCHEMA_VERSION) return fail(['schema-version'])
  if (raw.timezone !== 'Europe/Warsaw') return fail(['timezone'])
  if (raw.activityBasis !== 'createdTime') return fail(['activity-basis'])
  if (!isIso(raw.generatedAt)) return fail(['generated-at'])

  const sync = asRecord(raw.synchronization)
  if (!sync || !exactKeys(sync, PUBLIC_SYNC_KEYS)) return fail(['synchronization'])
  if (sync.status !== 'complete') return fail(['incomplete'])
  if (!isIso(sync.lastSynchronizationAt)) return fail(['last-sync'])
  if (sync.lastSynchronizationAt !== raw.generatedAt) return fail(['generated-at'])

  const project = asRecord(raw.project)
  if (!project || !exactKeys(project, PUBLIC_PROJECT_KEYS)) return fail(['project'])
  const totalStudents = project.totalStudents
  const activeStudents = project.activeStudents
  const projectRecordings = project.totalRecordings
  const projectBytes = project.totalBytes
  const projectLast7 = project.recordingsLast7Days
  const projectLast30 = project.recordingsLast30Days
  if (
    !isCount(totalStudents) ||
    !isCount(activeStudents) ||
    !isCount(projectRecordings) ||
    !isCount(projectBytes) ||
    !isCount(projectLast7) ||
    !isCount(projectLast30)
  ) {
    return fail(['project-field'])
  }
  if (project.lastSynchronizationAt !== sync.lastSynchronizationAt) return fail(['last-sync'])

  if (!Array.isArray(raw.students) || !Array.isArray(raw.dailyActivity)) return fail(['snapshot'])

  const students: PublicStudent[] = []
  const seenStudents = new Set<string>()
  for (const item of raw.students) {
    const row = asRecord(item)
    if (!row || !exactKeys(row, PUBLIC_STUDENT_KEYS)) return fail(['student-field'])
    if (typeof row.studentId !== 'string' || !STUDENT_ID.test(row.studentId)) return fail(['student-id'])
    if (seenStudents.has(row.studentId)) return fail(['duplicate-student'])
    seenStudents.add(row.studentId)
    if (typeof row.displayName !== 'string') return fail(['display-name'])
    const displayName = row.displayName.trim()
    if (!displayName || displayName.length > 80 || isPrivateLabel(displayName) || containsPrivateText(displayName)) {
      return fail(['display-name'])
    }
    if (!isCount(row.recordingCount) || !isCount(row.totalBytes)) return fail(['student-field'])
    if (row.lastActivityAt !== null && !isIso(row.lastActivityAt)) return fail(['last-activity'])
    if (row.recordingCount === 0 && row.lastActivityAt !== null) return fail(['last-activity'])
    if (row.recordingCount > 0 && row.lastActivityAt === null) return fail(['last-activity'])
    if (containsPrivateText(row.studentId)) return fail(['private-value'])
    students.push({
      studentId: row.studentId,
      displayName,
      recordingCount: row.recordingCount,
      totalBytes: row.totalBytes,
      lastActivityAt: row.lastActivityAt,
    })
  }

  const daily: PublicDailyActivity[] = []
  const seenDays = new Set<string>()
  let previous = ''
  for (const item of raw.dailyActivity) {
    const row = asRecord(item)
    if (!row || !exactKeys(row, PUBLIC_DAY_KEYS)) return fail(['daily-field'])
    if (!isYmd(row.date) || !isCount(row.count) || row.count < 1) return fail(['daily-date'])
    if (seenDays.has(row.date) || (previous && row.date <= previous)) return fail(['daily-date'])
    seenDays.add(row.date)
    previous = row.date
    daily.push({ date: row.date, count: row.count })
  }

  for (const student of students) {
    if (!student.lastActivityAt) continue
    const day = warsawCalendarDate(Date.parse(student.lastActivityAt))
    if (!day || !seenDays.has(day)) return fail(['last-activity'])
  }

  const totalRecordings = students.reduce((sum, student) => sum + student.recordingCount, 0)
  const totalBytes = students.reduce((sum, student) => sum + student.totalBytes, 0)
  const dailyTotal = daily.reduce((sum, point) => sum + point.count, 0)
  if (students.length !== totalStudents) return fail(['total-students'])
  if (totalRecordings !== projectRecordings || dailyTotal !== projectRecordings) return fail(['sum-recordings'])
  if (totalBytes !== projectBytes) return fail(['sum-bytes'])

  const syncedAt = Date.parse(sync.lastSynchronizationAt)
  const week = calendarWindow(7, syncedAt)
  const month = calendarWindow(30, syncedAt)
  if (!week || !month) return fail(['last-sync'])
  const last7 = daily.reduce((sum, point) => sum + (dateInWindow(point.date, week.start, week.end) ? point.count : 0), 0)
  const last30 = daily.reduce((sum, point) => sum + (dateInWindow(point.date, month.start, month.end) ? point.count : 0), 0)
  if (last7 !== projectLast7) return fail(['recordings-last-7'])
  if (last30 !== projectLast30) return fail(['recordings-last-30'])

  const active = students.filter((student) => {
    if (!student.lastActivityAt) return false
    const day = warsawCalendarDate(Date.parse(student.lastActivityAt))
    return day !== null && dateInWindow(day, week.start, week.end)
  }).length
  if (active !== activeStudents) return fail(['active-students'])

  const snapshot: PublicActivitySnapshot = {
    schemaVersion: 1,
    generatedAt: raw.generatedAt,
    timezone: 'Europe/Warsaw',
    activityBasis: 'createdTime',
    synchronization: {
      status: 'complete',
      lastSynchronizationAt: sync.lastSynchronizationAt,
    },
    project: {
      totalStudents,
      activeStudents,
      totalRecordings: projectRecordings,
      totalBytes: projectBytes,
      recordingsLast7Days: projectLast7,
      recordingsLast30Days: projectLast30,
      lastSynchronizationAt: sync.lastSynchronizationAt,
    },
    students,
    dailyActivity: daily,
  }
  return { ok: true, snapshot }
}
