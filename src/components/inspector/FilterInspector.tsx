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
import { paramsMatchDefaults } from '../../audio/fx/effectDefaults'
import { FILTER_PRESETS, type FilterPresetId } from '../../audio/fx/filterPresets'
import { modulePresetsFor } from '../../audio/fx/modulePresets'
import { PresetMenu } from '../controls/PresetMenu'
import { filterResponseCurve } from '../../audio/fx/filterResponse'
import { FILTER_KNOBS, PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ParamControl } from '../controls/ParamControl'
import { Toggle } from '../controls/Toggle'
import { useFxLfoConnect } from './FxLfoConnect'
import { FxLfoSection } from './FxLfoSection'
import { isPrimaryPadPress, shouldApplyPadMove, xyFromClient } from './filterXyPad'
import inspectorStyles from './Inspector.module.css'
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
          <PresetMenu
            label="Filter presets"
            categories={['Factory', 'Modules']}
            presets={[
              ...FILTER_PRESETS.map((preset) => ({
                id: preset.id,
                name: preset.label,
                category: 'Factory',
              })),
              ...modulePresetsFor('filter').map((preset) => ({
                id: `module:${preset.id}`,
                name: preset.name,
                category: 'Modules',
                hint: preset.hint,
              })),
            ]}
            matchesDefault={paramsMatchDefaults(snap.params, 'filter') && !snap.fxLfos.filter.some((slot) => slot.target)}
            onApply={(id) => {
              if (id.startsWith('module:')) {
                engine.applyModulePreset(id.slice('module:'.length))
                return
              }
              engine.applyFilterPreset(id as FilterPresetId)
            }}
            onDefault={() => engine.resetEffect('filter')}
          />
          <FilterResponse snap={snap} />
          <FilterXyPad
            cutoff={snap.params.filterCutoff}
            reso={snap.params.filterReso}
            liveCutoff={live.filterCutoff}
            liveReso={live.filterReso}
          />
          <div className={variant === 'knob' ? inspectorStyles.knobs : undefined}>
            {FILTER_KNOBS.map((id) => (
              <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
            ))}
          </div>
          <div className={inspectorStyles.row}>
            <button type="button" className={inspectorStyles.ghost} onClick={() => engine.randomizeFilter()}>
              Randomize
            </button>
            <button type="button" className={inspectorStyles.ghost} onClick={() => engine.resetFilter()}>
              Reset
            </button>
          </div>
          <label className={inspectorStyles.field}>
            Filter type
            <select
              className={`${inspectorStyles.select} ${inspectorStyles.selectOn}`}
              aria-label="Filter type"
              value={kind}
              onChange={(event) =>
                engine.setParam('filterKind', optionIndex(FILTER_TYPE_OPTIONS, event.target.value as (typeof FILTER_TYPE_OPTIONS)[number]['value']))
              }
            >
              {FILTER_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {kind === 'morph' ? (
            <ParamControl id="filterMorph" value={snap.params.filterMorph} variant={variant} />
          ) : null}
          <label className={inspectorStyles.field}>
            Slope
            <select
              className={`${inspectorStyles.select} ${inspectorStyles.selectOn}`}
              aria-label="Filter slope"
              value={String(filterSlopeAt(snap.params.filterSlope))}
              onChange={(event) =>
                engine.setParam(
                  'filterSlope',
                  optionIndex(FILTER_SLOPE_OPTIONS, Number(event.target.value) as (typeof FILTER_SLOPE_OPTIONS)[number]['value']),
                )
              }
            >
              {FILTER_SLOPE_OPTIONS.map((s) => (
                <option key={s.value} value={String(s.value)}>
                  {s.label} dB
                </option>
              ))}
            </select>
          </label>
          <label className={inspectorStyles.field}>
            Character
            <select
              className={`${inspectorStyles.select} ${inspectorStyles.selectOn}`}
              aria-label="Filter character"
              value={filterCharacterAt(snap.params.filterCharacter)}
              onChange={(event) =>
                engine.setParam('filterCharacter', optionIndex(FILTER_CHARACTER_OPTIONS, event.target.value as (typeof FILTER_CHARACTER_OPTIONS)[number]['value']))
              }
            >
              {FILTER_CHARACTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <FilterFollowerPanel snap={snap} variant={variant} />
          <FxLfoSection snap={snap} kind="filter" variant={variant} />
        </>
      ) : (
        <>
          <h3 className={inspectorStyles.sub}>Filter envelope</h3>
          <p className={inspectorStyles.help}>Triggered when the sample starts. Amount is bipolar.</p>
          <div className={variant === 'knob' ? inspectorStyles.knobs : undefined}>
            {(['filterAdsAmt', 'filterAdsAttack', 'filterAdsDecay', 'filterAdsSustain', 'filterAdsRelease'] as ParamId[]).map(
              (id) => (
                <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
              ),
            )}
          </div>
          <h3 className={inspectorStyles.sub}>Pitch tracking</h3>
          <ParamControl id="filterPitchTrack" value={snap.params.filterPitchTrack} variant={variant} />
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
          reserveLabel={positive ? 'Negative' : 'Positive'}
          onToggle={() => engine.setParam('filterEnvDir', positive ? 0 : 1)}
        />
      </div>
      <div className={variant === 'knob' ? inspectorStyles.knobs : undefined}>
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
    const { x: nx, y: ny } = xyFromClient(el.getBoundingClientRect(), clientX, clientY)
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
                engine.setParam('filterCutoff', cutoffDef.defaultValue)
                engine.setParam('filterReso', resoDef.defaultValue)
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
      const freqs = logFreqAxis(96, 20, 22000)
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
