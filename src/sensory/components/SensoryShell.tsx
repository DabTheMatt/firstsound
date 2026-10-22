import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useA11ySettings } from '../../a11y'
import { patchAttentionSignals } from '../../a11y/attention/signals'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import type { EditState } from '../../app/editorState'
import type { WaveformHandle } from '../../components/waveform/Waveform'
import type { AppView } from '../../app/appView'
import type { UiMode } from '../../modes/uiMode'
import { engine } from '../../hooks/useEngine'
import type { SensoryAxisId } from '../sensoryParameters'
import { readStoredSensoryScene, type SensorySceneId } from '../sensoryScene'
import { readStoredSensoryStrings } from '../sensoryStrings'
import { RAIL_AXIS_IDS } from '../sensoryFeelings'
import { useI18n } from '../../i18n'
import type { ColorSound } from '../colorSound'
import type { SensoryValues } from '../sensoryState'
import { resolveSensoryPresentation, sensoryCalmFactors } from '../../a11y/sensoryComfort'
import { calmSensoryVisual, sensoryVisualState, visualCssVars } from '../visualization/sensoryVisualState'
import { ColorSoundPad } from './ColorSoundPad'
import { FeelingRail } from './FeelingRail'
import { OverviewStrip } from './OverviewStrip'
import { ParameterStrings } from './ParameterStrings'
import { PlaybackFeel } from './PlaybackFeel'
import { PlayheadClock } from './PlayheadClock'
import { AccessibleWaveform } from '../../a11y/waveform/AccessibleWaveform'
import { MarkerHost } from '../../components/markers/MarkerPanel'
import { DragFreeWave } from '../../edit/dragFree/DragFreeWave'
import { SensoryExact } from './SensoryExact'
import { SoundRange } from './SoundRange'
import styles from './SensoryShell.module.css'

type Props = {
  header: ReactNode
  overlay?: ReactNode
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
  view: AppView
  onView: (view: AppView) => void
  values: SensoryValues
  onValues: (values: SensoryValues) => void
  color: ColorSound
  onColor: (color: ColorSound) => void
  onCommitSensory: () => void
  onPlayback: (patch: { speed?: number; pitch?: number }) => void
  moodLabel: string | null
  onMoodLabel: (label: string | null) => void
  sampleInput?: ReactNode
}

