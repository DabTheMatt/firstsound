import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatTimecode, timecodeDigits } from '../../audio/engine/formatTime'
import { computeMinMax, computeMinMaxCached, samplesPerPixel } from '../../audio/engine/peaks'
import { fadeGain, findZeroCrossing } from '../../audio/samplePrep'
import { engine, useEngine } from '../../hooks/useEngine'
import { Overview } from './Overview'
import {
  clampView,
  fitView,
  fracToTime,
  panView,
  timeToFrac,
  verticalGain,
  type View,
  zoomAround,
  zoomToSelection,
} from './viewport'
import styles from './Waveform.module.css'

type Props = {
  duration: number
  start: number
  end: number
  loaded: boolean
  editMode: boolean
  onLoadDemo: () => void
  onEnterEdit: () => void
}

type DragMode = 'start' | 'end' | 'move' | 'pan' | 'select' | 'fadeIn' | 'fadeOut' | null
type Tool = 'select' | 'pan' | 'fade'

const HANDLE_PX = 22
const TOUCH_HANDLE_PX = 44

export function Waveform({ duration, start, end, loaded, editMode, onLoadDemo, onEnterEdit }: Props) {
  const snap = useEngine()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const fadeCanvasRef = useRef<HTMLCanvasElement>(null)

  const sourceDuration = editMode ? snap.sourceDuration || duration : duration
  const selStart = editMode ? snap.prep.selectionStart : start
  const selEnd = editMode ? snap.prep.selectionEnd : end
  const windowStart = editMode ? snap.prep.windowStart : 0
  const windowEnd = editMode ? snap.prep.windowEnd || sourceDuration : sourceDuration
  const viewLimit = Math.max(windowEnd - windowStart, 0.002)

  const [view, setViewState] = useState<View>(() =>
    clampView({ start: windowStart, end: windowEnd }, sourceDuration || 1, Math.min(0.002, viewLimit)),
  )
  const [normalizeView, setNormalizeView] = useState(false)
  const [tool, setTool] = useState<Tool>('select')
  const loupeRef = useRef<HTMLDivElement>(null)
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null)
  const loupeLabelRef = useRef<HTMLSpanElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const startHandleRef = useRef<HTMLButtonElement>(null)
  const endHandleRef = useRef<HTMLButtonElement>(null)
  const holdTimer = useRef(0)
  const viewRef = useRef(view)
  const windowKey = `${windowStart.toFixed(4)}:${windowEnd.toFixed(4)}`
  const stateRef = useRef({
    selStart,
    selEnd,
    duration: sourceDuration,
    normalizeView,
    editMode,
    tool,
    windowStart,
    windowEnd,
  })

  const setView = useCallback(
    (next: View) => {
      const spanMin = Math.min(0.002, Math.max(0.002, windowEnd - windowStart))
      const clamped = clampView(next, sourceDuration, spanMin)
      viewRef.current = clamped
      setViewState(clamped)
    },
    [sourceDuration, windowStart, windowEnd],
  )

  const layoutOverlay = (startSec: number, endSec: number) => {
    const startPct = timeToFrac(startSec, viewRef.current) * 100
    const endPct = timeToFrac(endSec, viewRef.current) * 100
    const left = Math.max(0, Math.min(100, startPct))
    const right = Math.max(0, Math.min(100, endPct))
    if (regionRef.current) {
      regionRef.current.style.left = `${left}%`
      regionRef.current.style.width = `${Math.max(0, right - left)}%`
    }
    if (startHandleRef.current) {
      startHandleRef.current.style.left = `${startPct}%`
      startHandleRef.current.style.display = startPct >= 0 && startPct <= 100 ? '' : 'none'
    }
    if (endHandleRef.current) {
      endHandleRef.current.style.left = `${endPct}%`
      endHandleRef.current.style.display = endPct >= 0 && endPct <= 100 ? '' : 'none'
    }
  }

  const hideLoupe = () => {
    const el = loupeRef.current
    if (el) {
      el.style.visibility = 'hidden'
      el.style.opacity = '0'
    }
  }

  const showLoupe = (x: number, t: number) => {
    const el = loupeRef.current
    const label = loupeLabelRef.current
    const canvas = loupeCanvasRef.current
    if (!el) return
    el.style.visibility = 'visible'
    el.style.opacity = '1'
    el.style.left = `clamp(90px, ${x}px, calc(100% - 90px))`
    if (label) {
      label.textContent = formatTimecode(t, timecodeDigits(viewRef.current.end - viewRef.current.start))
    }
    if (!canvas || sourceDuration <= 0) return
    const mono = engine.getSourceMono() ?? engine.getMono()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.floor(160 * dpr)
    const height = Math.floor(48 * dpr)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx || !mono) return
    ctx.fillStyle = '#111313'
    ctx.fillRect(0, 0, width, height)
    const windowSec = 0.06
    const sr = mono.length / sourceDuration
    const center = Math.floor(t * sr)
    const half = Math.floor((windowSec * sr) / 2)
    const from = Math.max(0, center - half)
    const to = Math.min(mono.length, center + half)
    ctx.strokeStyle = '#9aa0a3'
    ctx.lineWidth = dpr
    ctx.beginPath()
    const mid = height / 2
    const amp = height * 0.4
    for (let px = 0; px < width; px++) {
      const idx = from + Math.floor((px / width) * Math.max(1, to - from))
      const y = mid - (mono[idx] ?? 0) * amp
      if (px === 0) ctx.moveTo(px, y)
      else ctx.lineTo(px, y)
    }
    ctx.stroke()
    ctx.strokeStyle = '#e8e8e8'
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
  }

  useEffect(() => {
    stateRef.current = {
      selStart,
      selEnd,
      duration: sourceDuration,
      normalizeView,
      editMode,
      tool,
      windowStart,
      windowEnd,
    }
  }, [selStart, selEnd, sourceDuration, normalizeView, editMode, tool, windowStart, windowEnd])

  useEffect(() => {
    if (!editMode) return
    const fitted = clampView({ start: windowStart, end: windowEnd }, sourceDuration || 1)
    viewRef.current = fitted
    setViewState(fitted)
  }, [windowKey, windowStart, windowEnd, sourceDuration, editMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const channels = editMode ? engine.getSourceChannels() : []
      if (!editMode) {
        const mono = engine.getMono()
        if (mono) channels.push(mono)
      }
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
      if (!channels.length || sourceDuration <= 0) return
      const sampleCount = channels[0]?.length ?? 0
      const samplesPerSec = sampleCount / sourceDuration
      const s = Math.floor(view.start * samplesPerSec)
      const e = Math.max(s + 1, Math.floor(view.end * samplesPerSec))
      const lanes = editMode && channels.length >= 2 ? 2 : 1
      const laneH = height / lanes
      const spp = samplesPerPixel(s, e, width)
      const mips = editMode ? engine.getSourceMips() : []
      let peak = 0
      const envelopes = channels.slice(0, lanes).map((ch, idx) => {
        const cached = mips[idx]
        const mm = cached?.length
          ? computeMinMaxCached(ch, cached, s, e, width)
          : computeMinMax(ch, s, e, width)
        peak = Math.max(peak, mm.peak)
        return mm
      })
      const gain = normalizeView ? verticalGain(peak) : 1
      envelopes.forEach((mm, lane) => {
        const mid = laneH * lane + laneH / 2
        const half = laneH * 0.42
        const ch = channels[lane]
        if (spp <= 3 && ch) {
          ctx.beginPath()
          ctx.strokeStyle = '#9aa0a3'
          ctx.lineWidth = Math.max(1, dpr * 0.7)
          for (let x = 0; x < width; x++) {
            const idx = s + (x / Math.max(1, width - 1)) * (e - s)
            const i0 = Math.floor(idx)
            const i1 = Math.min(ch.length - 1, i0 + 1)
            const t = idx - i0
            const v = ((ch[i0] ?? 0) * (1 - t) + (ch[i1] ?? 0) * t) * gain
            const y = mid - Math.max(-1, Math.min(1, v)) * half
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          if (spp <= 1.15) {
            ctx.fillStyle = '#c8cdcf'
            const iStart = Math.max(0, s)
            const iEnd = Math.min(ch.length - 1, e)
            for (let i = iStart; i <= iEnd; i++) {
              const x = ((i - s) / Math.max(1, e - s)) * width
              const y = mid - Math.max(-1, Math.min(1, (ch[i] ?? 0) * gain)) * half
              ctx.beginPath()
              ctx.arc(x, y, Math.max(1.4, dpr * 1.1), 0, Math.PI * 2)
              ctx.fill()
            }
          }
          return
        }
        ctx.fillStyle = '#9aa0a3'
        for (let x = 0; x < width; x++) {
          const hi = Math.max(-1, Math.min(1, (mm.max[x] ?? 0) * gain))
          const lo = Math.max(-1, Math.min(1, (mm.min[x] ?? 0) * gain))
          const top = mid - hi * half
          const bottom = mid - lo * half
          ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
        }
      })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [view, normalizeView, loaded, sourceDuration, editMode, snap.fileName, snap.prep.reverse])

  useEffect(() => {
    const canvas = fadeCanvasRef.current
    if (!canvas || !editMode) return
    const draw = () => {
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
      const prep = engine.getPrep()
      const left = timeToFrac(prep.selectionStart, viewRef.current)
      const right = timeToFrac(prep.selectionEnd, viewRef.current)
      const fadeInW = (prep.fadeInSec / Math.max(viewRef.current.end - viewRef.current.start, 0.0001)) * width
      const fadeOutW = (prep.fadeOutSec / Math.max(viewRef.current.end - viewRef.current.start, 0.0001)) * width
      const x0 = left * width
      const x1 = right * width
      if (prep.fadeInEnabled && fadeInW > 1) {
        ctx.beginPath()
        ctx.moveTo(x0, height)
        const n = Math.max(8, Math.floor(fadeInW))
        for (let i = 0; i <= n; i++) {
          const t = i / n
          ctx.lineTo(x0 + t * fadeInW, height - fadeGain(t, prep.fadeInCurve, prep.fadeInBend) * height * 0.92)
        }
        ctx.lineTo(x0 + fadeInW, height)
        ctx.closePath()
        ctx.fillStyle = 'rgba(94, 97, 68, 0.28)'
        ctx.fill()
      }
      if (prep.fadeOutEnabled && fadeOutW > 1) {
        ctx.beginPath()
        ctx.moveTo(x1, height)
        const n = Math.max(8, Math.floor(fadeOutW))
        for (let i = 0; i <= n; i++) {
          const t = i / n
          ctx.lineTo(x1 - t * fadeOutW, height - fadeGain(t, prep.fadeOutCurve, prep.fadeOutBend) * height * 0.92)
        }
        ctx.lineTo(x1 - fadeOutW, height)
        ctx.closePath()
        ctx.fillStyle = 'rgba(196, 92, 74, 0.18)'
        ctx.fill()
      }
      ctx.fillStyle = '#c4b49a'
      if (prep.fadeInEnabled) {
        ctx.beginPath()
        ctx.arc(x0 + fadeInW, height * 0.35, 4 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
      if (prep.fadeOutEnabled) {
        ctx.beginPath()
        ctx.arc(x1 - fadeOutW, height * 0.35, 4 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
      const channels = engine.getSourceChannels()
      const sr = engine.getSnapshot().sourceSampleRate
      const markZero = (seconds: number) => {
        const hit = findZeroCrossing(channels, sr, seconds)
        if (!hit || hit.far) return
        const x = timeToFrac(hit.seconds, viewRef.current) * width
        ctx.fillStyle = '#6a8f6a'
        ctx.fillRect(x - dpr, height * 0.08, dpr * 2, height * 0.84)
      }
      markZero(prep.selectionStart)
      markZero(prep.selectionEnd)
      const silence = engine.getSnapshot().silenceProposal
      if (silence) {
        ctx.fillStyle = 'rgba(106, 143, 106, 0.18)'
        const a = timeToFrac(silence.startSec, viewRef.current) * width
        const b = timeToFrac(silence.endSec, viewRef.current) * width
        ctx.fillRect(Math.min(a, b), 0, Math.abs(b - a), height)
      }
    }
    draw()
  }, [view, editMode, snap.prep, snap.silenceProposal])

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
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const onWheel = (event: WheelEvent) => {
      const { duration: d } = stateRef.current
      if (d <= 0) return
      event.preventDefault()
      const rect = overlay.getBoundingClientRect()
      const v = viewRef.current
      const zoom = event.ctrlKey || event.metaKey || event.altKey
      if (!zoom || event.shiftKey) {
        const span = v.end - v.start
        const delta = ((event.deltaX || event.deltaY) / rect.width) * span
        setView(panView(v, delta, d))
        return
      }
      const focus = fracToTime((event.clientX - rect.left) / rect.width, v)
      setView(zoomAround(v, event.deltaY > 0 ? 1.2 : 1 / 1.2, focus, d))
    }
    overlay.addEventListener('wheel', onWheel, { passive: false })
    return () => overlay.removeEventListener('wheel', onWheel)
  }, [setView])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      }
      const { selStart: s, selEnd: e, duration: d, editMode: editing } = stateRef.current
      if (d <= 0) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) engine.redoPrep()
        else engine.undoPrep()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setView(fitView(d))
      } else if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault()
        setView(zoomToSelection(s, e, d))
      } else if (editing && (event.key === 'x' || event.key === 'X')) {
        event.preventDefault()
        engine.snapZero('start')
        engine.snapZero('end')
      } else if (editing && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault()
        engine.commitPrep({ reverse: !engine.getPrep().reverse })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView])

  const pointers = useRef(new Map<number, number>())
  const drag = useRef<{
    mode: DragMode
    span: number
    originT: number
    originX: number
    originView: View
    origin: { start: number; end: number }
    moved: boolean
    pointerType: string
  } | null>(null)
  const pinch = useRef<{ dist: number; view: View; focus: number } | null>(null)

  const hitPx = (pointerType: string) => (pointerType === 'touch' ? TOUCH_HANDLE_PX : HANDLE_PX)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || sourceDuration <= 0) return
    const overlay = overlayRef.current
    if (!overlay) return
    event.preventDefault()
    overlay.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, event.clientX)

    if (pointers.current.size === 2) {
      drag.current = null
      const xs = [...pointers.current.values()]
      const rect = overlay.getBoundingClientRect()
      const midFrac = ((xs[0]! + xs[1]!) / 2 - rect.left) / rect.width
      pinch.current = {
        dist: Math.max(1, Math.abs(xs[0]! - xs[1]!)),
        view: viewRef.current,
        focus: fracToTime(midFrac, viewRef.current),
      }
      return
    }

    const rect = overlay.getBoundingClientRect()
    const width = rect.width
    const x = event.clientX - rect.left
    const startX = timeToFrac(selStart, viewRef.current) * width
    const endX = timeToFrac(selEnd, viewRef.current) * width
    const t = fracToTime(x / width, viewRef.current)
    const px = hitPx(event.pointerType)
    const prep = engine.getPrep()
    const fadeInX = timeToFrac(selStart + prep.fadeInSec, viewRef.current) * width
    const fadeOutX = timeToFrac(selEnd - prep.fadeOutSec, viewRef.current) * width

    let mode: DragMode = tool === 'pan' ? 'pan' : 'move'
    if (editMode && tool === 'fade') {
      mode = Math.abs(x - fadeInX) < Math.abs(x - fadeOutX) ? 'fadeIn' : 'fadeOut'
    } else if (Math.abs(x - startX) < px) mode = 'start'
    else if (Math.abs(x - endX) < px) mode = 'end'
    else if (editMode && prep.fadeInEnabled && Math.abs(x - fadeInX) < px) mode = 'fadeIn'
    else if (editMode && prep.fadeOutEnabled && Math.abs(x - fadeOutX) < px) mode = 'fadeOut'
    else if (tool === 'pan') mode = 'pan'
    else if (x < startX || x > endX) {
      if (editMode && tool === 'select') mode = 'select'
      else if (!editMode) {
        engine.setParam('start', t)
        mode = 'start'
      } else mode = 'pan'
    }

    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    if (editMode && event.pointerType === 'touch' && mode === 'move') {
      holdTimer.current = window.setTimeout(() => {
        if (!drag.current) return
        drag.current.mode = 'select'
        drag.current.originT = fracToTime(
          ((drag.current.originX - (overlayRef.current?.getBoundingClientRect().left ?? 0)) /
            Math.max(1, overlayRef.current?.getBoundingClientRect().width ?? 1)),
          viewRef.current,
        )
      }, 420)
    }

    if (editMode && mode !== 'pan') engine.beginPrepGesture()
    drag.current = {
      mode,
      span: selEnd - selStart,
      originT: t,
      originX: event.clientX,
      originView: viewRef.current,
      origin: { start: selStart, end: selEnd },
      moved: false,
      pointerType: event.pointerType,
    }
    if (editMode) {
      showLoupe(x, t)
    }
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
      const dist = Math.max(1, Math.abs(xs[0]! - xs[1]!))
      const factor = pinch.current.dist / dist
      setView(zoomAround(pinch.current.view, factor, pinch.current.focus, sourceDuration))
      return
    }
    if (!drag.current) return
    const next = fracToTime((event.clientX - rect.left) / rect.width, viewRef.current)
    const { mode, span, originT, origin, originX, originView } = drag.current
    if (Math.abs(next - originT) > 0.0002) {
      drag.current.moved = true
      if (holdTimer.current) {
        window.clearTimeout(holdTimer.current)
        holdTimer.current = 0
      }
    }
    if (editMode) showLoupe(event.clientX - rect.left, next)
    if (mode === 'pan') {
      const spanView = originView.end - originView.start
      const delta = ((originX - event.clientX) / rect.width) * spanView
      setView(panView(originView, delta, sourceDuration))
      return
    }
    if (editMode) {
      const prep = engine.getPrep()
      const fadeEmit = mode === 'fadeIn' || mode === 'fadeOut'
      if (mode === 'start') engine.setPrepLive({ selectionStart: next })
      else if (mode === 'end') engine.setPrepLive({ selectionEnd: next })
      else if (mode === 'select') {
        const a = Math.min(originT, next)
        const b = Math.max(originT, next)
        engine.setPrepLive({ selectionStart: a, selectionEnd: b })
      } else if (mode === 'fadeIn') {
        engine.setPrepLive({ fadeInSec: Math.max(0, next - prep.selectionStart), fadeAuto: false }, fadeEmit)
      } else if (mode === 'fadeOut') {
        engine.setPrepLive({ fadeOutSec: Math.max(0, prep.selectionEnd - next), fadeAuto: false }, fadeEmit)
      } else {
        const delta = next - originT
        const maxStart = Math.max(windowStart, Math.min(origin.start + delta, windowEnd - span))
        engine.setPrepLive({ selectionStart: maxStart, selectionEnd: maxStart + span })
      }
      const live = engine.getPrep()
      layoutOverlay(live.selectionStart, live.selectionEnd)
      return
    }
    if (mode === 'start') engine.setParam('start', next)
    else if (mode === 'end') engine.setParam('end', next)
    else {
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
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = 0
    }
    const pending = drag.current
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      if (pending && !pending.moved && loaded) {
        const overlay = overlayRef.current
        if (overlay) {
          const rect = overlay.getBoundingClientRect()
          const t = fracToTime((event.clientX - rect.left) / rect.width, viewRef.current)
          engine.seekSeconds(t, 'sample')
        }
      }
      if (editMode && pending) {
        engine.endPrepGesture()
        if (
          engine.getPrep().autoSnapZero &&
          (pending.mode === 'start' || pending.mode === 'end' || pending.mode === 'select')
        ) {
          if (pending.mode === 'start' || pending.mode === 'select') engine.snapZero('start')
          if (pending.mode === 'end' || pending.mode === 'select') engine.snapZero('end')
        }
      }
      drag.current = null
      hideLoupe()
    }
  }

  const onDoubleClick = () => {
    if (sourceDuration <= 0) return
    const full = selStart <= windowStart + 0.001 && selEnd >= windowEnd - 0.001
    setView(full ? fitView(sourceDuration) : zoomToSelection(selStart, selEnd, sourceDuration))
  }

  const pct = (t: number) => timeToFrac(t, view) * 100
  const startPct = pct(selStart)
  const endPct = pct(selEnd)
  const regionLeft = Math.max(0, Math.min(100, startPct))
  const regionRight = Math.max(0, Math.min(100, endPct))
  const digits = timecodeDigits(view.end - view.start)

  const ticks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((p) =>
      formatTimecode(view.start + (view.end - view.start) * p, digits),
    )
  }, [view, digits])

  const zoomBy = (factor: number) => {
    setView(zoomAround(viewRef.current, factor, (view.start + view.end) / 2, sourceDuration))
  }

  const fitSelection = () => {
    setView(zoomToSelection(selStart, selEnd, sourceDuration))
    setNormalizeView(true)
  }

  return (
    <div className={`${styles.editor} ${editMode ? styles.editorEdit : ''}`}>
      {loaded && sourceDuration > 0 ? (
        <div className={styles.toolbar}>
          {editMode ? (
            <>
              <button type="button" className={`${styles.tool} ${tool === 'select' ? styles.toolActive : ''}`} onClick={() => setTool('select')}>
                Select
              </button>
              <button type="button" className={`${styles.tool} ${tool === 'pan' ? styles.toolActive : ''}`} onClick={() => setTool('pan')}>
                Pan
              </button>
              <button type="button" className={`${styles.tool} ${tool === 'fade' ? styles.toolActive : ''}`} onClick={() => setTool('fade')}>
                Fade
              </button>
              <button type="button" className={styles.tool} onClick={() => engine.snapZero('start')}>
                Zero
              </button>
            </>
          ) : (
            <button type="button" className={styles.tool} onClick={onEnterEdit}>
              Edit
            </button>
          )}
          <button type="button" className={styles.tool} onClick={() => setView(fitView(sourceDuration))}>
            Fit sample
          </button>
          <button type="button" className={styles.tool} onClick={() => setView(zoomToSelection(selStart, selEnd, sourceDuration))}>
            Zoom to selection
          </button>
          <button type="button" className={styles.tool} onClick={fitSelection}>
            Fit selection
          </button>
          <button
            type="button"
            className={`${styles.tool} ${normalizeView ? styles.toolActive : ''}`}
            aria-pressed={normalizeView}
            onClick={() => setNormalizeView((n) => !n)}
          >
            Normalize view
          </button>
          {snap.prep.reverse && editMode ? <span className={styles.badge}>Reversed</span> : null}
          <div className={styles.spacer} />
          <button type="button" className={styles.iconTool} aria-label="Zoom out" onClick={() => zoomBy(1.4)}>
            −
          </button>
          <button type="button" className={styles.iconTool} aria-label="Zoom in" onClick={() => zoomBy(1 / 1.4)}>
            +
          </button>
        </div>
      ) : null}

      {!editMode && loaded ? (
        <div className={styles.readoutStrip}>
          <span>
            Start <b>{formatTimecode(selStart)}</b>
          </span>
          <span>
            End <b>{formatTimecode(selEnd)}</b>
          </span>
          <span>
            Length <b>{formatTimecode(selEnd - selStart)}</b>
          </span>
        </div>
      ) : null}

      <div className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {editMode ? <canvas ref={fadeCanvasRef} className={styles.fadeCanvas} /> : null}
        <div
          ref={overlayRef}
          className={styles.overlay}
          onPointerDown={loaded ? onPointerDown : undefined}
          onPointerMove={loaded ? onPointerMove : undefined}
          onPointerUp={loaded ? endPointer : undefined}
          onPointerCancel={loaded ? endPointer : undefined}
          onDoubleClick={loaded ? onDoubleClick : undefined}
        >
          {loaded && sourceDuration > 0 ? (
            <>
              <div
                ref={regionRef}
                className={styles.region}
                style={{ left: `${regionLeft}%`, width: `${Math.max(0, regionRight - regionLeft)}%` }}
              />
              <button
                ref={startHandleRef}
                type="button"
                className={`${styles.handle} ${editMode ? styles.handleEdit : ''}`}
                style={{ left: `${startPct}%`, display: startPct >= 0 && startPct <= 100 ? undefined : 'none' }}
                aria-label="Region start"
              />
              <button
                ref={endHandleRef}
                type="button"
                className={`${styles.handle} ${editMode ? styles.handleEdit : ''} ${styles.handleEnd}`}
                style={{ left: `${endPct}%`, display: endPct >= 0 && endPct <= 100 ? undefined : 'none' }}
                aria-label="Region end"
              />
              <div ref={playheadRef} className={styles.playhead} />
              <div ref={loupeRef} className={styles.loupe}>
                <canvas ref={loupeCanvasRef} className={styles.loupeWave} />
                <span ref={loupeLabelRef} />
              </div>
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
          {ticks.map((label, index) => (
            <span key={index}>{loaded ? label : '—'}</span>
          ))}
        </div>
      </div>

      {loaded && sourceDuration > 0 ? (
        <Overview
          duration={sourceDuration}
          start={selStart}
          end={selEnd}
          view={view}
          onScrub={setView}
          silence={snap.silenceProposal}
        />
      ) : null}
    </div>
  )
}
