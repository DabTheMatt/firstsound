import { useState } from 'react'
import { MODULE_LABELS, type ModuleType } from '../../audio/chain/chain'
import { formatTimecode } from '../../audio/engine/formatTime'
import {
  bandUsesGain,
  bandUsesSlope,
  EQ_FILTER_TYPES,
  FILTER_SLOPES,
  type FilterSlope,
} from '../../audio/engine/eqBands'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PLAYBACK_DIRECTIONS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { ValueKnob } from '../controls/ValueKnob'
import type { EditState, InspectorFocus, WaveTool } from '../../app/editorState'
import { EqCurve } from './EqCurve'
import { SpaceInspector } from './SpaceInspector'
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
}: Props) {
  const variant = knobs ? 'knob' : 'slider'
  return (
    <div className={`${styles.panel} ${sheet ? styles.sheet : ''}`}>
      {focus.kind === 'tool' ? (
        <ToolInspector
          tool={focus.tool}
          snap={snap}
          edit={edit}
          onEdit={onEdit}
          onFine={onFine}
          onCommit={onCommit}
          onTrim={onTrim}
          knobs={knobs}
        />
      ) : (
        <ModuleInspector
          snap={snap}
          type={focus.type}
          instanceId={focus.instanceId}
          variant={variant}
        />
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
  onCommit,
  onTrim,
  knobs,
}: {
  tool: WaveTool
  snap: EngineSnapshot
  edit: EditState
  onEdit: (patch: Partial<EditState>) => void
  onFine: (which: 'start' | 'end', delta: number) => void
  onCommit?: () => void
  onTrim?: () => void
  knobs: boolean
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
        <button
          type="button"
          className={styles.ghost}
          onClick={() => engine.normalizeRegion()}
        >
          Normalize
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => engine.reverseRegion()}
        >
          Reverse
        </button>
      </>
    )
  }
  if (tool === 'fade') {
    const maxMs = 2000
    return (
      <>
        <h2 className={styles.title}>Fade</h2>
        {snap.engineMode === 'grain' ? (
          <>
            <p className={styles.help}>
              Grain plays from the cursor, so region fades are easy to miss. Use Playback to hear
              fade-in and fade-out on the selection.
            </p>
            <button type="button" className={styles.ghost} onClick={() => engine.setEngineMode('playback')}>
              Playback
            </button>
          </>
        ) : null}
        <Readout label="Fade In" value={`${Math.round(edit.fadeIn * 1000)} ms`} />
        <Readout label="Fade Out" value={`${Math.round(edit.fadeOut * 1000)} ms`} />
        {knobs ? (
          <div className={styles.knobs}>
            <ValueKnob
              label="Fade In"
              valueText={`${Math.round(edit.fadeIn * 1000)} ms`}
              normalized={Math.min(1, edit.fadeIn / 2)}
              min={0}
              max={maxMs}
              now={Math.round(edit.fadeIn * 1000)}
              onChange={(n) => onEdit({ fadeIn: n * 2, fadeAuto: false })}
              onReset={() => onEdit({ fadeIn: 0.01, fadeAuto: false })}
              onGestureEnd={onCommit}
            />
            <ValueKnob
              label="Fade Out"
              valueText={`${Math.round(edit.fadeOut * 1000)} ms`}
              normalized={Math.min(1, edit.fadeOut / 2)}
              min={0}
              max={maxMs}
              now={Math.round(edit.fadeOut * 1000)}
              onChange={(n) => onEdit({ fadeOut: n * 2, fadeAuto: false })}
              onReset={() => onEdit({ fadeOut: 0.01, fadeAuto: false })}
              onGestureEnd={onCommit}
            />
          </div>
        ) : (
          <>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={2000}
              value={Math.round(edit.fadeIn * 1000)}
              aria-label="Fade in"
              onChange={(e) => onEdit({ fadeIn: Number(e.target.value) / 1000, fadeAuto: false })}
              onPointerUp={onCommit}
            />
            <input
              className={styles.range}
              type="range"
              min={0}
              max={2000}
              value={Math.round(edit.fadeOut * 1000)}
              aria-label="Fade out"
              onChange={(e) => onEdit({ fadeOut: Number(e.target.value) / 1000, fadeAuto: false })}
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
  return null
}

function ModuleInspector({
  snap,
  type,
  instanceId,
  variant,
}: {
  snap: EngineSnapshot
  type: ModuleType
  instanceId: string
  variant: 'knob' | 'slider'
}) {
  const mod = snap.chain.find((m) => m.instanceId === instanceId)
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
        <h2 className={styles.title}>{MODULE_LABELS[type]}</h2>
        {type !== 'gain' && type !== 'output' ? (
          <Toggle
            pressed={!mod?.bypassed}
            label={mod?.bypassed ? 'Bypassed' : 'Active'}
            onToggle={() => engine.setModuleBypass(instanceId, !mod?.bypassed)}
          />
        ) : null}
      </div>
      {type === 'gain' ? params(GAIN_IDS) : null}
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
            wrap
            onChange={(d) => engine.setDirection(d)}
          />
          {params(GRAIN_IDS)}
        </>
      ) : null}
      {type === 'eq' ? <EqEditor snap={snap} knobs={variant === 'knob'} /> : null}
      {type === 'saturation' ? params(SAT_IDS) : null}
      {type === 'delay' ? <SpaceInspector snap={snap} kind="delay" variant={variant} /> : null}
      {type === 'reverb' ? <SpaceInspector snap={snap} kind="reverb" variant={variant} /> : null}
      {type === 'output' ? (
        <>
          {params(OUT_IDS)}
          <Toggle pressed={snap.muted} label="Mute" onToggle={() => engine.setMuted(!snap.muted)} />
        </>
      ) : null}
    </>
  )
}

function EqEditor({ snap, knobs }: { snap: EngineSnapshot; knobs: boolean }) {
  const [openBand, setOpenBand] = useState(0)
  return (
    <div className={styles.eq}>
      <div className={styles.eqViz}>
        <EqCurve bands={snap.eqBands} sampleRate={snap.sampleRate} selectedBand={openBand} />
      </div>
      {snap.eqBands.map((band, index) => (
        <details
          key={index}
          className={styles.band}
          open={openBand === index}
          onToggle={(event) => {
            if (event.currentTarget.open) setOpenBand(index)
          }}
        >
          <summary>Band {index + 1}</summary>
          <Segmented
            label={`Band ${index + 1} type`}
            value={band.type}
            options={EQ_TYPE_OPTIONS}
            wrap
            onChange={(type) => engine.setEqBand(index, { type })}
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
                onChange={(slope) => engine.setEqBand(index, { slope: Number(slope) as FilterSlope })}
              />
            </>
          ) : null}
          {knobs ? (
            <div className={styles.knobs}>
              <ValueKnob
                label="Freq"
                valueText={
                  band.frequency >= 1000
                    ? `${(band.frequency / 1000).toFixed(2)} kHz`
                    : `${Math.round(band.frequency)} Hz`
                }
                normalized={freqToN(band.frequency)}
                min={20}
                max={20000}
                now={band.frequency}
                onChange={(n) => engine.setEqBand(index, { frequency: nToFreq(n) })}
              />
              {bandUsesGain(band.type) ? (
                <ValueKnob
                  label="Gain"
                  valueText={`${band.gain.toFixed(1)} dB`}
                  normalized={(band.gain + 18) / 36}
                  min={-18}
                  max={18}
                  now={band.gain}
                  onChange={(n) => engine.setEqBand(index, { gain: n * 36 - 18 })}
                />
              ) : null}
              <ValueKnob
                label="Q"
                valueText={band.q.toFixed(2)}
                normalized={qToN(band.q)}
                min={0.1}
                max={20}
                now={band.q}
                onChange={(n) => engine.setEqBand(index, { q: nToQ(n) })}
              />
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
                    engine.setEqBand(index, { frequency: nToFreq(Number(e.target.value)) })
                  }
                />
                <span>
                  {band.frequency >= 1000
                    ? `${(band.frequency / 1000).toFixed(2)} kHz`
                    : `${Math.round(band.frequency)} Hz`}
                </span>
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
            </>
          )}
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
