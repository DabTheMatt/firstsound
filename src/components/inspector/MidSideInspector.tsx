import { useEffect, useRef } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { byteToAudio, stereoCorrelation } from '../../audio/fx/midSide'
import { MIDSIDE_RECIPES } from '../../audio/fx/midSidePresets'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import { ParamControl } from '../controls/ParamControl'
import { Toggle } from '../controls/Toggle'
import { wheelToNormalized } from '../controls/scrub'
import { FxLfoSection } from './FxLfoSection'
import styles from './MidSideInspector.module.css'

type Props = {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  pane: 'main' | 'advanced'
}

const MAIN_IDS: ParamId[] = [
  'msMidGain',
  'msSideGain',
  'msSideHpf',
  'msRotate',
  'msCrossfeed',
]

const ADV_IDS: ParamId[] = ['msHaasTime', 'msHaasAmount', 'msMidTilt', 'msSideTilt']

export function MidSideInspector({ snap, variant, pane }: Props) {
  const live = snap.liveParams
  return (
    <div className={styles.root}>
      {pane === 'main' ? (
        <>
          <p className={styles.lead}>
            Sculpt stereo space. Width and M/S Balance lead; drag the field to play them as an XY pad.
          </p>
          <StereoField snap={snap} />
          <div className={styles.monitor}>
            <Toggle
              pressed={snap.params.msSoloMid > 0.5}
              label="M Solo"
              onToggle={() => {
                const on = snap.params.msSoloMid <= 0.5
                engine.setParam('msSoloMid', on ? 1 : 0)
                if (on) engine.setParam('msSoloSide', 0)
              }}
            />
            <Toggle
              pressed={snap.params.msSoloSide > 0.5}
              label="S Solo"
              onToggle={() => {
                const on = snap.params.msSoloSide <= 0.5
                engine.setParam('msSoloSide', on ? 1 : 0)
                if (on) engine.setParam('msSoloMid', 0)
              }}
            />
            <Toggle
              pressed={snap.params.msMono > 0.5}
              label="Mono"
              onToggle={() => engine.setParam('msMono', snap.params.msMono > 0.5 ? 0 : 1)}
            />
          </div>
          <div className={styles.hero}>
            <ParamControl id="msWidth" value={snap.params.msWidth} variant={variant} />
            <ParamControl id="msBalance" value={snap.params.msBalance} variant={variant} />
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles.ghost} onClick={() => engine.randomizeMidSide()}>
              Randomize
            </button>
            <button type="button" className={styles.ghost} onClick={() => engine.resetMidSide()}>
              Reset
            </button>
          </div>
          <div className={styles.presets} role="list">
            {MIDSIDE_RECIPES.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className={styles.preset}
                onClick={() => engine.applyMidSideRecipe(recipe.id)}
              >
                {recipe.label}
              </button>
            ))}
          </div>
          <div className={variant === 'knob' ? styles.knobs : undefined}>
            {MAIN_IDS.map((id) => (
              <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
            ))}
          </div>
          <FxLfoSection snap={snap} kind="midside" variant={variant} />
          <p className={styles.help}>
            Live Width {formatParamValue(live.msWidth, PARAMS.msWidth)} · Balance{' '}
            {formatParamValue(live.msBalance, PARAMS.msBalance)}
          </p>
        </>
      ) : (
        <>
          <h3 className={styles.section}>Micro Shift</h3>
          <p className={styles.help}>Tiny L/R delay for width on short or mono samples. Watch correlation.</p>
          <div className={variant === 'knob' ? styles.knobs : undefined}>
            {ADV_IDS.slice(0, 2).map((id) => (
              <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
            ))}
          </div>
          <Toggle
            pressed={snap.params.msHaasDir > 0.5}
            label={snap.params.msHaasDir > 0.5 ? 'Delay R' : 'Delay L'}
            onToggle={() => engine.setParam('msHaasDir', snap.params.msHaasDir > 0.5 ? 0 : 1)}
          />
          <h3 className={styles.section}>Tilt</h3>
          <div className={variant === 'knob' ? styles.knobs : undefined}>
            {ADV_IDS.slice(2).map((id) => (
              <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
            ))}
          </div>
          <h3 className={styles.section}>Phase</h3>
          <div className={styles.phaseRow}>
            <button
              type="button"
              className={`${styles.phase} ${snap.params.msFlipMid > 0.5 ? styles.phaseOn : ''}`}
              aria-pressed={snap.params.msFlipMid > 0.5}
              onClick={() => engine.setParam('msFlipMid', snap.params.msFlipMid > 0.5 ? 0 : 1)}
            >
              Ø Mid
            </button>
            <button
              type="button"
              className={`${styles.phase} ${snap.params.msFlipSide > 0.5 ? styles.phaseOn : ''}`}
              aria-pressed={snap.params.msFlipSide > 0.5}
              onClick={() => engine.setParam('msFlipSide', snap.params.msFlipSide > 0.5 ? 0 : 1)}
            >
              Ø Side
            </button>
          </div>
          <FxLfoSection snap={snap} kind="midside" variant={variant} />
        </>
      )}
    </div>
  )
}

