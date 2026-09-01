import { MODULE_LABELS, type ModuleType } from '../../audio/chain/chain'
import { formatTimecode } from '../../audio/engine/formatTime'
import { FADE_CURVES } from '../../audio/engine/fades'
import { bandUsesGain, EQ_FILTER_TYPES } from '../../audio/engine/eqBands'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamSlider } from '../controls/ParamSlider'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import type { EditState, InspectorFocus, WaveTool } from '../../app/editorState'
import styles from './Inspector.module.css'

type Props = {
  snap: EngineSnapshot
  focus: InspectorFocus
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  sheet?: boolean
}

const GAIN_IDS: ParamId[] = ['gain']
const GRAIN_IDS: ParamId[] = [
  'grainSize',
  'density',
  'position',
  'scatter',
  'grainPitch',
  'pitchSpread',
  'speed',
  'pitch',
  'motionDepth',
  'motionRate',
  'motionJitter',
]
const DELAY_IDS: ParamId[] = ['delayTime', 'delayFeedback', 'spaceMix']
const REVERB_IDS: ParamId[] = ['reverbSize', 'reverbDecay', 'reverbPredelay', 'reverbDamping', 'reverb']
const SAT_IDS: ParamId[] = ['saturation']
const OUT_IDS: ParamId[] = ['outputGain']

export function Inspector({ snap, focus, edit, onEdit, onFine, sheet }: Props) {
  return (
    <div className={`${styles.panel} ${sheet ? styles.sheet : ''}`}>
      {focus.kind === 'tool' ? (
        <ToolInspector
          tool={focus.tool}
          snap={snap}
          edit={edit}
          onEdit={onEdit}
          onFine={onFine}
        />
      ) : (
        <ModuleInspector snap={snap} type={focus.type} instanceId={focus.instanceId} />
      )}
    </div>
  )
}

function ToolInspector({
  tool,
  snap,
  edit,
  onEdit,
  onFine,
}: {
  tool: WaveTool
  snap: EngineSnapshot
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
}) {
  const length = Math.max(0, snap.params.end - snap.params.start)
  if (tool === 'select') {
    return (
      <>
        <h2 className={styles.title}>Select</h2>
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
          label="Auto Snap"
          onToggle={() => onEdit({ autoSnap: !edit.autoSnap })}
        />
        <button
          type="button"
          className={styles.ghost}
          onClick={() =>
            void engine.useAsSample({
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
        <button
          type="button"
          className={styles.ghost}
          onClick={() =>
            void engine.useAsSample({
              fadeIn: 0,
              fadeOut: 0,
              fadeCurve: 'linear',
              reverse: false,
              normalize: true,
            })
          }
        >
          Normalize
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => engine.setDirection(snap.direction === 'reverse' ? 'forward' : 'reverse')}
        >
          Reverse
        </button>
      </>
    )
  }
  if (tool === 'fade') {
    return (
      <>
        <h2 className={styles.title}>Fade</h2>
        <Readout label="Fade In" value={`${Math.round(edit.fadeIn * 1000)} ms`} />
        <Readout label="Fade Out" value={`${Math.round(edit.fadeOut * 1000)} ms`} />
        <input
          className={styles.range}
          type="range"
          min={0}
          max={500}
          value={Math.round(edit.fadeIn * 1000)}
          aria-label="Fade in"
          onChange={(e) => onEdit({ fadeIn: Number(e.target.value) / 1000, fadeAuto: false })}
        />
        <input
          className={styles.range}
          type="range"
          min={0}
          max={500}
          value={Math.round(edit.fadeOut * 1000)}
          aria-label="Fade out"
          onChange={(e) => onEdit({ fadeOut: Number(e.target.value) / 1000, fadeAuto: false })}
        />
        <Segmented
          label="Curve"
          value={edit.fadeCurve}
          options={FADE_CURVES}
          onChange={(fadeCurve) => onEdit({ fadeCurve })}
        />
        <button
          type="button"
          className={styles.ghost}
          onClick={() => onEdit({ fadeIn: 0.01, fadeOut: 0.01, fadeAuto: true })}
        >
          Auto 10 ms
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => onEdit({ fadeIn: 0, fadeOut: 0, fadeAuto: false })}
        >
          Off
        </button>
      </>
    )
  }
  if (tool === 'zero') {
    return (
      <>
        <h2 className={styles.title}>Zero</h2>
        <Toggle
          pressed={edit.autoSnap}
          label="Auto Snap"
          onToggle={() => onEdit({ autoSnap: !edit.autoSnap })}
        />
        <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('start')}>
          Snap Start
        </button>
        <button type="button" className={styles.ghost} onClick={() => engine.snapToZero('end')}>
          Snap End
        </button>
      </>
    )
  }
  return (
    <>
      <h2 className={styles.title}>Pan</h2>
      <p className={styles.help}>Drag the waveform to move the viewport. Pinch or use +/− to zoom.</p>
    </>
  )
}

