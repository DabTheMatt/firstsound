import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { EFFECT_DEFAULT_ID, paramsMatchDefaults } from '../../audio/fx/effectDefaults'
import {
  findSpacePreset,
  presetHint,
  presetsForReverbType,
  presetsForDelayType,
} from '../../audio/fx/presets'
import {
  DELAY_TYPES,
  NOTE_DIVISIONS,
  NOTE_KINDS,
  parseDelayType,
  parseReverbType,
  REVERB_TYPES,
  type NoteKind,
} from '../../audio/fx/types'
import { isDelayStereo, isReverbStereo } from '../../audio/fx/spaceModel'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { ParamControl } from '../controls/ParamControl'
import { PlugGlyph } from '../controls/PlugGlyph'
import { RhythmSwitch } from '../controls/RhythmSwitch'
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
            <SyncRow snap={snap} label={delayStereo ? 'Left' : 'Delay'} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" rhythm="rotary" />
            {delayStereo ? (
              <SyncRow snap={snap} label="Right" syncId="delaySyncR" noteId="delayNoteR" kindId="delayNoteKindR" rhythm="rotary" />
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
        <label className={styles.field}>
          Delay type
          <select
            className={`${styles.select} ${styles.selectOn}`}
            aria-label="Delay type"
            value={snap.delayType}
            onChange={(event) => {
              const type = parseDelayType(event.target.value)
              if (type) engine.setDelayType(type)
            }}
          >
            {DELAY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
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

      {kind === 'delay' ? (
        <>
          <p className={styles.help}>
            Type sets analog / tape / digital tone. The preset list shows only factory delays for that type. Dry and Wet stay complementary when Correlate is on.
          </p>
          <DelayPresetSelect snap={snap} />
        </>
      ) : (
        <>
          <p className={styles.help}>
            Type picks the algorithm. Preset lists only factory spaces for that type. Custom has no factory list — set the knobs yourself. Dry and Wet stay complementary when Correlate is on. Stereo In 0% sums the sample first (clean space from a mono file).
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
                <DryWetPair
                  snap={snap}
                  variant={variant}
                  dryId="delayDry"
                  wetId="delayWet"
                  correlateId="delayCorrelate"
                  layout="vertical"
                  showHelp={false}
                />
                {params(['delayTime'])}
                <div className={styles.syncCluster}>
                  <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" rhythm="rotary" />
                </div>
              </section>
              <div className={styles.lrLinkCol}>
                <LrLinkButton linked={snap.params.delayLinkLR > 0.5} />
              </div>
              <section className={styles.lrCol} aria-label="Delay right">
                <div className={styles.lrHead}>
                  <h3 className={styles.sub}>Right</h3>
                  <span className={styles.lrTime}>{formatParamValue(snap.params.delayTimeR, PARAMS.delayTimeR)}</span>
                </div>
                <DryWetPair
                  snap={snap}
                  variant={variant}
                  dryId="delayDryR"
                  wetId="delayWetR"
                  correlateId="delayCorrelate"
                  layout="vertical"
                  showHelp={false}
                />
                {params(['delayTimeR'])}
                <div className={styles.syncCluster}>
                  <SyncRow snap={snap} syncId="delaySyncR" noteId="delayNoteR" kindId="delayNoteKindR" rhythm="rotary" />
                </div>
              </section>
            </div>
          ) : (
            <>
              <DryWetPair
                snap={snap}
                variant={variant}
                dryId="delayDry"
                wetId="delayWet"
                correlateId="delayCorrelate"
                layout="vertical"
                showHelp={false}
              />
              {params(['delayTime'])}
              <div className={styles.syncCluster}>
                <SyncRow snap={snap} syncId="delaySync" noteId="delayNote" kindId="delayNoteKind" rhythm="rotary" />
              </div>
            </>
          )}
          <div className={styles.feedbackRow}>{params(['delayFeedback'])}</div>
          <p className={styles.help}>
            The link keeps Dry + Wet at 100%. Turn it off to set the two levels independently (can get loud).
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

function lfoResting(snap: EngineSnapshot, kind: 'delay' | 'reverb'): boolean {
  return !snap.fxLfos[kind].some((slot) => slot.target)
}

function DelayPresetSelect({ snap }: { snap: EngineSnapshot }) {
  const selected = snap.spacePresetId ? findSpacePreset(snap.spacePresetId) : undefined
  const matchesType = selected?.kind === 'delay' && selected.delayType === snap.delayType
  const current = matchesType ? selected : undefined
  const typePresets = presetsForDelayType(snap.delayType)
  const atDefault =
    !current && paramsMatchDefaults(snap.params, 'delay') && snap.delayType === 'digital' && lfoResting(snap, 'delay')
  return (
    <>
      <label className={styles.field}>
        Delay presets
        <select
          className={`${styles.select} ${current || atDefault ? styles.selectOn : ''}`}
          aria-label="Delay presets"
          value={current?.id ?? (atDefault ? EFFECT_DEFAULT_ID : '')}
          onChange={(event) => {
            if (event.target.value === EFFECT_DEFAULT_ID) {
              engine.resetEffect('delay')
              return
            }
            const preset = findSpacePreset(event.target.value)
            if (preset) engine.applySpacePreset(preset)
          }}
        >
          <option value="" disabled>
            {typePresets.length === 0 ? 'No factory delays' : 'Choose a delay'}
          </option>
          <option value={EFFECT_DEFAULT_ID}>Default</option>
          {typePresets.map((p) => (
            <option key={p.id} value={p.id} title={presetHint(p)}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {current ? (
        <p className={styles.selectCurrent}>
          {current.category} · {current.name}
        </p>
      ) : atDefault ? (
        <p className={styles.selectCurrent}>Default</p>
      ) : (
        <p className={styles.help}>No factory delay selected for this type.</p>
      )}
      {current ? <p className={styles.help}>{presetHint(current)}</p> : null}
    </>
  )
}

function ReverbPresetSelect({ snap }: { snap: EngineSnapshot }) {
  const selected = snap.spacePresetId ? findSpacePreset(snap.spacePresetId) : undefined
  const matchesType = selected?.kind === 'reverb' && selected.reverbType === snap.reverbType
  const current = matchesType ? selected : undefined
  const typePresets = presetsForReverbType(snap.reverbType)
  const custom = snap.reverbType === 'custom'
  const atDefault =
    !current && paramsMatchDefaults(snap.params, 'reverb') && snap.reverbType === 'hall' && lfoResting(snap, 'reverb')
  return (
    <>
      <label className={styles.field}>
        Reverb presets
        <select
          className={`${styles.select} ${current || atDefault ? styles.selectOn : ''}`}
          aria-label="Reverb presets"
          value={current?.id ?? (atDefault ? EFFECT_DEFAULT_ID : '')}
          onChange={(event) => {
            if (event.target.value === EFFECT_DEFAULT_ID) {
              engine.resetEffect('reverb')
              return
            }
            const preset = findSpacePreset(event.target.value)
            if (preset) engine.applySpacePreset(preset)
          }}
        >
          <option value="" disabled>
            {custom ? 'Custom' : typePresets.length === 0 ? 'No factory spaces' : 'Choose a space'}
          </option>
          <option value={EFFECT_DEFAULT_ID}>Default</option>
          {typePresets.map((p) => (
            <option key={p.id} value={p.id} title={presetHint(p)}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {current ? (
        <p className={styles.selectCurrent}>
          {current.category} · {current.name}
        </p>
      ) : atDefault ? (
        <p className={styles.selectCurrent}>Default</p>
      ) : custom ? (
        <p className={styles.help}>Custom space — knobs are not a factory preset.</p>
      ) : (
        <p className={styles.help}>No factory space selected for this type.</p>
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
  layout = 'horizontal',
  showHelp = true,
}: {
  snap: EngineSnapshot
  variant: 'knob' | 'slider'
  dryId: 'reverbDry' | 'delayDry' | 'delayDryR'
  wetId: 'reverbWet' | 'delayWet' | 'delayWetR'
  correlateId: 'reverbCorrelate' | 'delayCorrelate'
  layout?: 'horizontal' | 'vertical'
  showHelp?: boolean
}) {
  const linked = snap.params[correlateId] > 0.5
  const vertical = layout === 'vertical'
  const dashClass = vertical
    ? `${styles.mixDashVert} ${linked ? styles.mixDashVertOn : ''}`
    : `${styles.mixDash} ${linked ? styles.mixDashOn : ''}`
  const linkClass = vertical
    ? `${styles.mixLinkVert} ${variant === 'slider' ? styles.mixLinkVertSlider : ''}`
    : `${styles.mixLink} ${variant === 'slider' ? styles.mixLinkSlider : ''}`
  return (
    <>
      <div className={vertical ? styles.mixCol : styles.mixRow}>
        <ParamControl id={dryId} value={snap.params[dryId]} variant={variant} />
        <div className={linkClass}>
          <span className={dashClass} />
          <button
            type="button"
            className={`${styles.correlate} ${linked ? styles.correlateOn : ''}`}
            aria-pressed={linked}
            aria-label="Correlate Dry and Wet"
            title={linked ? 'Correlate on — Dry + Wet stay at 100%' : 'Correlate off — Dry and Wet are independent'}
            onClick={() => engine.setParam(correlateId, linked ? 0 : 1)}
          >
            <PlugGlyph />
          </button>
          <span className={dashClass} />
        </div>
        <ParamControl id={wetId} value={snap.params[wetId]} variant={variant} />
      </div>
      {showHelp ? (
        <p className={styles.help}>
          The link keeps Dry + Wet at 100%. Turn it off to set the two levels independently (can get loud).
        </p>
      ) : null}
    </>
  )
}

function LrLinkButton({ linked }: { linked: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.lrLink} ${linked ? styles.lrLinkOn : ''}`}
      aria-pressed={linked}
      aria-label={linked ? 'Left and right linked' : 'Left and right unlinked'}
      title={linked ? 'Linked — left and right move together' : 'Unlinked — left and right are independent'}
      onClick={() => engine.setParam('delayLinkLR', linked ? 0 : 1)}
    >
      <ChainGlyph linked={linked} />
      <span className={styles.lrLinkWord}>
        <span className={linked ? undefined : styles.lrLinkHidden}>LINKED</span>
        <span className={linked ? styles.lrLinkHidden : undefined}>UNLINKED</span>
      </span>
    </button>
  )
}

function ChainGlyph({ linked }: { linked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={linked ? 'M5.2 6.2 h5.6 a2.2 2.2 0 0 1 0 4.4 H5.2 a2.2 2.2 0 0 1 0 -4.4 z' : 'M2.2 6.2 h4.2 a2.2 2.2 0 0 1 0 4.4 H2.2'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {linked ? null : (
        <path d="M9.6 6.2 h4.2 a2.2 2.2 0 0 1 0 4.4 H9.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  )
}

function SyncRow({
  snap,
  label,
  syncId,
  noteId,
  kindId,
  rhythm = 'segmented',
}: {
  snap: EngineSnapshot
  label?: string
  syncId: 'delaySync' | 'delaySyncR' | 'reverbSync'
  noteId: 'delayNote' | 'delayNoteR' | 'reverbNote'
  kindId: 'delayNoteKind' | 'delayNoteKindR' | 'reverbNoteKind'
  rhythm?: 'rotary' | 'segmented'
}) {
  const on = snap.params[syncId] > 0.5
  const kind = (NOTE_KINDS[Math.round(snap.params[kindId])]?.value ?? 'straight') as NoteKind
  const noteLabel = label ? `${label} note` : 'Note'
  const division = NOTE_DIVISIONS[Math.round(snap.params[noteId])]?.value ?? '1/4'
  const setNote = (value: string) =>
    engine.setParam(noteId, NOTE_DIVISIONS.findIndex((d) => d.value === value))
  return (
    <>
      <Toggle
        pressed={on}
        label={label ? `${label} BPM Sync` : 'BPM Sync'}
        onToggle={() => engine.setParam(syncId, on ? 0 : 1)}
      />
      {rhythm === 'rotary' ? (
        <div className={`${styles.noteBlock} ${on ? '' : styles.noteBlockOff}`}>
          <span className={styles.noteKicker}>Note</span>
          <select
            className={styles.noteValue}
            aria-label={noteLabel}
            disabled={!on}
            value={division}
            onChange={(event) => setNote(event.target.value)}
          >
            {NOTE_DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <RhythmSwitch
            value={kind}
            disabled={!on}
            onChange={(next) => engine.setParam(kindId, NOTE_KINDS.findIndex((k) => k.value === next))}
          />
        </div>
      ) : on ? (
        <>
          <label className={styles.field}>
            Note
            <select
              className={styles.select}
              aria-label={noteLabel}
              value={division}
              onChange={(event) => setNote(event.target.value)}
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
            value={kind}
            options={NOTE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
            wrap
            onChange={(v) => engine.setParam(kindId, NOTE_KINDS.findIndex((k) => k.value === v))}
          />
        </>
      ) : null}
    </>
  )
}
