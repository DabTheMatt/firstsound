import type { EqBand } from '../audio/engine/eqBands'
import type { BufferAnalysis } from './analyze'
import { HEARING_BANDS } from './bands'
import { eqBandDeltas, heardBandLevels, levelBar } from './eqAssist'
import { InfoTip } from './InfoTip'
import styles from './HearingAccessLayer.module.css'

type Props = {
  analysis: BufferAnalysis | null
  bands: readonly EqBand[]
  sampleRate: number
  engaged: boolean
  pitchSemitones?: number
  lit?: ReadonlySet<string>
}

/** After-EQ band energy from the measured original spectrum and the real EQ curve. */
export function afterShares(analysis: BufferAnalysis, deltas: ReturnType<typeof eqBandDeltas>): number[] {
  const weighted = analysis.bands.map((band, index) => {
    const delta = deltas[index]?.deltaDb
    const gain = delta === null || !Number.isFinite(delta) ? 1 : 10 ** (delta / 10)
    return Math.max(0, band.power) * gain
  })
  const sum = weighted.reduce((total, value) => total + value, 0)
  return weighted.map((value) => (sum > 0 ? value / sum : 0))
}

export function LevelTrack({ db, tone = 'band' }: { db: number | null; tone?: 'band' | 'original' | 'heard' }) {
  const pct = Math.round(levelBar(db) * 100)
  return (
    <span className={styles.level} aria-hidden="true">
      <i className={tone === 'band' ? undefined : styles[tone]} style={{ width: `${pct}%` }} />
    </span>
  )
}

/** Bar geometry for one band. A boost is the heard level extending past the original. */
export function compareTrackGeometry(before: number | null, after: number | null): {
  beforePct: number
  afterPct: number
  boost: boolean
} {
  const beforePct = Math.round(levelBar(before) * 100)
  const afterPct = Math.round(levelBar(after) * 100)
  return { beforePct, afterPct, boost: afterPct > beforePct }
}

/** One track: the dimmer bar is the original, the brighter bar is what you hear. A tick marks the original end. */
export function CompareTrack({ before, after }: { before: number | null; after: number | null }) {
  const { beforePct, afterPct, boost } = compareTrackGeometry(before, after)
  return (
    <span className={styles.level} aria-hidden="true">
      <i className={styles.original} style={{ width: `${beforePct}%` }} />
      <i className={styles.heard} style={{ width: `${afterPct}%` }} />
      {boost ? <i className={styles.boost} style={{ left: `${beforePct}%`, width: `${afterPct - beforePct}%` }} /> : null}
      <i className={styles.originMark} style={{ left: `${beforePct}%` }} />
    </span>
  )
}

function dbText(db: number | null): string {
  if (db === null || !Number.isFinite(db)) return '—'
  return `${db.toFixed(0)} dB`
}

export function AfterEqChart({ analysis, bands, sampleRate, engaged, pitchSemitones = 0, lit }: Props) {
  if (!analysis) return <p style={{ margin: 0 }}>Load a sample to compare the original with what you hear.</p>
  const rows = heardBandLevels(analysis, sampleRate || analysis.sampleRate, pitchSemitones, bands, engaged)
  const pitched = Math.abs(pitchSemitones) >= 0.05
  const changed = rows.some((band) => band.deltaDb !== null && Math.abs(band.deltaDb) >= 0.3)
  return (
    <div>
      <div className={styles.sectionTitle}>
        <h3>{pitched ? 'Original → heard' : 'Original → after EQ'}</h3>
        <InfoTip label="More about original and heard levels">
          Each track runs from −96 dB to 0 dB. The dimmer bar is the original and the tick is its end. The brighter bar is what you hear
          {pitched
            ? ` after pitch ${pitchSemitones > 0 ? '+' : ''}${pitchSemitones.toFixed(1)} st and the EQ curve.`
            : engaged
              ? ' after the current EQ curve.'
              : '. EQ is bypassed and pitch is at 0 st, so the bars match.'}{' '}
          A bright extension past the tick is a boost. A dim tail past the bright bar is a cut.
          {changed || (!pitched && !engaged) ? '' : ' Nothing in the current pitch or EQ moves a band by 0.3 dB or more.'}
        </InfoTip>
      </div>
      <ul className={styles.compare}>
        {HEARING_BANDS.map((band) => {
          const row = rows.find((item) => item.id === band.id)
          const delta = row?.deltaDb ?? null
          return (
            <li key={band.id} data-band={band.id} data-lit={lit?.has(band.id) ? 'true' : 'false'}>
              <span>{band.label}</span>
              <CompareTrack before={row?.beforeDb ?? null} after={row?.afterDb ?? null} />
              <span>
                {dbText(row?.afterDb ?? null)}
                {delta === null || Math.abs(delta) < 0.05 ? '' : ` ${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
