import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { eqColorIndex, isFixedType, moduleLabel, type ModuleType } from '../../audio/chain/chain'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { clampCombSpacing, defaultSpacingForMode } from '../../audio/engine/comb'
import { formatTimecode } from '../../audio/engine/formatTime'
import {
  bandUsesGain,
  bandUsesWidth,
  bandwidthHz,
  EQ_FILTER_TYPES,
  EQ_MAX_BANDS,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  eqStripKey,
  formatEqHz,
  nearestFilterSlope,
  qFromBandwidth,
  slopeFromNormalized,
  slopeToNormalized,
} from '../../audio/engine/eqBands'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import {
  COMPRESSOR_ADV_KNOBS,
  COMPRESSOR_MAIN_KNOBS,
  DISTORTION_ADV_KNOBS,
  DISTORTION_MAIN_KNOBS,
  GRAIN_KNOBS,
  LIMITER_ADV_KNOBS,
  LIMITER_MAIN_KNOBS,
  MOTION_KNOBS,
  PARAMS,
  PLAYBACK_DIRECTIONS,
  STRETCH_INTERP_ALGOS,
} from '../../audio/parameters/definitions'
import { fadeBendFromQ, fadeQFromBend } from '../../audio/engine/fades'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import { fadeKnobMaxSec } from '../waveform/handleLayout'
import type { ParamId } from '../../audio/parameters/types'
import { eqBandLfoIds, fxLfoIsActive, lfoBinding, lfoRangeNormalized } from '../../audio/fx/lfo'
import { liveControlNormalized, liveWidthNormalized, widthModulationRange } from '../modulation/modulationModel'
import { engine } from '../../hooks/useEngine'
import { readStoredHearingSettings } from '../../hearing/settings'
import { PresetMenu } from '../controls/PresetMenu'
import { LfoParamShell, ModulationScopeProvider } from '../controls/LfoParamShell'
import { combMatchesDefault, eqBandsMatchDefault, paramsMatchDefaults } from '../../audio/fx/effectDefaults'
import { EQ_BAND_LFO_KINDS } from '../../audio/fx/lfo'
import { EQ_PRESET_CATEGORIES, EQ_PRESETS } from '../../audio/fx/eqPresets'
import { MODULE_PRESET_CATEGORIES, matchingModulePresetId, modulePresetsFor } from '../../audio/fx/modulePresets'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { ValueKnob } from '../controls/ValueKnob'
import paramWrap from '../controls/ParamControl.module.css'
import { useI18n } from '../../i18n'
import { DISTORTION_NOISE_KINDS, DISTORTION_TYPES, parseDistortionType, type DistortionType } from '../../audio/fx/types'
import type { EditState, PanelInspectorFocus } from '../../app/editorState'
import { inspectorContextId } from '../../app/inspectorRoute'
import { EqCurve } from './EqCurve'
import { FilterInspector } from './FilterInspector'
import { MidSideInspector } from './MidSideInspector'
import { eqBandAccentVars } from '../eq/eqBandStyle'
import { InspectorEye } from './InspectorEye'
import { LimiterPlot } from './LimiterPlot'
import { SpaceInspector } from './SpaceInspector'
import { EffectRandomMenu } from '../random/EffectRandomMenu'
import { selectEqBand, subscribeEqBandSelection } from '../../audio/engine/eqBandSelection'
import { ParamActionPair } from '../random/ParamActionPair'
import { inspectorAccentStyle, TrackIdentity } from './TrackIdentity'
import styles from './Inspector.module.css'

export type EditActions = {
  canCopy: boolean
  canCut: boolean
  canPaste: boolean
  canDelete: boolean
  canMute: boolean
  canClear: boolean
  canInsert: boolean
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onMute: () => void
  onClear: () => void
  onInsert: () => void
}

function lfoBankResting(bank: readonly { target: string | null }[] | undefined): boolean {
  return !bank?.some((slot) => slot.target)
}

type Props = {
  snap: EngineSnapshot
  focus: PanelInspectorFocus
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  onCommit?: () => void
  onTrim?: () => void
  sheet?: boolean
  knobs?: boolean
  compact?: boolean
  /** Phone sheet: essentials only until the sheet is expanded. */
  detail?: 'essential' | 'full'
  onHideInspector?: () => void
  edits?: EditActions
}

const GAIN_IDS: ParamId[] = ['gain', 'speed', 'pitch', 'stretchInterp']

