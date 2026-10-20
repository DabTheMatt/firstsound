import { useId } from 'react'
import { formatBytes } from '../app/runtimeStats'
import { useI18n } from '../i18n'
import { formatActivityWhen } from './format'
import type { RecentRecordingRow } from './types'
import styles from './ActivityView.module.css'

type Props = {
  rows: RecentRecordingRow[]
  notice?: string | null
}

export function ActivityRecordings({ rows, notice = null }: Props) {
  const { t, locale } = useI18n()
  const titleId = useId()
  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.heading}>
          {t.activity.recentRecordings}
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className={styles.empty}>{notice ?? t.activity.noRecordings}</p>
      ) : (
        <div>
          <div className={styles.recHead} aria-hidden="true">
            <span title={t.activity.filename}>{t.activity.filename}</span>
            <span title={t.activity.student}>{t.activity.student}</span>
            <span title={t.activity.uploaded}>{t.activity.uploaded}</span>
            <span title={t.activity.fileSize}>{t.activity.fileSize}</span>
            <span title={t.activity.format}>{t.activity.format}</span>
          </div>
          <ul className={styles.list}>
            {rows.map((row) => {
              const when = formatActivityWhen(row.uploaded, locale)
              const size = formatBytes(row.sizeBytes)
              return (
                <li key={row.id} className={styles.recRow}>
                  <span className={styles.file} title={row.filename}>
                    {row.filename}
                  </span>
                  <span className={styles.who}>{row.studentName}</span>
                  <time className={styles.when} dateTime={row.uploaded}>
                    {when}
                  </time>
                  <span className={styles.size}>{size}</span>
                  <span className={styles.format}>{row.format}</span>
                  <p className={styles.meta}>
                    {row.studentName}
                    {' · '}
                    {when}
                    {' · '}
                    {size}
                    {' · '}
                    {row.format}
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
