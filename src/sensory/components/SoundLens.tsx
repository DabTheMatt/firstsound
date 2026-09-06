import { useEffect, useRef } from 'react'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { lensDisplayX, lensEdgeBulge, lensSourceX, lensSphereScale } from '../visualization/lensWarp'
import { rgbCss, type SensoryVisualState } from '../visualization/sensoryVisualState'
import { LensSpanRing } from './LensSpanRing'
import styles from './SoundLens.module.css'

type Props = {
  duration: number
  loaded: boolean
  visual: SensoryVisualState
  loop: boolean
  windowSec: number
  windowAmount: number
  onWindowAmount: (amount: number) => void
  onWindowCommit: () => void
  onTogglePlay: () => void
}

export function SoundLens({
  duration,
  loaded,
  visual,
  loop,
  windowSec,
  windowAmount,
  onWindowAmount,
  onWindowCommit,
  onTogglePlay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastPaint = 0
    let timeBuf: Uint8Array | null = null
    const tick = (now: number) => {
      if (isDocumentHidden()) {
        frame = requestAnimationFrame(tick)
        return
      }
      if (now - lastPaint < paintIntervalMs(engine.getSnapshot().playing)) {
        frame = requestAnimationFrame(tick)
        return
      }
      lastPaint = now
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
      const r = Math.min(cx, cy) * 0.98
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()

      const glow = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.08, cx, cy, r)
      glow.addColorStop(0, rgbCss(visual.ink, 0.2 + visual.glow * 0.28))
      glow.addColorStop(0.42, rgbCss(visual.ink, 0.06 + visual.warmth * 0.08))
      glow.addColorStop(1, 'rgba(0,0,0,0.2)')
      ctx.fillStyle = glow
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

      if (buffer && duration > 0) {
        const data = buffer.getChannelData(0)
        const now = engine.getPlayheadSeconds()
        const span = Math.max(0.05, windowSec)
        const a = Math.max(0, now - span / 2)
        const b = Math.min(duration, now + span / 2)
        const samplesPerSec = data.length / duration
        const s = Math.floor(a * samplesPerSec)
        const e = Math.max(s + 1, Math.floor(b * samplesPerSec))
        const mips = engine.getSourceMips()[0] ?? []
        const { min, max } = mips.length
          ? computeMinMaxCached(data, mips, s, e, width)
          : computeMinMax(data, s, e, width)
        const analyser = engine.getAnalyser()
        let energy = 0.18
        if (analyser) {
          const n = analyser.fftSize
          if (!timeBuf || timeBuf.length !== n) timeBuf = new Uint8Array(n)
          analyser.getByteTimeDomainData(timeBuf as Uint8Array<ArrayBuffer>)
          const bins = timeBuf
          let acc = 0
          for (let i = 0; i < bins.length; i++) {
            const v = ((bins[i] ?? 128) - 128) / 128
            acc += v * v
          }
          energy = Math.min(1, Math.sqrt(acc / bins.length) * 3)
        }
        const wobble = reduced ? 0 : visual.motion * 8 * dpr * Math.sin(performance.now() / 380)
        const amp = r * (0.58 + visual.mass * 0.2) * (0.86 + energy * 0.28)
        const step = Math.max(1, Math.floor(dpr))
        const lastCol = Math.max(1, width - 1)
        const sampleAt = (nx: number, shift = 0) => {
          const src = lensSourceX(nx, 0.2)
          const col = Math.round(((src + 1) / 2) * lastCol + shift)
          const i = Math.min(lastCol, Math.max(0, col))
          return { hi: max[i] ?? 0, lo: min[i] ?? 0 }
        }
        const projectY = (nx: number, sample: number) => {
          const scale = lensSphereScale(nx) * lensEdgeBulge(nx, 1.35)
          return cy - sample * amp * scale + wobble
        }

        ctx.strokeStyle = rgbCss(visual.ink, 0.16 + visual.glow * 0.08)
        ctx.lineWidth = Math.max(1, dpr)
        const marks = 14
        for (let m = 1; m < marks; m++) {
          const src = (m / marks) * 2 - 1
          const nx = lensDisplayX(src, 0.2)
          const x = cx + nx * r
          const h = r * 0.62 * lensSphereScale(nx) * lensEdgeBulge(nx, 1.2)
          ctx.beginPath()
          ctx.moveTo(x, cy - h)
          ctx.lineTo(x, cy + h)
          ctx.stroke()
        }

        const ghosts = visual.echo > 0.04 ? 1 + Math.floor(visual.echo * 3) : 0
        for (let g = ghosts; g >= 1; g--) {
          const shift = g * visual.echo * 48 * dpr
          ctx.beginPath()
          let started = false
          for (let x = 0; x < width; x += step) {
            const nx = (x - cx) / r
            if (nx < -1 || nx > 1) continue
            const { hi } = sampleAt(nx, shift)
            const y = projectY(nx, hi)
            if (!started) {
              ctx.moveTo(x, y)
              started = true
            } else ctx.lineTo(x, y)
          }
          ctx.strokeStyle = rgbCss(visual.ink, 0.12 / g)
          ctx.lineWidth = Math.max(1, dpr)
          ctx.stroke()
        }

        ctx.beginPath()
        let started = false
        for (let x = 0; x < width; x += step) {
          const nx = (x - cx) / r
          if (nx < -1 || nx > 1) continue
          const { hi } = sampleAt(nx)
          const y = projectY(nx, hi)
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else ctx.lineTo(x, y)
        }
        for (let x = width - 1; x >= 0; x -= step) {
          const nx = (x - cx) / r
          if (nx < -1 || nx > 1) continue
          const { lo } = sampleAt(nx)
          ctx.lineTo(x, projectY(nx, lo))
        }
        ctx.closePath()
        ctx.fillStyle = rgbCss(visual.ink, 0.22 + visual.glow * 0.2)
        ctx.fill()
        ctx.strokeStyle = rgbCss(visual.ink, 0.82 + visual.glow * 0.18)
        ctx.lineWidth = Math.max(1.6, dpr * 1.35)
        ctx.stroke()

        const liveSpan = Math.min(0.32, Math.max(0.08, span * 0.08))
        ctx.beginPath()
        let liveStarted = false
        for (let x = 0; x < width; x += step) {
          const nx = (x - cx) / r
          if (nx < -1 || nx > 1) continue
          const src = lensSourceX(nx, 0.18)
          const t = now + src * (liveSpan / 2)
          const idx = Math.floor(Math.max(0, Math.min(data.length - 1, t * samplesPerSec)))
          const sample = data[idx] ?? 0
          const y = projectY(nx, sample)
          if (!liveStarted) {
            ctx.moveTo(x, y)
            liveStarted = true
          } else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = rgbCss(visual.ink, 0.95)
        ctx.lineWidth = Math.max(2.2, dpr * 1.8)
        ctx.stroke()

        const grains = 1 + Math.floor(visual.motion * 4)
        if (grains > 1) {
          ctx.fillStyle = rgbCss(visual.ink, 0.35)
          for (let x = 0; x < width; x += step * 2) {
            const nx = (x - cx) / r
            if (nx < -1 || nx > 1) continue
            const { hi, lo } = sampleAt(nx)
            for (let g = 0; g < grains; g++) {
              const u = (g + 0.35) / grains
              const y = projectY(nx, lo + u * (hi - lo))
              ctx.globalAlpha = 0.2 + visual.motion * 0.25
              ctx.fillRect(x, y, dpr, dpr)
            }
          }
          ctx.globalAlpha = 1
        }
      }
      ctx.restore()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, loaded, visual, loop, windowSec])

  return (
    <div
      className={`${styles.lens} ${loop ? styles.loop : ''}`}
      style={{
        ['--lens-glow' as string]: String(visual.glow),
        ['--lens-warm' as string]: String(visual.warmth),
        ['--lens-depth' as string]: String(visual.depth),
        ['--lens-haze' as string]: String(visual.haze),
        ['--lens-ink-r' as string]: String(visual.ink.r),
        ['--lens-ink-g' as string]: String(visual.ink.g),
        ['--lens-ink-b' as string]: String(visual.ink.b),
      }}
    >
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.glass}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.shine} aria-hidden="true" />
      </div>
      <LensSpanRing amount={windowAmount} duration={duration} onChange={onWindowAmount} onCommit={onWindowCommit} />
      <button type="button" className={styles.hit} aria-label="Play or pause" onDoubleClick={onTogglePlay} />
    </div>
  )
}
