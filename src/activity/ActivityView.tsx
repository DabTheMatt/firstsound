import { useId, useMemo, useState } from 'react'
import { formatBytes } from '../app/runtimeStats'
import { useI18n } from '../i18n'
import { ActivityRecordings } from './ActivityRecordings'
import { ActivityStudents } from './ActivityStudents'
import { ActivityTimeline } from './ActivityTimeline'
import { createDemoSnapshot } from './demo'
import { formatActivityWhen, formatCount } from './format'
import { activityMetrics, recentRecordings, studentRows, timelinePoints } from './metrics'
import type { ActivityRange, ActivitySnapshot, StudentSort } from './types'
import styles from './ActivityView.module.css'

type Props = {
  snapshot?: ActivitySnapshot
  now?: Date
  error?: boolean
  initialRange?: ActivityRange
  initialSort?: StudentSort
}

export function ActivityView({ snapshot, now, error = false, initialRange = '7d', initialSort = 'count' }: Props) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const [clock] = useState(() => now ?? new Date())
  const [range, setRange] = useState<ActivityRange>(initialRange)
  const [sort, setSort] = useState<StudentSort>(initialSort)
  const data = useMemo(() => snapshot ?? createDemoSnapshot(clock), [snapshot, clock])
  const metrics = useMemo(() => activityMetrics(data, clock), [data, clock])
  const points = useMemo(() => timelinePoints(data.recordings, range, clock), [data, range, clock])
  const students = useMemo(
    () => studentRows(data, clock, sort, locale, t.activity.unknownStudent),
    [data, clock, sort, locale, t.activity.unknownStudent],
  )
  const recent = useMemo(
    () => recentRecordings(data, t.activity.unknownStudent),
    [data, t.activity.unknownStudent],
  )
  const maxCount = students.reduce((peak, row) => Math.max(peak, row.recordingCount), 0)

  if (error) {
    return (
      <section id="main-controls" className={styles.root} aria-labelledby={titleId} data-activity-view="">
        <h2 id={titleId} className={styles.heading}>
          {t.view.activity}
        </h2>
        <p className={styles.alert} role="alert">
          {t.activity.loadError}
        </p>
      </section>
    )
  }

  return (
    <section
      id="main-controls"
      className={styles.root}
      aria-labelledby={titleId}
      data-activity-view=""
      data-activity-source={data.source}
      data-activity-demo={data.source === 'demo' ? 'true' : 'false'}
    >
      <h2 id={titleId} className="sr-only">
        {t.view.activity}
      </h2>
      {data.source === 'demo' ? (
        <div className={styles.demoBar}>
          <p className={styles.demoMark}>{t.activity.demoBadge}</p>
          <p className={styles.demoNote}>{t.activity.demoNote}</p>
          <p className={styles.generated}>{t.activity.generated(formatActivityWhen(data.generatedAt, locale))}</p>
        </div>
      ) : null}
      <div className={styles.metrics} aria-label={t.activity.region}>
        <Metric label={t.activity.recordings} value={formatCount(metrics.recordingCount, locale)} />
        <Metric label={t.activity.totalSize} value={formatBytes(metrics.totalBytes)} />
        <Metric label={t.activity.activeStudents} value={formatCount(metrics.activeStudents, locale)} />
        <Metric label={t.activity.last7Days} value={formatCount(metrics.last7Days, locale)} />
      </div>
      <ActivityTimeline points={points} range={range} onRange={setRange} />
      <div className={styles.columns}>
        <ActivityStudents rows={students} sort={sort} onSort={setSort} maxCount={maxCount} />
        <ActivityRecordings rows={recent} />
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
