import { createHash } from 'node:crypto'
import { createContext, runInContext, type Context } from 'node:vm'
import { describe, expect, it } from 'vitest'
import scriptSource from './driveSync.gs?raw'
import { warsawCalendarDate } from '../../src/activity/calendar'
import { validatePublicSnapshot } from '../../src/activity/snapshot/validate'

type DriveFile = {
  id: string
  name: string
  mime: string
  size: number | null
  created: string | null
  modified: string | null
}

type DriveFolder = {
  id: string
  name: string
  folders: string[]
  files: DriveFile[]
}

type Trigger = {
  handler: string
  everyMinutes?: number
  everyHours?: number
  everyDays?: number
  getHandlerFunction: () => string
}

type StoredFile = { id: string; name: string; content: string }

type ScriptApi = {
  aggregateDriveMetadata: (input: unknown) => {
    snapshot: Record<string, unknown> | null
    diagnostics: { status: string; code: string; counts: Record<string, number>; audioFiles: number }
  }
  validatePublicSnapshot: (input: unknown) => { ok: boolean; errors?: string[] }
  classifyDriveFile: (file: { filename?: string; mimeType?: string; isFolder?: boolean }) => { kind: string; extension?: string; reason?: string }
  publicStudentId: (folderId: string) => string
  warsawDate: (iso: string) => string | null
  syncActivitySnapshot: () => void
  installActivitySync: () => void
}

function iterator<T>(items: T[]) {
  let index = 0
  return {
    hasNext: () => index < items.length,
    next: () => items[index++],
  }
}

function loadScript(drive: Record<string, DriveFolder> = {}) {
  const properties: Record<string, string> = {}
  const stored = new Map<string, StoredFile>()
  const triggers: Trigger[] = []
  const logs: string[] = []
  let sequence = 1
  let lockHeld = false
  let allowLock = true
  let folderThrows = false

  function asFile(file: DriveFile) {
    return {
      getId: () => file.id,
      getName: () => file.name,
      getMimeType: () => file.mime,
      getSize: () => {
        if (file.size === null) throw new Error('size')
        return file.size
      },
      getDateCreated: () => {
        if (!file.created) throw new Error('created')
        return new Date(file.created)
      },
      getLastUpdated: () => (file.modified ? new Date(file.modified) : null),
    }
  }

  function asFolder(folder: DriveFolder) {
    return {
      getId: () => folder.id,
      getName: () => folder.name,
      getFiles: () => iterator(folder.files.map(asFile)),
      getFolders: () => iterator(folder.folders.map((id) => asFolder(drive[id]!))),
    }
  }

  const sandbox = {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algorithm: string, text: string) => Array.from(createHash('sha256').update(text, 'utf8').digest()),
      formatDate: (date: Date, timeZone: string, format: string) => {
        if (format !== 'yyyy-MM-dd') throw new Error(format)
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(date)
        const year = parts.find((part) => part.type === 'year')?.value
        const month = parts.find((part) => part.type === 'month')?.value
        const day = parts.find((part) => part.type === 'day')?.value
        return `${year}-${month}-${day}`
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => (Object.prototype.hasOwnProperty.call(properties, key) ? properties[key] : null),
        setProperty: (key: string, value: string) => {
          properties[key] = value
        },
      }),
    },
    DriveApp: {
      getFolderById: (id: string) => {
        if (folderThrows) throw new Error(`missing ${id}`)
        const folder = drive[id]
        if (!folder) throw new Error('missing-folder')
        return asFolder(folder)
      },
      getFileById: (id: string) => {
        const file = stored.get(id)
        if (!file) throw new Error('missing-file')
        return {
          getId: () => file.id,
          setContent: (content: string) => {
            file.content = content
          },
        }
      },
      createFile: (name: string, content: string) => {
        const id = `export-${sequence++}`
        const file = { id, name, content }
        stored.set(id, file)
        return { getId: () => id }
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (!allowLock || lockHeld) return false
          lockHeld = true
          return true
        },
        releaseLock: () => {
          lockHeld = false
        },
      }),
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (trigger: Trigger) => {
        const index = triggers.indexOf(trigger)
        if (index >= 0) triggers.splice(index, 1)
      },
      newTrigger: (handler: string) => {
        const trigger: Trigger = { handler, getHandlerFunction: () => handler }
        const builder = {
          timeBased: () => builder,
          everyMinutes: (value: number) => {
            trigger.everyMinutes = value
            return builder
          },
          everyHours: (value: number) => {
            trigger.everyHours = value
            return builder
          },
          everyDays: (value: number) => {
            trigger.everyDays = value
            return builder
          },
          create: () => {
            triggers.push(trigger)
            return trigger
          },
        }
        return builder
      },
    },
    Logger: { log: (message: string) => logs.push(message) },
  }

  const context = createContext(sandbox)
  runInContext(scriptSource, context)
  const api = context as Context & ScriptApi
  return {
    api,
    properties,
    stored,
    triggers,
    logs,
    denyLock: () => {
      allowLock = false
    },
    failFolders: () => {
      folderThrows = true
    },
  }
}

