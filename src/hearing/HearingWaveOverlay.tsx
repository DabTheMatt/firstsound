import { useEffect, useRef, useState } from 'react'
import { engine, useEngine } from '../hooks/useEngine'
import { getHearingReveal, subscribeHearingReveal, type HearingReveal } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { useHearingSettings } from './useHearingSettings'
import styles from './HearingAccessLayer.module.css'

type Props = {
  viewStart: number
  viewEnd: number
}

const SHAPE: Record<string, string> = {
  transient: '▲',
  silence: '▭',
  loud: '●',
  lowFrequency: '▬',
  tonal: '♩',
  possibleClick: '◆',
  possibleClip: '!',
}

/** Thin, non-interactive strip. Waveform editing keeps the pointer. */
export function HearingWaveOverlay({ viewStart, viewEnd }: Props) {
  const { settings } = useHearingSettings()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const paint = () => {
      const canvas = ref.current
      if (!canvas) return
      const show = settings.enabled && settings.showWaveSymbols && (settings.layers.dynamicsMap || settings.layers.events)
      canvas.hidden = !show
      if (!show) return
      const width = canvas.clientWidth || 300
      const height = 18
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const ink = getComputedStyle(canvas).color || '#fff'
      ctx.fillStyle = ink
      ctx.font = '9px sans-serif'
      const span = Math.max(0.0001, viewEnd - viewStart)
      const hearing = getHearingView()
      const analysis = hearing.analysis
      if (settings.layers.dynamicsMap && analysis) {
        analysis.dynamics.forEach((bucket) => {
          if (bucket.time < viewStart || bucket.time > viewEnd) return
          const x = ((bucket.time - viewStart) / span) * width
          const cell = width / Math.max(1, analysis.dynamics.length)
          ctx.globalAlpha = bucket.clip ? 0.95 : 0.4
          const level = bucket.peakDb === null ? 0 : Math.max(0, Math.min(1, (bucket.peakDb + 60) / 60))
          ctx.fillRect(x, height - 3 - level * 12, Math.max(1, cell), 2 + level * 10)
          if (bucket.clip) ctx.fillText('!', x, 8)
          else if (bucket.transient) ctx.fillText('▲', x, 8)
        })
      }
      if (settings.layers.events) {
        ctx.globalAlpha = 1
        for (const event of hearing.events) {
          if (event.time < viewStart || event.time > viewEnd) continue
          const x = ((event.time - viewStart) / span) * width
          ctx.fillText(SHAPE[event.kind] ?? '•', x, 9)
        }
      }
    }
    paint()
    return subscribeHearingView(paint)
  }, [viewStart, viewEnd, settings.enabled, settings.showWaveSymbols, settings.layers.dynamicsMap, settings.layers.events])

  if (!settings.enabled) return null

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'calc(22px + var(--wave-legend, 0px))',
          height: 18,
          width: '100%',
          pointerEvents: 'none',
          zIndex: 4,
          color: 'var(--text-primary)',
        }}
      />
    </>
  )
}

/** Names the waveform marks and turns the shared transient lines and the strip symbols on or off. */
export function HearingWaveLegend() {
  const { settings, patch } = useHearingSettings()
  const snap = useEngine()
  const toggleTransients = () => {
    engine.setShowTransients(!snap.showTransients, settings.transientSensitivity)
  }
  return (
    <div className={styles.waveLegend}>
      <span className={styles.waveLegendTransient}>transient</span>
      <span>▲ attack</span>
      <span>! clip</span>
      <span>bar = level</span>
      <span>▭ silence</span>
      <span>● loud</span>
      <span>♩ tone</span>
      <span>◆ click</span>
      <button type="button" aria-pressed={snap.showTransients} onClick={toggleTransients}>
        Transients
      </button>
      <button
        type="button"
        aria-pressed={settings.showWaveSymbols}
        onClick={() => patch({ showWaveSymbols: !settings.showWaveSymbols })}
      >
        Symbols
      </button>
    </div>
  )
}

/** Frames a Show span, or draws a line for a transient. Does not take pointer events. */
export function HearingRevealMark({ viewStart, viewEnd }: Props) {
  const [reveal, setReveal] = useState<HearingReveal | null>(() => getHearingReveal())
  useEffect(() => subscribeHearingReveal(() => setReveal(getHearingReveal())), [])
  if (!reveal) return null
  const span = Math.max(0.0001, viewEnd - viewStart)
  const left = ((reveal.start - viewStart) / span) * 100
  if (reveal.mark === 'line') {
    const labelOnLeft = left > 78
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 8,
          bottom: 28,
          left: `${left}%`,
          width: 1,
          background: 'var(--playhead)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 4,
            left: labelOnLeft ? 'auto' : 6,
            right: labelOnLeft ? 6 : 'auto',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
            background: 'var(--bg-panel)',
            padding: '1px 4px',
            whiteSpace: 'nowrap',
          }}
        >
          {reveal.label}
        </span>
      </div>
    )
  }
  const width = Math.max(0.8, ((reveal.end - reveal.start) / span) * 100)
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 8,
        bottom: 28,
        left: `${left}%`,
        width: `${width}%`,
        border: '1px solid var(--text-primary)',
        background: 'color-mix(in srgb, var(--text-primary) 12%, transparent)',
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          background: 'var(--bg-panel)',
          padding: '1px 4px',
        }}
      >
        {reveal.label}
      </span>
    </div>
  )
}
