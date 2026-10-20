import { useId } from 'react'
import { Segmented } from '../components/controls/Segmented'
import { useI18n } from '../i18n'
import { formatActivityDay, formatCount } from './format'
import type { ActivityRange, TimelinePoint } from './types'
import styles from './ActivityView.module.css'

type Props = {
  points: TimelinePoint[]
  range: ActivityRange
  onRange: (range: ActivityRange) => void
}

const VIEW_W = 720
const VIEW_H = 260
const PAD_L = 32
const PAD_R = 10
const PAD_T = 12
const PAD_B = 36

function labelStep(count: number): number {
  if (count <= 8) return 1
  if (count <= 16) return 2
  if (count <= 32) return 5
  return Math.ceil(count / 7)
}

export function ActivityTimeline({ points, range, onRange }: Props) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const total = points.reduce((sum, point) => sum + point.count, 0)
  const peak = points.reduce((best, point) => (point.count > best.count ? point : best), points[0] ?? { day: '', count: 0 })
  const max = Math.max(1, peak.count)
  const plotW = VIEW_W - PAD_L - PAD_R
  const plotH = VIEW_H - PAD_T - PAD_B
  const slot = points.length > 0 ? plotW / points.length : plotW
  const step = labelStep(points.length)
  const ticks = peak.count <= 1 ? [0, 1] : [0, Math.round(max / 2), max]
  const options: { value: ActivityRange; label: string }[] = [
    { value: '7d', label: t.activity.range7 },
    { value: '30d', label: t.activity.range30 },
    { value: 'all', label: t.activity.rangeAll },
  ]

  return (
    <section className={`${styles.panel} ${styles.timeline}`} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.heading}>
          {t.activity.timeline}
        </h2>
        <Segmented label={t.activity.rangeGroup} value={range} options={options} onChange={onRange} />
      </div>
      {total === 0 ? (
        <p className={styles.empty}>{t.activity.timelineEmpty}</p>
      ) : (
        <>
          <div className={styles.plotWrap}>
            <svg
              className={styles.plot}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              role="img"
              aria-hidden="true"
              preserveAspectRatio="xMidYMid meet"
            >
              {ticks.map((tick) => {
                const y = PAD_T + plotH - (tick / max) * plotH
                return (
                  <g key={tick}>
                    <line className={styles.grid} x1={PAD_L} x2={VIEW_W - PAD_R} y1={y} y2={y} />
                    <text className={styles.axis} x={PAD_L - 6} y={y + 3} textAnchor="end">
                      {formatCount(tick, locale)}
                    </text>
                  </g>
                )
              })}
              <line className={styles.baseline} x1={PAD_L} x2={VIEW_W - PAD_R} y1={PAD_T + plotH} y2={PAD_T + plotH} />
              {points.map((point, index) => {
                const silent = point.count === 0
                const height = silent ? 2 : Math.max(2, (point.count / max) * plotH)
                const barW = Math.max(1.5, slot * 0.62)
                const x = PAD_L + index * slot + (slot - barW) / 2
                const y = PAD_T + plotH - height
                const hot = point.count > 0 && point.count === peak.count
                return (
                  <rect
                    key={point.day}
                    className={silent ? styles.barSilent : hot ? styles.barPeak : styles.bar}
                    x={x}
                    y={y}
                    width={barW}
                    height={height}
                  >
                    <title>{`${formatActivityDay(point.day, locale)}: ${formatCount(point.count, locale)}`}</title>
                  </rect>
                )
              })}
              {points.map((point, index) => {
                if (index % step !== 0 && index !== points.length - 1) return null
                const x = PAD_L + index * slot + slot / 2
                return (
                  <text key={`${point.day}-label`} className={styles.axis} x={x} y={VIEW_H - 12} textAnchor="middle">
                    {formatActivityDay(point.day, locale)}
                  </text>
                )
              })}
            </svg>
          </div>
          <p className={styles.readout}>
            {t.activity.timelineSummary(total, formatCount(peak.count, locale), formatActivityDay(peak.day, locale))}
          </p>
          <details className={styles.tableWrap}>
            <summary>{t.activity.timelineTable}</summary>
            <div className={styles.tableScroll}>
              <table>
                <caption className="sr-only">{t.activity.timeline}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.activity.day}</th>
                    <th className={styles.num} scope="col">
                      {t.activity.count}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.day}>
                      <td>{formatActivityDay(point.day, locale)}</td>
                      <td className={styles.num}>{formatCount(point.count, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
