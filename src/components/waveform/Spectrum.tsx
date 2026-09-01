import { useEffect, useRef, useState } from 'react'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import {
  FAST_ATTACK,
  FAST_RELEASE,
  SLOW_ATTACK,
  SLOW_RELEASE,
  SPECTRUM_BAND_COUNT,
  bandPeakDb,
  followBands,
} from '../../audio/engine/spectrumBands'
import { engine } from '../../hooks/useEngine'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
}

type Tap = 'pre' | 'post'

/** Banded FFT observer — never sits in the processing chain. */
export function Spectrum({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tap, setTap] = useState<Tap>('post')
  const tapRef = useRef(tap)
  const fastRef = useRef(new Float32Array(SPECTRUM_BAND_COUNT).fill(-100))
  const slowRef = useRef(new Float32Array(SPECTRUM_BAND_COUNT).fill(-100))
  useEffect(() => {
    tapRef.current = tap
  }, [tap])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const tick = () => {
      const analyser = engine.getAnalyser(tapRef.current)
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
        ctx.clearRect(0, 0, width, height)
        const sr = snap.sampleRate || 44100
        const nyquist = sr / 2
        if (analyser) {
          const bins = new Float32Array(analyser.frequencyBinCount)
          analyser.getFloatFrequencyData(bins)
          const bands = bandPeakDb(bins, sr, SPECTRUM_BAND_COUNT, 20)
          followBands(fastRef.current, bands, FAST_ATTACK, FAST_RELEASE)
          followBands(slowRef.current, bands, SLOW_ATTACK, SLOW_RELEASE)
          const gap = Math.max(1, Math.floor(width / SPECTRUM_BAND_COUNT * 0.12))
          const bandW = width / SPECTRUM_BAND_COUNT
          for (let i = 0; i < SPECTRUM_BAND_COUNT; i++) {
            const x = i * bandW
            const slowDb = slowRef.current[i] ?? -100
            const fastDb = fastRef.current[i] ?? -100
            const slowH = Math.max(1, ((slowDb + 100) / 100) * height)
            const fastH = Math.max(1, ((fastDb + 100) / 100) * height)
            ctx.fillStyle = 'rgba(90, 130, 140, 0.45)'
            ctx.fillRect(x + gap / 2, height - slowH, Math.max(1, bandW - gap), slowH)
            ctx.fillStyle = '#9aa0a3'
            ctx.fillRect(x + gap / 2, height - fastH, Math.max(1, bandW - gap), Math.max(2, dpr))
            ctx.fillStyle = 'rgba(210, 220, 220, 0.35)'
            ctx.fillRect(x + gap / 2, height - fastH, Math.max(1, bandW - gap), Math.min(fastH, 8 * dpr))
          }
        }
        ctx.beginPath()
        ctx.strokeStyle = '#c4a574'
        ctx.lineWidth = Math.max(1.5, dpr)
        const freqs = logFreqAxis(width, 20, nyquist)
        for (let x = 0; x < width; x++) {
          const db = eqMagnitudeDb(snap.eqBands, freqs[x] ?? 20, sr)
          const y = ((18 - db) / 36) * height
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])

  if (!active) return null
  return (
    <div className={styles.wrap}>
      <div className={styles.taps} role="radiogroup" aria-label="Spectrum tap">
        <button
          type="button"
          className={tap === 'pre' ? styles.on : ''}
          aria-pressed={tap === 'pre'}
          onClick={() => setTap('pre')}
        >
          Pre
        </button>
        <button
          type="button"
          className={tap === 'post' ? styles.on : ''}
          aria-pressed={tap === 'post'}
          onClick={() => setTap('post')}
        >
          Post
        </button>
      </div>
      <p className={styles.legend}>
        <span>Slow</span>
        <span>Fast</span>
      </p>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Spectrum analyzer" />
    </div>
  )
}
