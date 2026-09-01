import { useMemo, useState } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import {
  applyDelayMacro,
  applyReverbMacro,
  delayMacroNormalized,
  reverbMacroNormalized,
} from '../../audio/fx/macros'
import {
  DELAY_PRESET_CATEGORIES,
  defaultPresetFor,
  presetHint,
  presetsFor,
  REVERB_PRESET_CATEGORIES,
  type FxPresetCategory,
} from '../../audio/fx/presets'
import { DELAY_TYPES, NOTE_DIVISIONS, NOTE_KINDS, REVERB_TYPES } from '../../audio/fx/types'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
import { ValueKnob } from '../controls/ValueKnob'
import styles from './Inspector.module.css'

type Props = {
  snap: EngineSnapshot
  kind: 'delay' | 'reverb'
  variant: 'knob' | 'slider'
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
  'reverbPredelay',
  'reverbEarly',
  'reverbDiffusion',
  'reverbDensity',
  'reverbDamping',
  'reverbLowCut',
  'reverbHighCut',
  'reverbWidth',
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

export function SpaceInspector({ snap, kind, variant }: Props) {
  const [advanced, setAdvanced] = useState(false)
  const [category, setCategory] = useState<FxPresetCategory>('Vocals')
  const cats = kind === 'delay' ? DELAY_PRESET_CATEGORIES : REVERB_PRESET_CATEGORIES
  const presets = useMemo(() => presetsFor(kind, category), [kind, category])
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

  const colorNorm =
    kind === 'delay' ? delayMacroNormalized('color', snap.params) : reverbMacroNormalized('color', snap.params)

  return (
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
        Categories load a starting sound. Each chip then switches time, feedback, type and mix.
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
        <Toggle
          pressed={advanced}
          label={advanced ? 'Advanced' : 'Main'}
          onToggle={() => setAdvanced((v) => !v)}
        />
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

      {kind === 'delay' ? params(['spaceMix', 'delayTime', 'delayFeedback']) : params(['reverb', 'reverbSize', 'reverbDecay'])}

      {variant === 'knob' ? (
        <div className={styles.knobs}>
          <ValueKnob
            label="Color"
            valueText={`${Math.round(colorNorm * 100)} %`}
            normalized={colorNorm}
            onChange={(n) =>
              engine.setParams(
                kind === 'delay' ? applyDelayMacro('color', n, snap.params) : applyReverbMacro('color', n, snap.params),
              )
            }
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
              engine.setParams(
                kind === 'delay' ? applyDelayMacro('color', n, snap.params) : applyReverbMacro('color', n, snap.params),
              )
            }}
          />
        </label>
      )}

      <details className={styles.band}>
        <summary>Tempo sync</summary>
        {kind === 'delay' ? (
          <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
        ) : (
          <SyncRow snap={snap} syncId="reverbSync" noteId="reverbNote" kindId="reverbNoteKind" />
        )}
        {params(['bpm'])}
      </details>

      {advanced ? params(kind === 'delay' ? DELAY_ADV : REVERB_ADV) : null}
    </>
  )
}

function SyncRow({
  snap,
  syncId,
  noteId,
  kindId,
}: {
  snap: EngineSnapshot
  syncId: 'delaySync' | 'reverbSync'
  noteId: 'delayNote' | 'reverbNote'
  kindId: 'delayNoteKind' | 'reverbNoteKind'
}) {
  const on = snap.params[syncId] > 0.5
  return (
    <>
      <Toggle pressed={on} label="BPM Sync" onToggle={() => engine.setParam(syncId, on ? 0 : 1)} />
      {on ? (
        <>
          <Segmented
            label="Note"
            value={NOTE_DIVISIONS[Math.round(snap.params[noteId])]?.value ?? '1/4'}
            options={NOTE_DIVISIONS.map((d) => ({ value: d.value, label: d.label }))}
            wrap
            onChange={(v) => engine.setParam(noteId, NOTE_DIVISIONS.findIndex((d) => d.value === v))}
          />
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
