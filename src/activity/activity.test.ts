import { describe, expect, it } from 'vitest'
import { createDemoSnapshot } from './demo'
import { audioFormatLabel } from './format'
import { activityMetrics, recentRecordings, studentRows, timelinePoints } from './metrics'
import { parseActivitySnapshot } from './parse'
import { createDemoActivityProvider, createDriveActivityProvider, createPublishedJsonProvider, ActivitySourceError } from './provider'
import type { ActivitySnapshot, RecordingReference } from './types'

const NOW = new Date('2026-10-20T12:00:00.000Z')

function recording(partial: Partial<RecordingReference> & Pick<RecordingReference, 'id' | 'studentId' | 'createdTime'>): RecordingReference {
  return {
    filename: `${partial.id}.wav`,
    mimeType: 'audio/wav',
    sizeBytes: 1000,
    modifiedTime: partial.createdTime,
    ...partial,
  }
}

function fixture(): ActivitySnapshot {
  return {
    source: 'demo',
    generatedAt: NOW.toISOString(),
    students: [
      { id: 's1', displayName: 'Ania' },
      { id: 's2', displayName: 'Bartek' },
      { id: 's3', displayName: 'Celina' },
      { id: 's4', displayName: 'Zofia' },
    ],
    recordings: [
      recording({ id: 'a', studentId: 's1', createdTime: '2026-10-20T08:00:00.000Z', sizeBytes: 1000, filename: 'rynek.wav' }),
      recording({ id: 'b', studentId: 's1', createdTime: '2026-10-18T08:00:00.000Z', sizeBytes: 2000, filename: 'planty.flac', mimeType: 'audio/flac' }),
      recording({ id: 'c', studentId: 's2', createdTime: '2026-10-01T08:00:00.000Z', sizeBytes: 4000 }),
      recording({ id: 'd', studentId: 's2', createdTime: '2026-09-01T08:00:00.000Z', sizeBytes: 8000 }),
      recording({ id: 'e', studentId: 's4', createdTime: '2026-10-19T08:00:00.000Z', sizeBytes: 500 }),
      recording({ id: 'f', studentId: 's4', createdTime: '2026-10-19T09:00:00.000Z', sizeBytes: 500 }),
      recording({ id: 'g', studentId: 's4', createdTime: '2026-10-16T09:00:00.000Z', sizeBytes: 500 }),
    ],
  }
}

