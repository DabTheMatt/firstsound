import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { parseCssColor } from '../../theme/cssColor'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import type { SensorySceneId } from '../sensoryScene'
import { paintSoundRange } from '../visualization/paintSoundRange'
import {
  NEUTRAL_PLAYBACK,
  advancePitchPhase,
  approachPlaybackVisual,
  playbackSmoothAmount,
  playbackVisualFromEngine,
  playbackVisualSettled,
  type PlaybackVisual,
} from '../visualization/playbackWarp'
import {
  lerpTime,
  playheadInView,
  regionFromDrag,
  resizeRegionEdge,
  sampleIndexSpan,
  selectionCoversSample,
  sensorySelectionGesture,
  slideRegion,
  workingTimeFromSource,
  type SensorySelectionGesture,
} from '../visualization/sampleRegion'
import {
  lerpVisualState,
  mixRgb,
  rgbCss,
  type Rgb,
  type SensoryVisualState,
} from '../visualization/sensoryVisualState'
import { absEnvelope, blurEnvelope, mountainLayerSpecs, normalizeEnvelopeDisplay } from '../visualization/mountainLayers'
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
  const live = loaded ? sourceView() : null
  const partialSelection = Boolean(
    live && live.sourceDur > 0 && !selectionCoversSample(live.regionStart, live.regionEnd, live.sourceDur),
  )
  const visualRef = useRef(visual)
  const shownRef = useRef(visual)
  const playbackRef = useRef<PlaybackVisual>(NEUTRAL_PLAYBACK)
  const pitchPhaseRef = useRef(0)
  const drag = useRef<{
    pointerId: number
    originFrac: number
    originStart: number
    originEnd: number
    moved: boolean
    mode: SensorySelectionGesture
  } | null>(null)

  useEffect(() => {
    visualRef.current = visual
  }, [visual])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastPaint = 0
    let lastStamp = 0
    let cache: { key: string; layers: Float32Array[] } | null = null
    const unsub = subscribeThemeChange(() => {
      cache = null
    })
    const tick = (now: number) => {
      if (isDocumentHidden()) {
        frame = requestAnimationFrame(tick)
        return
      }
      const dt = lastStamp === 0 ? 16 : Math.min(100, now - lastStamp)
      lastStamp = now
      const snap = engine.getSnapshot()
      const playbackTarget = playbackVisualFromEngine(snap.params.speed, snap.params.pitch)
      playbackRef.current = approachPlaybackVisual(
        playbackRef.current,
        playbackTarget,
        reduced ? 1 : playbackSmoothAmount(dt),
      )
      pitchPhaseRef.current = advancePitchPhase(
        pitchPhaseRef.current,
        dt / 1000,
        playbackRef.current.pitchFeel,
        reduced,
      )
      const playback = playbackRef.current
      const pitchLive = !reduced && Math.abs(playback.pitchFeel) > 0.004
      const settling = !playbackVisualSettled(playback, playbackTarget)
      const interval = settling || pitchLive ? 33 : paintIntervalMs(snap.playing)
      if (now - lastPaint < interval) {
        frame = requestAnimationFrame(tick)
        return
      }
      lastPaint = now
      canvas.dataset.timeStretch = String(playback.timeStretch)
      canvas.dataset.pitchFeel = String(playback.pitchFeel)
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
        // Time and pitch warp the cached silhouette while painting. They are not part of this key.
        const key = `${contentRev}:${width}:${span.i0}:${span.i1}:${visual.mass.toFixed(2)}:${visual.space.toFixed(2)}:${visual.dirt.toFixed(2)}:${visual.motion.toFixed(2)}:${visual.haze.toFixed(2)}`
        if (!cache || cache.key !== key) {
          const mips = engine.getSourceMips()[0] ?? []
          const { min, max } = mips.length
            ? computeMinMaxCached(data, mips, span.i0, span.i1, width)
            : computeMinMax(data, span.i0, span.i1, width)
          const abs = normalizeEnvelopeDisplay(absEnvelope(min, max))
          const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space, visual.haze)
          const dirtBlur = 1 - visual.dirt * 0.72
          const hazeBlur = 1 + visual.haze * 0.85
          cache = {
            key,
            layers: specs.map((spec) =>
              normalizeEnvelopeDisplay(blurEnvelope(abs, spec.blur * dpr * dirtBlur * hazeBlur)),
            ),
          }
        }
        const specs = mountainLayerSpecs(visual.mass, visual.motion, visual.space, visual.haze)
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
          playback,
          pitchPhase: pitchPhaseRef.current,
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

  const applySourceSpan = (sourceStart: number, sourceEnd: number) => {
    const view = sourceView()
    const region = regionFromDrag(
      workingTimeFromSource(sourceStart, view.windowStart, view.workDur),
      workingTimeFromSource(sourceEnd, view.windowStart, view.workDur),
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
    else if (state.mode !== 'create') {
      const view = sourceView()
      const t = lerpTime(state.originStart, state.originEnd, state.originFrac)
      engine.seekSeconds(workingTimeFromSource(t, view.windowStart, view.workDur || duration))
    }
  }

  return (
    <div className={styles.range}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
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
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              /* capture is optional; the gesture still tracks this pointer */
            }
            const frac = fracAt(event)
            const view = sourceView()
            const covers = selectionCoversSample(view.regionStart, view.regionEnd, view.sourceDur || duration)
            const mode = sensorySelectionGesture({
              frac,
              startFrac: 0,
              endFrac: 1,
              widthPx: event.currentTarget.getBoundingClientRect().width,
              coversSample: covers,
              minEdgePx: covers ? 22 : 44,
            })
            drag.current = {
              pointerId: event.pointerId,
              originFrac: frac,
              originStart: view.regionStart,
              originEnd: view.regionEnd,
              moved: false,
              mode,
            }
            if (mode === 'create') seekToFrac(frac)
          }}
          onPointerMove={(event) => {
            const state = drag.current
            if (!state || state.pointerId !== event.pointerId) return
            if (event.buttons === 0 && event.pointerType === 'mouse') {
              endDrag(event)
              return
            }
            const next = fracAt(event)
            if (Math.abs(next - state.originFrac) > 0.008) state.moved = true
            if (!state.moved) return
            const view = sourceView()
            const sourceDur = view.sourceDur || duration
            if (!(sourceDur > 0)) return
            if (state.mode === 'move') {
              const span = Math.abs(state.originEnd - state.originStart)
              const delta = (next - state.originFrac) * span
              const slid = slideRegion(state.originStart, state.originEnd, delta, sourceDur)
              applySourceSpan(slid.start, slid.end)
              return
            }
            const pointer = lerpTime(state.originStart, state.originEnd, next)
            if (state.mode === 'resize-start' || state.mode === 'resize-end') {
              const edge = state.mode === 'resize-start' ? 'start' : 'end'
              const resized = resizeRegionEdge(edge, state.originStart, state.originEnd, pointer, sourceDur)
              applySourceSpan(resized.start, resized.end)
              return
            }
            const a = lerpTime(state.originStart, state.originEnd, state.originFrac)
            applySourceSpan(a, pointer)
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={(event) => {
            event.preventDefault()
            onTogglePlay()
          }}
        >
          {partialSelection ? (
            <>
              <span className={styles.edge} data-edge="start" aria-hidden="true" />
              <span className={`${styles.edge} ${styles.edgeEnd}`} data-edge="end" aria-hidden="true" />
            </>
          ) : null}
        </button>
      ) : (
        <button type="button" className={styles.empty} onClick={onLoadDemo}>
          {t.sensory.loadDemo}
        </button>
      )}
    </div>
  )
}
