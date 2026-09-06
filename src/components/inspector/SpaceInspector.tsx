import { useMemo, useState } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import {
  DELAY_PRESET_CATEGORIES,
  defaultPresetFor,
  findSpacePreset,
  presetHint,
  presetsFor,
  REVERB_PRESET_CATEGORIES,
  type FxPresetCategory,
} from '../../audio/fx/presets'
import { DELAY_TYPES, NOTE_DIVISIONS, NOTE_KINDS, parseReverbType, REVERB_TYPES } from '../../audio/fx/types'
import { isDelayStereo, isReverbStereo } from '../../audio/fx/spaceModel'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamControl } from '../controls/ParamControl'
import { Segmented } from '../controls/Segmented'
import { Toggle } from '../controls/Toggle'
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
        <label className={styles.field}>
          Reverb type
          <select
            className={`${styles.select} ${styles.selectOn}`}
            aria-label="Reverb type"
            value={snap.reverbType}
            onChange={(event) => {
              const type = parseReverbType(event.target.value)
              if (type) engine.setReverbType(type)
            }}
          >
            {REVERB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <h3 className={styles.sub}>Presets</h3>
      {kind === 'delay' ? (
        <>
          <p className={styles.help}>
            Categories load a starting sound. Delay type sets analog / tape / digital tone (filters, drive, wow) without changing Time or Dry/Wet. Dry and Wet are independent unless Correlate is on. Feedback stays below unity so each repeat fades.
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
        </>
      ) : (
        <>
          <p className={styles.help}>
            Pick a category, then a space. Dry and Wet stay complementary when Correlate is on. Stereo In 0% sums the sample first (clean space from a mono file).
          </p>
          <ReverbPresetSelect snap={snap} />
        </>
      )}

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
            wrap
            onChange={(v) => engine.setParam('delayStereo', v === 'stereo' ? 1 : 0)}
          />
          {delayStereo ? (
            <div className={styles.lrGrid}>
              <section className={styles.lrCol} aria-label="Delay left">
                <div className={styles.lrHead}>
                  <h3 className={styles.sub}>Left</h3>
                  <span className={styles.lrTime}>{formatParamValue(snap.params.delayTime, PARAMS.delayTime)}</span>
                </div>
                {params(['delayDry', 'delayWet', 'delayTime', 'delayFeedback'])}
                <div className={styles.syncCluster}>
                  <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
                </div>
              </section>
              <section className={styles.lrCol} aria-label="Delay right">
                <div className={styles.lrHead}>
                  <h3 className={styles.sub}>Right</h3>
                  <span className={styles.lrTime}>{formatParamValue(snap.params.delayTimeR, PARAMS.delayTimeR)}</span>
                </div>
                {params(['delayDryR', 'delayWetR', 'delayTimeR', 'delayFeedbackR'])}
                <div className={styles.syncCluster}>
                  <SyncRow snap={snap} syncId="delaySyncR" noteId="delayNoteR" kindId="delayNoteKindR" />
                </div>
              </section>
            </div>
          ) : (
            <>
              {params(['delayDry', 'delayWet', 'delayFeedback', 'delayTime'])}
              <div className={styles.syncCluster}>
                <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" />
              </div>
            </>
          )}
          <div className={styles.row}>
            <Toggle
              pressed={snap.params.delayCorrelate > 0.5}
              label="Correlate"
              onToggle={() => engine.setParam('delayCorrelate', snap.params.delayCorrelate > 0.5 ? 0 : 1)}
            />
          </div>
          <p className={styles.help}>
            Correlate keeps Dry + Wet at 100%. Turn it off to set the two levels independently (can get loud).
          </p>
        </>
      ) : (
        <>
          <DryWetPair
            snap={snap}
            variant={variant}
            dryId="reverbDry"
            wetId="reverbWet"
            correlateId="reverbCorrelate"
          />
          {params(['reverbSize', 'reverbDecay'])}
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
          <h3 className={styles.sub}>Tone</h3>
          <p className={styles.help}>
            Simple EQ on the wet path: Low Cut removes rumble, High Cut tames air, High Damp rolls off the tail.
          </p>
          {params(['reverbLowCut', 'reverbHighCut', 'reverbDamping'])}
        </>
      )}
      <FxLfoSection snap={snap} kind={kind} variant={variant} />
    </>
  )
}

function ReverbPresetSelect({ snap }: { snap: EngineSnapshot }) {
  const selected = snap.spacePresetId ? findSpacePreset(snap.spacePresetId) : undefined
  const current = selected?.kind === 'reverb' ? selected : undefined
  return (
    <>
      <label className={styles.field}>
        Reverb preset
        <select
          className={`${styles.select} ${current ? styles.selectOn : ''}`}
          aria-label="Reverb preset"
          value={current?.id ?? ''}
          onChange={(event) => {
            const preset = findSpacePreset(event.target.value)
            if (preset) engine.applySpacePreset(preset)
          }}
        >
          <option value="" disabled>
            Choose a space
          </option>
          {REVERB_PRESET_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {presetsFor('reverb', cat).map((p) => (
                <option key={p.id} value={p.id} title={presetHint(p)}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {current ? (
        <p className={styles.selectCurrent}>
          {current.category} · {current.name}
        </p>
      ) : (
        <p className={styles.help}>No factory space selected.</p>
      )}
      {current ? <p className={styles.help}>{presetHint(current)}</p> : null}
    </>
  )
}

function DryWetPair({
  snap,
  variant,
  dryId,
  wetId,
  correlateId,
}: {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  dryId: 'reverbDry'
  wetId: 'reverbWet'
  correlateId: 'reverbCorrelate'
}) {
  const linked = snap.params[correlateId] > 0.5
  return (
    <>
      <div className={styles.mixRow}>
        <ParamControl id={dryId} value={snap.params[dryId]} variant={variant} linked={linked} />
        <button
          type="button"
          className={`${styles.correlate} ${linked ? styles.correlateOn : ''}`}
          aria-pressed={linked}
          aria-label="Correlate Dry and Wet"
          title={linked ? 'Correlate on — Dry + Wet stay at 100%' : 'Correlate off — Dry and Wet are independent'}
          onClick={() => engine.setParam(correlateId, linked ? 0 : 1)}
        >
          <CorrelateIcon />
        </button>
        <ParamControl id={wetId} value={snap.params[wetId]} variant={variant} linked={linked} />
      </div>
      <p className={styles.help}>
        The link keeps Dry + Wet at 100%. Turn it off to set the two levels independently (can get loud).
      </p>
    </>
  )
}

function CorrelateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M7.2 10.8 10.8 7.2M6.3 8.1a2.4 2.4 0 0 1 0-3.4l1.2-1.2a2.4 2.4 0 0 1 3.4 3.4L9.9 8M11.7 9.9a2.4 2.4 0 0 1 0 3.4l-1.2 1.2a2.4 2.4 0 1 1-3.4-3.4L8.1 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
