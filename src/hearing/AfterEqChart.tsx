import type { EqBand } from '../audio/engine/eqBands'
import type { BufferAnalysis } from './analyze'
import { HEARING_BANDS } from './bands'
import { eqBandDeltas } from './eqAssist'

type Props = {
  analysis: BufferAnalysis | null
  bands: readonly EqBand[]
  sampleRate: number
  engaged: boolean
  lit?: ReadonlySet<string>
}

function blocks(amount: number): string {
  const n = Math.round(Math.max(0, Math.min(1, amount)) * 8)
  return `${'▓'.repeat(n)}${'░'.repeat(8 - n)}`
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

export function AfterEqChart({ analysis, bands, sampleRate, engaged, lit }: Props) {
  if (!analysis) return <p style={{ margin: 0 }}>Load a sample to compare the original with EQ.</p>
  const deltas = eqBandDeltas(analysis, bands, sampleRate || analysis.sampleRate)
  const after = afterShares(analysis, deltas)
  const changed = engaged && deltas.some((band) => band.deltaDb !== null && Math.abs(band.deltaDb) >= 0.3)
  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Original → after EQ</h3>
      <p style={{ margin: '0 0 6px', fontSize: 12 }}>
        {engaged
          ? 'Left bar is the original sample or selection, before effects. Right bar applies the current EQ curve to that spectrum.'
          : 'EQ is bypassed, so the after column matches the original.'}
        {changed ? '' : engaged ? ' The current curve does not move band energy by 0.3 dB or more.' : ''}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12 }}>
        {HEARING_BANDS.map((band, index) => {
          const delta = deltas[index]?.deltaDb
          const share = analysis.bands[index]?.share ?? 0
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
              <span aria-hidden="true">{blocks(share)}</span>
              <span aria-hidden="true">{blocks(after[index] ?? 0)}</span>
              <span>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} dB`}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
