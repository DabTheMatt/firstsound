import { useEffect, useRef } from 'react'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { parseCssColor } from '../../theme/cssColor'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import type { SensorySceneId } from '../sensoryScene'
import { paintSoundRange } from '../visualization/paintSoundRange'
import { mixRgb, rgbCss, type Rgb, type SensoryVisualState } from '../visualization/sensoryVisualState'
import { absEnvelope, blurEnvelope, mountainLayerSpecs, normalizeEnvelopePeak } from '../visualization/mountainLayers'
import styles from './SoundRange.module.css'

type Props = {
  duration: number
  loaded: boolean
  visual: SensoryVisualState
  contentRev: number
  scene: SensorySceneId
  onTogglePlay: () => void
  onLoadDemo: () => void
}

function themeInk(visual: SensoryVisualState): Rgb {
  const parsed = parseCssColor(readThemeColors().waveform)
  if (!parsed) return visual.ink
  return mixRgb({ r: parsed.r, g: parsed.g, b: parsed.b }, visual.ink, 0.55 + visual.warmth * 0.3)
}

function sourceView() {
  const source = engine.getSourceBuffer() ?? engine.getBuffer()
  const working = engine.getBuffer()
  const prep = engine.getPrep()
  const sourceDur = source?.duration ?? 0
  const workDur = working?.duration ?? 0
  const trimmed = Boolean(source && working && source !== working)
  const windowStart = trimmed ? prep.windowStart : 0
  const windowEnd = trimmed ? prep.windowEnd : sourceDur
  const snap = engine.getSnapshot()
  const regionStart = windowStart + snap.params.start
  const regionEnd = windowStart + snap.params.end
  const head = engine.getPlayheadSeconds() + windowStart
  return { source, sourceDur, workDur, windowStart, windowEnd, regionStart, regionEnd, head }
}

export function SoundRange({ duration, loaded, visual, contentRev, scene, onTogglePlay, onLoadDemo }: Props) {
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
      const view = sourceView()
      const ink = themeInk(visual)
      const play = readThemeColors().playhead || rgbCss(ink, 1)
      const buffer = view.source
      const sourceDur = view.sourceDur || duration
      if (buffer && sourceDur > 0) {
        const data = buffer.getChannelData(0)
        const key = `${contentRev}:${width}:${visual.mass.toFixed(2)}:${visual.space.toFixed(2)}:${visual.dirt.toFixed(2)}`
        if (!cache || cache.key !== key) {
          const mips = engine.getSourceMips()[0] ?? []
          const { min, max } = mips.length
            ? computeMinMaxCached(data, mips, 0, data.length, width)
            : computeMinMax(data, 0, data.length, width)
          const abs = normalizeEnvelopePeak(absEnvelope(min, max))
          const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space)
          const dirtBlur = 1 - visual.dirt * 0.72
          cache = {
            key,
            layers: specs.map((spec) => blurEnvelope(abs, spec.blur * dpr * dirtBlur)),
          }
        }
        const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space)
        paintSoundRange({
          ctx,
          width,
          height,
          dpr,
          visual,
          ink,
          play,
          layers: cache.layers,
          specs,
          nowMs: performance.now(),
          reduced,
          playFrac: sourceDur > 0 ? Math.min(1, Math.max(0, view.head / sourceDur)) : 0,
          windowStartFrac: sourceDur > 0 ? Math.min(1, Math.max(0, view.regionStart / sourceDur)) : 0,
          windowEndFrac: sourceDur > 0 ? Math.min(1, Math.max(0, view.regionEnd / sourceDur)) : 1,
          scene,
          livePan: engine.getSnapshot().liveParams.pan,
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [duration, loaded, visual, contentRev, scene])

  return (
    <div className={styles.range}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div
        className={`${styles.fade} ${scene === 'canyon' ? styles.fadeCanyon : ''} ${scene === 'mirror' ? styles.fadeMirror : ''}`}
        aria-hidden="true"
      />
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
