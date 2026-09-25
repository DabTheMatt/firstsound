import { useEffect, useRef } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { byteToAudio, stereoCorrelation } from '../../audio/fx/midSide'
import { midSideFromPad, padFromMidSide } from '../../audio/fx/midSidePad'
import { isMidSideRecipeId, MIDSIDE_RECIPES } from '../../audio/fx/midSidePresets'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import { ParamControl } from '../controls/ParamControl'
import { PresetMenu } from '../controls/PresetMenu'
import { MODULE_PRESET_CATEGORIES, modulePresetsFor } from '../../audio/fx/modulePresets'
import { Toggle } from '../controls/Toggle'
import { wheelToNormalized } from '../controls/scrub'
import { isPrimaryPadPress, shouldApplyPadMove, xyFromClient } from './filterXyPad'
import { FxLfoSection } from './FxLfoSection'
import inspectorStyles from './Inspector.module.css'
import styles from './MidSideInspector.module.css'

type Props = {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  pane: 'main' | 'advanced'
}

const MIX_IDS: ParamId[] = ['msMidGain', 'msSideGain', 'msRotate', 'msCrossfeed']
const MID_EQ_IDS: ParamId[] = [
  'msMidLowGain',
  'msMidLowFreq',
  'msMidPeakGain',
  'msMidPeakFreq',
  'msMidPeakQ',
  'msMidHighGain',
  'msMidHighFreq',
]
const SIDE_EQ_IDS: ParamId[] = [
  'msSideLowGain',
  'msSideLowFreq',
  'msSidePeakGain',
  'msSidePeakFreq',
  'msSidePeakQ',
  'msSideHighGain',
  'msSideHighFreq',
]
const ADV_IDS: ParamId[] = ['msHaasTime', 'msHaasAmount', 'msMidTilt', 'msSideTilt']

