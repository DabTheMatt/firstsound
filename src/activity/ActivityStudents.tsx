import { useId } from 'react'
import { formatBytes } from '../app/runtimeStats'
import { Segmented } from '../components/controls/Segmented'
import { useI18n } from '../i18n'
import { formatActivityWhen, formatCount } from './format'
import { METER_SEGMENTS } from './metrics'
import type { StudentActivityRow, StudentSort } from './types'
import styles from './ActivityView.module.css'

type Props = {
  rows: StudentActivityRow[]
  sort: StudentSort
  onSort: (sort: StudentSort) => void
  maxCount: number
}

export function ActivityStudents({ rows, sort, onSort, maxCount }: Props) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const options: { value: StudentSort; label: string }[] = [
    { value: 'count', label: t.activity.sortCount },
    { value: 'recent', label: t.activity.sortRecent },
    { value: 'name', label: t.activity.sortName },
  ]
  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.heading}>
          {t.activity.students}
        </h2>
        <Segmented label={t.activity.sortGroup} value={sort} options={options} onChange={onSort} />
      </div>
      {rows.length === 0 ? (
        <p className={styles.empty}>{t.activity.noStudents}</p>
      ) : (
        <div>
          <div className={styles.studentHead} aria-hidden="true">
            <span>{t.activity.name}</span>
            <span>{t.activity.level}</span>
            <span className={styles.count}>{t.activity.recordings}</span>
            <span>{t.activity.fileSize}</span>
            <span>{t.activity.lastActivity}</span>
            <span>{t.activity.indicator}</span>
          </div>
          <ul className={styles.list}>
            {rows.map((row) => {
              const size = formatBytes(row.totalBytes)
              const when = row.lastUpload ? formatActivityWhen(row.lastUpload, locale) : '—'
              const state =
                row.state === 'recent'
                  ? t.activity.stateRecent
                  : row.state === 'earlier'
                    ? t.activity.stateEarlier
                    : t.activity.stateNone
              return (
                <li key={row.id} className={styles.student}>
                  <span className={styles.name} title={row.displayName}>
                    {row.displayName}
                  </span>
                  <div
                    className={styles.meter}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(maxCount, 1)}
                    aria-valuenow={row.recordingCount}
                    aria-valuetext={state}
                    aria-label={t.activity.meterLabel(row.displayName, row.recordingCount, size)}
                  >
                    {Array.from({ length: METER_SEGMENTS }, (_, index) => {
                      const on = index < row.segments
                      const recent = on && row.state === 'recent'
                      return (
                        <span
                          key={index}
                          className={`${styles.seg} ${on ? styles.segOn : ''} ${recent ? styles.segRecent : ''}`}
                          aria-hidden="true"
                        />
                      )
                    })}
                  </div>
                  <span className={styles.count}>{formatCount(row.recordingCount, locale)}</span>
                  <span className={styles.size}>{size}</span>
                  <time className={styles.when} dateTime={row.lastUpload ?? undefined}>
                    {when}
                  </time>
                  <span className={styles.state} data-state={row.state}>
                    {state}
                  </span>
                  <p className={styles.meta}>
                    {size}
                    {' · '}
                    {when}
                    {' · '}
                    {state}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
