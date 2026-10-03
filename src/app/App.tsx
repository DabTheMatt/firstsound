import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { formatTimecode } from '../audio/engine/formatTime'
import { downloadJson, parsePreset, readAudioFile, AUDIO_FILE_ACCEPT } from '../features/sample/files'
import { deleteUserPreset, loadUserPresets, mergeUserPresets, parseUserPresetPack, saveUserPreset } from '../audio/fx/userPresets'
import { engine, useEngine } from '../hooks/useEngine'
import type { FadeCurve } from '../audio/engine/fades'
import { DEFAULT_EDIT, type EditState, type InspectorFocus, type MeterRange, type VizMode, type WaveTool } from './editorState'
import {
  contextFromFocus,
  focusFromContext,
  inspectorKey,
  routeCollapse,
  routeModule,
  routeReveal,
  routeTrackClick,
  routeTrackEdit,
  routeViz,
  type TrackInspectorMemory,
} from './inspectorRoute'
import { commitHistory, createHistory, redoHistory, undoHistory } from './history'
import { commitDspGesture } from './dspHistory'
import { setRandomHistoryRunner } from '../audio/random/historyBridge'
import { createSpaceActivationGuard, isSpaceKey, isTypingTarget, isTransportShortcutTarget } from './keys'
import { A11ySettings, LiveAnnouncer, SkipLink, scrollFocusedIntoView, useA11ySettings } from '../a11y'
import { ANALYSER_FFT_IDLE } from '../audio/engine/analyserBudget'
import { inspectorWidth } from './layoutMode'
import { useLayoutMode } from './useLayoutMode'
import { AppHeader } from '../components/header/AppHeader'
import { ResetSessionButton } from '../components/header/ResetSessionButton'
import { ManualDialog } from '../components/manual/ManualDialog'
import { FIELD_VERSION } from '../version'
import { trackColorVar } from '../audio/mix/tracks'
import { SignalChain } from '../components/chain/SignalChain'
import { Inspector } from '../components/inspector/Inspector'
import { FxLfoConnectProvider } from '../components/inspector/FxLfoConnect'
import { LfoCenter } from '../components/inspector/LfoCenter'
import { InspectorEye } from '../components/inspector/InspectorEye'
import { CompactTransport, TransportExportButton } from '../components/transport/CompactTransport'
import { inspectorPaneForLfo, moduleTypeForLfoKind } from '../audio/fx/lfo'
import { MeterStrip } from '../components/meters/MeterStrip'
import { Waveform, type WaveformHandle } from '../components/waveform/Waveform'
import { runDisplayAction, WaveformToolbar } from '../components/waveform/WaveformToolbar'
import { EditBar } from '../components/samplePrep/EditBar'
import { ExportDialog } from '../components/samplePrep/ExportDialog'
import { ModeGate } from '../modes/ModeGate'
import { ModeSwitch } from '../modes/ModeSwitch'
import { persistUiMode, readStoredUiMode, type UiMode } from '../modes/uiMode'
import { useI18n } from '../i18n'
import { applySensorySession, captureDsp, writeDsp } from '../sensory/applySensory'
import type { DspSnapshot } from '../sensory/mapping/mappingEngine'
import { dspSnapshotsEqual } from '../sensory/mapping/mappingEngine'
import { cloneFxLfos } from '../audio/fx/lfo'
import { automationEqual, cloneAutomation, EMPTY_AUTOMATION_FOCUS, type AutomationDocument, type AutomationEditFocus } from '../audio/automation/automation'
import {
  nextSamplePcmId,
  snapshotFromCapture,
  type SampleEditCapture,
  type SamplePcmSnapshot,
} from '../audio/engine/sampleEdit'
import { AutomationInspector } from '../components/waveform/AutomationInspector'
import { MobileContext } from '../components/mobile/MobileContext'
import { FocusChrome } from '../components/mobile/FocusChrome'
import { MobileModeBar } from '../components/mobile/MobileModeBar'
import { focusWorkspaceForViz, phoneDisplayViz, type FocusWorkspace } from './phoneWorkspace'
import { ThemePicker } from '../components/header/ThemePicker'
import { SensoryShell } from '../sensory/components/SensoryShell'
import { SimpleShell } from '../simple/SimpleShell'
import { cloneSpectralState, spectralStatesEqual, type SpectralState } from '../audio/spectral/bands'
import { colorSoundsEqual, NEUTRAL_COLOR_SOUND, type ColorSound } from '../sensory/colorSound'
import { defaultSensoryValues, sensoryValuesEqual, type SensoryValues } from '../sensory/sensoryState'
import styles from './App.module.css'

type Hist = {
  start: number
  end: number
  chain: string
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  fadeInBend: number
  fadeOutBend: number
  layer: 'region' | 'sensory' | 'dsp'
  sensory?: SensoryValues
  colorSound?: ColorSound
  dsp?: DspSnapshot
  sensoryBase?: DspSnapshot
  automation: AutomationDocument
  pcm?: SamplePcmSnapshot
  spectral?: SpectralState
}

function cloneDsp(dsp: DspSnapshot): DspSnapshot {
  return {
    params: { ...dsp.params },
    eqBands: dsp.eqBands.map((b) => ({ ...b })),
    bypass: { ...dsp.bypass },
    fxLfos: cloneFxLfos(dsp.fxLfos),
  }
}

function histKey(
  start: number,
  end: number,
  chain: { instanceId: string }[],
  edit: Pick<EditState, 'fadeIn' | 'fadeOut' | 'fadeCurve' | 'fadeInBend' | 'fadeOutBend'>,
  automation: AutomationDocument,
  extra?: Pick<Hist, 'layer' | 'sensory' | 'colorSound' | 'dsp' | 'sensoryBase'>,
  spectral?: SpectralState,
): Hist {
  return {
    start,
    end,
    chain: chain.map((m) => m.instanceId).join(','),
    fadeIn: edit.fadeIn,
    fadeOut: edit.fadeOut,
    fadeCurve: edit.fadeCurve,
    fadeInBend: edit.fadeInBend,
    fadeOutBend: edit.fadeOutBend,
    layer: extra?.layer ?? 'region',
    sensory: extra?.sensory,
    colorSound: extra?.colorSound ? { ...extra.colorSound } : undefined,
    dsp: extra?.dsp ? cloneDsp(extra.dsp) : undefined,
    sensoryBase: extra?.sensoryBase ? cloneDsp(extra.sensoryBase) : undefined,
    automation: cloneAutomation(automation),
    spectral: spectral ? cloneSpectralState(spectral) : undefined,
  }
}

