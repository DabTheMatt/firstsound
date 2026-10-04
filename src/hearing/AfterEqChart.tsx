import type { EqBand } from '../audio/engine/eqBands'
import type { BufferAnalysis } from './analyze'
import { HEARING_BANDS } from './bands'
import { eqBandDeltas, heardBandLevels, levelBar } from './eqAssist'
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

export function LevelTrack({ db }: { db: number | null }) {
  const pct = Math.round(levelBar(db) * 100)
  return (
    <span className={styles.level} aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
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
      <h3 style={{ margin: '0 0 4px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {pitched ? 'Original → heard' : 'Original → after EQ'}
      </h3>
      <p style={{ margin: '0 0 6px', fontSize: 12 }}>
        Bars are mean level per band, from −96 dB to 0 dB, so a quieter high band stays visible beside a loud bass band.
        {pitched
          ? ` Right bar applies pitch ${pitchSemitones > 0 ? '+' : ''}${pitchSemitones.toFixed(1)} st, which moves energy to the heard frequency, then the EQ curve.`
          : engaged
            ? ' Right bar applies the current EQ curve. Pitch is at 0 st.'
            : ' EQ is bypassed and pitch is at 0 st, so the columns match.'}
        {changed || (!pitched && !engaged) ? '' : ' Nothing in the current pitch or EQ moves a band by 0.3 dB or more.'}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12 }}>
        {HEARING_BANDS.map((band) => {
          const row = rows.find((item) => item.id === band.id)
          const delta = row?.deltaDb ?? null
          return (
            <li
              key={band.id}
              data-lit={lit?.has(band.id) ? 'true' : 'false'}
              style={{
                display: 'grid',
                gridTemplateColumns: '5.2rem 1fr 1fr auto',
                gap: 8,
                alignItems: 'center',
                minHeight: 24,
                outline: lit?.has(band.id) ? '1px solid var(--border-strong)' : 'none',
              }}
            >
              <span>{band.label}</span>
              <LevelTrack db={row?.beforeDb ?? null} />
              <LevelTrack db={row?.afterDb ?? null} />
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
