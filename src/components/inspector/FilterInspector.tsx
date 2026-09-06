import { useEffect, useRef } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { logFreqAxis } from '../../audio/engine/eqResponse'
import {
  FILTER_CHARACTER_OPTIONS,
  FILTER_SLOPE_OPTIONS,
  FILTER_TYPE_OPTIONS,
  filterCharacterAt,
  filterSlopeAt,
  filterTypeAt,
  optionIndex,
} from '../../audio/fx/filter'
import { FILTER_PRESETS } from '../../audio/fx/filterPresets'
import { filterResponseCurve } from '../../audio/fx/filterResponse'
import { FILTER_KNOBS, PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { wheelToNormalized } from '../controls/scrub'
import { useFxLfoConnect } from './FxLfoConnect'
import { FxLfoSection } from './FxLfoSection'
import styles from './FilterInspector.module.css'

type Props = {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  pane: 'main' | 'advanced'
}

export function FilterInspector({ snap, variant, pane }: Props) {
  const live = snap.liveParams
  const kind = filterTypeAt(snap.params.filterKind)
  return (
    <div className={styles.root}>
      {pane === 'main' ? (
        <>
          <p className={styles.lead}>Creative filter — sweeps, resonance, and motion. EQ stays for correction.</p>
          <FilterResponse snap={snap} />
          <FilterXyPad
            cutoff={snap.params.filterCutoff}
            reso={snap.params.filterReso}
            liveCutoff={live.filterCutoff}
            liveReso={live.filterReso}
          />
          <div className={variant === 'knob' ? styles.knobs : undefined}>
            {FILTER_KNOBS.map((id) => (
              <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
            ))}
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles.ghost} onClick={() => engine.randomizeFilter()}>
              Randomize
            </button>
            <button type="button" className={styles.ghost} onClick={() => engine.resetFilter()}>
              Reset
            </button>
          </div>
          <div className={styles.presets} role="list">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.preset}
                onClick={() => engine.applyFilterPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Segmented
            label="Filter type"
            value={kind}
            options={FILTER_TYPE_OPTIONS}
            wrap
            onChange={(value) => engine.setParam('filterKind', optionIndex(FILTER_TYPE_OPTIONS, value))}
          />
          {kind === 'morph' ? (
            <ParamControl id="filterMorph" value={snap.params.filterMorph} variant={variant} />
          ) : null}
          <Segmented
            label="Slope"
            value={String(filterSlopeAt(snap.params.filterSlope))}
            options={FILTER_SLOPE_OPTIONS.map((s) => ({ value: String(s.value), label: `${s.label} dB` }))}
            wrap
            onChange={(value) =>
              engine.setParam(
                'filterSlope',
                optionIndex(FILTER_SLOPE_OPTIONS, Number(value) as (typeof FILTER_SLOPE_OPTIONS)[number]['value']),
              )
            }
          />
          <Segmented
            label="Character"
            value={filterCharacterAt(snap.params.filterCharacter)}
            options={FILTER_CHARACTER_OPTIONS}
            wrap
            onChange={(value) => engine.setParam('filterCharacter', optionIndex(FILTER_CHARACTER_OPTIONS, value))}
          />
          <FilterFollowerPanel snap={snap} variant={variant} />
          <FxLfoSection snap={snap} kind="filter" variant={variant} />
        </>
      ) : (
        <>
          <h3 className={styles.section}>Filter envelope</h3>
          <p className={styles.help}>Triggered when the sample starts. Amount is bipolar.</p>
          <div className={variant === 'knob' ? styles.knobs : undefined}>
            {(['filterAdsAmt', 'filterAdsAttack', 'filterAdsDecay', 'filterAdsSustain', 'filterAdsRelease'] as ParamId[]).map(
              (id) => (
                <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
              ),
            )}
          </div>
          <h3 className={styles.section}>Pitch tracking</h3>
          <ParamControl id="filterPitchTrack" value={snap.params.filterPitchTrack} variant={variant} />
          <FxLfoSection snap={snap} kind="filter" variant={variant} />
        </>
      )}
    </div>
  )
}