function histEqual(a: Hist, b: Hist): boolean {
  if ((a.pcm?.id ?? null) !== (b.pcm?.id ?? null)) return false
  if (!automationEqual(a.automation, b.automation)) return false
  if (
    a.start !== b.start ||
    a.end !== b.end ||
    a.chain !== b.chain ||
    a.fadeIn !== b.fadeIn ||
    a.fadeOut !== b.fadeOut ||
    a.fadeCurve !== b.fadeCurve ||
    a.fadeInBend !== b.fadeInBend ||
    a.fadeOutBend !== b.fadeOutBend ||
    a.layer !== b.layer
  ) {
    return false
  }
  if (a.layer === 'sensory' || b.layer === 'sensory') {
    if (!a.sensory || !b.sensory) return false
    return sensoryValuesEqual(a.sensory, b.sensory) && colorSoundsEqual(a.colorSound ?? NEUTRAL_COLOR_SOUND, b.colorSound ?? NEUTRAL_COLOR_SOUND)
  }
  if ((a.layer === 'dsp' || b.layer === 'dsp') && a.dsp && b.dsp) {
    return dspSnapshotsEqual(a.dsp, b.dsp)
  }
  if (Boolean(a.spectral) !== Boolean(b.spectral)) return false
  if (a.spectral && b.spectral && !spectralStatesEqual(a.spectral, b.spectral)) return false
  return true
}

