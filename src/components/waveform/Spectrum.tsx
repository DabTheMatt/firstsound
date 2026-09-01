import { useEffect, useRef, useState } from 'react'
import { combAsEqBands } from '../../audio/engine/comb'
import { bandUsesGain, EQ_MAX_HZ, EQ_MIN_HZ } from '../../audio/engine/eqBands'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import {
  DB_SCALE,
  FREQ_SCALE_HZ,
  formatFreqTick,
  formatHoverFreq,
  hzFromLogAxis,
  musicalScaleHz,
} from '../../audio/engine/pitchScale'
import {
  FAST_ATTACK,
  FAST_RELEASE,
  SLOW_ATTACK,
  SLOW_RELEASE,
  SPECTRUM_BAND_CHOICES,
  SPECTRUM_BAND_COUNT,
  bandPeakDb,
  clampSpectrumBandCount,
  followBands,
  logBandEdgesHz,
  type SpectrumBandCount,
} from '../../audio/engine/spectrumBands'
import { bandCenterHz, regionForHz, SPECTRUM_REGIONS } from '../../audio/engine/spectrumRegions'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
}

type Layer = 'pre' | 'post' | 'both'

const SPECTRUM_PREF_KEY = 'field.spectrum'

type SpectrumPrefs = {
  layer: Layer
  bands: SpectrumBandCount
  regionColors: boolean
}

function loadPrefs(): SpectrumPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(SPECTRUM_PREF_KEY) ?? 'null') as Partial<SpectrumPrefs> | null
    return {
      layer: raw?.layer === 'pre' || raw?.layer === 'post' || raw?.layer === 'both' ? raw.layer : 'both',
      bands: clampSpectrumBandCount(raw?.bands ?? SPECTRUM_BAND_COUNT),
      regionColors: raw?.regionColors !== false,
    }
  } catch {
    return { layer: 'both', bands: SPECTRUM_BAND_COUNT, regionColors: true }
  }
}

