import { useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import type { EditState } from '../../app/editorState'
import type { WaveformHandle } from '../../components/waveform/Waveform'
import { Waveform } from '../../components/waveform/Waveform'
import { ModeSwitch } from '../../modes/ModeSwitch'
import type { UiMode } from '../../modes/uiMode'
import { engine } from '../../hooks/useEngine'
import { EMOTIONAL_STATES, emotionalValues, surpriseLabel, surpriseSensoryValues } from '../emotionalStates'
import { SENSORY_DIALS, type SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { patchSensoryValue } from '../sensoryState'
import { sensoryVisualState, visualCssVars } from '../visualization/sensoryVisualState'
import { EmotionalStates } from './EmotionalStates'
import { PlayheadClock } from './PlayheadClock'
import { SensoryDial } from './SensoryDial'
import { SoundLens } from './SoundLens'
import styles from './SensoryShell.module.css'

type Props = {
  snap: EngineSnapshot
  edit: EditState
  waveRef: RefObject<WaveformHandle | null>
  menuOpen: boolean
  onToggleMenu: () => void
  menu: ReactNode
  dragging: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (file: File) => void
  onLoadSample: () => void
  onLoadDemo: () => void
  onSave: () => void
  onRecord: () => void
  onRegionCommit: () => void
  onFades: (patch: Partial<EditState>) => void
  onFadesCommit: () => void
  mode: UiMode
  onMode: (mode: UiMode) => void
  values: SensoryValues
  onValues: (values: SensoryValues) => void
  onCommitSensory: () => void
  moodLabel: string | null
  onMoodLabel: (label: string | null) => void
  sampleInput?: ReactNode
}

export function SensoryShell({
  snap,
  edit,
  waveRef,
  menuOpen,
  onToggleMenu,
  menu,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onLoadSample,
  onLoadDemo,
  onSave,
  onRecord,
  onRegionCommit,
  onFades,
  onFadesCommit,
  mode,
  onMode,
  values,
  onValues,
  onCommitSensory,
  moodLabel,
  onMoodLabel,
  sampleInput = null,
}: Props) {
  const [placesOpen, setPlacesOpen] = useState(false)
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const visual = sensoryVisualState(values, reduced)
  const cssVars = visualCssVars(visual)
  const leftDials = SENSORY_DIALS.slice(0, 3)
  const rightDials = SENSORY_DIALS.slice(3)

  const setAxis = (id: SensoryAxisId, value: number) => {
    onMoodLabel(null)
    onValues(patchSensoryValue(values, id, value))
  }

  return (
    <div
      className={`${styles.page} ${dragging ? styles.drop : ''}`}
      style={cssVars as CSSProperties}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) onDrop(file)
      }}
    >
      <header className={styles.top}>
        <ModeSwitch variant="editorial" mode={mode} onChange={onMode} />
        <div className={styles.brand}>
          <p className={styles.mark}>Firstsound</p>
          <p className={styles.tag}>Same sound. A deeper you.</p>
        </div>
        <div className={styles.tools}>
          <button type="button" className={styles.textBtn} onClick={onLoadSample}>
            Open
          </button>
          <button type="button" className={styles.textBtn} onClick={onSave}>
            Save
          </button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Menu"
            aria-expanded={menuOpen}
            data-settings-toggle=""
            onClick={onToggleMenu}
          >
            ···
          </button>
        </div>
      </header>
      {menuOpen ? menu : null}

      <div className={styles.stage}>
        <Waveform
          ref={waveRef}
          key={`${snap.fileName || 'empty'}:${snap.duration.toFixed(6)}:sensory`}
          duration={snap.duration}
          start={snap.params.start}
          end={snap.params.end}
          loaded={snap.sampleLoaded}
          tool="select"
          viz="waveform"
          fadeIn={edit.fadeIn}
          fadeOut={edit.fadeOut}
          fadeCurve={edit.fadeCurve}
          fadeInBend={edit.fadeInBend}
          fadeOutBend={edit.fadeOutBend}
          fadeFocus={edit.fadeFocus}
          autoSnap={edit.autoSnap}
          normalizeView={false}
          onNormalizeView={() => undefined}
          onZoomLabel={() => undefined}
          onLoadDemo={onLoadDemo}
          onRegionCommit={onRegionCommit}
          onFades={onFades}
          onFadesCommit={onFadesCommit}
          contentRev={snap.bufferRev}
          appearance="sensory"
          followPlayhead
          emptyLabel="Drop a sample. Listen closer."
        />
        <div className={styles.lensWrap}>
          <SoundLens
            duration={snap.duration}
            loaded={snap.sampleLoaded}
            visual={visual}
            loop={snap.loop}
            onTogglePlay={() => {
              void engine.unlock().then(() => engine.togglePlay())
            }}
          />
          <PlayheadClock duration={snap.duration} />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.dials}>
          {leftDials.map((spec) => (
            <SensoryDial
              key={`${spec.axis}-${spec.pole}`}
              spec={spec}
              axisValue={values[spec.axis]}
              onChange={(v) => setAxis(spec.axis, v)}
              onCommit={onCommitSensory}
            />
          ))}
          <button
            type="button"
            className={styles.play}
            disabled={!snap.sampleLoaded}
            aria-label={snap.playing ? 'Pause' : 'Play'}
            onClick={() => {
              void engine.unlock().then(() => engine.togglePlay())
            }}
          >
            {snap.playing ? (
              <span className={styles.pause} aria-hidden="true" />
            ) : (
              <span className={styles.tri} aria-hidden="true" />
            )}
          </button>
          {rightDials.map((spec) => (
            <SensoryDial
              key={`${spec.axis}-${spec.pole}`}
              spec={spec}
              axisValue={values[spec.axis]}
              onChange={(v) => setAxis(spec.axis, v)}
              onCommit={onCommitSensory}
            />
          ))}
        </div>
      </div>

      <footer className={styles.foot}>
        <p className={styles.guide}>
          Drag. Listen. Feel.
          <span>Shape the sound, not the settings.</span>
        </p>
        <p className={styles.script}>sound is a feeling</p>
        <div className={styles.links}>
          <button type="button" className={styles.textBtn} onClick={onLoadSample}>
            Samples
          </button>
          <button type="button" className={styles.textBtn} onClick={() => setPlacesOpen((v) => !v)}>
            {moodLabel || 'Presets'}
          </button>
          <button
            type="button"
            className={`${styles.textBtn} ${snap.recording ? styles.recOn : ''}`}
            onClick={onRecord}
          >
            Rec
          </button>
        </div>
      </footer>
      <EmotionalStates
        open={placesOpen}
        onPick={(id) => {
          const next = emotionalValues(id)
          onValues(next)
          onMoodLabel(EMOTIONAL_STATES.find((s) => s.id === id)?.label ?? id)
          setPlacesOpen(false)
          onCommitSensory()
        }}
        onSurprise={() => {
          const next = surpriseSensoryValues()
          onValues(next)
          onMoodLabel(surpriseLabel(next))
          setPlacesOpen(false)
          onCommitSensory()
        }}
      />
      {sampleInput}
    </div>
  )
}
