import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './OverviewStrip.module.css'

type Props = {
  duration: number
  loaded: boolean
  contentRev: number
}

export function OverviewStrip({ duration, loaded, contentRev }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let peaks: { min: Float32Array; max: Float32Array } | null = null
    let peakKey = ''
    const unsub = subscribeThemeChange(() => {
      peakKey = ''
    })
    const tick = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        peakKey = ''
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(tick)
        return
      }
      ctx.clearRect(0, 0, width, height)
      const buffer = engine.getBuffer()
      const colors = readThemeColors()
      if (buffer && duration > 0) {
        const data = buffer.getChannelData(0)
        const key = `${contentRev}:${width}`
        if (!peaks || peakKey !== key) {
          const mips = engine.getSourceMips()[0] ?? []
          peaks = mips.length
            ? computeMinMaxCached(data, mips, 0, data.length, width)
            : computeMinMax(data, 0, data.length, width)
          peakKey = key
        }
        const mid = height / 2
        const half = height * 0.42
        ctx.fillStyle = colorWithAlpha(colors.waveform, 0.55)
        for (let x = 0; x < width; x++) {
          const hi = peaks.max[x] ?? 0
          const lo = peaks.min[x] ?? 0
          ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half))
        }
        const now = engine.getPlayheadSeconds()
        const px = duration > 0 ? (now / duration) * width : 0
        ctx.fillStyle = colors.playhead
        ctx.fillRect(px, 0, Math.max(1, dpr), height)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [duration, loaded, contentRev])

  const onPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!loaded || duration <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const t = ((event.clientX - rect.left) / Math.max(1, rect.width)) * duration
    engine.seekSeconds(t)
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.strip}
      aria-label="Sample overview"
      onPointerDown={onPointer}
    />
  )
}