function ModuleInspector({
  snap,
  type,
  instanceId,
}: {
  snap: EngineSnapshot
  type: ModuleType
  instanceId: string
}) {
  const mod = snap.chain.find((m) => m.instanceId === instanceId)
  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{MODULE_LABELS[type]}</h2>
        {type !== 'gain' && type !== 'output' ? (
          <Toggle
            pressed={!mod?.bypassed}
            label={mod?.bypassed ? 'Bypassed' : 'Active'}
            onToggle={() => engine.setModuleBypass(instanceId, !mod?.bypassed)}
          />
        ) : null}
      </div>
      {type === 'gain' ? GAIN_IDS.map((id) => <ParamSlider key={id} id={id} value={snap.params[id]} />) : null}
      {type === 'grain' ? (
        <>
          <Toggle
            pressed={snap.engineMode === 'grain'}
            label="Grain"
            onToggle={() =>
              engine.setEngineMode(snap.engineMode === 'grain' ? 'playback' : 'grain')
            }
          />
          <Segmented
            label="Direction"
            value={snap.direction}
            options={PLAYBACK_DIRECTIONS}
            onChange={(d) => engine.setDirection(d)}
          />
          {GRAIN_IDS.map((id) => (
            <ParamSlider key={id} id={id} value={snap.params[id]} />
          ))}
        </>
      ) : null}
      {type === 'eq' ? <EqEditor snap={snap} /> : null}
      {type === 'saturation' ? SAT_IDS.map((id) => <ParamSlider key={id} id={id} value={snap.params[id]} />) : null}
      {type === 'delay' ? DELAY_IDS.map((id) => <ParamSlider key={id} id={id} value={snap.params[id]} />) : null}
      {type === 'reverb' ? REVERB_IDS.map((id) => <ParamSlider key={id} id={id} value={snap.params[id]} />) : null}
      {type === 'output' ? (
        <>
          {OUT_IDS.map((id) => (
            <ParamSlider key={id} id={id} value={snap.params[id]} />
          ))}
          <Toggle pressed={snap.muted} label="Mute" onToggle={() => engine.setMuted(!snap.muted)} />
        </>
      ) : null}
    </>
  )
}

function EqEditor({ snap }: { snap: EngineSnapshot }) {
  return (
    <div className={styles.eq}>
      {snap.eqBands.map((band, index) => (
        <details key={index} className={styles.band} open={index === 0}>
          <summary>Band {index + 1}</summary>
          <Segmented
            label={`Band ${index + 1} type`}
            value={band.type}
            options={EQ_FILTER_TYPES}
            onChange={(type) => engine.setEqBand(index, { type })}
          />
          <label className={styles.field}>
            Frequency
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={freqToN(band.frequency)}
              onChange={(e) =>
                engine.setEqBand(index, { frequency: nToFreq(Number(e.target.value)) })
              }
            />
            <span>{band.frequency >= 1000 ? `${(band.frequency / 1000).toFixed(2)} kHz` : `${Math.round(band.frequency)} Hz`}</span>
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
                onChange={(e) => engine.setEqBand(index, { gain: Number(e.target.value) })}
              />
              <span>{band.gain.toFixed(1)} dB</span>
            </label>
          ) : null}
          <label className={styles.field}>
            Q
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={qToN(band.q)}
              onChange={(e) => engine.setEqBand(index, { q: nToQ(Number(e.target.value)) })}
            />
            <span>{band.q.toFixed(2)}</span>
          </label>
        </details>
      ))}
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
  const min = Math.log(20)
  const max = Math.log(20000)
  return (Math.log(Math.min(20000, Math.max(20, hz))) - min) / (max - min)
}

function nToFreq(n: number): number {
  return 20 * (20000 / 20) ** Math.min(1, Math.max(0, n))
}

function qToN(q: number): number {
  const min = Math.log(0.1)
  const max = Math.log(20)
  return (Math.log(Math.min(20, Math.max(0.1, q))) - min) / (max - min)
}

function nToQ(n: number): number {
  return 0.1 * (20 / 0.1) ** Math.min(1, Math.max(0, n))
}