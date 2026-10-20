/**
 * Public activity statistics.
 * Only these fields may be shown or published. No addresses, tokens, or folder URLs.
 */

export const ACTIVITY_SOURCES = ['demo', 'published', 'drive'] as const

export type ActivitySourceKind = (typeof ACTIVITY_SOURCES)[number]

export type Student = {
  id: string
  displayName: string
}

export type RecordingReference = {
  id: string
  studentId: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdTime: string
  modifiedTime: string
}

export type ActivitySnapshot = {
  source: ActivitySourceKind
  generatedAt: string
  students: Student[]
  recordings: RecordingReference[]
}

export type ActivityRange = '7d' | '30d' | 'all'

export type StudentSort = 'count' | 'recent' | 'name'

export type ActivityState = 'recent' | 'earlier' | 'none'

export type ActivityMetrics = {
  recordingCount: number
  totalBytes: number
  activeStudents: number
  last7Days: number
}

export type TimelinePoint = {
  /** UTC midnight of a Europe/Warsaw calendar date, ISO-8601. */
  day: string
  count: number
}

export type StudentActivityRow = {
  id: string
  displayName: string
  recordingCount: number
  totalBytes: number
  lastUpload: string | null
  state: ActivityState
  segments: number
}

export type RecentRecordingRow = {
  id: string
  filename: string
  studentName: string
  uploaded: string
  sizeBytes: number
  mimeType: string
  format: string
}
