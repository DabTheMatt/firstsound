import { useEffect, useRef, useState } from 'react'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import { engine } from '../../hooks/useEngine'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
}

type Tap = 'pre' | 'post'

/** FFT observer — never sits in the processing chain. */
export function Spectrum({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tap, setTap] = useState<Tap>('post')
  const tapRef = useRef(tap)
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
        const nyquist = (snap.sampleRate || 44100) / 2
        const freqs = logFreqAxis(width, 20, nyquist)
        if (analyser) {
          const bins = new Float32Array(analyser.frequencyBinCount)
          analyser.getFloatFrequencyData(bins)
          ctx.fillStyle = '#9aa0a3'
          for (let x = 0; x < width; x++) {
            const hz = freqs[x] ?? 20
            const bin = Math.min(bins.length - 1, Math.round((hz / nyquist) * bins.length))
            const db = bins[bin] ?? -100
            const y = ((db - -100) / 100) * height
            const h = Math.max(1, y)
            ctx.fillRect(x, height - h, 1, h)
          }
        }
        ctx.beginPath()
        ctx.strokeStyle = '#c4a574'
        ctx.lineWidth = Math.max(1.5, dpr)
        const sr = snap.sampleRate || 48000
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
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Spectrum analyzer" />
    </div>
  )
}
