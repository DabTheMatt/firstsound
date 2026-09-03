import { useEffect, useState } from 'react'
import { MODULE_LABELS, eqColorIndex, isFixedType, moduleLabel, type ModuleType } from '../../audio/chain/chain'
import { clampCombSpacing, defaultSpacingForMode } from '../../audio/engine/comb'
import { formatTimecode } from '../../audio/engine/formatTime'
import {
  bandUsesGain,
  bandUsesSlope,
  bandUsesWidth,
  bandwidthHz,
  EQ_FILTER_TYPES,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  FILTER_SLOPES,
  qFromBandwidth,
  type FilterSlope,
} from '../../audio/engine/eqBands'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { GRAIN_KNOBS, LIMITER_ADV_KNOBS, LIMITER_MAIN_KNOBS, MOTION_KNOBS, PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import { fadeBendFromQ, fadeQFromBend } from '../../audio/engine/fades'
import { parseTypedRange } from '../../audio/parameters/mapping'
import { fadeKnobMaxSec } from '../waveform/handleLayout'
import type { ParamId } from '../../audio/parameters/types'
import { EQ_BAND_LFO_IDS } from '../../audio/fx/lfo'
import { engine } from '../../hooks/useEngine'
import { LfoParamShell } from '../controls/LfoParamShell'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { ValueKnob } from '../controls/ValueKnob'
import type { EditState, InspectorFocus } from '../../app/editorState'
import { EqCurve } from './EqCurve'
import { InspectorEye } from './InspectorEye'
import { LimiterPlot } from './LimiterPlot'
import { SpaceInspector } from './SpaceInspector'
import { FxLfoSection } from './FxLfoSection'
import styles from './Inspector.module.css'

type Props = {
  snap: EngineSnapshot
  focus: InspectorFocus
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  onCommit?: () => void
  onTrim?: () => void
  sheet?: boolean
  knobs?: boolean
  compact?: boolean
  onHideInspector?: () => void
}

const GAIN_IDS: ParamId[] = ['gain', 'speed', 'pitch']
const GRAIN_MAIN_IDS: ParamId[] = GRAIN_KNOBS
const GRAIN_ADV_IDS: ParamId[] = MOTION_KNOBS.filter((id) => id !== 'position')
const PAN_IDS: ParamId[] = ['pan', 'channelGainL', 'channelGainR']
const SAT_IDS: ParamId[] = ['saturation']
const OUT_IDS: ParamId[] = ['outputGain']

const EQ_TYPE_OPTIONS = EQ_FILTER_TYPES.map((t) => ({
  value: t.value,
  label: t.short,
  title: t.label,
}))

export function Inspector({
  snap,
  focus,
  edit,
  onEdit,
  onFine,
  onCommit,
  onTrim,
  sheet,
  knobs = true,
  compact = false,
  onHideInspector,
}: Props) {
  const variant = knobs ? 'knob' : 'slider'
  return (
    <div className={`${styles.panel} ${sheet ? styles.sheet : ''} ${compact ? styles.compact : ''}`}>
      {focus.kind === 'tool' ? (
        <ToolInspector
          snap={snap}
          edit={edit}
          onEdit={onEdit}
          onFine={onFine}
          onCommit={onCommit}
          onTrim={onTrim}
          knobs={knobs}
          onHideInspector={onHideInspector}
        />
      ) : (
        <ModuleInspector
          snap={snap}
          type={focus.type}
          instanceId={focus.instanceId}
          variant={variant}
          paneHint={focus.pane}
          onHideInspector={onHideInspector}
        />
      )}
    </div>
  )
}

function ToolInspector({
  snap,
  edit,
  onEdit,
  onFine,
  onCommit,
  onTrim,
  knobs,
  onHideInspector,
}: {
  snap: EngineSnapshot
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  onCommit?: () => void
  onTrim?: () => void
  knobs: boolean
  onHideInspector?: () => void
}) {
  const length = Math.max(0, snap.params.end - snap.params.start)
  const fadeMaxSec = fadeKnobMaxSec(length)
  const maxMs = Math.round(fadeMaxSec * 1000)
  const shapeBend = edit.fadeFocus === 'out' ? edit.fadeOutBend : edit.fadeInBend
  const shapeQ = fadeQFromBend(shapeBend)
  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Edit</h2>
        {onHideInspector ? (
          <div className={styles.headActions}>
            <InspectorEye open onClick={onHideInspector} />
          </div>
        ) : null}
      </div>
      <Readout label="Start" value={formatTimecode(snap.params.start)} />
      <Readout label="End" value={formatTimecode(snap.params.end)} />
      <Readout label="Length" value={formatTimecode(length)} />
      <div className={styles.fine}>
        <button type="button" onClick={() => onFine('start', -0.001)}>
          −1 ms
        </button>
        <span>Start</span>
        <button type="button" onClick={() => onFine('start', 0.001)}>
          +1 ms
        </button>
      </div>
      <div className={styles.fine}>
        <button type="button" onClick={() => onFine('end', -0.001)}>
          −1 ms
        </button>
        <span>End</span>
        <button type="button" onClick={() => onFine('end', 0.001)}>
          +1 ms
        </button>
      </div>
      <Toggle
        pressed={edit.autoSnap}
        label="Zero crossing"
        onToggle={() => onEdit({ autoSnap: !edit.autoSnap })}
      />
      <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('start')}>
        Snap Start
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('end')}>
        Snap End
      </button>
      {snap.engineMode === 'grain' ? (
        <p className={styles.help}>
          Grain plays from the cursor, so region fades are easy to miss. Use Playback to hear
          fade-in and fade-out on the selection.
        </p>
      ) : null}
      {knobs ? (
        <div className={styles.knobs}>
          <ValueKnob
            label="Fade In"
            valueText={`${Math.round(edit.fadeIn * 1000)} ms`}
            normalized={Math.min(1, edit.fadeIn / fadeMaxSec)}
            min={0}
            max={maxMs}
            now={Math.round(edit.fadeIn * 1000)}
            onChange={(n) => onEdit({ fadeIn: n * fadeMaxSec, fadeAuto: false, fadeFocus: 'in' })}
            onReset={() => onEdit({ fadeIn: 0.01, fadeAuto: false, fadeFocus: 'in' })}
            onGestureEnd={onCommit}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 0, maxMs, 'ms')
              if (next == null) return false
              onEdit({ fadeIn: next / 1000, fadeAuto: false, fadeFocus: 'in' })
              return true
            }}
          />
          <ValueKnob
            label="Fade Out"
            valueText={`${Math.round(edit.fadeOut * 1000)} ms`}
            normalized={Math.min(1, edit.fadeOut / fadeMaxSec)}
            min={0}
            max={maxMs}
            now={Math.round(edit.fadeOut * 1000)}
            onChange={(n) => onEdit({ fadeOut: n * fadeMaxSec, fadeAuto: false, fadeFocus: 'out' })}
            onReset={() => onEdit({ fadeOut: 0.01, fadeAuto: false, fadeFocus: 'out' })}
            onGestureEnd={onCommit}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 0, maxMs, 'ms')
              if (next == null) return false
              onEdit({ fadeOut: next / 1000, fadeAuto: false, fadeFocus: 'out' })
              return true
            }}
          />
          <ValueKnob
            label="Q"
            valueText={shapeQ.toFixed(2)}
            normalized={Math.min(1, Math.max(0, shapeBend))}
            min={0.25}
            max={4}
            now={shapeQ}
            onChange={(n) =>
              onEdit(edit.fadeFocus === 'out' ? { fadeOutBend: n } : { fadeInBend: n })
            }
            onReset={() =>
              onEdit(edit.fadeFocus === 'out' ? { fadeOutBend: 0.5 } : { fadeInBend: 0.5 })
            }
            onGestureEnd={onCommit}
            onTypedValue={(text) => {
              const next = parseTypedRange(text, 0.25, 4)
              if (next == null) return false
              const bend = fadeBendFromQ(next)
              onEdit(edit.fadeFocus === 'out' ? { fadeOutBend: bend } : { fadeInBend: bend })
              return true
            }}
          />
        </div>
      ) : (
        <>
          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxMs}
            value={Math.round(edit.fadeIn * 1000)}
            aria-label="Fade in"
            onChange={(e) => onEdit({ fadeIn: Number(e.target.value) / 1000, fadeAuto: false, fadeFocus: 'in' })}
            onPointerUp={onCommit}
          />
          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxMs}
            value={Math.round(edit.fadeOut * 1000)}
            aria-label="Fade out"
            onChange={(e) => onEdit({ fadeOut: Number(e.target.value) / 1000, fadeAuto: false, fadeFocus: 'out' })}
            onPointerUp={onCommit}
          />
        </>
      )}
      <Segmented
        label="Curve"
        value={edit.fadeCurve}
        options={[
          { value: 'linear', label: 'Lin', title: 'Linear' },
          { value: 'equalPower', label: 'EqPow', title: 'Equal Power' },
          { value: 'exponential', label: 'Exp', title: 'Exponential' },
          { value: 'sCurve', label: 'S', title: 'S-Curve' },
        ]}
        wrap
        onChange={(fadeCurve) => {
          onEdit({ fadeCurve })
          onCommit?.()
        }}
      />
      <p className={styles.help}>
        The circle warps the selected {edit.fadeFocus === 'out' ? 'fade-out' : 'fade-in'} inside
        the Lin / EqPow / Exp / S law. Fade starts on the loop edge. Higher Q pulls the knee
        earlier.
      </p>
      <button
        type="button"
        className={styles.ghost}
        onClick={() => {
          onEdit({ fadeIn: 0.01, fadeOut: 0.01, fadeAuto: true })
          onCommit?.()
        }}
      >
        Auto 10 ms
      </button>
      <button
        type="button"
        className={styles.ghost}
        onClick={() => {
          onEdit({ fadeIn: 0, fadeOut: 0, fadeAuto: false })
          onCommit?.()
        }}
      >
        Fades Off
      </button>
      <button
        type="button"
        className={styles.ghost}
        onClick={() =>
          onTrim
            ? onTrim()
            : void engine.useAsSample({
                fadeIn: 0,
                fadeOut: 0,
                fadeCurve: 'linear',
                reverse: false,
                normalize: false,
              })
        }
      >
        Trim
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.normalizeRegion()}>
        Normalize
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.reverseRegion()}>
        Reverse
      </button>
    </>
  )
}

