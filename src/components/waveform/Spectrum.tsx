import { useEffect, useRef } from 'react'
import { engine } from '../../hooks/useEngine'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
}

/** FFT observer — never sits in the processing chain. */
export function Spectrum({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const tick = () => {
      const analyser = engine.getAnalyser()
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
        if (analyser) {
          const bins = new Float32Array(analyser.frequencyBinCount)
          analyser.getFloatFrequencyData(bins)
          const nyquist = (engine.getSnapshot().sampleRate || 44100) / 2
          ctx.fillStyle = '#9aa0a3'
          for (let x = 0; x < width; x++) {
            const frac = x / Math.max(1, width - 1)
            const hz = 20 * (nyquist / 20) ** frac
            const bin = Math.min(bins.length - 1, Math.round((hz / nyquist) * bins.length))
            const db = bins[bin] ?? -100
            const y = ((db - -100) / 100) * height
            const h = Math.max(1, y)
            ctx.fillRect(x, height - h, 1, h)
          }
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className={styles.canvas} aria-label="Spectrum analyzer" />
}