const SYNCED = '2026-10-21T10:00:00.000Z'

function file(partial: Partial<DriveFile> & Pick<DriveFile, 'id' | 'name'> & { folderId?: string }): {
  folderId: string
  fileId: string
  filename: string
  mimeType: string
  sizeBytes: number | null
  createdTime: string | null
  modifiedTime: string | null
} {
  return {
    folderId: partial.folderId ?? 'folder-anna',
    fileId: partial.id,
    filename: partial.name,
    mimeType: partial.mime ?? 'audio/wav',
    sizeBytes: partial.size === undefined ? 100 : partial.size,
    createdTime: partial.created === undefined ? '2026-10-20T08:00:00.000Z' : partial.created,
    modifiedTime: partial.modified === undefined ? '2026-10-21T08:00:00.000Z' : partial.modified,
  }
}

function aggregate(files: ReturnType<typeof file>[], folders = [
  { folderId: 'folder-empty', folderName: 'Empty Person' },
  { folderId: 'folder-anna', folderName: 'Anna Kowalska' },
  { folderId: 'folder-admin', folderName: 'Teachers' },
]) {
  const { api } = loadScript()
  return api.aggregateDriveMetadata({
    folders,
    files,
    config: {
      excludedFolderIds: [],
      excludedFolderNames: ['Teachers'],
      displayNames: { 'folder-anna': 'Ania W.' },
      publishFolderNames: false,
    },
    syncedAt: SYNCED,
  })
}

