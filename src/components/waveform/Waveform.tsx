import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { fadeBendFromMidGain, fadeGain, type FadeCurve } from '../../audio/engine/fades'
import { computeMinMax } from '../../audio/engine/peaks'
import type { WaveTool, VizMode } from '../../app/editorState'
import { engine } from '../../hooks/useEngine'
import { Overview } from './Overview'
import { Spectrum } from './Spectrum'
import {
  fitView,
  fracToTime,
  panView,
  timeToFrac,
  verticalGain,
  wheelPanSeconds,
  zoomAround,
  zoomPercent,
  zoomToSelection,
  type View,
} from './viewport'
import { SPACE_HANDLE_TOP_PX, hitSpaceOverlay, dragSpaceOverlay, type SpaceHit } from '../../audio/fx/hit'
import { delayTaps, reverbTail } from '../../audio/fx/spaceModel'
import { drawDelayOverlay, drawReverbOverlay } from './spaceDraw'
import {
  clampFadeLengthToLoop,
  fadeDiamondLayout,
  fadeLengthFromDiamondTime,
  fadeOriginTime,
  fadeShapeHandleLayout,
} from './handleLayout'
import { rulerMarks } from './rulerTicks'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './Waveform.module.css'

type Props = {
  duration: number
  start: number
  end: number
  loaded: boolean
  tool: WaveTool
  viz: VizMode
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  fadeInBend?: number
  fadeOutBend?: number
  fadeFocus?: 'in' | 'out'
  autoSnap: boolean
  normalizeView: boolean
  onNormalizeView: (value: boolean) => void
  onZoomLabel: (label: string) => void
  onLoadDemo: () => void
  onRegionCommit: () => void
  onFades: (patch: {
    fadeIn?: number
    fadeOut?: number
    fadeInBend?: number
    fadeOutBend?: number
    fadeFocus?: 'in' | 'out'
  }) => void
  onFadesCommit?: () => void
  contentRev?: number
  fxMode?: 'delay' | 'reverb' | null
}

export type WaveformHandle = {
  fitSample: () => void
  zoomSelection: () => void
  fitSelection: () => void
  resetZoom: () => void
  zoomBy: (factor: number) => void
}

const SPLIT_PREF = 'field.splitWave'

function loadSplitShare(): number {
  try {
    const n = Number(localStorage.getItem(SPLIT_PREF))
    if (Number.isFinite(n) && n >= 0.28 && n <= 0.82) return n
  } catch {
    /* private mode */
  }
  return 0.64
}

type DragMode =
  | 'start'
  | 'end'
  | 'move'
  | 'pan'
  | 'fadeIn'
  | 'fadeOut'
  | 'fadeInShape'
  | 'fadeOutShape'
  | 'fx'
  | 'playhead'
  | null