describe('activity metrics', () => {
  const snapshot = fixture()

  it('counts recordings, size, recent students, and the last seven days', () => {
    expect(activityMetrics(snapshot, NOW)).toEqual({
      recordingCount: 7,
      totalBytes: 16500,
      activeStudents: 2,
      last7Days: 5,
    })
  })

  it('filters the timeline without changing the definition of the last seven days', () => {
    const week = timelinePoints(snapshot.recordings, '7d', NOW)
    const month = timelinePoints(snapshot.recordings, '30d', NOW)
    const all = timelinePoints(snapshot.recordings, 'all', NOW)
    expect(week).toHaveLength(7)
    expect(month).toHaveLength(30)
    expect(week.reduce((sum, point) => sum + point.count, 0)).toBe(activityMetrics(snapshot, NOW).last7Days)
    expect(month.reduce((sum, point) => sum + point.count, 0)).toBe(6)
    expect(all.reduce((sum, point) => sum + point.count, 0)).toBe(7)
    expect(all[0]?.day.startsWith('2026-09-01')).toBe(true)
    expect(week.some((point) => point.day.startsWith('2026-09-01'))).toBe(false)
  })

  it('sorts participants by count, recent activity, and name', () => {
    const count = studentRows(snapshot, NOW, 'count', 'en', 'Unknown').map((row) => row.displayName)
    const recent = studentRows(snapshot, NOW, 'recent', 'en', 'Unknown').map((row) => row.displayName)
    const name = studentRows(snapshot, NOW, 'name', 'en', 'Unknown').map((row) => row.displayName)
    expect(count).toEqual(['Zofia', 'Ania', 'Bartek', 'Celina'])
    expect(recent).toEqual(['Ania', 'Zofia', 'Bartek', 'Celina'])
    expect(name).toEqual(['Ania', 'Bartek', 'Celina', 'Zofia'])
    const rows = studentRows(snapshot, NOW, 'name', 'en', 'Unknown')
    expect(rows.find((row) => row.displayName === 'Ania')?.state).toBe('recent')
    expect(rows.find((row) => row.displayName === 'Bartek')?.state).toBe('earlier')
    expect(rows.find((row) => row.displayName === 'Celina')?.state).toBe('none')
    expect(rows.find((row) => row.displayName === 'Celina')?.segments).toBe(0)
    expect(rows.find((row) => row.displayName === 'Zofia')?.segments).toBe(16)
  })

  it('lists recent files without a duration', () => {
    const recent = recentRecordings(snapshot, 'Unknown')
    expect(recent.map((row) => row.id)).toEqual(['a', 'f', 'e', 'b', 'g', 'c', 'd'])
    expect(recent[0]).not.toHaveProperty('duration')
    expect(recent[1]?.format).toBe('WAV')
    expect(recent.find((row) => row.id === 'b')?.format).toBe('FLAC')
  })

  it('keeps an empty snapshot at zero', () => {
    const empty: ActivitySnapshot = { source: 'demo', generatedAt: NOW.toISOString(), students: [], recordings: [] }
    expect(activityMetrics(empty, NOW)).toEqual({
      recordingCount: 0,
      totalBytes: 0,
      activeStudents: 0,
      last7Days: 0,
    })
    expect(timelinePoints(empty.recordings, '7d', NOW).every((point) => point.count === 0)).toBe(true)
    expect(timelinePoints(empty.recordings, 'all', NOW)).toEqual([])
    expect(studentRows(empty, NOW, 'name', 'en', 'Unknown')).toEqual([])
    expect(recentRecordings(empty, 'Unknown')).toEqual([])
  })

  it('does not treat an unknown student id as a public name', () => {
    const orphan: ActivitySnapshot = {
      source: 'published',
      generatedAt: NOW.toISOString(),
      students: [],
      recordings: [recording({ id: 'a', studentId: 'missing', createdTime: '2026-10-20T08:00:00.000Z' })],
    }
    expect(activityMetrics(orphan, NOW).activeStudents).toBe(0)
    expect(activityMetrics(orphan, NOW).last7Days).toBe(1)
    expect(recentRecordings(orphan, 'Unknown participant')[0]?.studentName).toBe('Unknown participant')
  })
})

describe('activity snapshot parsing', () => {
  it('drops private fields, bad rows, and duplicate ids', () => {
    const parsed = parseActivitySnapshot({
      source: 'published',
      generatedAt: '2026-10-20T00:00:00.000Z',
      accessToken: 'ya29.secret-token',
      folderUrl: 'https://drive.google.com/drive/folders/abc',
      students: [
        { id: 's1', displayName: 'Ania W.', email: 'ania@example.com' },
        { id: 'ania@example.com', displayName: 'Hidden' },
        { id: 's1', displayName: 'Duplicate' },
      ],
      recordings: [
        {
          id: 'f1',
          studentId: 's1',
          filename: 'https://drive.google.com/file/d/secret/rynek.wav',
          mimeType: 'audio/wav; charset=binary',
          sizeBytes: 10,
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: 'not-a-date',
          webViewLink: 'https://drive.google.com/file/d/secret',
          duration: 12.5,
        },
        {
          id: 'f1',
          studentId: 's1',
          filename: 'other.wav',
          mimeType: 'audio/wav',
          sizeBytes: 99,
          createdTime: '2026-10-19T00:00:00.000Z',
          modifiedTime: '2026-10-19T00:00:00.000Z',
        },
        {
          id: 'bad',
          studentId: 's1',
          filename: 'nope.wav',
          mimeType: 'audio/wav',
          sizeBytes: -5,
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: '2026-10-20T00:00:00.000Z',
        },
        {
          id: 'text',
          studentId: 's1',
          filename: '../secret.wav',
          mimeType: 'audio/mpeg',
          sizeBytes: '12',
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: '2026-10-20T00:00:00.000Z',
        },
      ],
    })
    expect(parsed?.students).toEqual([{ id: 's1', displayName: 'Ania W.' }])
    expect(parsed?.recordings).toEqual([
      {
        id: 'f1',
        studentId: 's1',
        filename: 'rynek.wav',
        mimeType: 'audio/wav',
        sizeBytes: 10,
        createdTime: '2026-10-20T00:00:00.000Z',
        modifiedTime: '2026-10-20T00:00:00.000Z',
      },
    ])
    const json = JSON.stringify(parsed)
    expect(json).not.toContain('example.com')
    expect(json).not.toContain('ya29')
    expect(json).not.toContain('drive.google')
    expect(json).not.toContain('duration')
    expect(json).not.toContain('secret')
  })

  it('rejects a payload that is not a snapshot', () => {
    expect(parseActivitySnapshot(null)).toBeNull()
    expect(parseActivitySnapshot([])).toBeNull()
    expect(parseActivitySnapshot({ source: 'demo', students: [], recordings: 'nope' })).toBeNull()
    expect(parseActivitySnapshot({ source: 'live', students: [], recordings: [] })).toBeNull()
  })

  it('names known audio formats and leaves duration out', () => {
    expect(audioFormatLabel('audio/wav', 'take.wav')).toBe('WAV')
    expect(audioFormatLabel('audio/mpeg', 'take.mp3')).toBe('MP3')
    expect(audioFormatLabel('', 'take.aiff')).toBe('AIFF')
    expect(audioFormatLabel('application/octet-stream', 'take.bin')).toBe('—')
  })
})

