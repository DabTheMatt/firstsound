import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { parseCssColor } from '../../theme/cssColor'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import type { SensorySceneId } from '../sensoryScene'
import { paintSoundRange } from '../visualization/paintSoundRange'
import {
  lerpTime,
  playheadInView,
  regionFromDrag,
  sampleIndexSpan,
  workingTimeFromSource,
} from '../visualization/sampleRegion'
import {
  lerpVisualState,
  mixRgb,
  rgbCss,
  type Rgb,
  type SensoryVisualState,
} from '../visualization/sensoryVisualState'
import { absEnvelope, blurEnvelope, mountainLayerSpecs, normalizeEnvelopePeak } from '../visualization/mountainLayers'
import { useI18n } from '../../i18n'
import styles from './SoundRange.module.css'

type Props = {
  duration: number
  loaded: boolean
  visual: SensoryVisualState
  contentRev: number
  scene: SensorySceneId
  onTogglePlay: () => void
  onLoadDemo: () => void
  onRegionCommit: () => void
}

function themeInk(visual: SensoryVisualState): Rgb {
  const parsed = parseCssColor(readThemeColors().waveform)
  if (!parsed) return visual.ink
  return mixRgb({ r: parsed.r, g: parsed.g, b: parsed.b }, visual.ink, 0.55 + visual.warmth * 0.3)
}

function cssRgb(value: string, fallback: Rgb): Rgb {
  const parsed = parseCssColor(value)
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : fallback
}

function themeRidge(ink: Rgb) {
  const colors = readThemeColors()
  return {
    warm: cssRgb(colors.ridgeWarm, ink),
    mid: cssRgb(colors.ridgeMid, ink),
    cool: cssRgb(colors.ridgeCool, ink),
  }
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

export function SoundRange({
  duration,
  loaded,
  visual,
  contentRev,
  scene,
  onTogglePlay,
  onLoadDemo,
  onRegionCommit,
}: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visualRef = useRef(visual)
  const shownRef = useRef(visual)
  const drag = useRef<{ pointerId: number; originFrac: number; moved: boolean } | null>(null)

  useEffect(() => {
    visualRef.current = visual
  }, [visual])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastPaint = 0
    let cache: { key: string; layers: Float32Array[] } | null = null
    const unsub = subscribeThemeChange(() => {
      cache = null
    })
    const tick = (now: number) => {
      if (isDocumentHidden()) {
        frame = requestAnimationFrame(tick)
        return
      }
      const playing = engine.getSnapshot().playing
      if (now - lastPaint < paintIntervalMs(playing)) {
        frame = requestAnimationFrame(tick)
        return
      }
      lastPaint = now
      const target = visualRef.current
      shownRef.current = reduced ? target : lerpVisualState(shownRef.current, target, 0.085)
      const visual = shownRef.current
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
        const span = sampleIndexSpan(data.length, sourceDur, view.regionStart, view.regionEnd)
        const key = `${contentRev}:${width}:${span.i0}:${span.i1}:${visual.mass.toFixed(2)}:${visual.space.toFixed(2)}:${visual.dirt.toFixed(2)}:${visual.motion.toFixed(2)}`
        if (!cache || cache.key !== key) {
          const mips = engine.getSourceMips()[0] ?? []
          const { min, max } = mips.length
            ? computeMinMaxCached(data, mips, span.i0, span.i1, width)
            : computeMinMax(data, span.i0, span.i1, width)
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
          nowMs: reduced ? 0 : performance.now(),
          reduced,
          playFrac: playheadInView(view.head, view.regionStart, view.regionEnd),
          windowStartFrac: 0,
          windowEndFrac: 1,
          scene,
          ridge: themeRidge(ink),
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [duration, loaded, contentRev, scene])

  const fracAt = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
  }

  const seekToFrac = (frac: number) => {
    const view = sourceView()
    const t = lerpTime(view.regionStart, view.regionEnd, frac)
    engine.seekSeconds(workingTimeFromSource(t, view.windowStart, view.workDur || duration))
  }

  const selectFromDrag = (origin: number, next: number) => {
    const view = sourceView()
    const a = lerpTime(view.regionStart, view.regionEnd, origin)
    const b = lerpTime(view.regionStart, view.regionEnd, next)
    const region = regionFromDrag(
      workingTimeFromSource(a, view.windowStart, view.workDur),
      workingTimeFromSource(b, view.windowStart, view.workDur),
      view.workDur || duration,
    )
    engine.setRegion(region.start, region.end)
  }

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    if (state.moved) onRegionCommit()
    else seekToFrac(fracAt(event))
  }

  return (
    <div className={styles.range}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div
        className={`${styles.fade} ${scene === 'canyon' ? styles.fadeCanyon : ''} ${scene === 'mirror' ? styles.fadeMirror : ''}`}
        aria-hidden="true"
      />
      {loaded ? (
        <button
          type="button"
          className={styles.hit}
          aria-label={t.sensory.selectRegion}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { pointerId: event.pointerId, originFrac: fracAt(event), moved: false }
          }}
          onPointerMove={(event) => {
            const state = drag.current
            if (!state || state.pointerId !== event.pointerId) return
            if (event.buttons === 0) {
              endDrag(event)
              return
            }
            const next = fracAt(event)
            if (Math.abs(next - state.originFrac) > 0.008) state.moved = true
            if (state.moved) selectFromDrag(state.originFrac, next)
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={(event) => {
            event.preventDefault()
            onTogglePlay()
          }}
        />
      ) : (
        <button type="button" className={styles.empty} onClick={onLoadDemo}>
          {t.sensory.loadDemo}
        </button>
      )}
    </div>
  )
}