function stretchInterpCopy(
  algo: string | undefined,
  copy: {
    interpFast: string
    interpSmooth: string
    interpHigh: string
    interpFastTitle: string
    interpSmoothTitle: string
    interpHighTitle: string
  },
): { label: string; title: string } {
  if (algo === 'linear') return { label: copy.interpFast, title: copy.interpFastTitle }
  if (algo === 'sinc') return { label: copy.interpHigh, title: copy.interpHighTitle }
  return { label: copy.interpSmooth, title: copy.interpSmoothTitle }
}
const GRAIN_MAIN_IDS: ParamId[] = GRAIN_KNOBS
const GRAIN_ADV_IDS: ParamId[] = MOTION_KNOBS.filter((id) => id !== 'position')
const PAN_IDS: ParamId[] = ['pan', 'channelGainL', 'channelGainR']
const OUT_IDS: ParamId[] = ['outputGain']

function distortionHelp(type: DistortionType): string {
  switch (type) {
    case 'saturation':
      return 'Soft analog saturation. Drive stays near unity on quiet signals.'
    case 'overdrive':
      return 'Pedal-style overdrive with rounder even harmonics.'
    case 'tube':
      return 'Asymmetric tube-like clip. Bias shifts the even-harmonic balance.'
    case 'analog':
      return 'Diode / console analog grit with a darker loop.'
    case 'tape':
      return 'Tape compression with high-end roll-off and a little hiss.'
    case 'digital':
      return 'Hard digital clip. Bright, alias-prone edges.'
    case 'fuzz':
      return 'Heavy square-ish fuzz. Tone pulls the growl down.'
    case 'clip':
      return 'Brick clip into ±1. Use Mix to blend.'
    case 'fold':
      return 'Sine wavefold. Extra Drive adds inharmonic folds.'
    case 'bitcrush':
      return 'Bit reducer. Drop Bits for crunch; Rate stays at full sample rate.'
    case 'downsample':
      return 'Sample-rate reducer. Rate holds samples so aliases fold in.'
    case 'noise':
      return 'Noise generator blended with the signal. Color is on Advanced.'
    case 'vinyl':
      return 'Worn vinyl: mild sat, pink hiss, and a little rate crush.'
  }
}

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
  detail = 'full',
  onHideInspector,
  edits,
}: Props) {
  const variant = knobs ? 'knob' : 'slider'
  const track = snap.tracks.find((item) => item.id === snap.selectedTrackId) ?? snap.tracks[0]
  return (
    <div
      className={`${styles.panel} ${sheet ? styles.sheet : ''} ${compact ? styles.compact : ''} ${detail === 'essential' ? styles.essential : ''}`}
      style={inspectorAccentStyle(snap)}
      data-inspector-context={inspectorContextId(focus)}
      data-inspector-track={track?.id ?? ''}
    >
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
          edits={edits}
        />
      ) : (
        <ModuleInspector
          key={focus.instanceId}
          snap={snap}
          type={focus.type}
          instanceId={focus.instanceId}
          variant={variant}
          paneHint={focus.pane}
          detail={detail}
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
  edits,
}: {
  snap: EngineSnapshot
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  onCommit?: () => void
  onTrim?: () => void
  knobs: boolean
  onHideInspector?: () => void
  edits?: EditActions
}) {
  const { t } = useI18n()
  const length = Math.max(0, snap.params.end - snap.params.start)
  const fadeMaxSec = fadeKnobMaxSec(length)
  const maxMs = Math.round(fadeMaxSec * 1000)
  const shapeBend = edit.fadeFocus === 'out' ? edit.fadeOutBend : edit.fadeInBend
  const shapeQ = fadeQFromBend(shapeBend)
  const editOps = edits
    ? [
        { id: 'copy', label: t.waveform.copyCaption, title: t.waveform.copySelection, enabled: edits.canCopy, run: edits.onCopy },
        { id: 'cut', label: t.waveform.cutCaption, title: t.waveform.cutSelection, enabled: edits.canCut, run: edits.onCut },
        { id: 'paste', label: t.waveform.pasteCaption, title: t.waveform.pastePlayhead, enabled: edits.canPaste, run: edits.onPaste },
        { id: 'gap', label: t.waveform.insertSilenceCaption, title: t.waveform.insertSilence, enabled: edits.canInsert, run: edits.onInsert },
        { id: 'delete', label: t.waveform.deleteSelectionCaption, title: t.waveform.deleteSelection, enabled: edits.canDelete, run: edits.onDelete },
        { id: 'mute', label: t.waveform.muteSelectionCaption, title: t.waveform.muteSelection, enabled: edits.canMute, run: edits.onMute },
        { id: 'clear', label: t.waveform.clearSelectionCaption, title: t.waveform.clearSelection, enabled: edits.canClear, run: edits.onClear },
      ]
    : []
  return (
    <>
      <div className={styles.head}>
        <TrackIdentity snap={snap} />
        <h2 className={styles.title}>{t.inspector.edit}</h2>
        {onHideInspector ? (
          <div className={styles.headActions}>
            <InspectorEye open onClick={onHideInspector} />
          </div>
        ) : null}
      </div>
      <Readout label={t.inspector.start} value={formatTimecode(snap.params.start)} />
      <Readout label={t.inspector.end} value={formatTimecode(snap.params.end)} />
      <Readout label={t.inspector.length} value={formatTimecode(length)} />
      {editOps.length ? (
        <div className={styles.editOps} role="group" aria-label={t.inspector.edit}>
          {editOps.map((item) => (
            <button key={item.id} type="button" className={styles.ghost} title={item.title} disabled={!item.enabled} onClick={item.run}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.fine}>
        <button type="button" onClick={() => onFine('start', -0.001)}>
          −1 ms
        </button>
        <span>{t.inspector.start}</span>
        <button type="button" onClick={() => onFine('start', 0.001)}>
          +1 ms
        </button>
      </div>
      <div className={styles.fine}>
        <button type="button" onClick={() => onFine('end', -0.001)}>
          −1 ms
        </button>
        <span>{t.inspector.end}</span>
        <button type="button" onClick={() => onFine('end', 0.001)}>
          +1 ms
        </button>
      </div>
      <Toggle
        pressed={edit.autoSnap}
        label={t.inspector.zeroCrossing}
        onToggle={() => onEdit({ autoSnap: !edit.autoSnap })}
      />
      <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('start')}>
        {t.inspector.snapStart}
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('end')}>
        {t.inspector.snapEnd}
      </button>
      {snap.engineMode === 'grain' ? (
        <p className={styles.help}>
          {t.inspector.grainFadesHelp}
        </p>
      ) : null}
      {knobs ? (
        <div className={styles.knobs}>
          <ValueKnob
            label={t.inspector.fadeIn}
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
            label={t.inspector.fadeOut}
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
            aria-label={t.inspector.fadeIn}
            onChange={(e) => onEdit({ fadeIn: Number(e.target.value) / 1000, fadeAuto: false, fadeFocus: 'in' })}
            onPointerUp={onCommit}
          />
          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxMs}
            value={Math.round(edit.fadeOut * 1000)}
            aria-label={t.inspector.fadeOut}
            onChange={(e) => onEdit({ fadeOut: Number(e.target.value) / 1000, fadeAuto: false, fadeFocus: 'out' })}
            onPointerUp={onCommit}
          />
        </>
      )}
      <Segmented
        label={t.inspector.curve}
        value={edit.fadeCurve}
        options={[
          { value: 'linear', label: t.inspector.linear, title: 'Linear' },
          { value: 'equalPower', label: t.inspector.equalPower, title: 'Equal Power' },
          { value: 'exponential', label: t.inspector.exponential, title: 'Exponential' },
          { value: 'sCurve', label: t.inspector.sCurve, title: 'S-Curve' },
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
        {t.inspector.auto10}
      </button>
      <button
        type="button"
        className={styles.ghost}
        onClick={() => {
          onEdit({ fadeIn: 0, fadeOut: 0, fadeAuto: false })
          onCommit?.()
        }}
      >
        {t.inspector.fadesOff}
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
        {t.inspector.trim}
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.normalizeRegion()}>
        {t.inspector.normalize}
      </button>
      <button type="button" className={styles.ghost} onClick={() => engine.reverseRegion()}>
        {t.inspector.reverse}
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
  const { t } = useI18n()
  return (
    <div className={styles.paneTabs} role="tablist" aria-label={t.inspector.effectSettings}>
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
  detail = 'full',
  onHideInspector,
}: {
  snap: EngineSnapshot
  type: ModuleType
  instanceId: string
  variant: 'knob' | 'slider'
  paneHint?: 'main' | 'advanced'
  detail?: 'essential' | 'full'
  onHideInspector?: () => void
}) {
  const { t } = useI18n()
  const [paneById, setPaneById] = useState<Record<string, 'main' | 'advanced'>>({})
  const mod = snap.chain.find((m) => m.instanceId === instanceId)
  useEffect(() => {
    if (!paneHint) return
    setPaneById((prev) => (prev[instanceId] === paneHint ? prev : { ...prev, [instanceId]: paneHint }))
  }, [paneHint, instanceId])
  const pane = detail === 'essential' ? 'main' : (paneById[instanceId] ?? paneHint ?? 'main')
  const setPane = (next: 'main' | 'advanced') =>
    setPaneById((prev) => (prev[instanceId] === next ? prev : { ...prev, [instanceId]: next }))
  const hasAdvanced = type !== 'output'
  const primaryEq = snap.chain.find((item) => item.type === 'eq')?.instanceId
  const includeUnscoped = type !== 'eq' || instanceId === primaryEq
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
    <ModulationScopeProvider instanceId={instanceId} includeUnscoped={includeUnscoped}>
    <section className={styles.module} aria-labelledby={`module-${instanceId}-title`}>
      <div className={styles.head}>
        <TrackIdentity snap={snap} />
        <h2 className={styles.title} id={`module-${instanceId}-title`}>
          {mod ? moduleLabel(mod, snap.chain, t.modules) : t.modules[type]}
        </h2>
        <div className={styles.headActions}>
          {type !== 'gain' && type !== 'output' ? (
            <Toggle
              pressed={!mod?.bypassed}
              label={mod?.bypassed ? t.inspector.bypassed : t.inspector.active}
              reserveLabel={mod?.bypassed ? t.inspector.active : t.inspector.bypassed}
              onToggle={() => engine.toggleModuleBypass(instanceId)}
            />
          ) : null}
          <EffectRandomMenu type={type} />
          {mod && !isFixedType(mod.type) ? (
            <button
              type="button"
              className={styles.remove}
              aria-label={`${t.inspector.remove} ${t.modules[mod.type]}`}
              onClick={() => engine.removeModule(instanceId)}
            >
              {t.inspector.remove}
            </button>
          ) : null}
          {onHideInspector ? <InspectorEye open onClick={onHideInspector} /> : null}
        </div>
      </div>
      {hasAdvanced && detail !== 'essential' ? (
        <InspectorTabs
          value={pane}
          onChange={setPane}
          mainLabel={type === 'gain' ? t.inspector.gain : t.inspector.main}
          advancedLabel={type === 'gain' ? t.inspector.panning : t.inspector.advanced}
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
          {params(detail === 'essential' ? (['gain', 'speed', 'pitch'] as ParamId[]) : GAIN_IDS)}
          {detail === 'essential' ? null : (
          <>
          <div className={styles.stack}>
            <label className={styles.field} title={t.inspector.interpAlgo}>
              {t.inspector.interpolation}
              <select
                className={styles.select}
                aria-label={t.inspector.interpAlgo}
                title={
                  stretchInterpCopy(
                    STRETCH_INTERP_ALGOS[Math.round(snap.params.stretchInterpAlgo)]?.value,
                    t.inspector,
                  ).title
                }
                value={STRETCH_INTERP_ALGOS[Math.round(snap.params.stretchInterpAlgo)]?.value ?? 'cubic'}
                onChange={(event) => {
                  const i = STRETCH_INTERP_ALGOS.findIndex((a) => a.value === event.target.value)
                  if (i >= 0) engine.setParam('stretchInterpAlgo', i)
                }}
              >
                {STRETCH_INTERP_ALGOS.map((a) => {
                  const copy = stretchInterpCopy(a.value, t.inspector)
                  return (
                    <option key={a.value} value={a.value} title={copy.title}>
                      {copy.label}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
          <p className={styles.help}>{t.inspector.stretchHelp}</p>
          <h3 className={styles.sub}>Channels</h3>
          <p className={styles.help}>
            Make mono sums left and right. Make stereo copies a mono file onto both sides so pan and
            balance can act. Waveform lanes follow these controls.
          </p>
          <div className={styles.row}>
            <Toggle
              pressed={snap.channelLayout === 'mono' || snap.params.makeMono > 0.5}
              label="Make mono"
              title="Sum left and right into one channel. Visualizations and meters follow."
              onToggle={() =>
                engine.setChannelLayout(
                  snap.channelLayout === 'mono' || snap.params.makeMono > 0.5 ? 'original' : 'mono',
                )
              }
            />
            <Toggle
              pressed={snap.channelLayout === 'stereo'}
              label="Make stereo"
              title="Duplicate a mono file onto left and right so each side can be processed."
              onToggle={() =>
                engine.setChannelLayout(snap.channelLayout === 'stereo' ? 'original' : 'stereo')
              }
            />
            <Toggle
              pressed={snap.params.invertPhase > 0.5}
              label="Invert phase"
              title="Flips polarity of the input."
              onToggle={() => engine.setParam('invertPhase', snap.params.invertPhase > 0.5 ? 0 : 1)}
            />
          </div>
          {params(PAN_IDS)}
          <SampleTempo snap={snap} variant={variant} />
          </>
          )}
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
              pressed={snap.channelLayout === 'mono' || snap.params.makeMono > 0.5}
              label="Make mono"
              title="Sum left and right into one channel. Visualizations and meters follow."
              onToggle={() =>
                engine.setChannelLayout(
                  snap.channelLayout === 'mono' || snap.params.makeMono > 0.5 ? 'original' : 'mono',
                )
              }
            />
            <Toggle
              pressed={snap.channelLayout === 'stereo'}
              label="Make stereo"
              title="Duplicate a mono file onto left and right so each side can be processed."
              onToggle={() =>
                engine.setChannelLayout(snap.channelLayout === 'stereo' ? 'original' : 'stereo')
              }
            />
            <Toggle
              pressed={snap.params.invertPhase > 0.5}
              label="Invert phase"
              title="Flips polarity of the input."
              onToggle={() => engine.setParam('invertPhase', snap.params.invertPhase > 0.5 ? 0 : 1)}
            />
          </div>
        </>
      ) : null}
      {type === 'grain' && pane === 'main' ? (
        <>
          <PresetMenu
            label="Grain presets"
            categories={MODULE_PRESET_CATEGORIES}
            presets={modulePresetsFor('grain')}
            matchesDefault={paramsMatchDefaults(snap.params, 'grain') && lfoBankResting(snap.fxLfos.grain)}
            onApply={(id) => engine.applyModulePreset(id)}
            onDefault={() => engine.resetEffect('grain')}
          />
          <Toggle
            pressed={snap.engineMode === 'grain'}
            label="Grain"
            onToggle={() =>
              engine.setEngineMode(snap.engineMode === 'grain' ? 'playback' : 'grain')
            }
          />
          {params(detail === 'essential' ? GRAIN_MAIN_IDS.slice(0, 3) : GRAIN_MAIN_IDS)}
        </>
      ) : null}
      {type === 'grain' && pane === 'advanced' ? (
        <>
          {params(GRAIN_ADV_IDS)}
        </>
      ) : null}
      {type === 'eq' ? (
        <EqEditor snap={snap} instanceId={instanceId} knobs={variant === 'knob'} pane={pane} />
      ) : null}
      {type === 'filter' ? <FilterInspector snap={snap} variant={variant} pane={pane} /> : null}
      {type === 'midside' ? <MidSideInspector snap={snap} variant={variant} pane={pane} /> : null}
      {type === 'distortion' && pane === 'main' ? (
        <>
          <label className={styles.field}>
            Type
            <select
              className={`${styles.select} ${styles.selectOn}`}
              aria-label="Distortion type"
              value={snap.distortionType}
              onChange={(event) => {
                const next = parseDistortionType(event.target.value)
                if (next) engine.setDistortionType(next)
              }}
            >
              {DISTORTION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <PresetMenu
            label="Preset"
            categories={MODULE_PRESET_CATEGORIES}
            presets={modulePresetsFor('distortion')}
            selectedId={matchingModulePresetId('distortion', snap.params, snap.distortionType)}
            matchesDefault={
              paramsMatchDefaults(snap.params, 'distortion') &&
              snap.distortionType === 'saturation' &&
              snap.distortionNoiseKind === 'white' &&
              lfoBankResting(snap.fxLfos.distortion)
            }
            showStatus={false}
            onApply={(id) => engine.applyModulePreset(id)}
            onDefault={() => engine.resetEffect('distortion')}
          />
          <p className={styles.help}>{distortionHelp(snap.distortionType)}</p>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.ghost}
              aria-label={t.transport.killNoise}
              title={t.transport.killNoiseTitle}
              onClick={() => engine.killNoise()}
            >
              {t.transport.killNoise}
            </button>
          </div>
          {params(DISTORTION_MAIN_KNOBS)}
        </>
      ) : null}
      {type === 'distortion' && pane === 'advanced' ? (
        <>
          <Segmented
            label="Noise color"
            value={snap.distortionNoiseKind}
            options={DISTORTION_NOISE_KINDS}
            wrap
            onChange={(v) => engine.setDistortionNoiseKind(v)}
          />
          {params(DISTORTION_ADV_KNOBS)}
        </>
      ) : null}
      {type === 'delay' ? <SpaceInspector snap={snap} kind="delay" variant={variant} pane={pane} /> : null}
      {type === 'reverb' ? <SpaceInspector snap={snap} kind="reverb" variant={variant} pane={pane} /> : null}
      {type === 'compressor' ? <CompressorEditor snap={snap} variant={variant} pane={pane} /> : null}
      {type === 'limiter' ? <LimiterEditor snap={snap} variant={variant} pane={pane} /> : null}
      {type === 'output' ? (
        <>
          {params(OUT_IDS)}
          <Toggle pressed={snap.muted} label={t.inspector.mute} onToggle={() => engine.setMuted(!snap.muted)} />
        </>
      ) : null}
    </section>
    </ModulationScopeProvider>
  )
}

function CompressorEditor({
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
          <PresetMenu
            label="Compressor presets"
            categories={MODULE_PRESET_CATEGORIES}
            presets={modulePresetsFor('compressor')}
            matchesDefault={paramsMatchDefaults(snap.params, 'compressor') && lfoBankResting(snap.fxLfos.compressor)}
            onApply={(id) => engine.applyModulePreset(id)}
            onDefault={() => engine.resetEffect('compressor')}
          />
          <div className={styles.eqViz}>
            <LimiterPlot kind="compressor" />
          </div>
          {params(COMPRESSOR_MAIN_KNOBS)}
        </>
      ) : (
        <>
          <Toggle
            pressed={snap.params.compressorAutoMakeup > 0.5}
            label="Auto makeup"
            onToggle={() =>
              engine.setParam('compressorAutoMakeup', snap.params.compressorAutoMakeup > 0.5 ? 0 : 1)
            }
          />
          {params(COMPRESSOR_ADV_KNOBS)}
        </>
      )}
    </div>
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
          <PresetMenu
            label="Limiter presets"
            categories={MODULE_PRESET_CATEGORIES}
            presets={modulePresetsFor('limiter')}
            matchesDefault={paramsMatchDefaults(snap.params, 'limiter') && lfoBankResting(snap.fxLfos.limiter)}
            onApply={(id) => engine.applyModulePreset(id)}
            onDefault={() => engine.resetEffect('limiter')}
          />
          <div className={styles.eqViz}>
            <LimiterPlot kind="limiter" />
          </div>
          {params(LIMITER_MAIN_KNOBS)}
        </>
      ) : (
        <>
          {params(LIMITER_ADV_KNOBS)}
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
  const chooseBand = (index: number) => {
    setOpenBand(index)
    selectEqBand({ instanceId, index })
  }
  useEffect(() => {
    return subscribeEqBandSelection((selection) => {
      if (!selection || selection.instanceId !== instanceId) return
      setOpenBand(selection.index)
    })
  }, [instanceId])
  const st = snap.eqById[instanceId] ?? { bands: snap.eqBands, comb: snap.comb }
  const bands = st.bands
  const comb = st.comb
  const toneIndex = eqColorIndex(snap.chain, instanceId)
  const modulate = eqInstanceUsesSharedLfo(snap.chain, instanceId)
  const setBand = (index: number, patch: Parameters<typeof engine.setEqBand>[1]) =>
    engine.setEqBand(index, patch, instanceId)
  const setComb = (patch: Parameters<typeof engine.setComb>[0]) => engine.setComb(patch, instanceId)
  const formatHz = formatEqHz
  const eqKnobLfo = (id: ParamId | undefined, baseN: number) => {
    if (!modulate || !id) return undefined
    const binding = lfoBinding(snap.fxLfos, id)
    if (!binding || !fxLfoIsActive(binding.lfo)) return undefined
    return lfoRangeNormalized(baseN, binding.lfo.depth)
  }
  const eqLive = (id: ParamId | undefined) =>
    id ? liveControlNormalized(snap.liveParams[id], id, Boolean(eqKnobLfo(id, 0))) : undefined
  return (
    <div className={styles.eq}>
      {pane === 'main' ? (
        <>
      <PresetMenu
        label="EQ presets"
        categories={EQ_PRESET_CATEGORIES}
        presets={EQ_PRESETS.map((p) => ({ id: p.id, name: p.name, category: p.category, hint: p.hint }))}
        matchesDefault={
          eqBandsMatchDefault(bands) &&
          combMatchesDefault(comb) &&
          EQ_BAND_LFO_KINDS.every((kind) => lfoBankResting(snap.fxLfos[kind])) &&
          lfoBankResting(snap.fxLfos.eqcf)
        }
        onApply={(id) => engine.applyEqPreset(id, instanceId)}
        onDefault={() => engine.resetEffect('eq', instanceId)}
      />
      {bands.length < EQ_MAX_BANDS ? (
        <div className={styles.eqAddBar}>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              const next = engine.addEqBand(instanceId)
              if (next != null) chooseBand(next)
            }}
          >
            Add band ({bands.length}/{EQ_MAX_BANDS})
          </button>
        </div>
      ) : null}
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
          live={snap.liveByInstance[instanceId]}
          modulate={Boolean(snap.liveByInstance[instanceId]) || eqInstanceUsesSharedLfo(snap.chain, instanceId)}
          onSelectBand={chooseBand}
          onDragBand={(index, patch) => setBand(index, patch)}
        />
      </div>
      {bands.map((band, index) => (
        <details
          key={eqStripKey(instanceId, band)}
          className={styles.band}
          open={openBand === index}
          style={eqBandAccentVars(band.frequency) as CSSProperties}
          onToggle={(event) => {
            if (event.currentTarget.open) chooseBand(index)
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
              reserveLabel={band.bypassed ? 'Active' : 'Bypassed'}
              onToggle={() => setBand(index, { bypassed: !band.bypassed })}
            />
          </summary>
          <Segmented
            label={`Band ${index + 1} type`}
            value={band.type}
            options={EQ_TYPE_OPTIONS}
            wrap
            onChange={(type) =>
              setBand(
                index,
                (type === 'highpass' || type === 'lowpass') && band.slope < 24
                  ? { type, slope: 48 }
                  : { type },
              )
            }
          />
          {knobs ? (
            <div className={styles.knobs}>
              <EqLfoShell index={index} which="freq" afford={modulate}>
                <ValueKnob
                  label="Freq"
                  valueText={formatHz(band.frequency)}
                  normalized={freqToN(band.frequency)}
                  lfoRange={eqKnobLfo(eqBandLfoIds(index)?.freq, freqToN(band.frequency))}
                  liveNormalized={eqLive(eqBandLfoIds(index)?.freq)}
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
              </EqLfoShell>
              {band.type === 'highpass' || band.type === 'lowpass' ? (
                <div className={paramWrap.wrap}>
                  <ValueKnob
                    label="Slope"
                    valueText={`${band.slope} dB`}
                    normalized={slopeToNormalized(band.slope)}
                    min={12}
                    max={96}
                    now={band.slope}
                    onChange={(n) => setBand(index, { slope: slopeFromNormalized(n) })}
                    onTypedValue={(text) => {
                      const next = parseTypedRange(text, 12, 96, 'dB')
                      if (next == null) return false
                      setBand(index, { slope: nearestFilterSlope(next) })
                      return true
                    }}
                  />
                </div>
              ) : bandUsesGain(band.type) ? (
                <EqLfoShell index={index} which="gain" afford={modulate}>
                  <ValueKnob
                    label="Gain"
                    valueText={`${band.gain.toFixed(1)} dB`}
                    normalized={toNormalized(band.gain, PARAMS.eq1Gain)}
                    lfoRange={eqKnobLfo(eqBandLfoIds(index)?.gain, toNormalized(band.gain, PARAMS.eq1Gain))}
                    liveNormalized={eqLive(eqBandLfoIds(index)?.gain)}
                    min={PARAMS.eq1Gain.min}
                    max={PARAMS.eq1Gain.max}
                    now={band.gain}
                    onChange={(n) => setBand(index, { gain: fromNormalized(n, PARAMS.eq1Gain) })}
                    onTypedValue={(text) => {
                      const next = parseTypedRange(text, PARAMS.eq1Gain.min, PARAMS.eq1Gain.max, 'dB')
                      if (next == null) return false
                      setBand(index, { gain: next })
                      return true
                    }}
                  />
                </EqLfoShell>
              ) : null}
              {bandUsesWidth(band.type) ? (
                <EqLfoShell index={index} which="q" afford={modulate}>
                  <ValueKnob
                    label="Width"
                    valueText={formatHz(bandwidthHz(band.frequency, band.q))}
                    normalized={widthToN(bandwidthHz(band.frequency, band.q))}
                    lfoRange={
                      modulate && eqBandLfoIds(index)?.q
                        ? widthModulationRange(snap.fxLfos, eqBandLfoIds(index)!.q, band.frequency, band.q)
                        : undefined
                    }
                    liveNormalized={
                      modulate && eqBandLfoIds(index)?.q && widthModulationRange(snap.fxLfos, eqBandLfoIds(index)!.q, band.frequency, band.q)
                        ? liveWidthNormalized(band.frequency, snap.liveParams[eqBandLfoIds(index)!.q])
                        : undefined
                    }
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
                </EqLfoShell>
              ) : (
                <EqLfoShell index={index} which="q" afford={modulate}>
                  <ValueKnob
                    label="Q"
                    valueText={band.q.toFixed(2)}
                    normalized={qToN(band.q)}
                    lfoRange={eqKnobLfo(eqBandLfoIds(index)?.q, qToN(band.q))}
                    liveNormalized={eqLive(eqBandLfoIds(index)?.q)}
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
                </EqLfoShell>
              )}
            </div>
          ) : (
            <>
              <label className={styles.field} data-param-id={eqBandLfoIds(index)?.freq}>
                <span className={styles.fieldHead}>
                  Frequency
                  {modulate && eqBandLfoIds(index)?.freq ? <ParamActionPair id={eqBandLfoIds(index)!.freq} /> : null}
                </span>
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
              {band.type === 'highpass' || band.type === 'lowpass' ? (
                <label className={styles.field}>
                  Slope
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={slopeToNormalized(band.slope)}
                    onChange={(e) =>
                      setBand(index, { slope: slopeFromNormalized(Number(e.target.value)) })
                    }
                  />
                  <span>{band.slope} dB</span>
                </label>
              ) : bandUsesGain(band.type) ? (
                <label className={styles.field} data-param-id={eqBandLfoIds(index)?.gain}>
                  <span className={styles.fieldHead}>
                    Gain
                    {modulate && eqBandLfoIds(index)?.gain ? <ParamActionPair id={eqBandLfoIds(index)!.gain} /> : null}
                  </span>
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
                <label className={styles.field} data-param-id={eqBandLfoIds(index)?.q}>
                  <span className={styles.fieldHead}>
                    Width
                    {modulate && eqBandLfoIds(index)?.q ? <ParamActionPair id={eqBandLfoIds(index)!.q} /> : null}
                  </span>
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
                <label className={styles.field} data-param-id={eqBandLfoIds(index)?.q}>
                  <span className={styles.fieldHead}>
                    Q
                    {modulate && eqBandLfoIds(index)?.q ? <ParamActionPair id={eqBandLfoIds(index)!.q} /> : null}
                  </span>
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
        </details>
      ))}
      {bands.length < EQ_MAX_BANDS ? (
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            const next = engine.addEqBand(instanceId)
            if (next != null) chooseBand(next)
          }}
        >
          Add band ({bands.length}/{EQ_MAX_BANDS})
        </button>
      ) : null}
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
            <LfoParamShell id="eqcfTeeth" afford={modulate}>
            <ValueKnob
              label="Teeth"
              valueText={`${Math.round(comb.teeth)}`}
              normalized={(comb.teeth - 2) / 14}
              lfoRange={eqKnobLfo('eqcfTeeth', (comb.teeth - 2) / 14)}
              liveNormalized={eqLive('eqcfTeeth')}
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
            <LfoParamShell id="eqcfGain" afford={modulate}>
            <ValueKnob
              label="Gain"
              valueText={`${comb.gain.toFixed(1)} dB`}
              normalized={toNormalized(comb.gain, PARAMS.eqcfGain)}
              lfoRange={eqKnobLfo('eqcfGain', toNormalized(comb.gain, PARAMS.eqcfGain))}
              liveNormalized={eqLive('eqcfGain')}
              min={PARAMS.eqcfGain.min}
              max={PARAMS.eqcfGain.max}
              now={comb.gain}
              onChange={(n) => setComb({ gain: fromNormalized(n, PARAMS.eqcfGain) })}
              onTypedValue={(text) => {
                const next = parseTypedRange(text, PARAMS.eqcfGain.min, PARAMS.eqcfGain.max, 'dB')
                if (next == null) return false
                setComb({ gain: next })
                return true
              }}
            />
            </LfoParamShell>
            <LfoParamShell id="eqcfFreq" afford={modulate}>
            <ValueKnob
              label="Base"
              valueText={formatHz(comb.frequency)}
              normalized={freqToN(comb.frequency)}
              lfoRange={eqKnobLfo('eqcfFreq', freqToN(comb.frequency))}
              liveNormalized={eqLive('eqcfFreq')}
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
            <LfoParamShell id="eqcfSpacing" afford={modulate}>
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
        </>
      )}
    </div>
  )
}

function SampleTempo({ snap, variant }: { snap: EngineSnapshot; variant: 'knob' | 'slider' }) {
  const { t } = useI18n()
  const source =
    snap.tempoSource === 'detected'
      ? 'detected'
      : snap.tempoSource === 'tapped'
        ? 'tap'
        : snap.tempoSource === 'manual'
          ? 'manual'
          : 'default 120'
  return (
    <div className={styles.tempo}>
      <h3 className={styles.sub}>{t.inspector.sampleTempo}</h3>
      <p className={styles.help}>
        Delay and reverb BPM sync use this tempo. Detect tempo from the sample, mark hits on the
        waveform and drag them to warp the audio, or tap along while the sample plays.
      </p>
      {variant === 'knob' ? (
        <div className={styles.knobs}>
          <ParamControl id="bpm" value={snap.params.bpm} variant={variant} />
        </div>
      ) : (
        <ParamControl id="bpm" value={snap.params.bpm} variant={variant} />
      )}
      <div className={styles.tempoActions}>
        <button
          type="button"
          className={styles.ghost}
          disabled={!snap.sampleLoaded}
          onClick={() => engine.detectSampleTempo()}
        >
          Detect tempo
        </button>
        <button
          type="button"
          className={`${styles.ghost} ${snap.showTransients ? styles.ghostOn : ''}`}
          disabled={!snap.sampleLoaded}
          aria-pressed={snap.showTransients}
          onClick={() => engine.setShowTransients(!snap.showTransients, readStoredHearingSettings().transientSensitivity)}
        >
          Mark transients
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled={!snap.sampleLoaded}
          onPointerDown={() => engine.tapSampleTempo()}
          onClick={() => engine.tapSampleTempo()}
        >
          Tap tempo
        </button>
      </div>
      <div className={styles.readout}>
        <span>Source</span>
        <strong>{source}</strong>
      </div>
      {snap.tapCount > 0 ? (
        <div className={styles.readout}>
          <span>Taps</span>
          <strong>{snap.tapCount}</strong>
        </div>
      ) : null}
      {snap.tempoNotice ? <p className={styles.help}>{snap.tempoNotice}</p> : null}
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

function EqLfoShell({
  index,
  which,
  afford = true,
  children,
}: {
  index: number
  which: 'freq' | 'gain' | 'q'
  afford?: boolean
  children: ReactNode
}) {
  const id = eqBandLfoIds(index)?.[which]
  if (!id) return children
  return (
    <LfoParamShell id={id} afford={afford}>
      {children}
    </LfoParamShell>
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
