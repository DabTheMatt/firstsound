/**
 * Public activity snapshot, schema 1.
 * Only these fields may be published. Classification of audio files happens
 * before this document is built and uses extension plus MIME metadata.
 * It does not decode audio.
 */

export const ACTIVITY_SNAPSHOT_SCHEMA_VERSION = 1

export const PUBLIC_SNAPSHOT_KEYS = [
  'schemaVersion',
  'generatedAt',
  'timezone',
  'activityBasis',
  'synchronization',
  'project',
  'students',
  'dailyActivity',
] as const

export const PUBLIC_SYNC_KEYS = ['status', 'lastSynchronizationAt'] as const

export const PUBLIC_PROJECT_KEYS = [
  'totalStudents',
  'activeStudents',
  'totalRecordings',
  'totalBytes',
  'recordingsLast7Days',
  'recordingsLast30Days',
  'lastSynchronizationAt',
] as const

export const PUBLIC_STUDENT_KEYS = [
  'studentId',
  'displayName',
  'recordingCount',
  'totalBytes',
  'lastActivityAt',
] as const

export const PUBLIC_DAY_KEYS = ['date', 'count'] as const

export const PUBLIC_DAY_STUDENT_KEYS = ['studentId', 'count'] as const

export type PublicStudent = {
  studentId: string
  displayName: string
  recordingCount: number
  totalBytes: number
  lastActivityAt: string | null
}

export type PublicDayStudent = {
  studentId: string
  count: number
}

export type PublicDailyActivity = {
  date: string
  count: number
  /** Counts for that Warsaw day. Absent on snapshots that only stored a daily total. */
  byStudent?: PublicDayStudent[]
}

export type PublicActivitySnapshot = {
  schemaVersion: 1
  generatedAt: string
  timezone: 'Europe/Warsaw'
  activityBasis: 'createdTime'
  synchronization: {
    status: 'complete'
    lastSynchronizationAt: string
  }
  project: {
    totalStudents: number
    activeStudents: number
    totalRecordings: number
    totalBytes: number
    recordingsLast7Days: number
    recordingsLast30Days: number
    lastSynchronizationAt: string
  }
  students: PublicStudent[]
  dailyActivity: PublicDailyActivity[]
}
