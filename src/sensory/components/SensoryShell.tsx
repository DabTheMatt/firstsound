import { useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import type { EditState } from '../../app/editorState'
import type { WaveformHandle } from '../../components/waveform/Waveform'
import { Waveform } from '../../components/waveform/Waveform'
import { ModeSwitch } from '../../modes/ModeSwitch'
import type { UiMode } from '../../modes/uiMode'
import { engine } from '../../hooks/useEngine'
import { EMOTIONAL_STATES, emotionalValues, surpriseLabel, surpriseSensoryValues } from '../emotionalStates'
import { PRIMARY_ORBIT_AXES, SECONDARY_FIELD_AXES, SENSORY_AXES, type SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { patchSensoryValue } from '../sensoryState'
import { sensoryVisualState, visualCssVars } from '../visualization/sensoryVisualState'
import { EmotionalStates } from './EmotionalStates'
import { SensoryAxis } from './SensoryAxis'
import { SensoryTransport } from './SensoryTransport'
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
        <p className={styles.mark}>Firstsound</p>
        <button type="button" className={styles.file} onClick={onLoadSample}>
          {snap.fileName || 'Drop a sample'}
        </button>
        <div className={styles.tools}>
          <button type="button" className={styles.ghost} onClick={() => setPlacesOpen((v) => !v)}>
            {moodLabel || 'a place to start'}
          </button>
          <ModeSwitch mode={mode} onChange={onMode} />
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
          <div className={`${styles.orbit} ${styles.orbitBright}`}>{values.brightness >= 0 ? 'brighter' : 'darker'}</div>
          <div className={`${styles.orbit} ${styles.orbitWarm}`}>{values.warmth >= 0 ? 'warmer' : 'colder'}</div>
          <SoundLens
            duration={snap.duration}
            loaded={snap.sampleLoaded}
            visual={visual}
            loop={snap.loop}
            onTogglePlay={() => {
              void engine.unlock().then(() => engine.togglePlay())
            }}
          />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.orbitRow}>
          {PRIMARY_ORBIT_AXES.map((id) => (
            <SensoryAxis
              key={id}
              def={SENSORY_AXES[id]}
              value={values[id]}
              onChange={(v) => setAxis(id, v)}
              onCommit={onCommitSensory}
            />
          ))}
        </div>
        <div className={styles.fieldRow}>
          {SECONDARY_FIELD_AXES.map((id) => (
            <SensoryAxis
              key={id}
              def={SENSORY_AXES[id]}
              value={values[id]}
              onChange={(v) => setAxis(id, v)}
              onCommit={onCommitSensory}
              compact
            />
          ))}
        </div>
        <SensoryTransport
          playing={snap.playing}
          loop={snap.loop}
          disabled={!snap.sampleLoaded}
          onToggleLoop={() => engine.setLoop(!snap.loop)}
        />
      </div>
      {sampleInput}
    </div>
  )
}
