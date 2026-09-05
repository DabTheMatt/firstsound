import { useMemo, useState } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { applyReverbMacro, reverbMacroNormalized } from '../../audio/fx/macros'
import {
  DELAY_PRESET_CATEGORIES,
  defaultPresetFor,
  presetHint,
  presetsFor,
  REVERB_PRESET_CATEGORIES,
  type FxPresetCategory,
} from '../../audio/fx/presets'
import { DELAY_TYPES, NOTE_DIVISIONS, NOTE_KINDS, REVERB_TYPES } from '../../audio/fx/types'
import { isDelayStereo, isReverbStereo } from '../../audio/fx/spaceModel'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { ValueKnob } from '../controls/ValueKnob'
import { FxLfoSection } from './FxLfoSection'
import styles from './Inspector.module.css'

type Props = {
  snap: EngineSnapshot
  kind: 'delay' | 'reverb'
  variant: 'knob' | 'slider'
  pane: 'main' | 'advanced'
}

const DELAY_ADV: ParamId[] = [
  'delayHp',
  'delayLp',
  'delayDrive',
  'delayModRate',
  'delayModDepth',
  'delayWow',
  'delayFlutter',
  'delayDiffusion',
  'delayPitch',
  'delayReverse',
  'delayDuck',
  'delayDrift',
  'delayWidth',
  'delayPan',
  'delayOffset',
]

const REVERB_ADV: ParamId[] = [
  'reverbInput',
  'reverbOffset',
  'reverbPan',
  'reverbPredelay',
  'reverbEarly',
  'reverbDiffusion',
  'reverbDensity',
  'reverbDamping',
  'reverbLowCut',
  'reverbHighCut',
  'reverbModRate',
  'reverbModDepth',
  'reverbShimmerPitch',
  'reverbShimmer',
  'reverbDrive',
  'reverbDuck',
  'reverbGate',
  'reverbGateThres',
  'reverbGateAttack',
  'reverbGateHold',
  'reverbGateRelease',
  'reverbReverse',
  'reverbDistance',
]

