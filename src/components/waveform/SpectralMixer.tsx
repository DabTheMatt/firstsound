import { useState } from 'react'
import type { SpectralBand } from '../../audio/spectral/bands'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n/messages'
import styles from './SpectralMixer.module.css'

type SpectralCopy = Messages['waveform']['spectral']

const BAND_COPY: Record<string, keyof SpectralCopy> = {
  'sub-bass': 'subBass',
  'low-mid': 'lowMid',
  'high-mid': 'highMid',
  high: 'high',
}

export function spectralBandCopy(id: string, copy: SpectralCopy): string {
  const key = BAND_COPY[id]
  return key ? copy[key] : id
}

function formatDb(db: number): string {
  const rounded = Math.round(db * 10) / 10
  const text = rounded.toFixed(1)
  return `${rounded > 0 ? '+' : ''}${text} dB`
}

type Props = {
  onCommit?: () => void
  layout?: 'studio' | 'phone'
}

export function SpectralMixer({ onCommit, layout = 'studio' }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const spectral = snap.spectral
  const copy = t.waveform.spectral
  const crossoverKey = spectral.crossoversHz.join(',')
  const [crossoverDraft, setCrossoverDraft] = useState<{ key: string; values: number[] } | null>(null)
  const crossovers = crossoverDraft && crossoverDraft.key === crossoverKey ? crossoverDraft.values : spectral.crossoversHz

  const commitCrossovers = () => {
    engine.setSpectralCrossovers(crossovers)
    setCrossoverDraft(null)
    onCommit?.()
  }

  const patchBand = (band: SpectralBand, patch: Partial<Pick<SpectralBand, 'gainDb' | 'mute' | 'solo'>>) => {
    engine.setSpectralBand(band.id, patch)
  }

  return (
    <section className={`${styles.panel} ${layout === 'phone' ? styles.phone : ''}`} aria-label={`${copy.title} ${copy.experimental}`}>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <strong>{copy.title}</strong>
          <span className={styles.experimental}>{copy.experimental}</span>
        </div>
        <button
          type="button"
          className={spectral.enabled ? styles.toggleOn : styles.toggle}
          aria-pressed={spectral.enabled}
          onClick={() => {
            engine.setSpectralEnabled(!spectral.enabled)
            onCommit?.()
          }}
        >
          {spectral.enabled ? copy.on : copy.off}
        </button>
        <button
          type="button"
          className={spectral.analyser === 'sum' ? styles.fftOn : styles.fft}
          aria-pressed={spectral.analyser === 'sum'}
          disabled={!spectral.enabled}
          onClick={() => {
            engine.setSpectralAnalyser('sum')
            onCommit?.()
          }}
        >
          {copy.analyseSum}
        </button>
        {spectral.computing ? <span className={styles.computing}>{copy.computing}</span> : null}
      </div>
      {spectral.enabled || layout === 'phone' ? (
        <>
          <div className={styles.rows}>
            {spectral.bands.map((band) => {
              const listening = spectral.analyser === band.id
              return (
                <div key={band.id} className={styles.row}>
                  <span className={styles.name}>{spectralBandCopy(band.id, copy)}</span>
                  <label className={styles.gain}>
                    <span className={styles.db}>{formatDb(band.gainDb)}</span>
                    <input
                      type="range"
                      min={-24}
                      max={12}
                      step={0.1}
                      aria-label={`${spectralBandCopy(band.id, copy)} ${copy.gain}`}
                      value={band.gainDb}
                      onChange={(event) => patchBand(band, { gainDb: Number(event.target.value) })}
                      onPointerUp={() => onCommit?.()}
                      onKeyUp={() => onCommit?.()}
                      onBlur={() => onCommit?.()}
                    />
                  </label>
                  <button
                    type="button"
                    className={band.mute ? styles.msOn : styles.ms}
                    aria-pressed={band.mute}
                    aria-label={`${spectralBandCopy(band.id, copy)} ${copy.mute}`}
                    onClick={() => {
                      patchBand(band, { mute: !band.mute })
                      onCommit?.()
                    }}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    className={band.solo ? styles.msOn : styles.ms}
                    aria-pressed={band.solo}
                    aria-label={`${spectralBandCopy(band.id, copy)} ${copy.solo}`}
                    onClick={() => {
                      patchBand(band, { solo: !band.solo })
                      onCommit?.()
                    }}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    className={listening ? styles.fftOn : styles.fft}
                    aria-pressed={listening}
                    aria-label={`${copy.analyseBand} ${spectralBandCopy(band.id, copy)}`}
                    onClick={() => {
                      engine.setSpectralAnalyser(listening ? 'sum' : band.id)
                      onCommit?.()
                    }}
                  >
                    FFT
                  </button>
                </div>
              )
            })}
          </div>
          {layout === 'phone' ? (
            <details className={styles.advanced}>
              <summary>Crossovers</summary>
              <div className={styles.crossovers}>
                {crossovers.map((hz, index) => {
                  const label = index === 0 ? copy.crossoverLow : index === 1 ? copy.crossoverMid : copy.crossoverHigh
                  return (
                    <label key={label} className={styles.cross}>
                      <span>{label}</span>
                      <input
                        type="number"
                        min={40}
                        max={18000}
                        step={1}
                        aria-label={label}
                        value={Math.round(hz)}
                        onChange={(event) => {
                          const next = crossovers.slice()
                          next[index] = Number(event.target.value)
                          setCrossoverDraft({ key: crossoverKey, values: next })
                        }}
                        onBlur={commitCrossovers}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitCrossovers()
                        }}
                      />
                      <span>Hz</span>
                    </label>
                  )
                })}
              </div>
            </details>
          ) : (
            <div className={styles.crossovers}>
              {crossovers.map((hz, index) => {
                const label = index === 0 ? copy.crossoverLow : index === 1 ? copy.crossoverMid : copy.crossoverHigh
                return (
                  <label key={label} className={styles.cross}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={40}
                      max={18000}
                      step={1}
                      aria-label={label}
                      value={Math.round(hz)}
                      onChange={(event) => {
                        const next = crossovers.slice()
                        next[index] = Number(event.target.value)
                        setCrossoverDraft({ key: crossoverKey, values: next })
                      }}
                      onBlur={commitCrossovers}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitCrossovers()
                      }}
                    />
                    <span>Hz</span>
                  </label>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
