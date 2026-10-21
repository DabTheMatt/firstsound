import { useId, useMemo, useState } from 'react'
import { formatBytes } from '../app/runtimeStats'
import { useI18n } from '../i18n'
import { ActivityRecordings } from './ActivityRecordings'
import { ActivityStudents } from './ActivityStudents'
import { ActivityTimeline } from './ActivityTimeline'
import { formatActivityTimestamp, formatCount } from './format'
import { activityMetrics, recentRecordings, recordingsInDays, studentRows, timelinePoints } from './metrics'
import { publicStudentRows, publicTimeline, isSnapshotStale } from './snapshot/present'
import type { PublicActivitySnapshot } from './snapshot/schema'
import type { ActivityLoadError } from './loadActivity'
import type { ActivityRange, ActivitySnapshot, StudentSort } from './types'
import styles from './ActivityView.module.css'

type Props = {
  snapshot?: ActivitySnapshot
  publicSnapshot?: PublicActivitySnapshot
  now?: Date
  status?: 'loading' | 'error' | 'ready'
  error?: boolean
  errorCode?: ActivityLoadError | null
  initialRange?: ActivityRange
  initialSort?: StudentSort
}

export function ActivityView({
  snapshot,
  publicSnapshot,
  now,
  status = 'ready',
  error = false,
  errorCode = null,
  initialRange = '7d',
  initialSort = 'count',
}: Props) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const [clock] = useState(() => now ?? new Date())
  const [range, setRange] = useState<ActivityRange>(initialRange)
  const [sort, setSort] = useState<StudentSort>(initialSort)
  const demoMetrics = useMemo(() => (snapshot ? activityMetrics(snapshot, clock) : null), [snapshot, clock])
  const demoPoints = useMemo(
    () => (snapshot ? timelinePoints(snapshot.recordings, range, clock) : null),
    [snapshot, range, clock],
  )
  const demoStudents = useMemo(
    () => (snapshot ? studentRows(snapshot, clock, sort, locale, t.activity.unknownStudent) : null),
    [snapshot, clock, sort, locale, t.activity.unknownStudent],
  )
  const demoRecent = useMemo(
    () => (snapshot ? recentRecordings(snapshot, t.activity.unknownStudent) : null),
    [snapshot, t.activity.unknownStudent],
  )
  const publishedStudents = useMemo(
    () => (publicSnapshot ? publicStudentRows(publicSnapshot, sort, locale, t.activity.unknownStudent) : null),
    [publicSnapshot, sort, locale, t.activity.unknownStudent],
  )
  const publishedPoints = useMemo(
    () => (publicSnapshot ? publicTimeline(publicSnapshot, range) : null),
    [publicSnapshot, range],
  )

  if (status === 'loading') {
    return (
      <section id="main-controls" className={styles.root} aria-labelledby={titleId} data-activity-view="" data-activity-status="loading">
        <h2 id={titleId} className={styles.heading}>
          {t.view.activity}
        </h2>
        <p className={styles.alert} role="status">
          {t.activity.loading}
        </p>
      </section>
    )
  }

  if (status === 'error' || error || (!snapshot && !publicSnapshot)) {
    const message =
      errorCode === 'missing-snapshot'
        ? t.activity.missingSnapshot
        : errorCode === 'invalid-snapshot' || errorCode === 'invalid-json'
          ? t.activity.invalidSnapshot
          : t.activity.loadError
    return (
      <section id="main-controls" className={styles.root} aria-labelledby={titleId} data-activity-view="" data-activity-status="error">
        <h2 id={titleId} className={styles.heading}>
          {t.view.activity}
        </h2>
        <p className={styles.alert} role="alert">
          {message}
        </p>
      </section>
    )
  }

  const published = publicSnapshot ?? null
  const internal = published ? null : (snapshot ?? null)
  if (!published && !internal) {
    return (
      <section id="main-controls" className={styles.root} aria-labelledby={titleId} data-activity-view="" data-activity-status="error">
        <h2 id={titleId} className={styles.heading}>
          {t.view.activity}
        </h2>
        <p className={styles.alert} role="alert">
          {t.activity.loadError}
        </p>
      </section>
    )
  }
  const students = publishedStudents ?? demoStudents ?? []
  const points = publishedPoints ?? demoPoints ?? []
  const recent = published ? [] : (demoRecent ?? [])
  const metrics = published
    ? {
        recordingCount: published.project.totalRecordings,
        totalBytes: published.project.totalBytes,
        activeStudents: published.project.activeStudents,
        last7Days: published.project.recordingsLast7Days,
      }
    : (demoMetrics ?? { recordingCount: 0, totalBytes: 0, activeStudents: 0, last7Days: 0 })
  let source: 'static-snapshot' | ActivitySnapshot['source'] = 'static-snapshot'
  let syncedAt = ''
  let totalStudents = 0
  let last30 = 0
  if (published) {
    syncedAt = published.synchronization.lastSynchronizationAt
    totalStudents = published.project.totalStudents
    last30 = published.project.recordingsLast30Days
  } else if (internal) {
    source = internal.source
    syncedAt = internal.generatedAt
    totalStudents = internal.students.length
    last30 = recordingsInDays(internal.recordings, 30, clock)
  }
  const stale = published ? isSnapshotStale(syncedAt, clock) : false
  const maxCount = students.reduce((peak, row) => Math.max(peak, row.recordingCount), 0)
  const recordingNotice = published && published.project.totalRecordings > 0 ? t.activity.filenamesOmitted : null

  return (
    <section
      id="main-controls"
      className={styles.root}
      aria-labelledby={titleId}
      data-activity-view=""
      data-activity-status="ready"
      data-activity-source={source}
      data-activity-demo={source === 'demo' ? 'true' : 'false'}
      data-activity-stale={stale ? 'true' : 'false'}
    >
      <h2 id={titleId} className="sr-only">
        {t.view.activity}
      </h2>
      <div className={styles.demoBar}>
        {source === 'demo' ? (
          <>
            <p className={styles.demoMark}>{t.activity.demoBadge}</p>
            <p className={styles.demoNote}>{t.activity.demoNote}</p>
            <p className={styles.generated}>{t.activity.generated(formatActivityTimestamp(syncedAt, locale))}</p>
          </>
        ) : (
          <>
            <p className={styles.demoMark}>{t.activity.snapshotBadge}</p>
            <p className={styles.demoNote}>{published ? t.activity.snapshotNote : t.activity.publishedNote}</p>
            <p className={styles.generated}>{t.activity.synchronized(formatActivityTimestamp(syncedAt, locale))}</p>
          </>
        )}
        <p className={styles.generated}>
          {t.activity.windowCounts(formatCount(totalStudents, locale), formatCount(last30, locale))}
        </p>
        {stale ? (
          <p className={styles.stale} role="status">
            {t.activity.stale}
          </p>
        ) : null}
      </div>
      <div className={styles.metrics} aria-label={t.activity.region}>
        <Metric label={t.activity.recordings} value={formatCount(metrics.recordingCount, locale)} />
        <Metric label={t.activity.totalSize} value={formatBytes(metrics.totalBytes)} />
        <Metric label={t.activity.activeStudents} value={formatCount(metrics.activeStudents, locale)} />
        <Metric label={t.activity.last7Days} value={formatCount(metrics.last7Days, locale)} />
      </div>
      <ActivityTimeline
        points={points}
        range={range}
        onRange={setRange}
        legend={students.map((row) => ({ id: row.id, name: row.displayName, color: row.color }))}
      />
      <div className={styles.columns}>
        <ActivityStudents rows={students} sort={sort} onSort={setSort} maxCount={maxCount} />
        <ActivityRecordings rows={recent} notice={recordingNotice} />
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
    </div>
  )
}