export function SpaceInspector({ snap, kind, variant, pane }: Props) {
  const [category, setCategory] = useState<FxPresetCategory>('Vocals')
  const cats = kind === 'delay' ? DELAY_PRESET_CATEGORIES : REVERB_PRESET_CATEGORIES
  const presets = useMemo(() => presetsFor(kind, category), [kind, category])
  const delayStereo = isDelayStereo(snap.params)
  const reverbStereo = isReverbStereo(snap.params)
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

  const colorNorm = reverbMacroNormalized('color', snap.params)

  return pane === 'advanced' ? (
    <>
      <details className={styles.band} open>
        <summary>Tempo sync</summary>
        <p className={styles.help}>Uses the sample tempo from Input. Detect or tap it there, then sync delay notes to it.</p>
        {kind === 'delay' ? (
          <>
            <p className={styles.help}>{delayStereo ? 'Left and right can sync to different notes.' : 'One time for both channels.'}</p>
            <SyncRow snap={snap} label={delayStereo ? 'Left' : 'Delay'} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
            {delayStereo ? (
              <SyncRow snap={snap} label="Right" syncId="delaySyncR" noteId="delayNoteR" kindId="delayNoteKindR" />
            ) : null}
          </>
        ) : (
          <SyncRow snap={snap} syncId="reverbSync" noteId="reverbNote" kindId="reverbNoteKind" />
        )}
        {params(['bpm'])}
      </details>
      {params(kind === 'delay' ? DELAY_ADV : REVERB_ADV)}
      <FxLfoSection snap={snap} kind={kind} variant={variant} />
    </>
  ) : (
    <>
      {kind === 'delay' ? (
        <Segmented
          label="Delay type"
          value={snap.delayType}
          options={DELAY_TYPES}
          wrap
          onChange={(v) => engine.setDelayType(v)}
        />
      ) : (
        <Segmented
          label="Reverb type"
          value={snap.reverbType}
          options={REVERB_TYPES}
          wrap
          onChange={(v) => engine.setReverbType(v)}
        />
      )}

      <h3 className={styles.sub}>Presets</h3>
      <p className={styles.help}>
        {kind === 'delay'
          ? 'Categories load a starting sound. Delay type sets analog / tape / digital tone (filters, drive, wow) without changing Time or Mix. Feedback stays below unity so each repeat fades.'
          : 'Categories load a starting space. Mix is dry/wet. Mono collapses the tail; Stereo keeps Width, L/R offset, and a stereo tank. Stereo In 0% sums the sample first (clean space from a mono file).'}
      </p>
      <Segmented
        label="Preset category"
        value={category}
        options={cats.map((c) => ({ value: c, label: c }))}
        wrap
        onChange={(c) => {
          setCategory(c)
          const preset = defaultPresetFor(kind, c)
          if (preset) engine.applySpacePreset(preset)
        }}
      />
      <div className={styles.presets}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.preset} ${snap.spacePresetId === p.id ? styles.presetOn : ''}`}
            title={presetHint(p)}
            onClick={() => engine.applySpacePreset(p)}
          >
            <span>{p.name}</span>
            <em>{presetHint(p)}</em>
          </button>
        ))}
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.ghost} onClick={() => engine.killFx(kind)}>
          Kill {kind}
        </button>
        {kind === 'delay' ? (
          <Toggle
            pressed={snap.params.delayFreeze > 0.5}
            label="Freeze"
            onToggle={() => engine.setParam('delayFreeze', snap.params.delayFreeze > 0.5 ? 0 : 1)}
          />
        ) : (
          <Toggle
            pressed={snap.params.reverbFreeze > 0.5}
            label="Freeze"
            onToggle={() => engine.setParam('reverbFreeze', snap.params.reverbFreeze > 0.5 ? 0 : 1)}
          />
        )}
      </div>

      {kind === 'delay' ? (
        <>
          <Segmented
            label="Channels"
            value={delayStereo ? 'stereo' : 'mono'}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'stereo', label: 'Stereo' },
            ]}
            onChange={(v) => engine.setParam('delayStereo', v === 'stereo' ? 1 : 0)}
          />
          {delayStereo ? (
            <div className={styles.lrGrid}>
              <section className={styles.lrCol} aria-label="Delay left">
                <h3 className={styles.sub}>Left</h3>
                {params(['delayTime', 'delayWet', 'delayFeedback'])}
                <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
              </section>
              <section className={styles.lrCol} aria-label="Delay right">
                <h3 className={styles.sub}>Right</h3>
                {params(['delayTimeR', 'delayWetR', 'delayFeedbackR'])}
                <SyncRow snap={snap} syncId="delaySyncR" noteId="delayNoteR" kindId="delayNoteKindR" />
              </section>
            </div>
          ) : (
            <>
              {params(['delayWet', 'delayFeedback', 'delayTime'])}
              <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
            </>
          )}
        </>
      ) : (
        <>
          {params(['reverbWet', 'reverbSize', 'reverbDecay'])}
          <h3 className={styles.sub}>Channels</h3>
          <Segmented
            label="Channels"
            value={reverbStereo ? 'stereo' : 'mono'}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'stereo', label: 'Stereo' },
            ]}
            wrap
            onChange={(v) => engine.setParam('reverbStereo', v === 'stereo' ? 1 : 0)}
          />
          {reverbStereo ? (
            <p className={styles.help}>Width 0% is still a mono tail; 200% is extra-wide. Stereo In and L/R Offset live in Advanced.</p>
          ) : (
            <p className={styles.help}>Mono sums the send and collapses the tail — glue for a sample that should stay centered.</p>
          )}
          {reverbStereo ? params(['reverbWidth']) : null}
          <p className={styles.help}>
            Color tilts tone: lower is darker (closes the low-pass, opens the high-pass). 0% is fully dark.
          </p>
          {variant === 'knob' ? (
            <div className={styles.knobs}>
              <ValueKnob
                label="Color"
                valueText={`${Math.round(colorNorm * 100)} %`}
                normalized={colorNorm}
                onChange={(n) => engine.setParams(applyReverbMacro('color', n, snap.params))}
              />
            </div>
          ) : (
            <label className={styles.field}>
              Color
              <input
                className={styles.range}
                type="range"
                min={0}
                max={100}
                value={Math.round(colorNorm * 100)}
                aria-label="Color"
                onChange={(e) => {
                  const n = Number(e.target.value) / 100
                  engine.setParams(applyReverbMacro('color', n, snap.params))
                }}
              />
            </label>
          )}
        </>
      )}
      <FxLfoSection snap={snap} kind={kind} variant={variant} />
    </>
  )
}

function SyncRow({
  snap,
  label,
  syncId,
  noteId,
  kindId,
}: {
  snap: EngineSnapshot
  label?: string
  syncId: 'delaySync' | 'delaySyncR' | 'reverbSync'
  noteId: 'delayNote' | 'delayNoteR' | 'reverbNote'
  kindId: 'delayNoteKind' | 'delayNoteKindR' | 'reverbNoteKind'
}) {
  const on = snap.params[syncId] > 0.5
  return (
    <>
      <Toggle
        pressed={on}
        label={label ? `${label} BPM Sync` : 'BPM Sync'}
        onToggle={() => engine.setParam(syncId, on ? 0 : 1)}
      />
      {on ? (
        <>
          <label className={styles.field}>
            Note
            <select
              className={styles.select}
              aria-label={label ? `${label} note` : 'Note'}
              value={NOTE_DIVISIONS[Math.round(snap.params[noteId])]?.value ?? '1/4'}
              onChange={(event) =>
                engine.setParam(noteId, NOTE_DIVISIONS.findIndex((d) => d.value === event.target.value))
              }
            >
              {NOTE_DIVISIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Feel"
            value={NOTE_KINDS[Math.round(snap.params[kindId])]?.value ?? 'straight'}
            options={NOTE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
            wrap
            onChange={(v) => engine.setParam(kindId, NOTE_KINDS.findIndex((k) => k.value === v))}
          />
        </>
      ) : null}
    </>
  )
}