function persistPrefs(prefs: SpectrumPrefs): void {
  try {
    localStorage.setItem(SPECTRUM_PREF_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
}

function emptyBands(n: number): Float32Array {
  return new Float32Array(n).fill(-100)
}

function dbToY(db: number, top: number, bottom: number): number {
  const t = Math.min(1, Math.max(0, (0 - db) / 100))
  return top + t * (bottom - top)
}

function hzToX(hz: number, minHz: number, maxHz: number, left: number, right: number): number {
  const t = Math.log(Math.max(minHz, hz) / minHz) / Math.log(maxHz / minHz)
  return left + t * (right - left)
}

/** Banded FFT observer — never sits in the processing chain. */
export function Spectrum({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadPrefs())
  const [hover, setHover] = useState<{ x: number; y: number; label: string; flip: boolean } | null>(null)
  const prefsRef = useRef(prefs)
  const preFast = useRef(emptyBands(prefs.bands))
  const preSlow = useRef(emptyBands(prefs.bands))
  const postFast = useRef(emptyBands(prefs.bands))
  const postSlow = useRef(emptyBands(prefs.bands))

  useEffect(() => {
    prefsRef.current = prefs
    persistPrefs(prefs)
    preFast.current = emptyBands(prefs.bands)
    preSlow.current = emptyBands(prefs.bands)
    postFast.current = emptyBands(prefs.bands)
    postSlow.current = emptyBands(prefs.bands)
  }, [prefs])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const tick = () => {
      const snap = engine.getSnapshot()
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const colors = readThemeColors()
        const { layer, bands, regionColors } = prefsRef.current
        ctx.clearRect(0, 0, width, height)
        const sr = snap.sampleRate || 44100
        const nyquist = sr / 2
        const minHz = EQ_MIN_HZ
        const maxHz = EQ_MAX_HZ
        const padL = 36 * dpr
        const padR = 10 * dpr
        const padT = 18 * dpr
        const padB = 28 * dpr
        const left = padL
        const right = width - padR
        const top = padT
        const bottom = height - padB
        const plotW = Math.max(1, right - left)
        const plotH = Math.max(1, bottom - top)

        ctx.fillStyle = colors.textMuted
        ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (const db of DB_SCALE) {
          const y = dbToY(db, top, bottom)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, 0.9)
          ctx.lineWidth = dpr * 0.5
          ctx.beginPath()
          ctx.moveTo(left, y)
          ctx.lineTo(right, y)
          ctx.stroke()
          ctx.fillStyle = colors.textMuted
          ctx.fillText(`${db}`, left - 6 * dpr, y)
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        for (const hz of FREQ_SCALE_HZ) {
          if (hz > maxHz) continue
          const x = hzToX(hz, minHz, maxHz, left, right)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, 0.7)
          ctx.beginPath()
          ctx.moveTo(x, top)
          ctx.lineTo(x, bottom)
          ctx.stroke()
          ctx.fillStyle = colors.textMuted
          ctx.fillText(formatFreqTick(hz), x, bottom + 4 * dpr)
        }

        ctx.textBaseline = 'bottom'
        ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.85)
        for (const tick of musicalScaleHz(minHz, maxHz)) {
          const x = hzToX(tick.hz, minHz, maxHz, left, right)
          ctx.fillText(tick.label, x, top - 2 * dpr)
        }

        const drawLayer = (
          analyser: AnalyserNode | null,
          fast: Float32Array,
          slow: Float32Array,
          style: 'pre' | 'post',
        ) => {
          if (!analyser) return
          const bins = new Float32Array(analyser.frequencyBinCount)
          analyser.getFloatFrequencyData(bins)
          const peaks = bandPeakDb(bins, sr, bands, minHz)
          followBands(fast, peaks, FAST_ATTACK, FAST_RELEASE)
          followBands(slow, peaks, SLOW_ATTACK, SLOW_RELEASE)
          const edges = logBandEdgesHz(minHz, Math.min(nyquist, maxHz), bands)
          const gap = Math.max(1, Math.floor((plotW / bands) * 0.12))
          for (let i = 0; i < bands; i++) {
            const x0 = hzToX(edges[i] ?? minHz, minHz, maxHz, left, right)
            const x1 = hzToX(edges[i + 1] ?? Math.min(nyquist, maxHz), minHz, maxHz, left, right)
            const bandW = Math.max(1, x1 - x0)
            const center = bandCenterHz(edges, i)
            const region = regionForHz(center)
            const fill = regionColors ? region.color : colors.spectrum
            const line = regionColors ? region.color : colors.spectrumLine
            const slowDb = slow[i] ?? -100
            const fastDb = fast[i] ?? -100
            const slowY = dbToY(slowDb, top, bottom)
            const fastY = dbToY(fastDb, top, bottom)
            const slowH = bottom - slowY
            const fastH = bottom - fastY
            const alpha = style === 'pre' ? (layer === 'both' ? 0.22 : 0.42) : layer === 'both' ? 0.55 : 0.42
            ctx.fillStyle = colorWithAlpha(fill, alpha)
            ctx.fillRect(x0 + gap / 2, bottom - slowH, Math.max(1, bandW - gap), slowH)
            if (style === 'post' || layer !== 'both') {
              ctx.fillStyle = line
              ctx.fillRect(x0 + gap / 2, fastY, Math.max(1, bandW - gap), Math.max(2, dpr))
              ctx.fillStyle = colorWithAlpha(line, 0.35)
              ctx.fillRect(x0 + gap / 2, fastY, Math.max(1, bandW - gap), Math.min(fastH, 8 * dpr))
            }
          }
        }

        if (layer === 'pre' || layer === 'both') {
          drawLayer(engine.getAnalyser('pre'), preFast.current, preSlow.current, 'pre')
        }
        if (layer === 'post' || layer === 'both') {
          drawLayer(engine.getAnalyser('eq'), postFast.current, postSlow.current, 'post')
        }

        ctx.beginPath()
        ctx.strokeStyle = colors.eqCurve
        ctx.lineWidth = Math.max(1.5, dpr)
        const freqs = logFreqAxis(Math.floor(plotW), minHz, maxHz)
        for (let i = 0; i < freqs.length; i++) {
          const hz = freqs[i] ?? minHz
          const db = eqMagnitudeDb([...snap.eqBands, ...combAsEqBands(snap.comb)], hz, sr)
          const x = left + (i / Math.max(1, freqs.length - 1)) * plotW
          const y = top + ((18 - db) / 36) * plotH
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        ctx.font = `700 ${9 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        snap.eqBands.forEach((band, index) => {
          if (band.type === 'off') return
          const nodeDb = bandUsesGain(band.type) ? band.gain : 0
          const x = hzToX(band.frequency, minHz, maxHz, left, right)
          const y = top + ((18 - nodeDb) / 36) * plotH
          const r = 8 * dpr
          ctx.beginPath()
          ctx.fillStyle = colors.eqNode
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = colors.eqCurve
          ctx.lineWidth = Math.max(1, dpr)
          ctx.stroke()
          ctx.fillStyle = colors.bgApp
          ctx.fillText(String(index + 1), x, y + 0.4 * dpr)
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])

  if (!active) return null
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.taps} role="radiogroup" aria-label="EQ spectrum layer">
          {(['pre', 'post', 'both'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={prefs.layer === id ? styles.on : ''}
              aria-pressed={prefs.layer === id}
              onClick={() => setPrefs((p) => ({ ...p, layer: id }))}
            >
              {id === 'pre' ? 'Before' : id === 'post' ? 'After' : 'Both'}
            </button>
          ))}
        </div>
        <label className={styles.bands}>
          Bands
          <select
            aria-label="FFT band count"
            value={prefs.bands}
            onChange={(event) =>
              setPrefs((p) => ({ ...p, bands: clampSpectrumBandCount(Number(event.target.value)) }))
            }
          >
            {SPECTRUM_BAND_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={prefs.regionColors ? styles.on : ''}
          aria-pressed={prefs.regionColors}
          onClick={() => setPrefs((p) => ({ ...p, regionColors: !p.regionColors }))}
        >
          Band colors
        </button>
      </div>
      {prefs.regionColors ? (
        <p className={styles.regions}>
          {SPECTRUM_REGIONS.map((region) => (
            <span key={region.id}>
              <i style={{ background: region.color }} />
              {region.label}
            </span>
          ))}
        </p>
      ) : (
        <p className={styles.legend}>
          <span>Slow</span>
          <span>Fast</span>
          {prefs.layer === 'both' ? <span>Before / after EQ</span> : null}
        </p>
      )}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Spectrum analyzer"
        onPointerMove={(event) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const rect = canvas.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          const sr = engine.getSnapshot().sampleRate || 44100
          const nyquist = sr / 2
          const left = 36
          const right = rect.width - 10
          const top = 18
          const bottom = rect.height - 28
          if (x < left || x > right || y < top || y > bottom) {
            setHover(null)
            return
          }
          const hz = hzFromLogAxis((x - left) / Math.max(1, right - left), 20, nyquist)
          setHover({ x, y, label: formatHoverFreq(hz), flip: x > rect.width * 0.68 })
        }}
        onPointerLeave={() => setHover(null)}
      />
      {hover ? (
        <div
          className={`${styles.cursorReadout} ${hover.flip ? styles.cursorReadoutFlip : ''}`}
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.label}
        </div>
      ) : null}
    </div>
  )
}