describe('drive metadata sync', () => {
  it('keeps the Warsaw calendar aligned with FIELD', () => {
    const { api } = loadScript()
    const boundary = '2026-10-20T22:00:00.000Z'
    const before = '2026-10-20T21:59:00.000Z'
    expect(api.warsawDate(boundary)).toBe(warsawCalendarDate(Date.parse(boundary)))
    expect(api.warsawDate(boundary)).toBe('2026-10-21')
    expect(api.warsawDate(before)).toBe('2026-10-20')
  })

  it('classifies audio from the extension or MIME and ignores other files', () => {
    const { api } = loadScript()
    expect(api.classifyDriveFile({ filename: 'take.wav', mimeType: 'application/octet-stream' }).kind).toBe('audio')
    expect(api.classifyDriveFile({ filename: 'take.aif', mimeType: '' }).extension).toBe('aif')
    expect(api.classifyDriveFile({ filename: 'voice', mimeType: 'audio/mpeg' }).extension).toBe('mp3')
    expect(api.classifyDriveFile({ filename: 'notes.pdf', mimeType: 'audio/wav' }).kind).toBe('ignore')
    expect(api.classifyDriveFile({ filename: 'sheet', mimeType: 'application/vnd.google-apps.document' }).reason).toBe('google-app')
    expect(api.classifyDriveFile({ filename: 'photo.png', mimeType: 'image/png' }).kind).toBe('ignore')
    expect(api.classifyDriveFile({ filename: 'part.crdownload', mimeType: 'audio/wav' }).reason).toBe('temporary')
    expect(api.classifyDriveFile({ filename: 'folder', mimeType: 'application/vnd.google-apps.folder', isFolder: true }).reason).toBe('folder')
    expect(scriptSource).not.toContain('getBlob')
    expect(scriptSource).not.toContain('setSharing')
    expect(scriptSource).not.toContain('UrlFetchApp')
  })

  it('aggregates an empty parent and an empty student folder', () => {
    const empty = aggregate([], [])
    expect(empty.snapshot).not.toBeNull()
    expect(validatePublicSnapshot(empty.snapshot).ok).toBe(true)
    expect(empty.snapshot?.project).toMatchObject({ totalStudents: 0, totalRecordings: 0, totalBytes: 0 })
    const quiet = aggregate([])
    expect(quiet.snapshot?.project).toMatchObject({ totalStudents: 2, totalRecordings: 0, activeStudents: 0 })
    const students = quiet.snapshot?.students as { displayName: string; recordingCount: number; lastActivityAt: string | null }[]
    expect(students.every((student) => student.recordingCount === 0 && student.lastActivityAt === null)).toBe(true)
    expect(JSON.stringify(quiet.snapshot)).not.toContain('Empty Person')
    expect(JSON.stringify(quiet.snapshot)).not.toContain('Teachers')
  })

  it('counts supported files, duplicate names, and Warsaw createdTime', () => {
    const withNested = aggregate([
      file({ id: 'file-1', name: 'take.wav', size: 1000, created: '2026-10-20T22:30:00.000Z' }),
      file({ id: 'file-2', name: 'take.wav', size: 2000, created: '2026-10-20T21:30:00.000Z' }),
      file({ id: 'file-1b', name: 'take.wav', size: 9999, created: '2026-10-21T00:00:00.000Z' }),
      file({ id: 'file-3', name: 'old.flac', mime: 'audio/flac', size: 50, created: '2026-09-01T08:00:00.000Z', modified: '2026-10-21T09:00:00.000Z' }),
      file({ id: 'file-4', name: 'undated.wav', created: null }),
      file({ id: 'file-5', name: 'nosize.mp3', mime: 'audio/mpeg', size: null, created: '2026-10-21T08:00:00.000Z' }),
      file({ id: 'file-6', name: 'notes.pdf', mime: 'application/pdf' }),
      file({ id: 'file-7', name: 'photo.png', mime: 'image/png' }),
      file({ id: 'file-8', name: 'Sheet', mime: 'application/vnd.google-apps.spreadsheet' }),
      file({ id: 'file-9', name: 'part.crdownload', mime: 'audio/wav' }),
      file({ id: 'file-10', name: 'secret.wav', folderId: 'folder-admin' }),
      file({ id: 'file-11', name: 'nested.wav', folderId: 'folder-nested', created: '2026-10-21T01:00:00.000Z' }),
    ])
    expect(withNested.diagnostics.code).toBe('ok')
    expect(withNested.snapshot).not.toBeNull()
    const validated = validatePublicSnapshot(withNested.snapshot)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.snapshot.project).toMatchObject({
      totalStudents: 2,
      activeStudents: 1,
      totalRecordings: 5,
      totalBytes: 1000 + 2000 + 9999 + 50,
      recordingsLast7Days: 4,
      recordingsLast30Days: 4,
    })
    const ania = validated.snapshot.students.find((student) => student.displayName === 'Ania W.')
    expect(ania?.recordingCount).toBe(5)
    expect(ania?.studentId.startsWith('stu_')).toBe(true)
    expect(validated.snapshot.dailyActivity.map((point) => point.date)).toEqual(['2026-09-01', '2026-10-20', '2026-10-21'])
    expect(withNested.diagnostics.counts['missing-created-time']).toBe(1)
    expect(withNested.diagnostics.counts['missing-size']).toBe(1)
    expect(withNested.diagnostics.counts['duplicate-file']).toBe(0)
    const duplicate = aggregate([
      file({ id: 'same', name: 'take.wav', created: '2026-10-21T08:00:00.000Z' }),
      file({ id: 'same', name: 'other.wav', created: '2026-10-21T09:00:00.000Z' }),
    ])
    expect(duplicate.diagnostics.counts['duplicate-file']).toBe(1)
    expect(duplicate.snapshot?.project).toMatchObject({ totalRecordings: 1 })
    const json = JSON.stringify(validated.snapshot)
    expect(json).not.toContain('Anna Kowalska')
    expect(json).not.toContain('folder-anna')
    expect(json).not.toContain('file-1')
    expect(json).not.toContain('take.wav')
    expect(json).not.toContain('secret.wav')
    expect(json).not.toContain('nested.wav')
    expect(json).not.toContain('@')
    expect(json).not.toContain('drive.google')
  })

  it('does not publish a partial, locked, or failed scan', () => {
    const drive: Record<string, DriveFolder> = {
      root: {
        id: 'root',
        name: 'Class',
        folders: ['folder-anna'],
        files: [{ id: 'root-file', name: 'root.wav', mime: 'audio/wav', size: 10, created: '2026-10-21T08:00:00.000Z', modified: '2026-10-21T08:00:00.000Z' }],
      },
      'folder-anna': {
        id: 'folder-anna',
        name: 'Anna Kowalska',
        folders: ['folder-nested'],
        files: [
          { id: 'file-1', name: 'take.wav', mime: 'audio/wav', size: 80, created: '2026-10-21T08:00:00.000Z', modified: '2026-10-21T08:00:00.000Z' },
          { id: 'file-pdf', name: 'notes.pdf', mime: 'application/pdf', size: 5, created: '2026-10-21T08:00:00.000Z', modified: '2026-10-21T08:00:00.000Z' },
        ],
      },
      'folder-nested': {
        id: 'folder-nested',
        name: 'Nested',
        folders: [],
        files: [{ id: 'file-nested', name: 'nested.wav', mime: 'audio/wav', size: 70, created: '2026-10-21T07:00:00.000Z', modified: '2026-10-21T07:00:00.000Z' }],
      },
    }
    const session = loadScript(drive)
    session.properties.ACTIVITY_ROOT_FOLDER_ID = 'root'
    session.properties.ACTIVITY_DISPLAY_NAMES = JSON.stringify({ 'folder-anna': 'Ania W.' })
    session.api.syncActivitySnapshot()
    const snapshotFile = [...session.stored.values()].find((file) => file.name === 'field-activity-snapshot.json')
    expect(snapshotFile).toBeTruthy()
    const published = JSON.parse(snapshotFile?.content ?? '{}') as unknown
    const validated = validatePublicSnapshot(published)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.snapshot.project.totalRecordings).toBe(1)
    expect(JSON.stringify(published)).not.toContain('take.wav')
    expect(JSON.stringify(published)).not.toContain('folder-anna')
    expect(JSON.stringify(published)).not.toContain('root.wav')
    expect(JSON.stringify(published)).not.toContain('nested.wav')
    const previous = snapshotFile?.content

    session.denyLock()
    session.api.syncActivitySnapshot()
    expect(snapshotFile?.content).toBe(previous)
    const overlap = [...session.stored.values()].find((file) => file.name === 'field-activity-diagnostics.json')
    expect(JSON.parse(overlap?.content ?? '{}')).toMatchObject({ status: 'incomplete', code: 'overlap' })

    const limited = loadScript(drive)
    limited.properties.ACTIVITY_ROOT_FOLDER_ID = 'root'
    limited.properties.ACTIVITY_MAX_RUNTIME_MS = '0'
    limited.api.syncActivitySnapshot()
    expect([...limited.stored.values()].some((file) => file.name === 'field-activity-snapshot.json')).toBe(false)
    const timeLimit = [...limited.stored.values()].find((file) => file.name === 'field-activity-diagnostics.json')
    expect(JSON.parse(timeLimit?.content ?? '{}')).toMatchObject({ status: 'incomplete', code: 'time-limit' })
    expect(timeLimit?.content).not.toContain('Anna')

    const broken = loadScript(drive)
    broken.properties.ACTIVITY_ROOT_FOLDER_ID = 'root'
    broken.failFolders()
    broken.api.syncActivitySnapshot()
    expect([...broken.stored.values()].some((file) => file.name === 'field-activity-snapshot.json')).toBe(false)
    const failure = [...broken.stored.values()].find((file) => file.name === 'field-activity-diagnostics.json')
    expect(JSON.parse(failure?.content ?? '{}')).toMatchObject({ status: 'incomplete', code: 'exception' })
    expect(failure?.content).not.toContain('root')
  })

  it('installs a single hourly trigger', () => {
    const session = loadScript()
    session.api.installActivitySync()
    session.api.installActivitySync()
    expect(session.triggers).toHaveLength(1)
    expect(session.triggers[0]?.handler).toBe('syncActivitySnapshot')
    expect(session.triggers[0]?.everyHours).toBe(1)
    session.properties.ACTIVITY_INTERVAL_MINUTES = '45'
    session.api.installActivitySync()
    expect(session.triggers).toHaveLength(1)
    const diagnostics = [...session.stored.values()].find((file) => file.name === 'field-activity-diagnostics.json')
    expect(JSON.parse(diagnostics?.content ?? '{}')).toMatchObject({ code: 'invalid-interval' })
  })
})
