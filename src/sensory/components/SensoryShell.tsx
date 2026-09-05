import { useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import type { EditState } from '../../app/editorState'
import type { WaveformHandle } from '../../components/waveform/Waveform'
import { Waveform } from '../../components/waveform/Waveform'
import { ModeSwitch } from '../../modes/ModeSwitch'
import type { UiMode } from '../../modes/uiMode'
import { engine } from '../../hooks/useEngine'
import { EMOTIONAL_STATES, emotionalValues, surpriseLabel, surpriseSensoryValues } from '../emotionalStates'
import { SENSORY_AXIS_IDS, type SensoryAxisId } from '../sensoryParameters'
import { persistSensoryScene, readStoredSensoryScene, type SensorySceneId } from '../sensoryScene'
import type { SensoryValues } from '../sensoryState'
import { lensWindowSeconds } from '../visualization/lensWindow'
import { sensoryVisualState, visualCssVars } from '../visualization/sensoryVisualState'
import { EmotionalStates } from './EmotionalStates'
import { FeelingRail } from './FeelingRail'
import { OverviewStrip } from './OverviewStrip'
import { PlayheadClock } from './PlayheadClock'
import { SensoryThemePicker } from './SensoryThemePicker'
import { SoundLens } from './SoundLens'
import { SoundRange } from './SoundRange'
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
  onLoadSample: _onLoadSample,
  onLoadDemo,
  onSave: _onSave,
  onRecord: _onRecord,
  onRegionCommit,
  onFades,
  onFadesCommit,
  mode,
  onMode,
  values,
  onValues,
  onCommitSensory,
  moodLabel: _moodLabel,
  onMoodLabel,
  sampleInput = null,
}: Props) {
  const [placesOpen, setPlacesOpen] = useState(false)
  const [windowAmount, setWindowAmount] = useState(0)
  const [scene, setScene] = useState<SensorySceneId>(() => readStoredSensoryScene())
  const [feelingId, setFeelingId] = useState<SensoryAxisId | null>(null)
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const visual = sensoryVisualState(values, reduced, feelingId)
  const cssVars = visualCssVars(visual)
  const windowSec = lensWindowSeconds(windowAmount, snap.duration)
  const activeId = feelingId
  const range = scene === 'range'

  const chooseScene = (next: SensorySceneId) => {
    setScene(next)
    persistSensoryScene(next)
  }

  return (
    <div
      className={`${styles.page} ${range ? styles.rangePage : ''} ${dragging ? styles.drop : ''}`}
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
        <p className={styles.brand}>Firstsound</p>
        <ModeSwitch variant="editorial" mode={mode} onChange={onMode} />
        <div className={styles.tools}>
          <SensoryThemePicker
            scene={scene}
            onScene={chooseScene}
            onPlaces={() => setPlacesOpen((v) => !v)}
          />
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

      {range ? (
        <SoundRange
          duration={snap.duration}
          loaded={snap.sampleLoaded}
          visual={visual}
          contentRev={snap.bufferRev}
          onTogglePlay={() => {
            void engine.unlock().then(() => engine.togglePlay())
          }}
          onLoadDemo={onLoadDemo}
        />
      ) : (
        <>
          <div className={styles.world} aria-hidden={!snap.sampleLoaded}>
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
              emptyLabel=""
            />
            <div className={styles.vignette} aria-hidden="true" />
          </div>
          <div className={styles.lensWrap}>
            <SoundLens
              duration={snap.duration}
              loaded={snap.sampleLoaded}
              visual={visual}
              loop={snap.loop}
              windowSec={windowSec}
              windowAmount={windowAmount}
              onWindowAmount={setWindowAmount}
              onWindowCommit={() => undefined}
              onTogglePlay={() => {
                void engine.unlock().then(() => engine.togglePlay())
              }}
            />
          </div>
        </>
      )}

      <FeelingRail
        values={values}
        activeId={activeId}
        onActive={(id) => {
          onMoodLabel(null)
          setFeelingId(id && SENSORY_AXIS_IDS.includes(id as SensoryAxisId) ? (id as SensoryAxisId) : null)
        }}
        onValues={(next) => {
          onMoodLabel(null)
          onValues(next)
        }}
        onCommit={onCommitSensory}
      />

      <div className={styles.bar}>
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
        <OverviewStrip duration={snap.duration} loaded={snap.sampleLoaded} contentRev={snap.bufferRev} />
        <PlayheadClock duration={snap.duration} compact={range} />
      </div>

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