export function SensoryShell({
  header,
  overlay,
  snap,
  edit: _edit,
  waveRef: _waveRef,
  menuOpen,
  menu,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onLoadDemo,
  onSave: _onSave,
  onRecord: _onRecord,
  onRegionCommit,
  onFades: _onFades,
  onFadesCommit: _onFadesCommit,
  values,
  onValues,
  color,
  onColor,
  onCommitSensory,
  onPlayback,
  moodLabel: _moodLabel,
  onMoodLabel,
  sampleInput = null,
}: Props) {
  const { t } = useI18n()
  const headerRef = useRef<HTMLElement>(null)
  const [overlayTop, setOverlayTop] = useState(0)
  const [scene] = useState<SensorySceneId>(() => readStoredSensoryScene())
  const [feelingId, setFeelingId] = useState<SensoryAxisId | null>(null)
  const [editingId, setEditingId] = useState<SensoryAxisId | null>(null)
  const [stringsOn] = useState(() => readStoredSensoryStrings())
  const { settings: a11y, systemReducedMotion } = useA11ySettings()
  const presentation = resolveSensoryPresentation(a11y, systemReducedMotion)
  const reduced = presentation.motionReduced
  const visual = calmSensoryVisual(sensoryVisualState(values, reduced, feelingId), sensoryCalmFactors(presentation))
  const cssVars = visualCssVars(visual)
  const activeId = feelingId
  useEffect(() => {
    patchAttentionSignals({ sensoryAxisId: editingId ?? feelingId })
    return () => patchAttentionSignals({ sensoryAxisId: null })
  }, [editingId, feelingId])
  const sceneClass =
    scene === 'mirror' ? styles.mirror : scene === 'canyon' ? styles.canyon : scene === 'gleam' ? styles.gleam : ''

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () => {
      const parent = header.offsetParent instanceof HTMLElement ? header.offsetParent : header.parentElement
      const parentTop = parent?.getBoundingClientRect().top ?? 0
      setOverlayTop(Math.max(0, Math.round(header.getBoundingClientRect().bottom - parentTop)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      className={`${styles.page} ${styles.rangePage} ${sceneClass} ${dragging ? styles.drop : ''}`}
      data-region="sensory"
      data-attention-region="sensory"
      style={{ ...cssVars, '--sensory-chrome-top': `${overlayTop}px` } as CSSProperties}
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
      <header ref={headerRef} className={styles.top} data-stable-region="navigation" data-technical-ui="workspace">
        {header}
      </header>
      {overlay ? <div className={styles.flyHost}>{overlay}</div> : null}
      {menuOpen ? (
        <div className={styles.menuLayer} style={{ top: overlayTop }}>
          {menu}
        </div>
      ) : null}

      <div id="main-controls" data-stable-region="editor">
      <SoundRange
        duration={snap.sourceDuration || snap.duration}
        loaded={snap.sampleLoaded}
        visual={visual}
        contentRev={snap.bufferRev}
        scene={scene}
        color={color}
        onTogglePlay={() => {
          void engine.unlock().then(() => engine.togglePlay())
        }}
        onLoadDemo={onLoadDemo}
        onRegionCommit={onRegionCommit}
      />
      <DragFreeWave
        fadeIn={0}
        fadeOut={0}
        showTrim={false}
        showFades={false}
        onFades={() => undefined}
        onFadesCommit={() => undefined}
        onRegionCommit={onRegionCommit}
      />
      <AccessibleWaveform mode="sensory" onRegionCommit={onRegionCommit} />
      <SensoryExact
        axisId={activeId}
        value={activeId ? values[activeId] : 0}
        onChange={(next) => {
          if (!activeId) return
          onMoodLabel(null)
          onValues({ ...values, [activeId]: next })
        }}
        onCommit={onCommitSensory}
      />

      <ParameterStrings
        values={values}
        activeId={activeId}
        editingId={editingId}
        visible={stringsOn}
        onActive={(id) => {
          onMoodLabel(null)
          setFeelingId(id)
        }}
        onEditing={(id) => {
          setEditingId(id)
          if (!id && !a11y.dragFreeEditing && !a11y.keyboardFirst) setFeelingId(null)
        }}
        onValues={(next) => {
          onMoodLabel(null)
          onValues(next)
        }}
        onCommit={onCommitSensory}
        interactive={snap.sampleLoaded}
      />

      <FeelingRail
        values={values}
        activeId={activeId}
        onActive={(id) => {
          onMoodLabel(null)
          setFeelingId(id && RAIL_AXIS_IDS.includes(id as SensoryAxisId) ? (id as SensoryAxisId) : null)
        }}
        onEditing={(id) => {
          const next = id && RAIL_AXIS_IDS.includes(id as SensoryAxisId) ? (id as SensoryAxisId) : null
          setEditingId(next)
          if (!next && !a11y.dragFreeEditing && !a11y.keyboardFirst) setFeelingId(null)
        }}
        onValues={(next) => {
          onMoodLabel(null)
          onValues(next)
        }}
        onCommit={onCommitSensory}
      />
      </div>

      <ColorSoundPad color={color} onChange={onColor} onCommit={onCommitSensory} />

      <PlaybackFeel
        disabled={!snap.sampleLoaded}
        onChange={onPlayback}
        onCommit={onCommitSensory}
      />

      <div className={styles.bar} data-transport="">
        <button
          type="button"
          className={styles.play}
          disabled={!snap.sampleLoaded}
          aria-label={snap.playing ? t.sensory.pause : t.sensory.play}
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
        <OverviewStrip
          duration={snap.sourceDuration || snap.duration}
          loaded={snap.sampleLoaded}
          contentRev={snap.bufferRev}
          onRegionCommit={onRegionCommit}
        />
        <PlayheadClock duration={snap.duration} compact />
      </div>

      <MarkerHost mode="sensory" onCommit={onRegionCommit} />
      {sampleInput}
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.blur} data-decorative="" />
        <div className={styles.chroma} data-decorative="" />
        <div className={styles.grain} data-decorative="" />
        <div className={styles.pulse} data-decorative="" />
      </div>
    </div>
  )
}