function InspectorTabs({
  value,
  onChange,
  mainLabel = 'Main',
  advancedLabel = 'Advanced',
}: {
  value: 'main' | 'advanced'
  onChange: (next: 'main' | 'advanced') => void
  mainLabel?: string
  advancedLabel?: string
}) {
  return (
    <div className={styles.paneTabs} role="tablist" aria-label="Effect settings">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'main'}
        className={value === 'main' ? styles.paneTabOn : styles.paneTab}
        onClick={() => onChange('main')}
      >
        {mainLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'advanced'}
        className={value === 'advanced' ? styles.paneTabOn : styles.paneTab}
        onClick={() => onChange('advanced')}
      >
        {advancedLabel}
      </button>
    </div>
  )
}

function ModuleInspector({
  snap,
  type,
  instanceId,
  variant,
  paneHint,
  onHideInspector,
}: {
  snap: EngineSnapshot
  type: ModuleType
  instanceId: string
  variant: 'knob' | 'slider'
  paneHint?: 'main' | 'advanced'
  onHideInspector?: () => void
}) {
  const [paneById, setPaneById] = useState<Record<string, 'main' | 'advanced'>>({})
  const mod = snap.chain.find((m) => m.instanceId === instanceId)
  useEffect(() => {
    if (!paneHint) return
    setPaneById((prev) => (prev[instanceId] === paneHint ? prev : { ...prev, [instanceId]: paneHint }))
  }, [paneHint, instanceId])
  const pane = paneById[instanceId] ?? paneHint ?? 'main'
  const setPane = (next: 'main' | 'advanced') =>
    setPaneById((prev) => (prev[instanceId] === next ? prev : { ...prev, [instanceId]: next }))
  const hasAdvanced = type !== 'saturation' && type !== 'output'
  const params = (ids: ParamId[]) =>
    variant === 'knob' ? (
      <div className={styles.knobs}>
        {ids.map((id) => (
          <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
        ))}
      </div>
    ) : (
      ids.map((id) => <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />)
    )
  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{mod ? moduleLabel(mod, snap.chain) : MODULE_LABELS[type]}</h2>
        <div className={styles.headActions}>
          {type !== 'gain' && type !== 'output' ? (
            <Toggle
              pressed={!mod?.bypassed}
              label={mod?.bypassed ? 'Bypassed' : 'Active'}
              onToggle={() => engine.setModuleBypass(instanceId, !mod?.bypassed)}
            />
          ) : null}
          {mod && !isFixedType(mod.type) ? (
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${MODULE_LABELS[mod.type]}`}
              onClick={() => engine.removeModule(instanceId)}
            >
              Remove
            </button>
          ) : null}
          {onHideInspector ? <InspectorEye open onClick={onHideInspector} /> : null}
        </div>
      </div>
      {hasAdvanced ? (
        <InspectorTabs
          value={pane}
          onChange={setPane}
          mainLabel={type === 'gain' ? 'Gain' : 'Main'}
          advancedLabel={type === 'gain' ? 'Panning' : 'Advanced'}
        />
      ) : null}
      {type === 'gain' && pane === 'main' ? (
        <>
          <Segmented
            label="Direction"
            value={snap.direction}
            options={PLAYBACK_DIRECTIONS}
            wrap
            onChange={(d) => engine.setDirection(d)}
          />
          {params(GAIN_IDS)}
          <FxLfoSection snap={snap} kind="input" variant={variant} />
        </>
      ) : null}
      {type === 'gain' && pane === 'advanced' ? (
        <>
          <p className={styles.help}>
            Pan moves the stereo image with equal-power, so loudness stays even as the image shifts.
            Balance L/R trims each channel’s level without that image law. Make mono sums both sides.
            Invert phase flips polarity.
          </p>
          {params(PAN_IDS)}
          <div className={styles.row}>
            <Toggle
              pressed={snap.params.makeMono > 0.5}
              label="Make mono"
              onToggle={() => engine.setParam('makeMono', snap.params.makeMono > 0.5 ? 0 : 1)}
            />
            <Toggle
              pressed={snap.params.invertPhase > 0.5}
              label="Invert phase"
              onToggle={() => engine.setParam('invertPhase', snap.params.invertPhase > 0.5 ? 0 : 1)}
            />
          </div>
          <FxLfoSection snap={snap} kind="input" variant={variant} />
        </>
      ) : null}
      {type === 'grain' && pane === 'main' ? (
        <>
          <Toggle
            pressed={snap.engineMode === 'grain'}
            label="Grain"
            onToggle={() =>
              engine.setEngineMode(snap.engineMode === 'grain' ? 'playback' : 'grain')
            }
          />
          {params(GRAIN_MAIN_IDS)}
          <FxLfoSection snap={snap} kind="grain" variant={variant} />
        </>
      ) : null}
      {type === 'grain' && pane === 'advanced' ? (
        <>
          {params(GRAIN_ADV_IDS)}
          <FxLfoSection snap={snap} kind="grain" variant={variant} />
        </>
      ) : null}
      {type === 'eq' ? (
        <EqEditor snap={snap} instanceId={instanceId} knobs={variant === 'knob'} pane={pane} />
      ) : null}
      {type === 'saturation' ? (
        <>
          {params(SAT_IDS)}
          <FxLfoSection snap={snap} kind="saturation" variant={variant} />
        </>
      ) : null}
      {type === 'delay' ? <SpaceInspector snap={snap} kind="delay" variant={variant} pane={pane} /> : null}
      {type === 'reverb' ? <SpaceInspector snap={snap} kind="reverb" variant={variant} pane={pane} /> : null}
      {type === 'limiter' ? <LimiterEditor snap={snap} variant={variant} pane={pane} /> : null}
      {type === 'output' ? (
        <>
          {params(OUT_IDS)}
          <Toggle pressed={snap.muted} label="Mute" onToggle={() => engine.setMuted(!snap.muted)} />
        </>
      ) : null}
    </>
  )
}

function LimiterEditor({
  snap,
  variant,
  pane,
}: {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  pane: 'main' | 'advanced'
}) {
  const params = (ids: ParamId[]) =>
    variant === 'knob' ? (
      <div className={styles.knobs}>
        {ids.map((id) => (
          <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />
        ))}
      </div>
    ) : (
      ids.map((id) => <ParamControl key={id} id={id} value={snap.params[id]} variant={variant} />)
    )
  return (
    <div className={styles.eq}>
      {pane === 'main' ? (
        <>
          <div className={styles.eqViz}>
            <LimiterPlot />
          </div>
          {params(LIMITER_MAIN_KNOBS)}
          <FxLfoSection snap={snap} kind="limiter" variant={variant} />
        </>
      ) : (
        <>
          <Toggle
            pressed={snap.params.limiterAutoMakeup > 0.5}
            label="Auto makeup"
            onToggle={() =>
              engine.setParam('limiterAutoMakeup', snap.params.limiterAutoMakeup > 0.5 ? 0 : 1)
            }
          />
          {params(LIMITER_ADV_KNOBS)}
          <FxLfoSection snap={snap} kind="limiter" variant={variant} />
        </>
      )}
    </div>
  )
}

function EqEditor({
  snap,
  knobs,
  instanceId,
  pane,
}: {
  snap: EngineSnapshot
  knobs: boolean
  instanceId: string
  pane: 'main' | 'advanced'
}) {
  const [openBand, setOpenBand] = useState(0)
  const st = snap.eqById[instanceId] ?? { bands: snap.eqBands, comb: snap.comb }
  const bands = st.bands
  const comb = st.comb
  const toneIndex = eqColorIndex(snap.chain, instanceId)
  const setBand = (index: number, patch: Parameters<typeof engine.setEqBand>[1]) =>
    engine.setEqBand(index, patch, instanceId)
  const setComb = (patch: Parameters<typeof engine.setComb>[0]) => engine.setComb(patch, instanceId)
  const formatHz = (hz: number) =>
    hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`
  return (
    <div className={styles.eq}>
      {pane === 'main' ? (
        <>
      <Segmented
        label="EQ listen"
        value={snap.eqListen}
        options={[
          { value: 'sample', label: 'Sample', title: 'Sample with filters' },
          { value: 'filters', label: 'Filters', title: 'Filters only (pink noise)' },
        ]}
        wrap
        onChange={(mode) => engine.setEqListen(mode)}
      />
      <div className={styles.eqViz}>
        <EqCurve
          bands={bands}
          sampleRate={snap.sampleRate}
          selectedBand={openBand}
          comb={comb}
          toneIndex={toneIndex}
          onSelectBand={setOpenBand}
          onDragBand={(index, patch) => setBand(index, patch)}
        />
      </div>
      {bands.map((band, index) => (
        <details
          key={index}
          className={styles.band}
          open={openBand === index}
          onToggle={(event) => {
            if (event.currentTarget.open) setOpenBand(index)
          }}
        >
          <summary>
            <span className={styles.bandTitle}>
              Band {index + 1}
              {band.bypassed ? ' · bypass' : ''}
            </span>
            <Toggle
              compact
              pressed={!band.bypassed}
              label={band.bypassed ? 'Bypassed' : 'Active'}
              onToggle={() => setBand(index, { bypassed: !band.bypassed })}
            />
          </summary>
          <Segmented
            label={`Band ${index + 1} type`}
            value={band.type}
            options={EQ_TYPE_OPTIONS}
            wrap
            onChange={(type) => setBand(index, { type })}
          />
          {bandUsesSlope(band.type) ? (
            <>
              <p className={styles.help}>Slope (dB/oct)</p>
              <Segmented
                label={`Band ${index + 1} slope`}
                value={String(band.slope) as `${FilterSlope}`}
                options={FILTER_SLOPES.map((s) => ({
                  value: String(s.value) as `${FilterSlope}`,
                  label: `${s.value}`,
                  title: `${s.value} dB/oct`,
                }))}
                wrap
                onChange={(slope) => setBand(index, { slope: Number(slope) as FilterSlope })}
              />
            </>
          ) : null}
          {knobs ? (
            <div className={styles.knobs}>
              <LfoParamShell id={EQ_BAND_LFO_IDS[index]!.freq}>
                <ValueKnob
                  label="Freq"
                  valueText={formatHz(snap.liveParams[EQ_BAND_LFO_IDS[index]!.freq] ?? band.frequency)}
                  normalized={freqToN(band.frequency)}
                  visualNormalized={freqToN(snap.liveParams[EQ_BAND_LFO_IDS[index]!.freq] ?? band.frequency)}
                  min={EQ_MIN_HZ}
                  max={EQ_MAX_HZ}
                  now={band.frequency}
                  onChange={(n) => setBand(index, { frequency: nToFreq(n) })}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, EQ_MIN_HZ, EQ_MAX_HZ, 'Hz')
                    if (next == null) return false
                    setBand(index, { frequency: next })
                    return true
                  }}
                />
              </LfoParamShell>
              {bandUsesGain(band.type) ? (
                <LfoParamShell id={EQ_BAND_LFO_IDS[index]!.gain}>
                  <ValueKnob
                    label="Gain"
                    valueText={`${(snap.liveParams[EQ_BAND_LFO_IDS[index]!.gain] ?? band.gain).toFixed(1)} dB`}
                    normalized={(band.gain + 18) / 36}
                    visualNormalized={((snap.liveParams[EQ_BAND_LFO_IDS[index]!.gain] ?? band.gain) + 18) / 36}
                    min={-18}
                    max={18}
                    now={band.gain}
                    onChange={(n) => setBand(index, { gain: n * 36 - 18 })}
                    onTypedValue={(text) => {
                      const next = parseTypedRange(text, -18, 18, 'dB')
                      if (next == null) return false
                      setBand(index, { gain: next })
                      return true
                    }}
                  />
                </LfoParamShell>
              ) : null}
              {bandUsesWidth(band.type) ? (
                <LfoParamShell id={EQ_BAND_LFO_IDS[index]!.q}>
                  <ValueKnob
                    label="Width"
                    valueText={formatHz(bandwidthHz(band.frequency, band.q))}
                    normalized={widthToN(bandwidthHz(band.frequency, band.q))}
                    min={10}
                    max={10000}
                    now={bandwidthHz(band.frequency, band.q)}
                    onChange={(n) =>
                      setBand(index, { q: qFromBandwidth(band.frequency, nToWidth(n)) })
                    }
                    onTypedValue={(text) => {
                      const next = parseTypedRange(text, 10, 10000, 'Hz')
                      if (next == null) return false
                      setBand(index, { q: qFromBandwidth(band.frequency, next) })
                      return true
                    }}
                  />
                </LfoParamShell>
              ) : (
                <LfoParamShell id={EQ_BAND_LFO_IDS[index]!.q}>
                  <ValueKnob
                    label="Q"
                    valueText={(snap.liveParams[EQ_BAND_LFO_IDS[index]!.q] ?? band.q).toFixed(2)}
                    normalized={qToN(band.q)}
                    visualNormalized={qToN(snap.liveParams[EQ_BAND_LFO_IDS[index]!.q] ?? band.q)}
                    min={0.1}
                    max={20}
                    now={band.q}
                    onChange={(n) => setBand(index, { q: nToQ(n) })}
                    onTypedValue={(text) => {
                      const next = parseTypedRange(text, 0.1, 20)
                      if (next == null) return false
                      setBand(index, { q: next })
                      return true
                    }}
                  />
                </LfoParamShell>
              )}
            </div>
          ) : (
            <>
              <label className={styles.field}>
                Frequency
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={freqToN(band.frequency)}
                  onChange={(e) =>
                    setBand(index, { frequency: nToFreq(Number(e.target.value)) })
                  }
                />
                <span>{formatHz(band.frequency)}</span>
              </label>
              {bandUsesGain(band.type) ? (
                <label className={styles.field}>
                  Gain
                  <input
                    type="range"
                    min={-18}
                    max={18}
                    step={0.1}
                    value={band.gain}
                    onChange={(e) => setBand(index, { gain: Number(e.target.value) })}
                  />
                  <span>{band.gain.toFixed(1)} dB</span>
                </label>
              ) : null}
              {bandUsesWidth(band.type) ? (
                <label className={styles.field}>
                  Width
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={widthToN(bandwidthHz(band.frequency, band.q))}
                    onChange={(e) =>
                      setBand(index, {
                        q: qFromBandwidth(band.frequency, nToWidth(Number(e.target.value))),
                      })
                    }
                  />
                  <span>{formatHz(bandwidthHz(band.frequency, band.q))}</span>
                </label>
              ) : (
                <label className={styles.field}>
                  Q
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={qToN(band.q)}
                    onChange={(e) => setBand(index, { q: nToQ(Number(e.target.value)) })}
                  />
                  <span>{band.q.toFixed(2)}</span>
                </label>
              )}
            </>
          )}
          {openBand === index ? (
            <FxLfoSection snap={snap} kind="eq" variant={knobs ? 'knob' : 'slider'} />
          ) : null}
        </details>
      ))}
        </>
      ) : (
        <>
        <Toggle
          pressed={comb.enabled}
          label="Comb filter"
          onToggle={() => setComb({ enabled: !comb.enabled })}
        />
        <Segmented
          label="Comb spacing"
          value={comb.spacingMode}
          options={[
            { value: 'linear', label: 'Lin', title: 'Linear Hz spacing' },
            { value: 'log', label: 'Log', title: 'Logarithmic ratio spacing' },
          ]}
          wrap
          onChange={(spacingMode) =>
            setComb({
              spacingMode,
              spacing: defaultSpacingForMode(spacingMode),
            })
          }
        />
        {knobs ? (
          <div className={styles.knobs}>
            <LfoParamShell id="eqcfTeeth">
            <ValueKnob
              label="Teeth"
              valueText={`${Math.round(snap.liveParams.eqcfTeeth ?? comb.teeth)}`}
              normalized={(comb.teeth - 2) / 14}
              min={2}
              max={16}
              now={comb.teeth}
              onChange={(n) => setComb({ teeth: Math.round(n * 14 + 2) })}
              onTypedValue={(text) => {
                const next = parseTypedRange(text, 2, 16)
                if (next == null) return false
                setComb({ teeth: Math.round(next) })
                return true
              }}
            />
            </LfoParamShell>
            <LfoParamShell id="eqcfGain">
            <ValueKnob
              label="Gain"
              valueText={`${(snap.liveParams.eqcfGain ?? comb.gain).toFixed(1)} dB`}
              normalized={(comb.gain + 18) / 36}
              min={-18}
              max={18}
              now={comb.gain}
              onChange={(n) => setComb({ gain: n * 36 - 18 })}
              onTypedValue={(text) => {
                const next = parseTypedRange(text, -18, 18, 'dB')
                if (next == null) return false
                setComb({ gain: next })
                return true
              }}
            />
            </LfoParamShell>
            <LfoParamShell id="eqcfFreq">
            <ValueKnob
              label="Base"
              valueText={formatHz(snap.liveParams.eqcfFreq ?? comb.frequency)}
              normalized={freqToN(comb.frequency)}
              min={EQ_MIN_HZ}
              max={EQ_MAX_HZ}
              now={comb.frequency}
              onChange={(n) => setComb({ frequency: nToFreq(n) })}
              onTypedValue={(text) => {
                const next = parseTypedRange(text, EQ_MIN_HZ, EQ_MAX_HZ, 'Hz')
                if (next == null) return false
                setComb({ frequency: next })
                return true
              }}
            />
            </LfoParamShell>
            <LfoParamShell id="eqcfSpacing">
            <ValueKnob
              label="Spacing"
              valueText={
                comb.spacingMode === 'log'
                  ? `${comb.spacing.toFixed(2)}×`
                  : formatHz(comb.spacing)
              }
              normalized={
                comb.spacingMode === 'log'
                  ? (Math.log(clampCombSpacing('log', comb.spacing)) - Math.log(1.05)) /
                    (Math.log(4) - Math.log(1.05))
                  : (Math.log(clampCombSpacing('linear', comb.spacing)) - Math.log(10)) /
                    (Math.log(4000) - Math.log(10))
              }
              min={comb.spacingMode === 'log' ? 1.05 : 10}
              max={comb.spacingMode === 'log' ? 4 : 4000}
              now={comb.spacing}
              onChange={(n) => {
                if (comb.spacingMode === 'log') {
                  setComb({ spacing: 1.05 * (4 / 1.05) ** n })
                } else {
                  setComb({ spacing: 10 * (4000 / 10) ** n })
                }
              }}
              onTypedValue={(text) => {
                const next = parseTypedRange(
                  text,
                  comb.spacingMode === 'log' ? 1.05 : 10,
                  comb.spacingMode === 'log' ? 4 : 4000,
                  comb.spacingMode === 'log' ? '' : 'Hz',
                )
                if (next == null) return false
                setComb({ spacing: next })
                return true
              }}
            />
            </LfoParamShell>
          </div>
        ) : null}
        <FxLfoSection snap={snap} kind="eqcf" variant={knobs ? 'knob' : 'slider'} />
        </>
      )}
    </div>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.readout}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function freqToN(hz: number): number {
  const min = Math.log(EQ_MIN_HZ)
  const max = Math.log(EQ_MAX_HZ)
  return (Math.log(Math.min(EQ_MAX_HZ, Math.max(EQ_MIN_HZ, hz))) - min) / (max - min)
}

function nToFreq(n: number): number {
  return EQ_MIN_HZ * (EQ_MAX_HZ / EQ_MIN_HZ) ** Math.min(1, Math.max(0, n))
}

function widthToN(hz: number): number {
  const min = Math.log(10)
  const max = Math.log(10000)
  return (Math.log(Math.min(10000, Math.max(10, hz))) - min) / (max - min)
}

function nToWidth(n: number): number {
  return 10 * (10000 / 10) ** Math.min(1, Math.max(0, n))
}

function qToN(q: number): number {
  const min = Math.log(0.1)
  const max = Math.log(20)
  return (Math.log(Math.min(20, Math.max(0.1, q))) - min) / (max - min)
}

function nToQ(n: number): number {
  return 0.1 * (20 / 0.1) ** Math.min(1, Math.max(0, n))
}