function StereoField({ snap }: { snap: EngineSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const corrValueRef = useRef<HTMLSpanElement>(null)
  const corrNeedleRef = useRef<HTMLSpanElement>(null)
  const corrRowRef = useRef<HTMLDivElement>(null)
  const corrHintRef = useRef<HTMLSpanElement>(null)
  const widthDef = PARAMS.msWidth
  const balDef = PARAMS.msBalance
  const x = toNormalized(snap.params.msBalance, balDef)
  const y = toNormalized(snap.params.msWidth, widthDef)
  const lx = toNormalized(snap.liveParams.msBalance, balDef)
  const ly = toNormalized(snap.liveParams.msWidth, widthDef)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const left = new Uint8Array(1024)
    const right = new Uint8Array(1024)
    const fL = new Float32Array(1024)
    const fR = new Float32Array(1024)
    let frame = 0
    const paint = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const theme = readThemeColors()
      ctx.fillStyle = colorWithAlpha(theme.bgApp, 0.22)
      ctx.fillRect(0, 0, w, h)
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.42
      ctx.strokeStyle = theme.borderSubtle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.moveTo(cx - r, cy)
      ctx.lineTo(cx + r, cy)
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx, cy + r)
      ctx.stroke()
      const has = engine.copyMidSideScope(left, right)
      if (has) {
        for (let i = 0; i < left.length; i++) {
          fL[i] = byteToAudio(left[i] ?? 128)
          fR[i] = byteToAudio(right[i] ?? 128)
        }
        const nextCorr = stereoCorrelation(fL, fR)
        if (corrValueRef.current) corrValueRef.current.textContent = `Corr ${nextCorr.toFixed(2)}`
        if (corrNeedleRef.current) corrNeedleRef.current.style.left = `${((nextCorr + 1) / 2) * 100}%`
        const phaseWarn = nextCorr < -0.08
        corrRowRef.current?.classList.toggle(styles.warn, phaseWarn)
        if (corrHintRef.current) corrHintRef.current.textContent = phaseWarn ? 'Phase risk in mono' : 'Correlation'
        ctx.fillStyle = colorWithAlpha(theme.accent, 0.55)
        const step = 4
        for (let i = 0; i < fL.length; i += step) {
          const L = fL[i] ?? 0
          const R = fR[i] ?? 0
          const px = cx + ((L - R) * r) / Math.SQRT2
          const py = cy - ((L + R) * r) / Math.SQRT2
          ctx.fillRect(px, py, 1.4, 1.4)
        }
      }
      frame = window.requestAnimationFrame(paint)
    }
    frame = window.requestAnimationFrame(paint)
    const unsub = subscribeThemeChange(() => undefined)
    return () => {
      window.cancelAnimationFrame(frame)
      unsub()
    }
  }, [])

  const apply = (nx: number, ny: number) => {
    engine.setParam('msBalance', fromNormalized(nx, balDef))
    engine.setParam('msWidth', fromNormalized(ny, widthDef))
  }

  const pointFromEvent = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const ny = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height))
    apply(nx, ny)
  }

  return (
    <div className={styles.scopeBlock}>
      <div
        ref={wrapRef}
        className={styles.scopeWrap}
        role="application"
        aria-label="Stereo field. X is M/S balance, Y is width."
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          const started = event.timeStamp
          const ox = event.clientX
          const oy = event.clientY
          pointFromEvent(event.clientX, event.clientY)
          const move = (ev: PointerEvent) => pointFromEvent(ev.clientX, ev.clientY)
          const up = (ev: PointerEvent) => {
            event.currentTarget.removeEventListener('pointermove', move)
            event.currentTarget.removeEventListener('pointerup', up)
            event.currentTarget.removeEventListener('pointercancel', up)
            if (ev.timeStamp - started < 220 && Math.hypot(ev.clientX - ox, ev.clientY - oy) < 8) {
              const prev = event.currentTarget.dataset.lastTap
              if (prev && ev.timeStamp - Number(prev) < 400) {
                engine.setParam('msWidth', widthDef.defaultValue)
                engine.setParam('msBalance', balDef.defaultValue)
                event.currentTarget.dataset.lastTap = ''
                return
              }
              event.currentTarget.dataset.lastTap = String(ev.timeStamp)
            }
          }
          event.currentTarget.addEventListener('pointermove', move)
          event.currentTarget.addEventListener('pointerup', up)
          event.currentTarget.addEventListener('pointercancel', up)
        }}
        onWheel={(event) => {
          event.preventDefault()
          const fine = event.shiftKey
          const delta = wheelToNormalized(event.deltaY, !fine)
          const step = fine ? delta * 0.25 : delta
          apply(x, Math.min(1, Math.max(0, y + step)))
        }}
      >
        <canvas ref={canvasRef} className={styles.scope} />
        <span className={styles.padGhost} style={{ left: `${lx * 100}%`, top: `${(1 - ly) * 100}%` }} />
        <span className={styles.padDot} style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }} />
        <span className={styles.hintX}>M/S</span>
        <span className={styles.hintY}>Width</span>
      </div>
      <div ref={corrRowRef} className={styles.corr}>
        <span>−1</span>
        <div className={styles.corrTrack} aria-hidden="true">
          <span ref={corrNeedleRef} className={styles.corrNeedle} style={{ left: '100%' }} />
        </div>
        <span>+1</span>
      </div>
      <div className={styles.readout}>
        <span ref={corrValueRef}>Corr 1.00</span>
        <span ref={corrHintRef}>Correlation</span>
      </div>
    </div>
  )
}