export const Waveform = forwardRef<WaveformHandle, Props>(function Waveform(
  {
    duration,
    start,
    end,
    loaded,
    tool,
    viz,
    fadeIn,
    fadeOut,
    fadeCurve,
    fadeInBend = 0.5,
    fadeOutBend = 0.5,
    fadeFocus = 'in',
    autoSnap,
    normalizeView,
    onNormalizeView,
    onZoomLabel,
    onLoadDemo,
    onRegionCommit,
    onFades,
    onFadesCommit,
    contentRev = 0,
    fxMode = null,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const peaksRef = useRef<{ min: Float32Array; max: Float32Array } | null>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState<View>(() => fitView(duration || 1))
  const [panning, setPanning] = useState(false)
  const [waveShare, setWaveShare] = useState(loadSplitShare)
  const waveShareRef = useRef(waveShare)
  const splitDrag = useRef<{ y: number; share: number } | null>(null)
  const viewRef = useRef(view)
  const stateRef = useRef({ start, end, duration, normalizeView, tool, autoSnap })
  const handlePx = useRef(28)

  const setView = (next: View) => {
    viewRef.current = next
    setViewState(next)
    onZoomLabel(`${Math.round(zoomPercent(next, duration || 1))}%`)
  }

  useEffect(() => {
    waveShareRef.current = waveShare
  }, [waveShare])

  useEffect(() => {
    stateRef.current = { start, end, duration, normalizeView, tool, autoSnap }
  }, [start, end, duration, normalizeView, tool, autoSnap])

  useEffect(() => {
    handlePx.current = window.matchMedia('(pointer: coarse)').matches ? 44 : 22
  }, [])

  useImperativeHandle(ref, () => ({
    fitSample: () => setView(fitView(duration)),
    zoomSelection: () => setView(zoomToSelection(start, end, duration)),
    fitSelection: () => {
      setView(zoomToSelection(start, end, duration))
      onNormalizeView(true)
    },
    resetZoom: () => {
      setView(fitView(duration))
      onNormalizeView(false)
    },
    zoomBy: (factor: number) => {
      const v = viewRef.current
      setView(zoomAround(v, factor, (v.start + v.end) / 2, duration))
    },
  }))

  useEffect(() => {
    onZoomLabel(`${Math.round(zoomPercent(viewRef.current, duration || 1))}%`)
  }, [duration, onZoomLabel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const buffer = engine.getBuffer()
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      if (!buffer || duration <= 0) return
      const colors = readThemeColors()
      const selA = Math.min(start, end)
      const selB = Math.max(start, end)
      const channels = buffer.numberOfChannels
      const lanes = Math.min(2, channels)
      for (let lane = 0; lane < lanes; lane++) {
        const data = buffer.getChannelData(Math.min(lane, channels - 1))
        const laneH = height / lanes
        const top0 = lane * laneH
        const samplesPerSec = data.length / duration
        const s = Math.floor(view.start * samplesPerSec)
        const e = Math.max(s + 1, Math.floor(view.end * samplesPerSec))
        const { min, max, peak } = computeMinMax(data, s, e, width)
        const gain = normalizeView ? verticalGain(peak) : 1
        const mid = top0 + laneH / 2
        const half = laneH * 0.42
        const span = Math.max(0.0001, view.end - view.start)
        let lastSelected: boolean | null = null
        for (let x = 0; x < width; x++) {
          const t = view.start + (x / width) * span
          const selected = t >= selA && t <= selB
          if (selected !== lastSelected) {
            ctx.fillStyle = selected ? colors.waveformSelected : colors.waveform
            lastSelected = selected
          }
          const hi = Math.max(-1, Math.min(1, (max[x] ?? 0) * gain))
          const lo = Math.max(-1, Math.min(1, (min[x] ?? 0) * gain))
          const top = mid - hi * half
          const bottom = mid - lo * half
          ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
        }
        if (lane === 0) peaksRef.current = { min, max }
      }
      const span = Math.max(0.0001, view.end - view.start)
      const strokeFade = (from: number, to: number, side: 'in' | 'out', bend: number) => {
        if (!(to > from + 1e-6)) return
        ctx.beginPath()
        ctx.strokeStyle = colors.envelope
        ctx.lineWidth = Math.max(1, dpr)
        ctx.setLineDash([3 * dpr, 3 * dpr])
        const n = Math.max(20, Math.floor(((to - from) / span) * width))
        for (let i = 0; i <= n; i++) {
          const u = i / n
          const t = from + u * (to - from)
          const x = ((t - view.start) / span) * width
          const g = side === 'in' ? fadeGain(u, fadeCurve, bend) : fadeGain(1 - u, fadeCurve, bend)
          const y = (1 - g) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
      const inDur = clampFadeLengthToLoop(fadeIn, start, end)
      const outDur = clampFadeLengthToLoop(fadeOut, start, end)
      strokeFade(fadeOriginTime('in', start, end), start + inDur, 'in', fadeInBend)
      strokeFade(end - outDur, fadeOriginTime('out', start, end), 'out', fadeOutBend)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [view, normalizeView, loaded, duration, viz, contentRev, start, end, fadeIn, fadeOut, fadeCurve, fadeInBend, fadeOutBend])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = playheadRef.current
      if (el) {
        const frac = timeToFrac(engine.getPlayheadSeconds(), viewRef.current)
        if (frac >= 0 && frac <= 1) {
          el.style.display = ''
          el.style.left = `${frac * 100}%`
        } else {
          el.style.display = 'none'
        }
      }
      const fxCanvas = fxCanvasRef.current
      const snap = engine.getSnapshot()
      const mode = fxMode
      if (fxCanvas && mode && !snap.chain.find((m) => m.type === mode)?.bypassed) {
        const rect = fxCanvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = Math.max(1, Math.floor(rect.width * dpr))
        const height = Math.max(1, Math.floor(rect.height * dpr))
        if (fxCanvas.width !== width || fxCanvas.height !== height) {
          fxCanvas.width = width
          fxCanvas.height = height
        }
        const ctx = fxCanvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          const view = viewRef.current
          const now = performance.now() / 1000
          if (mode === 'delay') {
            const taps = delayTaps(snap.params, snap.delayType, snap.params.bpm, now)
            drawDelayOverlay(ctx, width, height, view.start, view.end, snap.params.start, taps)
          } else {
            drawReverbOverlay(
              ctx,
              width,
              height,
              view.start,
              view.end,
              snap.params.start,
              reverbTail(snap.params, snap.reverbType, snap.params.bpm),
              now,
            )
          }
        }
      } else if (fxCanvas) {
        const ctx = fxCanvas.getContext('2d')
        ctx?.clearRect(0, 0, fxCanvas.width, fxCanvas.height)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fxMode])

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const onWheel = (event: WheelEvent) => {
      const { duration: d } = stateRef.current
      if (d <= 0) return
      event.preventDefault()
      const rect = overlay.getBoundingClientRect()
      const v = viewRef.current
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const span = v.end - v.start
        const delta = wheelPanSeconds(event.deltaX, event.deltaY, event.shiftKey, span, rect.width)
        if (delta !== null) setView(panView(v, delta, d))
      } else {
        const focus = fracToTime((event.clientX - rect.left) / rect.width, v)
        setView(zoomAround(v, event.deltaY > 0 ? 1.2 : 1 / 1.2, focus, d))
      }
    }
    overlay.addEventListener('wheel', onWheel, { passive: false })
    return () => overlay.removeEventListener('wheel', onWheel)
  }, [])

  const pointers = useRef(new Map<number, number>())
  const drag = useRef<{
    mode: DragMode
    span: number
    originT: number
    originY: number
    originX: number
    originView: View
    origin: { start: number; end: number }
    fx?: SpaceHit
  } | null>(null)
  const pinch = useRef<{ dist: number; view: View; focus: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0) return
    const overlay = overlayRef.current
    if (!overlay) return
    event.preventDefault()
    overlay.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, event.clientX)

    if (pointers.current.size === 2) {
      drag.current = null
      const xs = [...pointers.current.values()]
      const rect = overlay.getBoundingClientRect()
      const midFrac = ((xs[0] + xs[1]) / 2 - rect.left) / rect.width
      pinch.current = {
        dist: Math.max(1, Math.abs(xs[0] - xs[1])),
        view: viewRef.current,
        focus: fracToTime(midFrac, viewRef.current),
      }
      return
    }

    const rect = overlay.getBoundingClientRect()
    const width = rect.width
    const x = event.clientX - rect.left
    const startX = timeToFrac(start, viewRef.current) * width
    const endX = timeToFrac(end, viewRef.current) * width
    const t = fracToTime(x / width, viewRef.current)
    const hit = handlePx.current
    const y = event.clientY - rect.top

    const fadeAttr = (event.target as HTMLElement | null)?.closest?.('[data-fade]') as HTMLElement | null
    const handleAttr = (event.target as HTMLElement | null)?.closest?.('[data-edge]') as HTMLElement | null
    const fadeRole = fadeAttr?.dataset.fadeRole

    let mode: DragMode = event.altKey || event.button === 1 ? 'pan' : event.shiftKey ? 'move' : 'playhead'
    if (mode !== 'pan') {
      if (fadeAttr?.dataset.fade === 'in' && fadeRole === 'shape') mode = 'fadeInShape'
      else if (fadeAttr?.dataset.fade === 'out' && fadeRole === 'shape') mode = 'fadeOutShape'
      else if (fadeAttr?.dataset.fade === 'in') mode = 'fadeIn'
      else if (fadeAttr?.dataset.fade === 'out') mode = 'fadeOut'
      else if (handleAttr?.dataset.edge === 'start') mode = 'start'
      else if (handleAttr?.dataset.edge === 'end') mode = 'end'
      else if (Math.abs(x - startX) < hit && y < hit * 1.6) mode = 'start'
      else if (Math.abs(x - endX) < hit && y < hit * 1.6) mode = 'end'
    }

    const usingRegionHandle =
      mode === 'fadeIn' ||
      mode === 'fadeOut' ||
      mode === 'fadeInShape' ||
      mode === 'fadeOutShape' ||
      mode === 'start' ||
      mode === 'end'

    if (!usingRegionHandle && fxMode && tool === 'select') {
      const snap = engine.getSnapshot()
      const taps = delayTaps(snap.params, snap.delayType, snap.params.bpm)
      const tail = reverbTail(snap.params, snap.reverbType, snap.params.bpm)
      const spaceHit = hitSpaceOverlay(
        x,
        y,
        width,
        rect.height,
        viewRef.current.start,
        viewRef.current.end,
        start,
        fxMode,
        taps,
        tail,
        { xs: [startX, endX], radius: hit, top: SPACE_HANDLE_TOP_PX },
      )
      if (spaceHit) {
        drag.current = {
          mode: 'fx',
          span: end - start,
          originT: t,
          originY: y,
          originX: event.clientX,
          originView: { ...viewRef.current },
          origin: { start, end },
          fx: spaceHit,
        }
        return
      }
    }

    if (mode === 'fadeIn' || mode === 'fadeInShape') onFades({ fadeFocus: 'in' })
    else if (mode === 'fadeOut' || mode === 'fadeOutShape') onFades({ fadeFocus: 'out' })
    if (mode === 'playhead') engine.seekSeconds(t, 'sample')
    drag.current = {
      mode,
      span: end - start,
      originT: t,
      originY: event.clientY - rect.top,
      originX: event.clientX,
      originView: { ...viewRef.current },
      origin: { start, end },
    }
    setPanning(mode === 'pan')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      endPointer(event)
      return
    }
    pointers.current.set(event.pointerId, event.clientX)
    const overlay = overlayRef.current
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()

    if (pinch.current && pointers.current.size >= 2) {
      const xs = [...pointers.current.values()]
      const dist = Math.max(1, Math.abs(xs[0] - xs[1]))
      const factor = pinch.current.dist / dist
      setView(zoomAround(pinch.current.view, factor, pinch.current.focus, duration))
      return
    }
    if (!drag.current) return
    const next = fracToTime((event.clientX - rect.left) / rect.width, viewRef.current)
    const { mode, span, originT, origin, fx, originX, originView } = drag.current
    if (mode === 'fx' && fx) {
      engine.setParams(
        dragSpaceOverlay(
          fx,
          originT,
          next,
          drag.current.originY,
          event.clientY - rect.top,
          rect.height,
          engine.getSnapshot().params,
        ),
      )
      return
    }
    if (mode === 'pan') {
      const spanSec = originView.end - originView.start
      const delta = -((event.clientX - originX) / Math.max(1, rect.width)) * spanSec
      setView(panView(originView, delta, duration))
      return
    }
    if (mode === 'start') engine.setParam('start', next)
    else if (mode === 'end') engine.setParam('end', next)
    else if (mode === 'fadeIn') {
      onFades({
        fadeIn: fadeLengthFromDiamondTime('in', start, end, next),
        fadeFocus: 'in',
      })
    } else if (mode === 'fadeOut') {
      onFades({
        fadeOut: fadeLengthFromDiamondTime('out', start, end, next),
        fadeFocus: 'out',
      })
    } else if (mode === 'fadeInShape') {
      onFades({
        fadeFocus: 'in',
        fadeInBend: fadeBendFromMidGain(
          1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
          fadeCurve,
        ),
      })
    } else if (mode === 'fadeOutShape') {
      onFades({
        fadeFocus: 'out',
        fadeOutBend: fadeBendFromMidGain(
          1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
          fadeCurve,
        ),
      })
    }
    else if (mode === 'playhead') engine.seekSeconds(next, 'sample')
    else if (mode === 'move') {
      const delta = next - originT
      const maxStart = Math.max(0, duration - span)
      const s = Math.min(maxStart, Math.max(0, origin.start + delta))
      engine.setRegion(s, s + span)
    }
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      overlayRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      const mode = drag.current?.mode
      drag.current = null
      setPanning(false)
      if (mode === 'start' || mode === 'end' || mode === 'move') {
        if (autoSnap) {
          if (mode === 'start' || mode === 'move') engine.snapToZero('start')
          if (mode === 'end' || mode === 'move') engine.snapToZero('end')
        }
        onRegionCommit()
      }
      if (
        mode === 'fadeIn' ||
        mode === 'fadeOut' ||
        mode === 'fadeInShape' ||
        mode === 'fadeOutShape'
      ) {
        onFadesCommit?.()
      }
    }
  }

  const onDoubleClick = () => {
    if (duration <= 0) return
    const full = start <= 0.001 && end >= duration - 0.001
    setView(full ? fitView(duration) : zoomToSelection(start, end, duration))
  }

  const pct = (t: number) => timeToFrac(t, view) * 100
  const startPct = pct(start)
  const endPct = pct(end)
  const regionLeft = Math.max(0, Math.min(100, startPct))
  const regionRight = Math.max(0, Math.min(100, endPct))
  const fadeHandleStyle = (side: 'in' | 'out') => {
    const layout = fadeDiamondLayout({
      side,
      start,
      end,
      fadeIn,
      fadeOut,
    })
    const left = Math.min(100, Math.max(0, pct(layout.time)))
    return { left: `${left}%` }
  }

  const fadeShapeStyle = (side: 'in' | 'out') => {
    const layout = fadeShapeHandleLayout({ side, start, end, fadeIn, fadeOut })
    if (!layout) return null
    const bend = side === 'in' ? fadeInBend : fadeOutBend
    const gain = fadeGain(layout.progress, fadeCurve, bend)
    return {
      left: `${Math.min(100, Math.max(0, pct(layout.time)))}%`,
      top: `${(1 - gain) * 100}%`,
    }
  }

  const ticks = useMemo(() => rulerMarks(view.start, view.end, duration), [view, duration])

  const showWave = viz !== 'spectrum'
  const showSpec = viz === 'spectrum' || viz === 'split'

  return (
    <div className={styles.editor}>
      <div className={`${styles.stage} ${viz === 'split' ? styles.split : ''}`}>
        <div
          className={styles.wrap}
          hidden={!showWave}
          style={viz === 'split' ? { flex: waveShare } : undefined}
        >
          <div className={styles.wavePane}>
            <canvas ref={canvasRef} className={styles.canvas} />
            <canvas ref={fxCanvasRef} className={styles.fxCanvas} />
            <div
              ref={overlayRef}
              className={`${styles.overlay} ${panning ? `${styles.overlayPan} ${styles.grabbing}` : ''}`}
              onPointerDown={loaded ? onPointerDown : undefined}
              onPointerMove={loaded ? onPointerMove : undefined}
              onPointerUp={loaded ? endPointer : undefined}
              onPointerCancel={loaded ? endPointer : undefined}
              onDoubleClick={loaded ? onDoubleClick : undefined}
            >
              {loaded && duration > 0 ? (
                <>
                  <div
                    className={styles.regionFrame}
                    style={{ left: `${regionLeft}%`, width: `${Math.max(0, regionRight - regionLeft)}%` }}
                  />
                  <div
                    className={`${styles.fadeHandle} ${fadeFocus === 'in' ? styles.fadeHandleOn : ''}`}
                    data-fade="in"
                    data-fade-role="length"
                    style={fadeHandleStyle('in')}
                    aria-label="Fade in"
                  >
                    <FadeArcIcon side="in" />
                  </div>
                  <div
                    className={`${styles.fadeHandle} ${fadeFocus === 'out' ? styles.fadeHandleOn : ''}`}
                    data-fade="out"
                    data-fade-role="length"
                    style={fadeHandleStyle('out')}
                    aria-label="Fade out"
                  >
                    <FadeArcIcon side="out" />
                  </div>
                  {(['in', 'out'] as const).map((side) => {
                    const style = fadeShapeStyle(side)
                    if (!style) return null
                    return (
                      <div
                        key={side}
                        className={`${styles.fadeShape} ${fadeFocus === side ? styles.fadeShapeOn : ''}`}
                        data-fade={side}
                        data-fade-role="shape"
                        style={style}
                        aria-label={side === 'in' ? 'Fade in shape' : 'Fade out shape'}
                      />
                    )
                  })}
                  {!panning && startPct >= 0 && startPct <= 100 ? (
                    <button
                      type="button"
                      className={styles.handle}
                      data-edge="start"
                      style={{ left: `${startPct}%` }}
                      aria-label="Region start"
                    />
                  ) : null}
                  {!panning && endPct >= 0 && endPct <= 100 ? (
                    <button
                      type="button"
                      className={styles.handle}
                      data-edge="end"
                      style={{ left: `${endPct}%` }}
                      aria-label="Region end"
                    />
                  ) : null}
                  <div ref={playheadRef} className={styles.playhead} />
                </>
              ) : (
                <div className={styles.empty}>
                  <span>Load a sample to begin</span>
                  <button type="button" className={styles.demo} onClick={onLoadDemo}>
                    Load demo tone
                  </button>
                </div>
              )}
            </div>
            <div className={styles.ruler}>
              {loaded
                ? ticks.map((mark) => (
                    <span key={mark.t} className={styles.tick} style={{ left: `${mark.frac * 100}%` }}>
                      {mark.label}
                    </span>
                  ))
                : (
                    <span>—</span>
                  )}
            </div>
          </div>
          {loaded && duration > 0 ? (
            <Overview
              duration={duration}
              start={start}
              end={end}
              view={view}
              contentRev={contentRev}
              onScrub={setView}
            />
          ) : null}
        </div>
        {viz === 'split' && showWave && showSpec ? (
          <button
            type="button"
            className={styles.splitHandle}
            aria-label="Resize waveform and FFT"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              splitDrag.current = { y: event.clientY, share: waveShareRef.current }
            }}
            onPointerMove={(event) => {
              const drag = splitDrag.current
              if (!drag) return
              const stage = event.currentTarget.parentElement
              if (!stage) return
              const h = stage.getBoundingClientRect().height
              if (h < 80) return
              const next = Math.min(0.82, Math.max(0.28, drag.share + (event.clientY - drag.y) / h))
              waveShareRef.current = next
              setWaveShare(next)
            }}
            onPointerUp={() => {
              if (!splitDrag.current) return
              splitDrag.current = null
              try {
                localStorage.setItem(SPLIT_PREF, String(waveShareRef.current))
              } catch {
                /* private mode */
              }
            }}
          />
        ) : null}
        {showSpec ? (
          <div
            className={`${styles.spec} ${viz === 'spectrum' ? styles.specSolo : ''}`}
            style={viz === 'split' ? { flex: 1 - waveShare } : undefined}
          >
            <Spectrum active={showSpec} />
          </div>
        ) : null}
      </div>
      {loaded && duration > 0 && !showWave ? (
        <Overview
          duration={duration}
          start={start}
          end={end}
          view={view}
          contentRev={contentRev}
          onScrub={setView}
        />
      ) : null}
    </div>
  )
})

function FadeArcIcon({ side }: { side: 'in' | 'out' }) {
  const d = side === 'in' ? 'M2 11 Q5 11 10 3' : 'M2 3 Q7 3 10 11'
  return (
    <svg className={styles.fadeIcon} viewBox="0 0 12 12" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--bg-app)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
