import { useEffect, useRef } from 'react'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { parseCssColor } from '../../theme/cssColor'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import { mixRgb, rgbCss, type Rgb, type SensoryVisualState } from '../visualization/sensoryVisualState'
import { absEnvelope, blurEnvelope, grainBandCount, mountainLayerSpecs } from '../visualization/mountainLayers'
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
  return mixRgb({ r: parsed.r, g: parsed.g, b: parsed.b }, visual.ink, 0.55 + visual.warmth * 0.3)
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
        const key = `${contentRev}:${width}:${visual.mass.toFixed(2)}:${visual.space.toFixed(2)}:${visual.dirt.toFixed(2)}`
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
        const zoom = visual.zoom
        const base = height * (0.72 - visual.space * 0.24)
        const amp = height * (0.34 + visual.mass * 0.1) * zoom * (1 - visual.tight * 0.45)
        const t = performance.now()
        const sway = reduced ? 0 : visual.mod * 18 * dpr * Math.sin(t / 900)
        const grit = visual.dirt
        const bands = grainBandCount(visual.grain)
        const gap = bands > 1 ? Math.max(3 * dpr, visual.grain * 14 * dpr) : 0
        const bandW = bands > 1 ? (width - gap * (bands - 1)) / bands : width
        const echoShift = visual.echo * 28 * dpr
        const driftPx = visual.drift * 36 * dpr

        const drawStack = (xOff: number, fill: Rgb, alphaMul: number) => {
          specs.forEach((spec, li) => {
            const env = cache?.layers[li]
            if (!env) return
            const drop = spec.drop * height * (0.7 + visual.space * 0.8)
            ctx.beginPath()
            ctx.moveTo(xOff, height)
            for (let x = 0; x < width; x++) {
              const jag = grit > 0.05 ? Math.sin(x * 0.37 + li) * grit * amp * 0.055 : 0
              const wave = reduced ? 0 : visual.mod * Math.sin(x * 0.018 + t / 420) * amp * 0.12
              const h = (env[x] ?? 0) * amp * spec.scale + jag + wave
              const y = base + drop - h + sway * (li + 1) * 0.12
              ctx.lineTo(x + xOff, y)
            }
            ctx.lineTo(width + xOff, height)
            ctx.closePath()
            const open = Math.max(0, visual.character)
            ctx.fillStyle = rgbCss(fill, spec.alpha * (0.7 + visual.glow * 0.55 + open * 0.12) * alphaMul)
            ctx.fill()
          })
        }

        const paint = () => {
          if (visual.drift > 0.08) {
            drawStack(-driftPx, visual.inkLeft, 0.85)
            drawStack(driftPx, visual.inkRight, 0.85)
          } else {
            drawStack(0, ink, 1)
          }
          if (visual.echo > 0.08) {
            drawStack(echoShift, mixRgb(ink, { r: 196, g: 128, b: 255 }, 0.55), visual.echo * 0.55)
            drawStack(-echoShift * 0.7, mixRgb(ink, { r: 196, g: 128, b: 255 }, 0.35), visual.echo * 0.35)
          }
        }

        if (bands <= 1) {
          paint()
        } else {
          for (let b = 0; b < bands; b++) {
            const x0 = b * (bandW + gap)
            ctx.save()
            ctx.beginPath()
            ctx.rect(x0, 0, bandW, height)
            ctx.clip()
            ctx.translate(0, ((b % 2) * 2 - 1) * visual.grain * 8 * dpr)
            paint()
            ctx.restore()
          }
        }

        const now = engine.getPlayheadSeconds()
        const frac = duration > 0 ? Math.min(1, Math.max(0, now / duration)) : 0
        const px = frac * (width - 1)
        const peak = cache?.layers[0]?.[Math.round(px)] ?? 0
        const peakY = base - peak * amp * (specs[0]?.scale ?? 1)
        ctx.strokeStyle = play
        ctx.lineWidth = Math.max(1.2, dpr * (1 + visual.glow * 0.8))
        ctx.globalAlpha = 0.95
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()
        ctx.fillStyle = play
        ctx.beginPath()
        ctx.arc(px, peakY, 3.6 * dpr, 0, Math.PI * 2)
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
