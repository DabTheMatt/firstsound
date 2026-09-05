import { useEffect, useRef } from 'react'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { parseCssColor } from '../../theme/cssColor'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import { mixRgb, rgbCss, type Rgb, type SensoryVisualState } from '../visualization/sensoryVisualState'
import { absEnvelope, blurEnvelope, mountainLayerSpecs } from '../visualization/mountainLayers'
import styles from './SoundRange.module.css'

type Props = {
  duration: number
  loaded: boolean
  visual: SensoryVisualState
  contentRev: number
  onTogglePlay: () => void
  onLoadDemo: () => void
}

function themeInk(visual: SensoryVisualState): Rgb {
  const parsed = parseCssColor(readThemeColors().waveform)
  if (!parsed) return visual.ink
  return mixRgb({ r: parsed.r, g: parsed.g, b: parsed.b }, visual.ink, 0.45 + visual.warmth * 0.25)
}

export function SoundRange({ duration, loaded, visual, contentRev, onTogglePlay, onLoadDemo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let cache: { key: string; layers: Float32Array[] } | null = null
    const unsub = subscribeThemeChange(() => {
      cache = null
    })
    const tick = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        cache = null
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(tick)
        return
      }
      ctx.clearRect(0, 0, width, height)
      const buffer = engine.getBuffer()
      const ink = themeInk(visual)
      const play = readThemeColors().playhead || rgbCss(ink, 1)
      if (buffer && duration > 0) {
        const data = buffer.getChannelData(0)
        const key = `${contentRev}:${width}:${visual.mass.toFixed(2)}:${visual.motion.toFixed(2)}:${visual.space.toFixed(2)}:${visual.dirt.toFixed(2)}`
        if (!cache || cache.key !== key) {
          const mips = engine.getSourceMips()[0] ?? []
          const { min, max } = mips.length
            ? computeMinMaxCached(data, mips, 0, data.length, width)
            : computeMinMax(data, 0, data.length, width)
          const abs = absEnvelope(min, max)
          const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space)
          const dirtBlur = 1 - visual.dirt * 0.72
          cache = {
            key,
            layers: specs.map((spec) => blurEnvelope(abs, spec.blur * dpr * dirtBlur)),
          }
        }
        const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space)
        const base = height * (0.58 + visual.depth * 0.08)
        const amp = height * (0.42 + visual.mass * 0.12) * (1 - visual.tight * 0.42)
        const sway = reduced ? 0 : visual.motion * 10 * dpr * Math.sin(performance.now() / 1400)
        const grit = visual.dirt
        specs.forEach((spec, li) => {
          const env = cache?.layers[li]
          if (!env) return
          const drop = spec.drop * height
          ctx.beginPath()
          ctx.moveTo(0, height)
          for (let x = 0; x < width; x++) {
            const jag = grit > 0.05 ? Math.sin(x * 0.37 + li) * grit * amp * 0.035 : 0
            const h = (env[x] ?? 0) * amp * spec.scale + jag
            const y = base + drop - h + sway * (li + 1) * 0.15
            ctx.lineTo(x, y)
          }
          ctx.lineTo(width, height)
          ctx.closePath()
          const echoShift = visual.echo * 22 * dpr * (li % 2 === 0 ? 1 : -1)
          const open = Math.max(0, visual.character)
          ctx.fillStyle = rgbCss(ink, spec.alpha * (0.65 + visual.glow * 0.5 + open * 0.08))
          ctx.fill()
          if (visual.echo > 0.1) {
            ctx.beginPath()
            ctx.moveTo(echoShift, height)
            for (let x = 0; x < width; x++) {
              const h = (env[x] ?? 0) * amp * spec.scale * 0.85
              const y = base + drop - h + sway * (li + 1) * 0.15
              ctx.lineTo(x + echoShift, y)
            }
            ctx.lineTo(width + echoShift, height)
            ctx.closePath()
            ctx.fillStyle = rgbCss(ink, spec.alpha * visual.echo * 0.45)
            ctx.fill()
          }
        })
        if (visual.grain > 0.08) {
          const n = Math.floor(10 + visual.grain * 48)
          ctx.fillStyle = rgbCss(ink, 0.18 + visual.grain * 0.35)
          for (let i = 0; i < n; i++) {
            const seed = (i * 127.1 + visual.grain * 13) % 1
            const x = (Math.sin(i * 12.9898) * 43758.5453) % 1
            const px = Math.abs(x) * width
            const env = cache?.layers[0]
            const xi = Math.min(width - 1, Math.max(0, Math.round(px)))
            const peak = env?.[xi] ?? 0.2
            const py = base - peak * amp * (0.3 + seed * 0.7) - (i % 7) * visual.grain * 6
            ctx.fillRect(px, py, Math.max(1, dpr), Math.max(1, dpr))
          }
        }
        const now = engine.getPlayheadSeconds()
        const frac = duration > 0 ? Math.min(1, Math.max(0, now / duration)) : 0
        const px = frac * (width - 1)
        const peak = cache?.layers[0]?.[Math.round(px)] ?? 0
        const peakY = base - peak * amp * (specs[0]?.scale ?? 1)
        ctx.strokeStyle = play
        ctx.lineWidth = Math.max(1, dpr)
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()
        ctx.fillStyle = play
        ctx.beginPath()
        ctx.arc(px, peakY, 3.2 * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [duration, loaded, visual, contentRev])

  return (
    <div className={styles.range}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.fade} aria-hidden="true" />
      {loaded ? (
        <button type="button" className={styles.hit} aria-label="Play or pause" onDoubleClick={onTogglePlay} />
      ) : (
        <button type="button" className={styles.empty} onClick={onLoadDemo}>
          Load demo tone
        </button>
      )}
    </div>
  )
}
