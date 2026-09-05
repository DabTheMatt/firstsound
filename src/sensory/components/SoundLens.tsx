import { useEffect, useRef } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { readThemeColors } from '../../theme'
import { lensEdgeBulge, lensSourceX } from '../visualization/lensWarp'
import type { SensoryVisualState } from '../visualization/sensoryVisualState'
import styles from './SoundLens.module.css'

type Props = {
  duration: number
  loaded: boolean
  visual: SensoryVisualState
  loop: boolean
  onTogglePlay: () => void
}

export function SoundLens({ duration, loaded, visual, loop, onTogglePlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const tick = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(tick)
        return
      }
      ctx.clearRect(0, 0, width, height)
      const buffer = engine.getBuffer()
      const cx = width / 2
      const cy = height / 2
      const r = Math.min(cx, cy) * 0.92
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()
      if (buffer && duration > 0) {
        const data = buffer.getChannelData(0)
        const now = engine.getPlayheadSeconds()
        const windowSec = Math.max(0.035, 0.14 / Math.max(0.35, visual.sharpness))
        const a = Math.max(0, now - windowSec / 2)
        const b = Math.min(duration, now + windowSec / 2)
        const samplesPerSec = data.length / duration
        const s = Math.floor(a * samplesPerSec)
        const e = Math.max(s + 1, Math.floor(b * samplesPerSec))
        const { min, max } = computeMinMax(data, s, e, width)
        const colors = readThemeColors()
        const analyser = engine.getAnalyser()
        let energy = 0.18
        if (analyser) {
          const bins = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteTimeDomainData(bins)
          let acc = 0
          for (let i = 0; i < bins.length; i++) {
            const v = ((bins[i] ?? 128) - 128) / 128
            acc += v * v
          }
          energy = Math.min(1, Math.sqrt(acc / bins.length) * 3)
        }
        const wobble = reduced ? 0 : visual.motion * 5 * dpr * Math.sin(performance.now() / 420)
        const amp = r * (0.62 + visual.mass * 0.18) * (0.88 + energy * 0.22)
        const step = Math.max(1, Math.floor(dpr))
        const lastCol = Math.max(1, width - 1)
        const sampleAt = (nx: number) => {
          const src = lensSourceX(nx, 0.4)
          const col = Math.round(((src + 1) / 2) * lastCol)
          return { hi: max[col] ?? 0, lo: min[col] ?? 0 }
        }
        ctx.strokeStyle = colors.waveform
        ctx.lineWidth = Math.max(1.2, dpr * 1.1)
        ctx.globalAlpha = 0.55 + visual.glow * 0.25
        ctx.beginPath()
        let started = false
        for (let x = 0; x < width; x += step) {
          const nx = (x - cx) / r
          if (nx < -1 || nx > 1) continue
          const { hi } = sampleAt(nx)
          const y = cy - hi * amp * lensEdgeBulge(nx, 0.62) + wobble
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.fillStyle = colors.waveform
        for (let x = 0; x < width; x += step) {
          const nx = (x - cx) / r
          if (nx < -1 || nx > 1) continue
          const { hi, lo } = sampleAt(nx)
          const bulge = lensEdgeBulge(nx, 0.62)
          const span = Math.max(0.02, hi - lo)
          const grains = 2 + Math.floor(span * 5)
          for (let g = 0; g < grains; g++) {
            const u = (g + 0.5) / grains
            const sample = lo + u * (hi - lo)
            const y = cy - sample * amp * bulge + wobble
            ctx.globalAlpha = 0.18 + visual.glow * 0.32 + energy * 0.15 + nx * nx * 0.12
            ctx.fillRect(x, y, dpr, dpr)
          }
        }
        ctx.globalAlpha = 1
      }
      ctx.restore()
      const playGlow = 0.45 + visual.glow * 0.35
      ctx.strokeStyle = `rgba(232, 212, 160, ${playGlow})`
      ctx.lineWidth = Math.max(1, dpr)
      ctx.beginPath()
      ctx.moveTo(cx, cy - r * 0.86)
      ctx.lineTo(cx, cy + r * 0.86)
      ctx.stroke()
      ctx.fillStyle = `rgba(232, 212, 160, ${playGlow})`
      ctx.beginPath()
      ctx.arc(cx, cy - r * 0.86, 3 * dpr, 0, Math.PI * 2)
      ctx.arc(cx, cy + r * 0.86, 3 * dpr, 0, Math.PI * 2)
      ctx.fill()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, loaded, visual, loop])

  return (
    <div
      className={`${styles.lens} ${loop ? styles.loop : ''}`}
      style={{
        ['--lens-glow' as string]: String(visual.glow),
        ['--lens-warm' as string]: String(visual.warmth),
        ['--lens-depth' as string]: String(visual.depth),
        ['--lens-haze' as string]: String(visual.haze),
      }}
    >
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.glass}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.shine} aria-hidden="true" />
      </div>
      <button type="button" className={styles.hit} aria-label="Play or pause" onDoubleClick={onTogglePlay} />
    </div>
  )
}