export function MidSideInspector({ snap, variant, pane }: Props) {
  const live = snap.liveParams
  const knobs = variant === 'knob' ? inspectorStyles.knobs : undefined
  return (
    <div className={styles.root}>
      {pane === 'main' ? (
        <>
          <p className={styles.lead}>
            A listening stage: you sit at the bottom, speakers at the top. Width spreads the
            panorama left–right. Drag toward yourself for more Mid, away for more Side.
          </p>
          <StereoField snap={snap} />
          <PresetMenu
            label="Mid/Side presets"
            categories={['Presets', 'Recipes', ...MODULE_PRESET_CATEGORIES]}
            presets={[
              ...modulePresetsFor('midside').map((preset) => ({
                id: preset.id,
                name: preset.name,
                category: 'Presets',
                hint: preset.hint,
              })),
              ...MIDSIDE_RECIPES.map((recipe) => ({
                id: `recipe:${recipe.id}`,
                name: recipe.label,
                category: 'Recipes',
                hint: recipe.params.msSideHpf
                  ? `Center Below ${Math.round(recipe.params.msSideHpf)} Hz`
                  : 'Full-band side',
              })),
            ]}
            onApply={(id) => {
              if (id.startsWith('recipe:')) {
                const recipeId = id.slice('recipe:'.length)
                if (isMidSideRecipeId(recipeId)) engine.applyMidSideRecipe(recipeId)
                return
              }
              engine.applyModulePreset(id)
            }}
          />
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
          <h3 className={inspectorStyles.sub}>Center Below</h3>
          <CenterBelowStatus hz={snap.params.msSideHpf} />
          <div className={knobs}>
            <ParamControl id="msSideHpf" value={snap.params.msSideHpf} variant={variant} />
          </div>
          <h3 className={inspectorStyles.sub}>Mid EQ</h3>
          <p className={inspectorStyles.help}>Boost Mid Low to add bass presence in the center.</p>
          <div className={knobs}>{MID_EQ_IDS.map((id) => control(id, snap, variant))}</div>
          <h3 className={inspectorStyles.sub}>Side EQ</h3>
          <div className={knobs}>{SIDE_EQ_IDS.map((id) => control(id, snap, variant))}</div>
          <div className={inspectorStyles.row}>
            <button type="button" className={inspectorStyles.ghost} onClick={() => engine.randomizeMidSide()}>
              Randomize
            </button>
            <button type="button" className={inspectorStyles.ghost} onClick={() => engine.resetMidSide()}>
              Reset
            </button>
          </div>
          <div className={knobs}>{MIX_IDS.map((id) => control(id, snap, variant))}</div>
          <FxLfoSection snap={snap} kind="midside" variant={variant} />
          <p className={inspectorStyles.help}>
            Live Width {formatParamValue(live.msWidth, PARAMS.msWidth)} · Balance{' '}
            {formatParamValue(live.msBalance, PARAMS.msBalance)}
          </p>
        </>
      ) : (
        <>
          <h3 className={inspectorStyles.sub}>Micro Shift</h3>
          <p className={inspectorStyles.help}>Tiny L/R delay for width on short or mono samples. Watch correlation.</p>
          <div className={knobs}>
            {ADV_IDS.slice(0, 2).map((id) => control(id, snap, variant))}
          </div>
          <Toggle
            pressed={snap.params.msHaasDir > 0.5}
            label={snap.params.msHaasDir > 0.5 ? 'Delay R' : 'Delay L'}
            onToggle={() => engine.setParam('msHaasDir', snap.params.msHaasDir > 0.5 ? 0 : 1)}
          />
          <h3 className={inspectorStyles.sub}>Tilt</h3>
          <div className={knobs}>{ADV_IDS.slice(2).map((id) => control(id, snap, variant))}</div>
          <h3 className={inspectorStyles.sub}>Phase</h3>
          <div className={styles.phaseRow}>
            <button
              type="button"
              className={`${inspectorStyles.ghost} ${snap.params.msFlipMid > 0.5 ? inspectorStyles.ghostOn : ''}`}
              aria-pressed={snap.params.msFlipMid > 0.5}
              onClick={() => engine.setParam('msFlipMid', snap.params.msFlipMid > 0.5 ? 0 : 1)}
            >
              Ø Mid
            </button>
            <button
              type="button"
              className={`${inspectorStyles.ghost} ${snap.params.msFlipSide > 0.5 ? inspectorStyles.ghostOn : ''}`}
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

function CenterBelowStatus({ hz }: { hz: number }) {
  const on = hz >= 20
  return (
    <p className={on ? styles.centerOn : inspectorStyles.help} role="status">
      {on
        ? `On — side content below ${Math.round(hz)} Hz is removed and the lows stay in the center.`
        : 'Off — the side channel is full band. Bass on the sides is not filtered.'}
    </p>
  )
}

function control(id: ParamId, snap: EngineSnapshot, variant: 'knob' | 'slider') {
  return <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
}

function StereoField({ snap }: { snap: EngineSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const corrValueRef = useRef<HTMLSpanElement>(null)
  const corrNeedleRef = useRef<HTMLSpanElement>(null)
  const corrRowRef = useRef<HTMLDivElement>(null)
  const corrHintRef = useRef<HTMLSpanElement>(null)
  const { x, y } = padFromMidSide(snap.params.msWidth, snap.params.msBalance)
  const live = padFromMidSide(snap.liveParams.msWidth, snap.liveParams.msBalance)

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
      const live = engine.getSnapshot()
      const widthN = Math.min(1, Math.max(0, live.liveParams.msWidth / 200))
      const spread = 0.16 + widthN * 0.72
      const cx = w / 2
      const listenerY = h - 20
      const speakerY = 28
      const leftX = cx - spread * (w / 2)
      const rightX = cx + spread * (w / 2)
      ctx.strokeStyle = theme.borderSubtle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftX, speakerY)
      ctx.lineTo(cx, listenerY)
      ctx.lineTo(rightX, speakerY)
      ctx.stroke()
      const drawSpeaker = (x: number, label: string) => {
        ctx.fillStyle = colorWithAlpha(theme.accent, 0.85)
        ctx.beginPath()
        ctx.moveTo(x - 7, speakerY - 4)
        ctx.lineTo(x + 7, speakerY - 4)
        ctx.lineTo(x + 10, speakerY + 6)
        ctx.lineTo(x - 10, speakerY + 6)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = theme.textMuted
        ctx.font = '9px ui-sans-serif, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, x, speakerY - 6)
      }
      drawSpeaker(leftX, 'L')
      drawSpeaker(rightX, 'R')
      ctx.fillStyle = colorWithAlpha(theme.textPrimary, 0.9)
      ctx.beginPath()
      ctx.arc(cx, listenerY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = colorWithAlpha(theme.accent, 0.45)
      ctx.beginPath()
      ctx.arc(cx, listenerY, 9, Math.PI * 1.15, Math.PI * 1.85)
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
        const reach = listenerY - speakerY - 12
        for (let i = 0; i < fL.length; i += step) {
          const L = fL[i] ?? 0
          const R = fR[i] ?? 0
          const mag = Math.abs(L) + Math.abs(R) + 1e-6
          const pan = (R - L) / mag
          const energy = Math.min(1, Math.hypot(L, R))
          const px = cx + pan * spread * (w / 2) * 0.92
          const py = speakerY + 10 + (1 - energy) * reach
          ctx.fillRect(px, py, 1.5, 1.5)
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
    const next = midSideFromPad(nx, ny)
    engine.setParam('msWidth', next.msWidth)
    engine.setParam('msBalance', next.msBalance)
  }

  const pointFromEvent = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return
    const { x: nx, y: ny } = xyFromClient(el.getBoundingClientRect(), clientX, clientY)
    apply(nx, ny)
  }

  return (
    <div className={styles.scopeBlock}>
      <div
        ref={wrapRef}
        className={styles.scopeWrap}
        role="application"
        aria-label="Listening stage. Drag left and right to set width. Drag down toward the listener for more Mid, up for more Side."
        tabIndex={0}
        onPointerDown={(event) => {
          if (!isPrimaryPadPress(event)) return
          event.preventDefault()
          const target = event.currentTarget
          target.setPointerCapture(event.pointerId)
          const pointerId = event.pointerId
          const started = event.timeStamp
          const ox = event.clientX
          const oy = event.clientY
          let ended = false
          pointFromEvent(event.clientX, event.clientY)
          const move = (ev: PointerEvent) => {
            if (ended || ev.pointerId !== pointerId) return
            if (!shouldApplyPadMove(ev)) {
              up(ev)
              return
            }
            pointFromEvent(ev.clientX, ev.clientY)
          }
          const up = (ev: PointerEvent) => {
            if (ended || ev.pointerId !== pointerId) return
            ended = true
            try {
              target.releasePointerCapture(ev.pointerId)
            } catch {
              /* already released */
            }
            target.removeEventListener('pointermove', move)
            target.removeEventListener('pointerup', up)
            target.removeEventListener('pointercancel', up)
            target.removeEventListener('lostpointercapture', up)
            if (ev.type !== 'pointerup') return
            if (ev.timeStamp - started < 220 && Math.hypot(ev.clientX - ox, ev.clientY - oy) < 8) {
              const prev = target.dataset.lastTap
              if (prev && ev.timeStamp - Number(prev) < 400) {
                engine.setParam('msWidth', PARAMS.msWidth.defaultValue)
                engine.setParam('msBalance', PARAMS.msBalance.defaultValue)
                target.dataset.lastTap = ''
                return
              }
              target.dataset.lastTap = String(ev.timeStamp)
            }
          }
          target.addEventListener('pointermove', move)
          target.addEventListener('pointerup', up)
          target.addEventListener('pointercancel', up)
          target.addEventListener('lostpointercapture', up)
        }}
        onWheel={(event) => {
          event.preventDefault()
          const fine = event.shiftKey
          const delta = wheelToNormalized(event.deltaY, !fine)
          const step = fine ? delta * 0.25 : delta
          apply(Math.min(1, Math.max(0, x + step)), y)
        }}
      >
        <canvas ref={canvasRef} className={styles.scope} />
        <span className={styles.padGhost} style={{ left: `${live.x * 100}%`, top: `${(1 - live.y) * 100}%` }} />
        <span className={styles.padDot} style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }} />
        <span className={styles.hintX}>Near / Mid</span>
        <span className={styles.hintY}>Far / Side</span>
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
