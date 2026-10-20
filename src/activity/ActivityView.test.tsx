import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { MANUAL } from '../manual/content'
import recordingsSource from './ActivityRecordings.tsx?raw'
import studentsSource from './ActivityStudents.tsx?raw'
import timelineSource from './ActivityTimeline.tsx?raw'
import viewSource from './ActivityView.tsx?raw'
import { ActivityView } from './ActivityView'
import { ActivityScreen } from './ActivityScreen'
import { formatActivityDay, formatActivityTimestamp } from './format'
import { parseActivitySnapshot } from './parse'
import { validatePublicSnapshot } from './snapshot/validate'
import type { PublicActivitySnapshot } from './snapshot/schema'
import type { ActivityRange, ActivitySnapshot, StudentSort } from './types'

const NOW = new Date('2026-10-20T12:00:00.000Z')

const SNAPSHOT: ActivitySnapshot = {
  source: 'demo',
  generatedAt: '2026-10-20T12:00:00.000Z',
  students: [
    { id: 's1', displayName: 'Ania' },
    { id: 's2', displayName: 'Bartek' },
    { id: 's4', displayName: 'Zofia' },
  ],
  recordings: [
    {
      id: 'a',
      studentId: 's1',
      filename: 'rynek-01.wav',
      mimeType: 'audio/wav',
      sizeBytes: 2048,
      createdTime: '2026-10-20T08:00:00.000Z',
      modifiedTime: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 'b',
      studentId: 's2',
      filename: 'wisla-02.flac',
      mimeType: 'audio/flac',
      sizeBytes: 4096,
      createdTime: '2026-09-01T08:00:00.000Z',
      modifiedTime: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'c',
      studentId: 's4',
      filename: 'wawel-03.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 1024,
      createdTime: '2026-10-19T08:00:00.000Z',
      modifiedTime: '2026-10-19T08:00:00.000Z',
    },
    {
      id: 'd',
      studentId: 's4',
      filename: 'wawel-04.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 1024,
      createdTime: '2026-10-19T09:00:00.000Z',
      modifiedTime: '2026-10-19T09:00:00.000Z',
    },
  ],
}

const PUBLIC_EMPTY: PublicActivitySnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-10-20T12:00:00.000Z',
  timezone: 'Europe/Warsaw',
  activityBasis: 'createdTime',
  synchronization: { status: 'complete', lastSynchronizationAt: '2026-10-20T12:00:00.000Z' },
  project: {
    totalStudents: 0,
    activeStudents: 0,
    totalRecordings: 0,
    totalBytes: 0,
    recordingsLast7Days: 0,
    recordingsLast30Days: 0,
    lastSynchronizationAt: '2026-10-20T12:00:00.000Z',
  },
  students: [],
  dailyActivity: [],
}

const PUBLIC_STALE: PublicActivitySnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-10-18T12:00:00.000Z',
  timezone: 'Europe/Warsaw',
  activityBasis: 'createdTime',
  synchronization: { status: 'complete', lastSynchronizationAt: '2026-10-18T12:00:00.000Z' },
  project: {
    totalStudents: 1,
    activeStudents: 1,
    totalRecordings: 1,
    totalBytes: 10,
    recordingsLast7Days: 1,
    recordingsLast30Days: 1,
    lastSynchronizationAt: '2026-10-18T12:00:00.000Z',
  },
  students: [
    {
      studentId: 'stu_0123456789abcdef',
      displayName: 'Ania',
      recordingCount: 1,
      totalBytes: 10,
      lastActivityAt: '2026-10-18T08:00:00.000Z',
    },
  ],
  dailyActivity: [{ date: '2026-10-18', count: 1 }],
}