function FilterFollowerPanel({ snap, variant }: { snap: EngineSnapshot; variant: 'knob' | 'slider' }) {
  const positive = snap.params.filterEnvDir > 0.5
  return (
    <div className={styles.mod}>
      <div className={styles.modHead}>
        <span>Envelope follower</span>
        <Toggle
          pressed={positive}
          label={positive ? 'Positive' : 'Negative'}
          onToggle={() => engine.setParam('filterEnvDir', positive ? 0 : 1)}
        />
      </div>
      <div className={variant === 'knob' ? styles.knobs : undefined}>
        <ParamControl id="filterEnvAmt" value={snap.params.filterEnvAmt} variant={variant} />
        <ParamControl id="filterEnvAttack" value={snap.params.filterEnvAttack} variant={variant} />
        <ParamControl id="filterEnvRelease" value={snap.params.filterEnvRelease} variant={variant} />
      </div>
    </div>
  )
}

function FilterXyPad({
  cutoff,
  reso,
  liveCutoff,
  liveReso,
}: {
  cutoff: number
  reso: number
  liveCutoff: number
  liveReso: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { armed } = useFxLfoConnect()
  const connecting = armed?.kind === 'filter'
  const cutoffDef = PARAMS.filterCutoff
  const resoDef = PARAMS.filterReso
  const x = toNormalized(cutoff, cutoffDef)
  const y = toNormalized(reso, resoDef)
  const lx = toNormalized(liveCutoff, cutoffDef)
  const ly = toNormalized(liveReso, resoDef)

  const apply = (nx: number, ny: number) => {
    engine.setParam('filterCutoff', fromNormalized(nx, cutoffDef))
    engine.setParam('filterReso', fromNormalized(ny, resoDef))
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
    <div className={styles.xyBlock}>
      <div
        ref={wrapRef}
        className={styles.xy}
        role="application"
        aria-label="Cutoff and resonance pad"
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
                engine.setParam('filterCutoff', cutoffDef.defaultValue)
                engine.setParam('filterReso', resoDef.defaultValue)
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
          apply(Math.min(1, Math.max(0, x + step)), y)
        }}
      >
        <span className={styles.ghostDot} style={{ left: `${lx * 100}%`, top: `${(1 - ly) * 100}%` }} />
        <span className={styles.dot} style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }} />
        {connecting ? null : (
          <>
            <span className={styles.xyHint}>Cutoff</span>
            <span className={styles.xyHintY}>Reso</span>
          </>
        )}
        <div className={`${styles.xyPickLayer} ${connecting ? styles.xyPickLayerActive : ''}`}>
          <div className={styles.xyPickX}>
            <LfoParamShell id="filterCutoff">
              <span className={styles.xyPickLabel}>Cutoff</span>
            </LfoParamShell>
          </div>
          <div className={styles.xyPickY}>
            <LfoParamShell id="filterReso">
              <span className={styles.xyPickLabel}>Reso</span>
            </LfoParamShell>
          </div>
        </div>
      </div>
      <div className={styles.readout}>
        <strong>{formatParamValue(liveCutoff, cutoffDef)}</strong>
        <span>{formatParamValue(liveReso, resoDef)}</span>
      </div>
    </div>
  )
}

function FilterResponse({ snap }: { snap: EngineSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(draw)
        return
      }
      const colors = readThemeColors()
      const live = engine.getSnapshot()
      const sr = live.sampleRate || 48000
      const freqs = logFreqAxis(96, 20, 20000)
      const curve = filterResponseCurve(live.liveParams, freqs, sr)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)
      ctx.beginPath()
      curve.forEach((db, i) => {
        const x = (i / (curve.length - 1)) * width
        const y = height * (1 - (db + 24) / 48)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = colorWithAlpha(colors.accent, 0.95)
      ctx.lineWidth = 1.6 * dpr
      ctx.stroke()
      const nx = toNormalized(live.liveParams.filterCutoff, PARAMS.filterCutoff)
      ctx.strokeStyle = colorWithAlpha(colors.accent, 0.35)
      ctx.beginPath()
      ctx.moveTo(nx * width, 0)
      ctx.lineTo(nx * width, height)
      ctx.stroke()
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const unsub = subscribeThemeChange(() => undefined)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [snap.sampleRate])
  return <canvas ref={canvasRef} className={styles.plot} aria-label="Filter frequency response" />
}