describe('activity providers', () => {
  it('loads demo data from the demo provider', async () => {
    const snapshot = await createDemoActivityProvider(NOW).load()
    expect(snapshot.source).toBe('demo')
    expect(snapshot.recordings.length).toBeGreaterThan(0)
    const quiet = studentRows(snapshot, NOW, 'name', 'en', 'Unknown').find((row) => row.displayName === 'Kasia D.')
    expect(quiet?.recordingCount).toBe(0)
    expect(activityMetrics(snapshot, NOW).last7Days).toBeGreaterThan(0)
    expect(timelinePoints(snapshot.recordings, '7d', NOW).reduce((sum, point) => sum + point.count, 0)).toBe(
      activityMetrics(snapshot, NOW).last7Days,
    )
    const json = JSON.stringify(snapshot)
    expect(json).not.toContain('@')
    expect(json).not.toContain('drive.google')
    expect(json).not.toContain('duration')
    expect(snapshot.recordings.every((recording) => recording.mimeType.startsWith('audio/'))).toBe(true)
  })

  it('reads a published snapshot and strips anything outside the public model', async () => {
    const provider = createPublishedJsonProvider(async () => ({
      source: 'published',
      generatedAt: NOW.toISOString(),
      accessToken: 'ya29.secret-token',
      students: [{ id: 's1', displayName: 'Ania W.', email: 'ania@example.com' }],
      recordings: [
        {
          id: 'f1',
          studentId: 's1',
          filename: 'rynek.wav',
          mimeType: 'audio/wav',
          sizeBytes: 10,
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: '2026-10-20T00:00:00.000Z',
          webViewLink: 'https://drive.google.com/file/d/secret',
        },
      ],
    }))
    const snapshot = await provider.load()
    expect(snapshot.source).toBe('published')
    expect(JSON.stringify(snapshot)).not.toContain('ya29')
    expect(JSON.stringify(snapshot)).not.toContain('drive.google')
    expect(Object.keys(snapshot.recordings[0] ?? {}).sort()).toEqual([
      'createdTime',
      'filename',
      'id',
      'mimeType',
      'modifiedTime',
      'sizeBytes',
      'studentId',
    ])
  })

  it('rejects an unreadable published file and does not call Drive', async () => {
    const published = createPublishedJsonProvider(async () => ({ source: 'published' }))
    await expect(published.load()).rejects.toBeInstanceOf(ActivitySourceError)
    await expect(createDriveActivityProvider().load()).rejects.toMatchObject({ code: 'not-implemented' })
    await expect(createDriveActivityProvider().load()).rejects.toThrow('not-implemented')
  })
})

describe('demo snapshot shape', () => {
  it('stays the same sample for the same day', () => {
    const first = createDemoSnapshot(NOW)
    const later = createDemoSnapshot(new Date('2026-10-20T23:00:00.000Z'))
    expect(later.recordings).toEqual(first.recordings)
    expect(later.students).toEqual(first.students)
  })
})