export default function App() {
  const { t } = useI18n()
  const { settings: a11y } = useA11ySettings()
  const snap = useEngine()
  const { mode, width: viewportWidth, height: viewportHeight } = useLayoutMode()
  const isPhoneLayout = mode === 'sheet'
  const [menuOpen, setMenuOpen] = useState(false)
  const [libraryTick, setLibraryTick] = useState(0)
  const [lfoCenterOpen, setLfoCenterOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [tool, setTool] = useState<WaveTool>('select')
  const [viz, setViz] = useState<VizMode>('waveform')
  const [arrangement, setArrangement] = useState<'single' | 'multi'>('single')
  const [autoFocus, setAutoFocus] = useState<AutomationEditFocus>(EMPTY_AUTOMATION_FOCUS)
  const [meterRange, setMeterRange] = useState<MeterRange>('normal')
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT)
  const [normalizeView, setNormalizeView] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [sheetLevel, setSheetLevel] = useState<'collapsed' | 'medium' | 'expanded'>('medium')
  const [focusWorkspace, setFocusWorkspace] = useState<FocusWorkspace | null>(null)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [collapseToken, setCollapseToken] = useState(0)
  const [zoomLabel, setZoomLabel] = useState('100%')
  const [editMode, setEditMode] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [focus, setFocus] = useState<InspectorFocus>({
    kind: 'module',
    instanceId: 'gain-1',
    type: 'gain',
  })
  const [inspectorMemory, setInspectorMemory] = useState<TrackInspectorMemory>({})
  const focusRef = useRef(focus)
  const memoryRef = useRef(inspectorMemory)
  const seenTrackRef = useRef(engine.getSnapshot().selectedTrackId)
  const intentRef = useRef<string | null>(null)
  useEffect(() => {
    focusRef.current = focus
    memoryRef.current = inspectorMemory
  }, [focus, inspectorMemory])
  const [history, setHistory] = useState(() =>
    createHistory(
      histKey(0, 1, [], DEFAULT_EDIT, engine.getSnapshot().automation, {
        layer: 'region',
        sensory: defaultSensoryValues(),
        colorSound: NEUTRAL_COLOR_SOUND,
        dsp: captureDsp(engine),
        sensoryBase: captureDsp(engine),
      }, engine.getSnapshot().spectral),
    ),
  )
  const [uiMode, setUiMode] = useState<UiMode | null>(() => readStoredUiMode())
  const [sensory, setSensory] = useState(defaultSensoryValues)
  const [colorSound, setColorSound] = useState<ColorSound>(NEUTRAL_COLOR_SOUND)
  const [moodLabel, setMoodLabel] = useState<string | null>(null)
  const sensoryRef = useRef(sensory)
  const colorRef = useRef(colorSound)
  const sensoryBaseRef = useRef<DspSnapshot>(captureDsp(engine))
  const appliedRef = useRef<DspSnapshot>(captureDsp(engine))
  const editRef = useRef(edit)
  const uiModeRef = useRef(uiMode)
  const historyRef = useRef(history)
  const restorePresentRef = useRef<(present: Hist) => void>(() => {})
  useEffect(() => {
    editRef.current = edit
  }, [edit])
  useEffect(() => {
    uiModeRef.current = uiMode
  }, [uiMode])
  useEffect(() => {
    historyRef.current = history
  }, [history])
  const sensoryUiFrame = useRef(0)
  const flushSensoryUi = () => {
    sensoryUiFrame.current = 0
    setSensory(sensoryRef.current)
    setColorSound(colorRef.current)
  }
  const scheduleSensoryUi = () => {
    if (typeof requestAnimationFrame !== 'function') {
      flushSensoryUi()
      return
    }
    if (sensoryUiFrame.current) return
    sensoryUiFrame.current = requestAnimationFrame(flushSensoryUi)
  }

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      scrollFocusedIntoView(event.target)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  useEffect(() => {
    if (uiMode === 'sensory' || uiMode === 'simple' || (viz !== 'spectrum' && viz !== 'split' && viz !== 'eq-split')) {
      engine.setSpectrumFftSize(ANALYSER_FFT_IDLE)
    }
  }, [uiMode, viz])

  useEffect(() => {
    engine.setRegionFades(edit.fadeIn, edit.fadeOut, edit.fadeCurve, edit.fadeInBend, edit.fadeOutBend)
  }, [edit.fadeIn, edit.fadeOut, edit.fadeCurve, edit.fadeInBend, edit.fadeOutBend])

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node) return
      if (settingsRef.current?.contains(node)) return
      if (node instanceof Element && node.closest('[data-settings-toggle]')) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen])

  useEffect(() => {
    const clickGuard = createSpaceActivationGuard()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setLfoCenterOpen(false)
        return
      }
      if (isTypingTarget(event.target)) return
      if (isSpaceKey(event)) {
        if (!a11y.shortcutsEnabled || !isTransportShortcutTarget(event.target)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (event.repeat) return
        clickGuard.arm()
        void engine.unlock()
        engine.togglePlay()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const current = historyRef.current
        const next = event.shiftKey ? redoHistory(current) : undoHistory(current)
        if (next === current) return
        setHistory(next)
        restorePresentRef.current(next.present)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (!isSpaceKey(event)) return
      if (!a11y.shortcutsEnabled || !isTransportShortcutTarget(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const onClick = (event: MouseEvent) => {
      clickGuard.onClick(event)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('click', onClick, true)
    }
  }, [a11y.shortcutsEnabled])
  const sampleInput = useRef<HTMLInputElement>(null)
  const presetInput = useRef<HTMLInputElement>(null)
  const waveRef = useRef<WaveformHandle>(null)
  const waveColRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const loadSample = async (file: File) => {
    const data = await readAudioFile(file)
    await engine.unlock()
    await engine.loadArrayBuffer(data, file.name)
  }

  const commit = useCallback((layer: Hist['layer'] = 'region') => {
    const e = editRef.current
    const current = engine.getSnapshot()
    const resolved: Hist['layer'] = uiModeRef.current === 'simple' && layer === 'region' ? 'dsp' : layer
    const extra: Pick<Hist, 'layer' | 'sensory' | 'colorSound' | 'dsp' | 'sensoryBase'> =
      resolved === 'sensory'
        ? {
            layer: resolved,
            sensory: { ...sensoryRef.current },
            colorSound: { ...colorRef.current },
            dsp: captureDsp(engine),
            sensoryBase: cloneDsp(sensoryBaseRef.current),
          }
        : resolved === 'dsp'
          ? { layer: resolved, dsp: captureDsp(engine), sensoryBase: cloneDsp(sensoryBaseRef.current) }
          : { layer: 'region' }
    setHistory((h) =>
      commitHistory(h, histKey(current.params.start, current.params.end, current.chain, e, current.automation, extra, current.spectral), histEqual),
    )
  }, [])

  useEffect(() => {
    setRandomHistoryRunner((apply) => {
      const before = captureDsp(engine)
      apply()
      const after = captureDsp(engine)
      setHistory((h) => commitDspGesture(h, before, after, histEqual))
    })
    return () => setRandomHistoryRunner(null)
  }, [])

  const pushSampleEdit = (before: SampleEditCapture, after: SampleEditCapture) => {
    const e = editRef.current
    const chain = engine.getSnapshot().chain
    setHistory((h) => {
      const stamped: Hist = {
        ...h.present,
        start: before.start,
        end: before.end,
        automation: cloneAutomation(before.automation),
        pcm: snapshotFromCapture(before, nextSamplePcmId()),
      }
      const next: Hist = {
        ...stamped,
        start: after.start,
        end: after.end,
        chain: chain.map((m) => m.instanceId).join(','),
        fadeIn: e.fadeIn,
        fadeOut: e.fadeOut,
        fadeCurve: e.fadeCurve,
        fadeInBend: e.fadeInBend,
        fadeOutBend: e.fadeOutBend,
        automation: cloneAutomation(after.automation),
        pcm: snapshotFromCapture(after, nextSamplePcmId()),
      }
      return commitHistory({ ...h, present: stamped }, next, histEqual)
    })
  }

  const insertSilence = () => {
    const before = engine.captureSampleEdit()
    if (!before || !engine.insertSilenceAtPlayhead()) return
    const after = engine.captureSampleEdit()
    if (!after) return
    pushSampleEdit(before, after)
    waveRef.current?.fitSample()
  }

  const deleteSelection = () => {
    const before = engine.captureSampleEdit()
    if (!before || !engine.deleteSampleSelection()) return
    const after = engine.captureSampleEdit()
    if (!after) return
    pushSampleEdit(before, after)
    waveRef.current?.fitSample()
  }

  const muteSelection = () => {
    const before = engine.captureSampleEdit()
    if (!before || !engine.muteSampleSelection()) return
    const after = engine.captureSampleEdit()
    if (!after) return
    pushSampleEdit(before, after)
  }

  const clearSelection = () => {
    if (!engine.clearSampleSelection()) return
    commit()
  }

  const copySelection = () => {
    engine.copySampleSelection()
  }

  const cutSelection = () => {
    const before = engine.captureSampleEdit()
    if (!before || !engine.cutSampleSelection()) return
    const after = engine.captureSampleEdit()
    if (!after) return
    pushSampleEdit(before, after)
    waveRef.current?.fitSample()
  }

  const pasteAtPlayhead = () => {
    const before = engine.captureSampleEdit()
    if (!before || !engine.pasteAtPlayhead()) return
    const after = engine.captureSampleEdit()
    if (!after) return
    pushSampleEdit(before, after)
    waveRef.current?.fitSample()
  }

  const restorePresent = (present: Hist) => {
    if (present.pcm) engine.restoreSamplePcm(present.pcm)
    engine.setRegion(present.start, present.end)
    engine.replaceAutomation(present.automation)
    setEdit((e) => ({
      ...e,
      fadeIn: present.fadeIn,
      fadeOut: present.fadeOut,
      fadeCurve: present.fadeCurve,
      fadeInBend: present.fadeInBend,
      fadeOutBend: present.fadeOutBend,
    }))
    if (present.dsp) {
      writeDsp(engine, present.dsp)
      appliedRef.current = cloneDsp(present.dsp)
    }
    if (present.sensory) {
      sensoryRef.current = present.sensory
      setSensory(present.sensory)
    }
    if (present.layer === 'sensory' || present.colorSound) {
      const color = present.colorSound ?? NEUTRAL_COLOR_SOUND
      colorRef.current = color
      setColorSound(color)
    }
    if (present.sensoryBase) sensoryBaseRef.current = cloneDsp(present.sensoryBase)
    if (present.spectral) engine.replaceSpectral(present.spectral)
  }
  useEffect(() => {
    restorePresentRef.current = restorePresent
  })

  const applySensoryValues = (next: SensoryValues) => {
    sensoryRef.current = next
    appliedRef.current = applySensorySession(engine, sensoryBaseRef.current, next, colorRef.current)
    scheduleSensoryUi()
  }

  const applyColorSoundValue = (next: ColorSound) => {
    colorRef.current = next
    appliedRef.current = applySensorySession(engine, sensoryBaseRef.current, sensoryRef.current, next)
    scheduleSensoryUi()
  }

  const applyPlayback = (patch: { speed?: number; pitch?: number }) => {
    if (patch.speed != null) engine.setParam('speed', patch.speed)
    if (patch.pitch != null) engine.setParam('pitch', patch.pitch)
    const live = engine.getSnapshot().params
    const stamp = (dsp: DspSnapshot): DspSnapshot => ({
      ...dsp,
      params: { ...dsp.params, speed: live.speed, pitch: live.pitch },
    })
    sensoryBaseRef.current = stamp(sensoryBaseRef.current)
    appliedRef.current = stamp(appliedRef.current ?? captureDsp(engine))
  }

  const prepareSensoryLayer = () => {
    const current = captureDsp(engine)
    const last = appliedRef.current
    if (!dspSnapshotsEqual(current, last)) {
      sensoryBaseRef.current = current
      appliedRef.current = current
      const rest = defaultSensoryValues()
      sensoryRef.current = rest
      setSensory(rest)
      colorRef.current = NEUTRAL_COLOR_SOUND
      setColorSound(NEUTRAL_COLOR_SOUND)
      setMoodLabel(null)
    }
  }

  const chooseMode = (mode: UiMode) => {
    persistUiMode(mode)
    if (mode === 'sensory') prepareSensoryLayer()
    setUiMode(mode)
  }

  const rememberFocus = (next: InspectorFocus, trackId = engine.getSnapshot().selectedTrackId) => {
    const memory = { ...memoryRef.current, [trackId]: contextFromFocus(next) }
    memoryRef.current = memory
    focusRef.current = next
    setInspectorMemory(memory)
    setFocus(next)
  }

  const followTrack = (trackId: string, mode?: 'edit') => {
    const current = engine.getSnapshot()
    const routed =
      mode === 'edit'
        ? routeTrackEdit(trackId, current.selectedTrackId, focusRef.current, memoryRef.current)
        : routeTrackClick(trackId, current.selectedTrackId, focusRef.current, memoryRef.current)
    const known = current.tracks.some((track) => track.id === trackId)
    if (known && current.selectedTrackId !== trackId) {
      intentRef.current = trackId
      engine.selectTrack(trackId)
    }
    const nextFocus: InspectorFocus =
      mode === 'edit'
        ? { kind: 'tool', tool: 'select' }
        : focusFromContext(routed.context, engine.getSnapshot().chain)
    memoryRef.current = routed.memory
    focusRef.current = nextFocus
    setInspectorMemory(routed.memory)
    setFocus(nextFocus)
    setInspectorOpen(true)
    if (mode === 'edit') {
      setTool('select')
      setViz('waveform')
      setArrangement('single')
      setFocusWorkspace(null)
    }
  }

  useEffect(() => {
    if (snap.selectedTrackId === seenTrackRef.current) return
    const previous = seenTrackRef.current
    seenTrackRef.current = snap.selectedTrackId
    if (intentRef.current === snap.selectedTrackId) {
      intentRef.current = null
      return
    }
    const routed = routeTrackClick(snap.selectedTrackId, previous, focusRef.current, memoryRef.current)
    const nextFocus = focusFromContext(routed.context, engine.getSnapshot().chain)
    memoryRef.current = routed.memory
    focusRef.current = nextFocus
    setInspectorMemory(routed.memory)
    setFocus(nextFocus)
    setInspectorOpen(true)
  }, [snap.selectedTrackId])

  const selectModule = (instanceId: string, pane?: 'main' | 'advanced') => {
    engine.focusEffect(instanceId)
    const live = engine.getSnapshot().chain
    const mod = live.find((m) => m.instanceId === instanceId)
    if (!mod) return
    const routed = routeModule(instanceId, mod.type, pane)
    rememberFocus(routed.focus)
    setInspectorOpen(routed.inspectorOpen)
    if (mode === 'sheet') {
      setSheetLevel('medium')
      if (mod.type === 'eq') setViz('eq-split')
    }
  }

  const hideInspector = () => {
    const routed = routeCollapse(focus)
    setFocus(routed.focus)
    setInspectorOpen(routed.inspectorOpen)
  }

  const revealInspector = () => {
    const routed = routeReveal(focus)
    setFocus(routed.focus)
    setInspectorOpen(routed.inspectorOpen)
  }

  const revealLfo = (kind: Parameters<typeof moduleTypeForLfoKind>[0], slot: number) => {
    const target = snap.fxLfos[kind][slot]?.target ?? null
    const type = moduleTypeForLfoKind(kind)
    const mod = snap.chain.find((m) => m.type === type)
    setLfoCenterOpen(false)
    if (!mod) return
    selectModule(mod.instanceId, inspectorPaneForLfo(kind, target))
  }

  const resolvedFocus: InspectorFocus =
    focus.kind === 'module' && !snap.chain.some((m) => m.instanceId === focus.instanceId)
      ? {
          kind: 'module',
          instanceId: snap.chain[0]?.instanceId ?? 'gain-1',
          type: snap.chain[0]?.type ?? 'gain',
        }
      : focus

  const selectTool = (next: WaveTool) => {
    setTool(next)
    rememberFocus({ kind: 'tool', tool: next })
    if (mode === 'sheet') setSheetLevel('medium')
  }

  const applyHistory = (next: typeof history) => {
    setHistory(next)
    restorePresent(next.present)
  }

  const activeFocus = focusWorkspace
  const resetSession = useCallback(() => {
    engine.resetSession()
    const dsp = captureDsp(engine)
    appliedRef.current = cloneDsp(dsp)
    sensoryBaseRef.current = cloneDsp(dsp)
    setEdit(DEFAULT_EDIT)
    setFocus({ kind: 'module', instanceId: 'gain-1', type: 'gain' })
    setFocusWorkspace(null)
    setViz('waveform')
    setMenuOpen(false)
    setLfoCenterOpen(false)
    setExportOpen(false)
    setManualOpen(false)
    setEditMode(false)
    setAutoFocus(EMPTY_AUTOMATION_FOCUS)
    setInspectorMemory({})
    setTool('select')
    setNormalizeView(false)
    setSensory(defaultSensoryValues())
    sensoryRef.current = defaultSensoryValues()
    setColorSound(NEUTRAL_COLOR_SOUND)
    colorRef.current = NEUTRAL_COLOR_SOUND
    setMoodLabel(null)
    setHistory(
      createHistory(
        histKey(engine.getSnapshot().params.start, engine.getSnapshot().params.end, engine.getSnapshot().chain, DEFAULT_EDIT, engine.getSnapshot().automation, {
          layer: 'region',
          sensory: defaultSensoryValues(),
          colorSound: NEUTRAL_COLOR_SOUND,
          dsp,
          sensoryBase: cloneDsp(dsp),
        }, engine.getSnapshot().spectral),
      ),
    )
  }, [])
  useLayoutEffect(() => {
    const col = waveColRef.current
    if (!col) return
    if (!activeFocus) {
      col.style.removeProperty('--focus-toolbar-height')
      return
    }
    const node = col.querySelector<HTMLElement>('[data-focus-chrome]')
    if (!node) return
    const apply = () => col.style.setProperty('--focus-toolbar-height', `${Math.ceil(node.getBoundingClientRect().height)}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeFocus])
  const monitorFocus = resolvedFocus.kind === 'module' ? resolvedFocus.instanceId : null
  const chainKey = snap.chain.map((mod) => `${mod.instanceId}:${mod.type}`).join('|')
  useEffect(() => {
    engine.setMonitorTaps(arrangement === 'single' || activeFocus != null, monitorFocus)
  }, [arrangement, activeFocus, monitorFocus, chainKey, snap.selectedTrackId])

  const enterFocus = () => {
    setMenuOpen(false)
    setLfoCenterOpen(false)
    const shown = isPhoneLayout ? phoneDisplayViz(viz) : viz
    setFocusWorkspace(focusWorkspaceForViz(shown))
  }

  const focusViz = (next: VizMode) => {
    if (next === 'eq-split') {
      const eq = engine.getSnapshot().chain.find((item) => item.type === 'eq')
      if (eq) selectModule(eq.instanceId)
    }
    const routed = routeViz(next, focus, inspectorOpen)
    setViz(routed.viz)
    rememberFocus(routed.focus)
    setInspectorOpen(routed.inspectorOpen)
    if (focusWorkspace) {
      const shown = isPhoneLayout ? phoneDisplayViz(routed.viz) : routed.viz
      setFocusWorkspace(focusWorkspaceForViz(shown))
    }
  }

  const dockRight = mode === 'dock-right'
  const sheet = mode === 'sheet'
  const compact = mode !== 'dock-right'
  const activeSheetLevel = isPhoneLayout && sheetLevel === 'medium' ? 'collapsed' : sheetLevel

  const moreOpen = menuOpen

  const panelKey = inspectorKey(resolvedFocus)
  const inspector = inspectorOpen ? (
    resolvedFocus.kind === 'automation' ? (
      <AutomationInspector
        sheet={sheet && !isPhoneLayout && activeSheetLevel !== 'expanded'}
        compact={isPhoneLayout}
        onHideInspector={dockRight ? hideInspector : undefined}
        onCommit={commit}
        focus={autoFocus}
        onFocus={setAutoFocus}
      />
    ) : (
    <Inspector
      snap={snap}
      focus={resolvedFocus}
      edit={edit}
      sheet={sheet && !isPhoneLayout && activeSheetLevel !== 'expanded'}
      onEdit={(patch) => setEdit((e) => ({ ...e, ...patch }))}
      onCommit={commit}
      onTrim={() => {
        void engine.trimPlayRegion().then((ok) => {
          if (!ok) return
          setEdit((e) => ({ ...e, fadeIn: 0, fadeOut: 0, fadeAuto: false }))
          waveRef.current?.fitSample()
          commit()
        })
      }}
      knobs={mode !== 'sheet' || isPhoneLayout}
      compact={isPhoneLayout}
      onHideInspector={dockRight ? hideInspector : undefined}
      onFine={(which, delta) => engine.setParam(which, snap.params[which] + delta)}
      edits={{
        canCopy: snap.canCopySelection,
        canCut: snap.canCutSelection,
        canPaste: snap.canPaste,
        canDelete: snap.canDeleteSelection,
        canMute: snap.canMuteSelection,
        canClear: snap.canClearSelection,
        canInsert: snap.canInsertSilence,
        onCopy: copySelection,
        onCut: cutSelection,
        onPaste: pasteAtPlayhead,
        onDelete: deleteSelection,
        onMute: muteSelection,
        onClear: clearSelection,
        onInsert: insertSilence,
      }}
    />
    )
  ) : null

  const actions = useMemo(
    () => (
      <div className={styles.moreMenu}>
          <p className={styles.hint}>{t.settings.hint}</p>
          <button type="button" className={styles.loadProminent} onClick={() => sampleInput.current?.click()}>
            {t.settings.loadSample}
          </button>
        {isPhoneLayout ? (
          <button
            type="button"
            disabled={!snap.sampleLoaded}
            onClick={() => {
              setExportOpen(true)
              setMenuOpen(false)
            }}
          >
            {t.transport.export}
          </button>
        ) : null}
        {isPhoneLayout ? (
          <button
            type="button"
            onClick={() => {
              setLfoCenterOpen(true)
              setMenuOpen(false)
            }}
          >
            {t.header.lfoCenter}
          </button>
        ) : null}
        {isPhoneLayout ? <ThemePicker compact /> : null}
        {isPhoneLayout ? (
          <div className={styles.modeCluster}>
            <ModeSwitch mode="technical" onChange={chooseMode} compact />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (engine.getSnapshot().recording) engine.stopMicRecord()
            else void engine.startMicRecord()
          }}
        >
          {snap.recording ? t.settings.stopRecording : t.settings.recordMic}
        </button>
        <button
          type="button"
          onClick={() => downloadJson('field-preset.json', engine.toPreset())}
        >
          {t.settings.savePreset}
        </button>
        <button
          type="button"
          onClick={() => {
            const name = window.prompt('Name this instrument preset for this browser')
            if (!name) return
            saveUserPreset(name, engine.toPreset())
            setLibraryTick((n) => n + 1)
          }}
        >
          Save to library
        </button>
        <p className={styles.hint}>
          Library lives in this browser. Export a pack to share or back up. There is no account server.
        </p>
        {loadUserPresets().length ? (
          <ul className={styles.presetLib}>
            {loadUserPresets().map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    engine.applyPreset(item.preset)
                    setMenuOpen(false)
                  }}
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => {
                    deleteUserPreset(item.id)
                    setLibraryTick((n) => n + 1)
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>No saved library presets yet.</p>
        )}
        <button
          type="button"
          onClick={() =>
            downloadJson('field-preset-library.json', {
              format: 'field-preset-library',
              version: 1,
              presets: loadUserPresets(),
            })
          }
        >
          Export library
        </button>
        <button type="button" onClick={() => presetInput.current?.click()}>
          {t.settings.loadPreset}
        </button>
        <p className={styles.hint}>{t.settings.loadPresetHint}</p>
        <button
          type="button"
          onClick={() => {
            void engine.unlock().then(() => engine.loadDemoTone())
          }}
        >
          {t.settings.loadDemo}
        </button>
        <button
          type="button"
          onClick={() => {
            engine.enterSampleEdit()
            setEditMode(true)
            setMenuOpen(false)
          }}
        >
          {t.settings.editSample}
        </button>
        <button type="button" onClick={() => engine.resetAll()}>
          {t.settings.resetAll}
        </button>
        <ResetSessionButton label={t.header.resetTitle} onReset={resetSession} />
        <button type="button" onClick={() => { setManualOpen(true); setMenuOpen(false) }}>
          {t.header.manual}
        </button>
        <p className={styles.hint}>FIELD v{FIELD_VERSION}</p>
        {snap.hasSource ? (
          <button type="button" onClick={() => engine.revertToSource()}>
            {t.settings.revertSource}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            applyHistory(undoHistory(history))
          }}
        >
          {t.settings.undo}
        </button>
        <button type="button" onClick={() => applyHistory(redoHistory(history))}>
          {t.settings.redo}
        </button>
        <A11ySettings />
      </div>
    ),
    [history, snap.hasSource, snap.recording, snap.sampleLoaded, t, libraryTick, isPhoneLayout, resetSession],
  )

  const fileInputs = (
    <>
      <input
        ref={sampleInput}
        type="file"
        accept={AUDIO_FILE_ACCEPT}
        hidden
        onChange={(event) => {
          const input = event.currentTarget
          const file = input.files?.[0]
          if (!file) return
          // Copy the bytes before clearing the input. Clearing first detaches the
          // File in Chromium, so the first pick decodes as empty and only the
          // second selection sticks.
          void file.arrayBuffer().then(async (data) => {
            input.value = ''
            await engine.unlock()
            await engine.loadArrayBuffer(data, file.name)
          })
        }}
      />
      <input
        ref={presetInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const text = await file.text()
          const json = JSON.parse(text) as unknown
          const pack = parseUserPresetPack(json)
          const rec = json && typeof json === 'object' ? (json as { format?: unknown }) : null
          if (rec?.format === 'field-preset-library' && pack.length) {
            mergeUserPresets(pack)
            setLibraryTick((n) => n + 1)
            return
          }
          const preset = parsePreset(json)
          if (preset) engine.applyPreset(preset)
        }}
      />
    </>
  )

  const settingsMenu = moreOpen ? (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.settingsScrim}
        aria-label={t.settings.close}
        onClick={() => setMenuOpen(false)}
      />
      <div className={styles.settingsFly} ref={settingsRef} role="dialog" aria-label={t.header.settings}>
        {actions}
      </div>
    </div>
  ) : null

  if (uiMode === null) {
    return (
      <>
        <SkipLink />
        <LiveAnnouncer />
        <ModeGate onChoose={chooseMode} />
        {fileInputs}
        {manualOpen ? <ManualDialog onClose={() => setManualOpen(false)} /> : null}
      </>
    )
  }

  if (uiMode === 'simple') {
    return (
      <>
        <SkipLink />
        <LiveAnnouncer />
        <SimpleShell
          snap={snap}
          edit={edit}
          waveRef={waveRef}
          menuOpen={moreOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
          menu={settingsMenu}
          dragging={dragging}
          onDragOver={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={(file) => void loadSample(file)}
          onLoadSample={() => sampleInput.current?.click()}
          onLoadDemo={() => {
            void engine.unlock().then(() => engine.loadDemoTone())
          }}
          onRegionCommit={() => commit('dsp')}
          onFades={(patch) => setEdit((e) => ({ ...e, ...patch, fadeAuto: false }))}
          onFadesCommit={() => commit('dsp')}
          onToneCommit={() => commit('dsp')}
          onUndo={() => applyHistory(undoHistory(history))}
          onRedo={() => applyHistory(redoHistory(history))}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onRestoreOriginal={() => {
            engine.revertToSource()
            engine.resetAll()
            setEdit(DEFAULT_EDIT)
            const dsp = captureDsp(engine)
            appliedRef.current = cloneDsp(dsp)
            sensoryBaseRef.current = cloneDsp(dsp)
            commit('dsp')
          }}
          onLevelLoudness={() => {
            engine.normalizeRegion()
            commit('dsp')
          }}
          onAutoFix={() => {
            engine.normalizeRegion()
            const dsp = captureDsp(engine)
            writeDsp(engine, { ...dsp, bypass: { ...dsp.bypass, eq: false, limiter: false } })
            commit('dsp')
          }}
          onApplyTrim={() => {
            void engine.trimPlayRegion().then((ok) => {
              if (!ok) return
              setEdit((e) => ({ ...e, fadeIn: 0, fadeOut: 0, fadeAuto: false }))
              waveRef.current?.fitSample()
              commit('dsp')
            })
          }}
          mode={uiMode}
          onMode={chooseMode}
        />
        {fileInputs}
        {manualOpen ? <ManualDialog onClose={() => setManualOpen(false)} /> : null}
      </>
    )
  }

  if (uiMode === 'sensory') {
    return (
      <>
        <SkipLink />
        <LiveAnnouncer />
        <SensoryShell
          snap={snap}
          edit={edit}
          waveRef={waveRef}
          menuOpen={moreOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
          menu={settingsMenu}
          dragging={dragging}
          onDragOver={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={(file) => void loadSample(file)}
          onLoadSample={() => sampleInput.current?.click()}
          onLoadDemo={() => {
            void engine.unlock().then(() => engine.loadDemoTone())
          }}
          onSave={() => downloadJson('field-preset.json', engine.toPreset())}
          onRecord={() => {
            if (engine.getSnapshot().recording) engine.stopMicRecord()
            else void engine.startMicRecord()
          }}
          onRegionCommit={() => commit('region')}
          onFades={(patch) => setEdit((e) => ({ ...e, ...patch, fadeAuto: false }))}
          onFadesCommit={() => commit('region')}
          mode={uiMode}
          onMode={chooseMode}
          values={sensory}
          onValues={applySensoryValues}
          color={colorSound}
          onColor={applyColorSoundValue}
          onCommitSensory={() => commit('sensory')}
          onPlayback={applyPlayback}
          moodLabel={moodLabel}
          onMoodLabel={setMoodLabel}
          sampleInput={null}
        />
        {fileInputs}
        {manualOpen ? <ManualDialog onClose={() => setManualOpen(false)} /> : null}
        {exportOpen ? <ExportDialog snap={snap} onClose={() => setExportOpen(false)} /> : null}
      </>
    )
  }

  return (
    <FxLfoConnectProvider>
    <div
      className={`${styles.page} ${isPhoneLayout ? styles.phonePage : ''} ${styles.modeFade}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) void loadSample(file)
      }}
    >
      <SkipLink />
      <LiveAnnouncer />
      <main
        className={`${styles.shell} ${styles[mode]} ${dragging ? styles.drop : ''} ${inspectorOpen ? '' : styles.inspectorHidden} ${isPhoneLayout ? styles.phoneShell : ''}`}
        data-orient={isPhoneLayout && viewportWidth > viewportHeight ? 'landscape' : 'portrait'}
        data-workspace={activeFocus ? 'focus' : 'edit'}
        data-focus={activeFocus ?? undefined}
        data-phone-viz={isPhoneLayout ? phoneDisplayViz(viz) : undefined}
        style={
          mode === 'dock-right' && inspectorOpen
            ? ({ '--inspector-col': `${inspectorWidth(mode, viewportWidth)}px` } as CSSProperties)
            : undefined
        }
      >
        <AppHeader
          snap={snap}
          settingsOpen={moreOpen}
          lfoCenterOpen={lfoCenterOpen}
          onToggleSettings={() => {
            setMenuOpen((v) => !v)
            setLfoCenterOpen(false)
          }}
          onToggleLfoCenter={() => {
            setLfoCenterOpen((v) => !v)
            setMenuOpen(false)
          }}
          onLoadSample={() => sampleInput.current?.click()}
          onReset={resetSession}
          onRecord={() => {
            if (engine.getSnapshot().recording) engine.stopMicRecord()
            else void engine.startMicRecord()
          }}
          compact={sheet}
          minimal={isPhoneLayout}
          modeSwitch={
            isPhoneLayout ? undefined : (
            <div className={styles.modeCluster}>
              <ModeSwitch mode="technical" onChange={chooseMode} compact={isPhoneLayout} />
            </div>
            )
          }
        />
        <div className={styles.stage}>
          <div className={styles.stageMain}>
        <div id="main-controls" className={styles.chrome}>
        {snap.audioStatus === 'blocked' ? (
          <p className={styles.banner}>{t.banner.audioBlocked}</p>
        ) : null}
        {snap.recordError ? <p className={styles.banner}>{snap.recordError}</p> : null}

        <section className={styles.chainBand} aria-label={t.chain.aria}>
          <div className={styles.trackContext}>
            <span className={styles.trackKicker}>{t.mix.track}</span>
            <span
              className={styles.trackSwatch}
              style={{ background: trackColorVar(snap.tracks.find((track) => track.id === snap.selectedTrackId)?.color ?? 'amber') }}
            />
            <span className={styles.trackNow} title={snap.tracks.find((track) => track.id === snap.selectedTrackId)?.name}>
              {snap.tracks.find((track) => track.id === snap.selectedTrackId)?.name}
            </span>
          </div>
          {snap.tracks.length > 1 && !isPhoneLayout ? (
              <div className={styles.trackChips} role="tablist" aria-label={t.mix.tracks}>
                {snap.tracks.map((track, index) => {
                  const on = track.id === snap.selectedTrackId
                  return (
                    <button
                      key={track.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      title={track.name}
                      className={`${styles.trackChip} ${on ? styles.trackChipOn : ''}`}
                      style={{ borderColor: trackColorVar(track.color) }}
                      onClick={() => followTrack(track.id)}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            ) : null}
          <SignalChain
            chain={snap.chain}
            selectedId={resolvedFocus.kind === 'module' ? resolvedFocus.instanceId : ''}
            onSelect={selectModule}
            touch={compact}
            minimal={isPhoneLayout}
          />
        </section>

        {isPhoneLayout ? null : (
        <WaveformToolbar
          tool={tool}
          onTool={selectTool}
          viz={viz}
          onViz={(next) => {
            const routed = routeViz(next, focus, inspectorOpen)
            setViz(routed.viz)
            rememberFocus(routed.focus)
            setInspectorOpen(routed.inspectorOpen)
          }}
          zoomLabel={zoomLabel}
          normalizeView={normalizeView}
          onZoomIn={() => waveRef.current?.zoomBy(1 / 1.4)}
          onZoomOut={() => waveRef.current?.zoomBy(1.4)}
          onView={(action) => {
            runDisplayAction(action, waveRef.current, () => setNormalizeView((n) => !n))
          }}
          onTrim={() => {
            void engine.trimPlayRegion().then((ok) => {
              if (!ok) return
              setEdit((e) => ({ ...e, fadeIn: 0, fadeOut: 0, fadeAuto: false }))
              waveRef.current?.fitSample()
              commit()
            })
          }}
          onCopySelection={copySelection}
          onCutSelection={cutSelection}
          onPasteAtPlayhead={pasteAtPlayhead}
          onInsertSilence={insertSilence}
          onDeleteSelection={deleteSelection}
          onMuteSelection={muteSelection}
          onClearSelection={clearSelection}
          onUndo={() => applyHistory(undoHistory(history))}
          onRedo={() => applyHistory(redoHistory(history))}
          canInsertSilence={snap.canInsertSilence}
          canDeleteSelection={snap.canDeleteSelection}
          canMuteSelection={snap.canMuteSelection}
          canClearSelection={snap.canClearSelection}
          canCopySelection={snap.canCopySelection}
          canCutSelection={snap.canCutSelection}
          canPaste={snap.canPaste}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onAutoFade={() => {
            setEdit((e) => ({ ...e, fadeIn: 0.01, fadeOut: 0.01, fadeAuto: true }))
            commit()
          }}
          autoFade={edit.fadeAuto && edit.fadeIn === 0.01 && edit.fadeOut === 0.01}
          minimal={isPhoneLayout}
          onToggleWorkspace={enterFocus}
          arrangement={arrangement}
          onArrangement={setArrangement}
        />
        )}
        </div>

        <div className={`${styles.work} ${isPhoneLayout ? styles.phoneWork : ''}`}>
          <div ref={waveColRef} className={styles.waveCol} data-focus-inset={activeFocus ? '' : undefined}>
            {activeFocus ? (
              <FocusChrome
                workspace={activeFocus}
                playing={snap.playing}
                canPlay={snap.projectAudible}
                onTogglePlay={() => {
                  void engine.unlock().then(() => engine.togglePlay())
                }}
                onExit={() => setFocusWorkspace(null)}
                onSelectModule={selectModule}
                autoFocus={autoFocus}
                onAutoFocus={setAutoFocus}
                onAutomationCommit={commit}
                onAddNode={() => waveRef.current?.addAutomationNode()}
                onDeleteNode={() => waveRef.current?.deleteAutomationNode()}
                onViz={isPhoneLayout ? undefined : focusViz}
                touch={isPhoneLayout}
                edit={{
                  canCopy: snap.canCopySelection,
                  canCut: snap.canCutSelection,
                  canPaste: snap.canPaste,
                  canDelete: snap.canDeleteSelection,
                  canMute: snap.canMuteSelection,
                  canClear: snap.canClearSelection,
                  canInsert: snap.canInsertSilence,
                  canUndo: history.past.length > 0,
                  canRedo: history.future.length > 0,
                  onCopy: copySelection,
                  onCut: cutSelection,
                  onPaste: pasteAtPlayhead,
                  onDelete: deleteSelection,
                  onMute: muteSelection,
                  onClear: clearSelection,
                  onTrim: () => {
                    void engine.trimPlayRegion().then((ok) => {
                      if (!ok) return
                      setEdit((e) => ({ ...e, fadeIn: 0, fadeOut: 0, fadeAuto: false }))
                      waveRef.current?.fitSample()
                      commit()
                    })
                  },
                  onInsertSilence: insertSilence,
                  onUndo: () => applyHistory(undoHistory(history)),
                  onRedo: () => applyHistory(redoHistory(history)),
                  onFadeIn: () => waveRef.current?.applyFade('in'),
                  onFadeOut: () => waveRef.current?.applyFade('out'),
                }}
              />
            ) : null}
            {isPhoneLayout ? (
              <MobileModeBar
                viz={viz}
                arrangement={arrangement}
                onArrangement={setArrangement}
                onViz={(next) => {
                  if (next === 'eq-split') {
                    const eq = engine.getSnapshot().chain.find((item) => item.type === 'eq')
                    if (eq) {
                      selectModule(eq.instanceId)
                      setViz('eq-split')
                      return
                    }
                  }
                  const routed = routeViz(next, focus, inspectorOpen)
                  setViz(routed.viz)
                  rememberFocus(routed.focus)
                  setInspectorOpen(routed.inspectorOpen)
                }}
                onEnterFocus={enterFocus}
                normalizeView={normalizeView}
                onView={(action) => {
                  if (action === 'zoom-in') waveRef.current?.zoomBy(1 / 1.4)
                  else if (action === 'zoom-out') waveRef.current?.zoomBy(1.4)
                  else runDisplayAction(action, waveRef.current, () => setNormalizeView((n) => !n))
                }}
                canCopy={snap.canCopySelection}
                canCut={snap.canCutSelection}
                canDelete={snap.canDeleteSelection}
                canMute={snap.canMuteSelection}
                canClear={snap.canClearSelection}
                onCopy={copySelection}
                onCut={cutSelection}
                onDelete={deleteSelection}
                onMute={muteSelection}
                onUndo={() => applyHistory(undoHistory(history))}
                onRedo={() => applyHistory(redoHistory(history))}
                canUndo={history.past.length > 0}
                canRedo={history.future.length > 0}
              />
            ) : null}
            <Waveform
              ref={waveRef}
              key={`buffer:${snap.bufferRev}`}
              duration={snap.duration}
              start={snap.params.start}
              end={snap.params.end}
              loaded={snap.sampleLoaded}
              tool={tool}
              viz={viz}
              fadeIn={edit.fadeIn}
              fadeOut={edit.fadeOut}
              fadeCurve={edit.fadeCurve}
              fadeInBend={edit.fadeInBend}
              fadeOutBend={edit.fadeOutBend}
              fadeFocus={edit.fadeFocus}
              autoSnap={edit.autoSnap}
              normalizeView={normalizeView}
              onNormalizeView={setNormalizeView}
              onZoomLabel={setZoomLabel}
              contentRev={snap.bufferRev}
              onFades={(patch) => setEdit((e) => ({ ...e, ...patch, fadeAuto: false }))}
              onFadesCommit={commit}
              onSpectralCommit={commit}
              onRegionCommit={commit}
              onAutomationCommit={commit}
              onDeleteSelection={deleteSelection}
              onCopySelection={copySelection}
              onCutSelection={cutSelection}
              onPasteAtPlayhead={pasteAtPlayhead}
              autoFocus={autoFocus}
              onAutoFocus={setAutoFocus}
              fxMode={resolvedFocus.kind === 'module' && (resolvedFocus.type === 'delay' || resolvedFocus.type === 'reverb') ? resolvedFocus.type : null}
              onLoadSample={() => sampleInput.current?.click()}
              onLoadDemo={() => {
                void engine.unlock().then(() => engine.loadDemoTone())
              }}
              onSelectModule={selectModule}
              phone={isPhoneLayout}
              phoneFocus={activeFocus}
              onGraphEdit={() => setCollapseToken((token) => token + 1)}
              analyzerOpen={analyzerOpen}
              onAnalyzerClose={() => setAnalyzerOpen(false)}
              phoneEqId={resolvedFocus.kind === 'module' && resolvedFocus.type === 'eq' ? resolvedFocus.instanceId : undefined}
              arrangement={arrangement}
              onSelectTrack={followTrack}
              onEditTrack={(trackId) => followTrack(trackId, 'edit')}
              onInspectEffect={(trackId, instanceId) => {
                if (engine.getSnapshot().selectedTrackId !== trackId) {
                  intentRef.current = trackId
                  engine.selectTrack(trackId)
                }
                selectModule(instanceId)
              }}
            />
          </div>
          {dockRight && inspectorOpen && !activeFocus ? (
            <aside className={styles.inspector} data-inspector={panelKey}>
              {inspector}
            </aside>
          ) : null}
          {dockRight && !inspectorOpen && !activeFocus ? (
            <div className={styles.inspectorReveal} data-inspector-toggle="show">
              <InspectorEye open={false} onClick={revealInspector} />
            </div>
          ) : null}
          {isPhoneLayout || activeFocus ? null : (
          <MeterStrip
            className={styles.meterDock}
            channels={snap.channelLayout === 'mono' || snap.params.makeMono > 0.5 ? 1 : 2}
            range={meterRange}
            onRange={setMeterRange}
          />
          )}
        </div>

        {isPhoneLayout && !activeFocus ? (
          <div className={styles.phoneContext}>
            <MobileContext snap={snap} focus={resolvedFocus} collapseToken={collapseToken} />
          </div>
        ) : null}

        {!isPhoneLayout && !dockRight && inspectorOpen && !activeFocus ? (
          <div
            className={`${styles.bottom} ${isPhoneLayout ? styles.phoneBottom : styles[activeSheetLevel]}`}
            data-inspector={panelKey}
          >
            {sheet ? (
              <button
                type="button"
                className={styles.sheetHandle}
                onClick={() =>
                  setSheetLevel((s) =>
                    s === 'collapsed' ? 'medium' : s === 'medium' ? 'expanded' : 'collapsed',
                  )
                }
              >
                {t.banner.inspector}
              </button>
            ) : null}
            {activeSheetLevel !== 'collapsed' || !sheet ? inspector : null}
          </div>
        ) : null}

        {editMode && snap.sampleLoaded ? (
          <div className={styles.editRow}>
          <EditBar
            snap={snap}
            viewSpan={Math.max(0.001, snap.prep.windowEnd - snap.prep.windowStart)}
            moreOpen={false}
            onToggleMore={() => undefined}
            onExport={() => setExportOpen(true)}
            onDone={() => {
              engine.stopPreview()
              setEditMode(false)
              setExportOpen(false)
            }}
          />
          </div>
        ) : null}

        <div className={`${styles.transportWrap} ${isPhoneLayout ? styles.transportPinned : ''}`} data-transport="">
          <CompactTransport
            playing={snap.playing}
            loop={snap.loop}
            start={snap.params.start}
            end={snap.params.end}
            bpm={snap.params.bpm}
            disabled={!snap.projectAudible}
            compact={compact}
            minimal={isPhoneLayout}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={() => applyHistory(undoHistory(history))}
            onRedo={() => applyHistory(redoHistory(history))}
          />
          {isPhoneLayout ? null : (
          <div className={styles.exportCol}>
            <TransportExportButton disabled={!snap.sampleLoaded} onExport={() => setExportOpen(true)} />
          </div>
          )}
        </div>

        <p className={styles.sr}>{t.transport.selectionSr(formatTimecode(snap.params.start), formatTimecode(snap.params.end))}</p>
          </div>
          {lfoCenterOpen ? (
            <div className={styles.overlay}>
              <button
                type="button"
                className={styles.settingsScrim}
                aria-label={t.settings.closeLfo}
                onClick={() => setLfoCenterOpen(false)}
              />
              <div className={`${styles.settingsFly} ${styles.lfoFly}`}>
                <LfoCenter snap={snap} onReveal={revealLfo} />
              </div>
            </div>
          ) : null}
          {settingsMenu}
        </div>

        {fileInputs}
        {manualOpen ? <ManualDialog onClose={() => setManualOpen(false)} /> : null}
      </main>
      {exportOpen ? <ExportDialog snap={snap} onClose={() => setExportOpen(false)} /> : null}
    </div>
    </FxLfoConnectProvider>
  )
}