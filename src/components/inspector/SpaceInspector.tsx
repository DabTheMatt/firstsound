import { useMemo, useState } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import {
  applyDelayMacro,
  applyReverbMacro,
  DELAY_MACROS,
  delayMacroNormalized,
  REVERB_MACROS,
  reverbMacroNormalized,
} from '../../audio/fx/macros'
import {
  DELAY_PRESET_CATEGORIES,
  presetsFor,
  REVERB_PRESET_CATEGORIES,
  type FxPresetCategory,
} from '../../audio/fx/presets'
import { DELAY_TYPES, NOTE_DIVISIONS, NOTE_KINDS, REVERB_TYPES } from '../../audio/fx/types'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
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
  'reverbColor',
  'reverbDistance',
]

export function SpaceInspector({ snap, kind, variant }: Props) {
  const [advanced, setAdvanced] = useState(false)
  const [category, setCategory] = useState<FxPresetCategory>(kind === 'delay' ? 'Vocals' : 'Vocals')
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

      <div className={styles.macros}>
        {kind === 'delay'
          ? DELAY_MACROS.map((m) => (
              <ValueKnob
                key={m.id}
                label={m.label}
                valueText={macroText('delay', m.id, snap)}
                normalized={delayMacroNormalized(m.id, snap.params)}
                onChange={(n) => engine.setParams(applyDelayMacro(m.id, n, snap.params))}
              />
            ))
          : REVERB_MACROS.map((m) => (
              <ValueKnob
                key={m.id}
                label={m.label}
                valueText={macroText('reverb', m.id, snap)}
                normalized={reverbMacroNormalized(m.id, snap.params)}
                onChange={(n) => engine.setParams(applyReverbMacro(m.id, n, snap.params))}
              />
            ))}
      </div>

      <div className={styles.row}>
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

      {kind === 'delay' ? (
        <>
          <SyncRow
            snap={snap}
            syncId="delaySync"
            noteId="delayNote"
            kindId="delayNoteKind"
          />
          {params(['delayTime', 'delayFeedback', 'spaceMix', 'bpm'])}
        </>
      ) : (
        <>
          <SyncRow
            snap={snap}
            syncId="reverbSync"
            noteId="reverbNote"
            kindId="reverbNoteKind"
          />
          {params(['reverbSize', 'reverbDecay', 'reverbPredelay', 'reverb', 'bpm'])}
        </>
      )}

      {advanced ? params(kind === 'delay' ? DELAY_ADV : REVERB_ADV) : null}

      <h3 className={styles.sub}>Presets</h3>
      <Segmented
        label="Preset category"
        value={category}
        options={cats.map((c) => ({ value: c, label: c }))}
        wrap
        onChange={(c) => setCategory(c)}
      />
      <div className={styles.presets}>
        {presets.map((p) => (
          <button key={p.id} type="button" className={styles.preset} onClick={() => engine.applySpacePreset(p)}>
            {p.name}
          </button>
        ))}
      </div>
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
      <Toggle
        pressed={on}
        label="BPM Sync"
        onToggle={() => engine.setParam(syncId, on ? 0 : 1)}
      />
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

function macroText(kind: 'delay' | 'reverb', id: string, snap: EngineSnapshot): string {
  if (kind === 'delay') {
    if (id === 'time') return formatParamValue(snap.params.delayTime, PARAMS.delayTime)
    if (id === 'feedback') return formatParamValue(snap.params.delayFeedback, PARAMS.delayFeedback)
    if (id === 'mix') return formatParamValue(snap.params.spaceMix, PARAMS.spaceMix)
    const n = delayMacroNormalized(id as 'color' | 'space' | 'mod', snap.params)
    return `${Math.round(n * 100)} %`
  }
  if (id === 'size') return formatParamValue(snap.params.reverbSize, PARAMS.reverbSize)
  if (id === 'decay') return formatParamValue(snap.params.reverbDecay, PARAMS.reverbDecay)
  if (id === 'mix') return formatParamValue(snap.params.reverb, PARAMS.reverb)
  const n = reverbMacroNormalized(id as 'color' | 'distance' | 'mod', snap.params)
  return `${Math.round(n * 100)} %`
}
