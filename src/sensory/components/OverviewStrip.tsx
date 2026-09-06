import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isDocumentHidden } from '../../app/frameBudget'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine, useEngine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './OverviewStrip.module.css'

type Props = {
  duration: number
  loaded: boolean
  contentRev: number
}

export function OverviewStrip({ duration, loaded, contentRev }: Props) {
  const snap = useEngine()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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
      const source = engine.getSourceBuffer() ?? engine.getBuffer()
      const working = engine.getBuffer()
      const prep = engine.getPrep()
      const colors = readThemeColors()
      const sourceDur = source?.duration || duration
      if (!source || sourceDur <= 0) return
      const data = source.getChannelData(0)
      const mips = engine.getSourceMips()[0] ?? []
      const peaks = mips.length
        ? computeMinMaxCached(data, mips, 0, data.length, width)
        : computeMinMax(data, 0, data.length, width)
      const mid = height / 2
      const half = height * 0.42
      ctx.fillStyle = colorWithAlpha(colors.waveform, 0.55)
      for (let x = 0; x < width; x++) {
        const hi = peaks.max[x] ?? 0
        const lo = peaks.min[x] ?? 0
        ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half))
      }
      const trimmed = Boolean(source && working && source !== working)
      const windowStart = trimmed ? prep.windowStart : 0
      const sel0 = ((windowStart + snap.params.start) / sourceDur) * width
      const sel1 = ((windowStart + snap.params.end) / sourceDur) * width
      if (sel1 - sel0 < width - 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(0, 0, sel0, height)
        ctx.fillRect(sel1, 0, width - sel1, height)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [duration, loaded, contentRev, snap.params.start, snap.params.end])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (!isDocumentHidden()) {
        const el = playheadRef.current
        const source = engine.getSourceBuffer() ?? engine.getBuffer()
        const working = engine.getBuffer()
        const sourceDur = source?.duration || duration
        if (el && sourceDur > 0) {
          const prep = engine.getPrep()
          const trimmed = Boolean(source && working && source !== working)
          const windowStart = trimmed ? prep.windowStart : 0
          const now = engine.getPlayheadSeconds() + windowStart
          el.style.left = `${(now / sourceDur) * 100}%`
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  const onPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0) return
    const source = engine.getSourceBuffer() ?? engine.getBuffer()
    const working = engine.getBuffer()
    const sourceDur = source?.duration || duration
    const workDur = working?.duration || duration
    const prep = engine.getPrep()
    const trimmed = Boolean(source && working && source !== working)
    const windowStart = trimmed ? prep.windowStart : 0
    const rect = event.currentTarget.getBoundingClientRect()
    const srcT = ((event.clientX - rect.left) / Math.max(1, rect.width)) * sourceDur
    const local = Math.min(workDur, Math.max(0, srcT - windowStart))
    engine.seekSeconds(local)
  }

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      aria-label="Sample overview"
      onPointerDown={onPointer}
    >
      <canvas ref={canvasRef} className={styles.strip} />
      <div ref={playheadRef} className={styles.playhead} aria-hidden="true" />
    </div>
  )
}
