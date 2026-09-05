import { useEffect, useRef } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { readThemeColors } from '../../theme'
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
        const windowSec = Math.max(0.04, 0.18 / Math.max(0.35, visual.sharpness))
        const a = Math.max(0, now - windowSec / 2)
        const b = Math.min(duration, now + windowSec / 2)
        const samplesPerSec = data.length / duration
        const s = Math.floor(a * samplesPerSec)
        const e = Math.max(s + 1, Math.floor(b * samplesPerSec))
        const { min, max } = computeMinMax(data, s, e, width)
        const colors = readThemeColors()
        const analyser = engine.getAnalyser()
        let energy = 0.2
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
        const wobble = reduced ? 0 : visual.motion * 6 * dpr * Math.sin(performance.now() / 420)
        ctx.beginPath()
        ctx.strokeStyle = colors.waveform
        ctx.globalAlpha = 0.55 + visual.glow * 0.25
        ctx.lineWidth = Math.max(1, (1.2 + visual.mass) * dpr)
        ctx.lineJoin = 'round'
        for (let x = 0; x < width; x++) {
          const hi = max[x] ?? 0
          const lo = min[x] ?? 0
          const mid = (hi + lo) * 0.5
          const y = cy - mid * r * (0.72 + visual.mass * 0.2) * (0.85 + energy * 0.25) + wobble
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.globalAlpha = 0.18 + visual.haze * 0.2
        ctx.beginPath()
        for (let x = 0; x < width; x += 2) {
          const hi = max[x] ?? 0
          const y = cy - hi * r * 0.9
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + visual.glow * 0.2})`
      ctx.lineWidth = Math.max(1, 1.2 * dpr)
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + visual.glow * 0.3})`
      ctx.lineWidth = Math.max(1, dpr)
      ctx.moveTo(cx, cy - r * 0.88)
      ctx.lineTo(cx, cy + r * 0.88)
      ctx.stroke()
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
      </div>
      <button type="button" className={styles.hit} aria-label="Play or pause" onDoubleClick={onTogglePlay} />
    </div>
  )
}