function markup(props: {
  snapshot?: ActivitySnapshot
  publicSnapshot?: PublicActivitySnapshot
  error?: boolean
  status?: 'loading' | 'error' | 'ready'
  errorCode?: 'missing-snapshot' | 'invalid-snapshot' | 'invalid-json' | 'unavailable'
  initialRange?: ActivityRange
  initialSort?: StudentSort
} = {}) {
  return renderToStaticMarkup(
    <I18nProvider>
      <ActivityView
        now={NOW}
        snapshot={props.publicSnapshot || props.status ? props.snapshot : (props.snapshot ?? SNAPSHOT)}
        publicSnapshot={props.publicSnapshot}
        error={props.error}
        status={props.status}
        errorCode={props.errorCode}
        initialRange={props.initialRange}
        initialSort={props.initialSort}
      />
    </I18nProvider>,
  )
}

describe('activity dashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('labels demonstration data and shows the four metrics', () => {
    const html = markup()
    expect(html).toContain('data-activity-demo="true"')
    expect(html).toContain('Demo data')
    expect(html).toContain('These figures are a sample set')
    expect(html).toContain('Recordings')
    expect(html).toContain('File size')
    expect(html).toContain('Active students')
    expect(html).toContain('Last 7 days')
    expect(html).toContain('>4<')
    expect(html).toContain('rynek-01.wav')
    expect(html).toContain('FLAC')
    expect(html).toContain('MP3')
    expect(html).not.toContain('duration')
    expect(html).not.toContain('@')
  })

  it('changes the timeline with the date range', () => {
    const week = markup({ initialRange: '7d' })
    const all = markup({ initialRange: 'all' })
    const september = formatActivityDay('2026-09-01T00:00:00.000Z', 'en')
    expect(week).toContain('<title>14 Oct: 0</title>')
    expect(week).not.toContain(`<title>${september}:`)
    expect(week).not.toContain('No recordings in this range.')
    expect(all).toContain(`<title>${september}:`)
    expect(all).not.toContain('No recordings in this range.')
  })

  it('orders participants by the selected sort', () => {
    const byCount = markup({ initialSort: 'count' })
    const byName = markup({ initialSort: 'name' })
    expect(byCount.indexOf('Zofia')).toBeLessThan(byCount.indexOf('Ania'))
    expect(byName.indexOf('Ania')).toBeLessThan(byName.indexOf('Zofia'))
    expect(byCount).toContain('aria-checked="true"')
  })

  it('renders an empty project without inventing rows', () => {
    const html = markup({
      snapshot: { source: 'demo', generatedAt: NOW.toISOString(), students: [], recordings: [] },
    })
    expect(html).toContain('Demo data')
    expect(html).toContain('No recordings in this range.')
    expect(html).toContain('No participants.')
    expect(html).toContain('No recordings yet.')
    expect(html).toContain('>0<')
  })

  it('does not call demonstration data real when the snapshot is published', () => {
    const html = markup({ snapshot: { ...SNAPSHOT, source: 'published' } })
    expect(html).toContain('data-activity-demo="false"')
    expect(html).not.toContain('Demo data')
    expect(html).not.toContain('Dane demonstracyjne')
  })

  it('shows a safe error instead of partial figures', () => {
    const html = markup({ error: true })
    expect(html).toContain('Activity data could not be read.')
    expect(html).not.toContain('Demo data')
    expect(html).not.toContain('rynek-01.wav')
  })

  it('renders a parsed payload that dropped invalid rows', () => {
    const parsed = parseActivitySnapshot({
      source: 'demo',
      generatedAt: NOW.toISOString(),
      students: [{ id: 's1', displayName: 'Ania', email: 'ania@example.com' }],
      recordings: [
        {
          id: 'f1',
          studentId: 's1',
          filename: 'folder/rynek.wav',
          mimeType: 'audio/wav',
          sizeBytes: 10,
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: '2026-10-20T00:00:00.000Z',
          duration: 4,
        },
        {
          id: 'bad',
          studentId: 's1',
          filename: 'bad.wav',
          mimeType: 'audio/wav',
          sizeBytes: Number.NaN,
          createdTime: '2026-10-20T00:00:00.000Z',
          modifiedTime: '2026-10-20T00:00:00.000Z',
        },
      ],
    })
    const html = markup({ snapshot: parsed ?? undefined })
    expect(parsed).not.toBeNull()
    expect(html).toContain('rynek.wav')
    expect(html).not.toContain('bad.wav')
    expect(html).not.toContain('example.com')
    expect(html).not.toContain('duration')
  })

  it('uses Polish labels from the catalog', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'field.uiLocale' ? 'pl' : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    const html = markup()
    expect(html).toContain('Dane demonstracyjne')
    expect(html).toContain('Nagrania')
    expect(html).toContain('Rozmiar plików')
    expect(html).toContain('Aktywni uczestnicy')
    expect(html).toContain('Ostatnie 7 dni')
    expect(html).toContain('Uczestnicy')
    expect(html).toContain('Ostatnie nagrania')
    expect(html).toContain('Ostatnia aktywność')
    expect(html).not.toContain('>Demo data<')
  })

  it('shows a published snapshot with its synchronization time and no file names', () => {
    expect(validatePublicSnapshot(PUBLIC_STALE).ok).toBe(true)
    const html = markup({ publicSnapshot: PUBLIC_STALE })
    expect(html).toContain('data-activity-source="static-snapshot"')
    expect(html).toContain('data-activity-demo="false"')
    expect(html).toContain('data-activity-stale="true"')
    expect(html).toContain('Published snapshot')
    expect(html).toContain('Last synchronization')
    expect(html).toContain(formatActivityTimestamp(PUBLIC_STALE.generatedAt, 'en'))
    expect(html).toContain('older than the expected refresh')
    expect(html).toContain('File names are not part of the published snapshot.')
    expect(html).toContain('Ania')
    expect(html).not.toContain('Demo data')
    expect(html).not.toContain('.wav')
    expect(html).not.toContain('stu_0123456789abcdef')
  })

  it('renders an empty published project without demonstration rows', () => {
    const html = markup({ publicSnapshot: PUBLIC_EMPTY })
    expect(html).toContain('Published snapshot')
    expect(html).toContain('No recordings in this range.')
    expect(html).toContain('No participants.')
    expect(html).toContain('No recordings yet.')
    expect(html).not.toContain('Demo data')
    expect(html).not.toContain('rynek')
  })

  it('keeps loading and invalid snapshots off the demonstration set', () => {
    const loading = markup({ status: 'loading' })
    const invalid = markup({ status: 'error', errorCode: 'invalid-snapshot' })
    const missing = markup({ status: 'error', errorCode: 'missing-snapshot' })
    expect(loading).toContain('data-activity-status="loading"')
    expect(loading).toContain('Reading the activity snapshot.')
    expect(loading).not.toContain('Demo data')
    expect(loading).not.toContain('rynek-01.wav')
    expect(invalid).toContain('could not be read')
    expect(invalid).toContain('Demonstration data is not shown')
    expect(invalid).not.toContain('rynek-01.wav')
    expect(missing).toContain('not published yet')
    expect(missing).not.toContain('Demo data')
  })

  it('uses Polish snapshot copy and does not paint demo data on first load', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'field.uiLocale' ? 'pl' : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    const html = markup({ publicSnapshot: PUBLIC_STALE })
    expect(html).toContain('Opublikowany zestaw')
    expect(html).toContain('Ostatnia synchronizacja')
    expect(html).toContain('Nazwy plików nie wchodzą')
    expect(html).not.toContain('Dane demonstracyjne')
    const screen = renderToStaticMarkup(
      <I18nProvider>
        <ActivityScreen />
      </I18nProvider>,
    )
    expect(screen).toContain('Odczyt zestawu aktywności.')
    expect(screen).not.toContain('Dane demonstracyjne')
    expect(screen).not.toContain('Demo data')
  })

  it('keeps the manual sections aligned and the view free of the audio engine', () => {
    expect(MANUAL.en.sections.map((section) => section.id)).toEqual(MANUAL.pl.sections.map((section) => section.id))
    expect(MANUAL.en.sections.some((section) => section.id === 'activity')).toBe(true)
    const ui = `${viewSource}\n${studentsSource}\n${recordingsSource}\n${timelineSource}`
    expect(ui).not.toContain('AudioEngine')
    expect(ui).not.toContain('useEngine')
    expect(ui).not.toContain('duration')
  })
})
