import {
  ACTIVITY_SOURCES,
  type ActivitySnapshot,
  type ActivitySourceKind,
  type RecordingReference,
  type Student,
} from './types'

const SOURCE_SET = new Set<string>(ACTIVITY_SOURCES)

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function stripControls(value: string): string {
  let out = ''
  for (const char of value) {
    if (char.charCodeAt(0) >= 32) out += char
  }
  return out
}

function basename(name: string): string {
  const cut = name.split(/[/\\]/).pop()?.trim() ?? ''
  if (!cut || cut === '.' || cut === '..') return ''
  return stripControls(cut).slice(0, 180)
}

/** Display names and ids stay free of addresses. */
export function isPrivateLabel(value: string): boolean {
  const text = value.trim()
  if (!text) return true
  if (text.includes('@')) return true
  if (/https?:\/\//i.test(text)) return true
  if (/drive\.google\.com/i.test(text)) return true
  if (/^ya29[.\w-]*$/i.test(text)) return true
  return false
}

function parseStudent(value: unknown): Student | null {
  const raw = asRecord(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.displayName !== 'string') return null
  const id = raw.id.trim()
  if (!id || id.length > 80 || isPrivateLabel(id)) return null
  const displayName = isPrivateLabel(raw.displayName) ? '' : raw.displayName.trim()
  return { id, displayName }
}

function parseRecording(value: unknown): RecordingReference | null {
  const raw = asRecord(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.studentId !== 'string' || typeof raw.filename !== 'string') return null
  const id = raw.id.trim()
  const studentId = raw.studentId.trim()
  if (!id || id.length > 120 || isPrivateLabel(id)) return null
  if (!studentId || studentId.length > 80 || isPrivateLabel(studentId)) return null
  const filename = basename(raw.filename)
  if (!filename || isPrivateLabel(filename)) return null
  const size = typeof raw.sizeBytes === 'number' ? raw.sizeBytes : Number.NaN
  if (!Number.isFinite(size) || size < 0 || size > Number.MAX_SAFE_INTEGER) return null
  if (typeof raw.createdTime !== 'string') return null
  const created = Date.parse(raw.createdTime)
  if (!Number.isFinite(created)) return null
  const modified = typeof raw.modifiedTime === 'string' ? Date.parse(raw.modifiedTime) : Number.NaN
  const mime = typeof raw.mimeType === 'string' ? raw.mimeType.split(';')[0]?.trim().toLowerCase() ?? '' : ''
  return {
    id,
    studentId,
    filename,
    mimeType: mime.slice(0, 80),
    sizeBytes: Math.round(size),
    createdTime: new Date(created).toISOString(),
    modifiedTime: new Date(Number.isFinite(modified) ? modified : created).toISOString(),
  }
}

/** Copies only the fields approved for a public statistics snapshot. */
export function toPublicActivitySnapshot(snapshot: ActivitySnapshot): ActivitySnapshot {
  return {
    source: snapshot.source,
    generatedAt: snapshot.generatedAt,
    students: snapshot.students.map((student) => ({
      id: student.id,
      displayName: student.displayName,
    })),
    recordings: snapshot.recordings.map((recording) => ({
      id: recording.id,
      studentId: recording.studentId,
      filename: recording.filename,
      mimeType: recording.mimeType,
      sizeBytes: recording.sizeBytes,
      createdTime: recording.createdTime,
      modifiedTime: recording.modifiedTime,
    })),
  }
}

/**
 * Accepts a loose payload and returns a public snapshot.
 * Invalid rows are dropped. A payload that is not a snapshot returns null.
 */
export function parseActivitySnapshot(input: unknown): ActivitySnapshot | null {
  const raw = asRecord(input)
  if (!raw || typeof raw.source !== 'string' || !SOURCE_SET.has(raw.source)) return null
  if (!Array.isArray(raw.students) || !Array.isArray(raw.recordings)) return null
  const generated = typeof raw.generatedAt === 'string' ? Date.parse(raw.generatedAt) : Number.NaN
  const students: Student[] = []
  const seenStudents = new Set<string>()
  for (const item of raw.students) {
    const student = parseStudent(item)
    if (!student || seenStudents.has(student.id)) continue
    seenStudents.add(student.id)
    students.push(student)
  }
  const recordings: RecordingReference[] = []
  const seenFiles = new Set<string>()
  for (const item of raw.recordings) {
    const recording = parseRecording(item)
    if (!recording || seenFiles.has(recording.id)) continue
    seenFiles.add(recording.id)
    recordings.push(recording)
  }
  return toPublicActivitySnapshot({
    source: raw.source as ActivitySourceKind,
    generatedAt: new Date(Number.isFinite(generated) ? generated : 0).toISOString(),
    students,
    recordings,
  })
}
