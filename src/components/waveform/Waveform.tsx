import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { fadeBendFromMidGain, fadeGain, type FadeCurve } from '../../audio/engine/fades'
import { computeMinMax, computeMinMaxCached, mipsCovering, mixToMono } from '../../audio/engine/peaks'
import { waveformVisualGain } from '../../audio/mix/playback'
import { onPointerReset } from '../../app/pointerSession'
import { waveformLaneLayout } from '../../audio/engine/stereoStage'
import { PARAMS } from '../../audio/parameters/definitions'
import {
  EMPTY_AUTOMATION_FOCUS,
  automatedLanes,
  automationColor,
  colorIndexForParam,
  effectKindForParam,
  envelopeToParam,
  lanePolyline,
  nodeCurve,
  nodeTension,
  normalizedFromLaneY,
  sampleEnvelope,
  segmentIdForNode,
  segmentPolyline,
  type AutomationEditFocus,
} from '../../audio/automation/automation'
import { isTypingTarget } from '../../a11y/keyboard'
import { playheadNudgeSeconds } from '../../audio/engine/playheadNudge'
import { blocksPlayheadArrowKey } from './playheadKeys'
import { clipboardShortcut, hasUserTextSelection, isTextEditingTarget, isWaveformEditorContext } from './editorShortcuts'
import type { WaveTool, VizMode } from '../../app/editorState'
import { phoneDisplayViz, type FocusWorkspace } from '../../app/phoneWorkspace'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { placeAutomationLabels } from './automationLabelLayout'
import { automationEffectLabel, automationLaneTitle } from './automationLabels'
import { formatAutomationNodeValue } from './automationValue'
import { Overview } from './Overview'
import { Spectrum } from './Spectrum'
import { HearingFocusStage } from '../../hearing/HearingFocusStage'
import { HearingRevealMark, HearingTransientGuides, HearingWaveLegend, HearingWaveOverlay } from '../../hearing/HearingWaveOverlay'
import { LoudnessMeter } from '../../hearing/LoudnessMeter'
import { bindWaveZoom, getHearingReveal, subscribeHearingReveal } from '../../hearing/reveal'
import { VizBackground } from './VizBackground'
import { EqConsole } from '../eq/EqConsole'
import { anyTrackSoloed, trackHasAudio } from '../../audio/mix/tracks'
import { MultiTrackView } from '../mix/MultiTrackView'
import {
  clampView,
  fitView,
  fracToTime,
  panView,
  timeToFrac,
  verticalGain,
  wheelPanSeconds,
  zoomAround,
  zoomPercent,
  zoomToSelection,
  type View,
} from './viewport'
import { hitSpaceOverlay, dragSpaceOverlay, type SpaceHit } from '../../audio/fx/hit'
import { delayTaps, reverbTail } from '../../audio/fx/spaceModel'
import { drawDelayOverlay, drawReverbOverlay } from './spaceDraw'
import {
  SPACE_HANDLE_TOP_PX,
  clampFadeLengthToLoop,
  fadeLengthFromDiamondTime,
  fadeOriginTime,
  promotePlayheadDrag,
  resolveSimpleWaveformDrag,
  resolveWaveformDrag,
  selectionBoundaryHitPx,
  selectionFromAnchor,
} from './handleLayout'
import { EnterFocusButton } from '../focus/EnterFocusButton'
import { spectralBandsEnabled } from '../../audio/spectral/ui'
import { SpectralMixer, spectralBandCopy } from './SpectralMixer'
import { rulerMarks, rulerMinFracGap } from './rulerTicks'
import { PhoneEqGraph } from '../mobile/PhoneEqGraph'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import { automationInsertTime, defaultSelectionFadeSeconds, focusLaneFraction, focusLanePolyline, focusLaneValue, segmentAtTime } from '../../app/focusWorkspace'
import styles from './Waveform.module.css'

type Props = {
  duration: number
  start: number
  end: number
  loaded: boolean
  tool: WaveTool
  viz: VizMode
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  fadeInBend?: number
  fadeOutBend?: number
  fadeFocus?: 'in' | 'out'
  autoSnap: boolean
  normalizeView: boolean
  onNormalizeView: (value: boolean) => void
  onZoomLabel: (label: string) => void
  onLoadDemo: () => void
  onLoadSample?: () => void
  onRegionCommit: () => void
  onAutomationCommit?: () => void
  onDeleteSelection?: () => void
  onCopySelection?: () => void
  onCutSelection?: () => void
  onPasteAtPlayhead?: () => void
  onFades: (patch: {
    fadeIn?: number
    fadeOut?: number
    fadeInBend?: number
    fadeOutBend?: number
    fadeFocus?: 'in' | 'out'
  }) => void
  onFadesCommit?: () => void
  onSpectralCommit?: () => void
  contentRev?: number
  fxMode?: 'delay' | 'reverb' | null
  appearance?: 'studio' | 'sensory' | 'simple'
  followPlayhead?: boolean
  emptyLabel?: string
  trimHandles?: boolean
  onSelectModule?: (instanceId: string) => void
  autoFocus?: AutomationEditFocus
  onAutoFocus?: (focus: AutomationEditFocus) => void
  phone?: boolean
  /** Focused editing workspace. Null keeps the normal phone layout. */
  phoneFocus?: FocusWorkspace | null
  onGraphEdit?: () => void
  analyzerOpen?: boolean
  onAnalyzerClose?: () => void
  phoneEqId?: string
  /** Presentation only. Does not change transport or project audio. */
  arrangement?: 'single' | 'multi'
  onSelectTrack?: (trackId: string) => void
  onEditTrack?: (trackId: string) => void
  onInspectEffect?: (trackId: string, instanceId: string) => void
  /** Opens Focus for the view this surface is showing. */
  onEnterFocus?: (workspace: 'wave' | 'fft' | 'eq' | 'auto') => void
}

export type WaveformHandle = {
  fitSample: () => void
  zoomSelection: () => void
  fitSelection: () => void
  resetZoom: () => void
  zoomBy: (factor: number) => void
  addAutomationNode: () => void
  deleteAutomationNode: () => void
  applyFade: (side: 'in' | 'out') => void
}

function blocksSampleDeleteKey(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  return target.getAttribute('role') === 'slider'
}

const SPLIT_PREF = 'field.splitWave'
const HEARING_WAVE_PREF = 'field.hearingWaveShare'
const HEARING_WAVE_MIN = 0.16
const HEARING_WAVE_MAX = 0.88
const EQ_STRIPS_PREF = 'field.eqStripHeight'
const EQ_STRIPS_MIN = 220
const EQ_STRIPS_MAX = 720

function loadHearingWaveShare(): number {
  try {
    const n = Number(localStorage.getItem(HEARING_WAVE_PREF))
    if (Number.isFinite(n)) return Math.min(HEARING_WAVE_MAX, Math.max(HEARING_WAVE_MIN, n))
  } catch {
    /* private mode */
  }
  return 0.4
}

function loadSplitShare(): number {
  try {
    const n = Number(localStorage.getItem(SPLIT_PREF))
    if (Number.isFinite(n) && n >= 0.28 && n <= 0.82) return n
  } catch {
    /* private mode */
  }
  return 0.64
}

function loadEqStripHeight(): number {
  try {
    const n = Number(localStorage.getItem(EQ_STRIPS_PREF))
    if (Number.isFinite(n) && n >= EQ_STRIPS_MIN && n <= EQ_STRIPS_MAX) return n
  } catch {
    /* private mode */
  }
  return 360
}

function clampEqStripHeight(px: number, stageHeight: number): number {
  const max = Math.max(EQ_STRIPS_MIN, Math.min(EQ_STRIPS_MAX, stageHeight - 150))
  return Math.min(max, Math.max(EQ_STRIPS_MIN, px))
}

type DragMode =
  | 'start'
  | 'end'
  | 'move'
  | 'pan'
  | 'fadeIn'
  | 'fadeOut'
  | 'fadeInShape'
  | 'fadeOutShape'
  | 'fx'
  | 'playhead'
  | 'select'
  | 'transient'
  | 'autoNode'
  | 'autoTension'
  | null

export const Waveform = forwardRef<WaveformHandle, Props>(function Waveform(
  {
    duration,
    start,
    end,
    loaded,
    tool,
    viz,
    fadeIn,
    fadeOut,
    fadeCurve,
    fadeInBend = 0.5,
    fadeOutBend = 0.5,
    autoSnap,
    normalizeView,
    onNormalizeView,
    onZoomLabel,
    onLoadDemo,
    onLoadSample,
    onRegionCommit,
    onAutomationCommit,
    onDeleteSelection,
    onCopySelection,
    onCutSelection,
    onPasteAtPlayhead,
    onFades,
    onFadesCommit,
    onSpectralCommit,
    contentRev = 0,
    fxMode = null,
    appearance = 'studio',
    followPlayhead = false,
    emptyLabel,
    trimHandles = false,
    onSelectModule,
    autoFocus: autoFocusProp,
    onAutoFocus,
    phone = false,
    phoneFocus = null,
    onGraphEdit,
    analyzerOpen = false,
    onAnalyzerClose,
    phoneEqId,
    arrangement = 'single',
    onSelectTrack,
    onEditTrack,
    onInspectEffect,
    onEnterFocus,
  },
  ref,
) {
  const { t, paramLabel } = useI18n()
  const sensory = appearance === 'sensory'
  const simple = appearance === 'simple'
  const snap = useEngine()
  const showTransients = snap.showTransients
  const transients = showTransients ? snap.transients : []
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const peaksRef = useRef<{ min: Float32Array; max: Float32Array } | null>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState<View>(() => fitView(duration || 1))
  const [fittedRev, setFittedRev] = useState(contentRev)
  const [panning, setPanning] = useState(false)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)
  const [fadeDrag, setFadeDrag] = useState<'in' | 'out' | null>(null)
  const addAutomationNodeRef = useRef<() => void>(() => undefined)
  const deleteAutomationNodeRef = useRef<() => void>(() => undefined)
  const applyFadeRef = useRef<(side: 'in' | 'out') => void>(() => undefined)
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const node = overlayRef.current
    if (!node) return
    const measure = () => {
      const rect = node.getBoundingClientRect()
      setPlotSize((current) =>
        current.width === rect.width && current.height === rect.height ? current : { width: rect.width, height: rect.height },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const [waveShare, setWaveShare] = useState(loadSplitShare)
  const [hearingWaveShare, setHearingWaveShare] = useState(loadHearingWaveShare)
  const hearingWaveRef = useRef(hearingWaveShare)
  const waveShareRef = useRef(waveShare)
  const [eqStripHeight, setEqStripHeight] = useState(loadEqStripHeight)
  const [localAutoFocus, setLocalAutoFocus] = useState<AutomationEditFocus>(EMPTY_AUTOMATION_FOCUS)
  const autoFocusControlled = autoFocusProp != null
  const autoFocus = autoFocusProp ?? localAutoFocus
  const setAutoFocus = useCallback(
    (next: AutomationEditFocus) => {
      if (!autoFocusControlled) setLocalAutoFocus(next)
      onAutoFocus?.(next)
    },
    [autoFocusControlled, onAutoFocus],
  )
  const eqStripHeightRef = useRef(eqStripHeight)
  const splitDrag = useRef<{ y: number; share?: number; height?: number; kind: 'wave' | 'eq' } | null>(null)
  const viewRef = useRef(view)
  if (fittedRev !== contentRev) {
    setFittedRev(contentRev)
    setViewState(fitView(duration || 1))
  }
  useLayoutEffect(() => {
    viewRef.current = view
  }, [view])
  const stateRef = useRef({ start, end, duration, normalizeView, tool, autoSnap })
  const handlePx = useRef(28)

  const setView = (next: View) => {
    viewRef.current = next
    setViewState(next)
    onZoomLabel(`${Math.round(zoomPercent(next, duration || 1))}%`)
  }
  const setViewRef = useRef<(next: View) => void>(() => {})
  useEffect(() => {
    setViewRef.current = setView
  })

  useEffect(() => {
    waveShareRef.current = waveShare
  }, [waveShare])

  useEffect(() => {
    hearingWaveRef.current = hearingWaveShare
  }, [hearingWaveShare])

  useEffect(() => {
    eqStripHeightRef.current = eqStripHeight
  }, [eqStripHeight])

  useEffect(() => {
    stateRef.current = { start, end, duration, normalizeView, tool, autoSnap }
  }, [start, end, duration, normalizeView, tool, autoSnap])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.repeat) return
      if (isTypingTarget(event.target) || blocksSampleDeleteKey(event.target)) return
      if (viz === 'automation') {
        const selected = autoFocus.nodeId
        const doc = engine.getSnapshot().automation
        const lane = doc.lanes.find((item) => item.paramId === doc.selectedParamId)
        if (selected && lane?.nodes.some((node) => node.id === selected)) {
          event.preventDefault()
          engine.deleteAutomationNode(selected)
          setAutoFocus(EMPTY_AUTOMATION_FOCUS)
          onAutomationCommit?.()
          return
        }
      }
      if (!onDeleteSelection || !engine.getSnapshot().canDeleteSelection) return
      event.preventDefault()
      onDeleteSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viz, autoFocus.nodeId, onAutomationCommit, setAutoFocus, onDeleteSelection])

  useEffect(() => {
    if (!onCopySelection && !onCutSelection && !onPasteAtPlayhead) return
    const onKey = (event: KeyboardEvent) => {
      const action = clipboardShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        repeat: event.repeat,
        typing: isTextEditingTarget(event.target),
        textSelected: hasUserTextSelection(),
        editorContext: isWaveformEditorContext(event.target),
      })
      if (action === 'copy' && onCopySelection) {
        event.preventDefault()
        onCopySelection()
      } else if (action === 'cut' && onCutSelection) {
        event.preventDefault()
        onCutSelection()
      } else if (action === 'paste' && onPasteAtPlayhead) {
        event.preventDefault()
        onPasteAtPlayhead()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCopySelection, onCutSelection, onPasteAtPlayhead])

  useEffect(() => {
    handlePx.current = simple || window.matchMedia('(pointer: coarse)').matches ? 44 : 22
  }, [simple])

  useEffect(() => {
    return subscribeHearingReveal(() => {
      const reveal = getHearingReveal()
      const span = stateRef.current.duration
      if (!reveal || span <= 0 || reveal.mark === 'line') return
      const pad = Math.max(0.08, (reveal.end - reveal.start) * 0.08)
      const nextStart = Math.max(0, reveal.start - pad)
      const nextEnd = Math.min(span, Math.max(nextStart + 0.05, reveal.end + pad))
      setViewRef.current({ start: nextStart, end: nextEnd })
    })
  }, [])

  useEffect(() => {
    return bindWaveZoom((command) => {
      const span = stateRef.current.duration
      if (span <= 0) return
      const current = viewRef.current
      const next =
        command === 'fit'
          ? fitView(span)
          : zoomAround(current, command === 'out' ? 1.4 : 1 / 1.4, (current.start + current.end) / 2, span)
      setViewRef.current(next)
    })
  }, [])

  useImperativeHandle(ref, () => ({
    fitSample: () => setView(fitView(duration)),
    zoomSelection: () => setView(zoomToSelection(start, end, duration)),
    fitSelection: () => {
      setView(zoomToSelection(start, end, duration))
      onNormalizeView(true)
    },
    resetZoom: () => {
      setView(fitView(duration))
      onNormalizeView(false)
    },
    zoomBy: (factor: number) => {
      const v = viewRef.current
      setView(zoomAround(v, factor, (v.start + v.end) / 2, duration))
    },
    addAutomationNode: () => addAutomationNodeRef.current(),
    deleteAutomationNode: () => deleteAutomationNodeRef.current(),
    applyFade: (side) => applyFadeRef.current(side),
  }))

  useEffect(() => {
    onZoomLabel(`${Math.round(zoomPercent(viewRef.current, duration || 1))}%`)
  }, [duration, onZoomLabel])

  useEffect(() => {
    if (!followPlayhead) return
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last > 50 && engine.getSnapshot().playing && duration > 0) {
        last = now
        const t = engine.getSourcePlayheadSeconds()
        setViewState((prev) => {
          const span = prev.end - prev.start
          const next = clampView({ start: t - span / 2, end: t + span / 2 }, duration)
          viewRef.current = next
          return next
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [followPlayhead, duration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const buffer = engine.getBuffer()
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      const recording = engine.getSnapshot().recording
      if (recording) {
        const peaks = engine.getSnapshot().recordPeaks
        const colors = readThemeColors()
        ctx.fillStyle = colors.waveform
        const n = Math.max(1, peaks.length)
        const mid = height / 2
        const half = height * 0.42
        for (let x = 0; x < width; x++) {
          const i = Math.min(n - 1, Math.floor((x / width) * n))
          const amp = peaks[i] ?? 0
          ctx.fillRect(x, mid - amp * half, 1, Math.max(1, amp * half * 2))
        }
        ctx.fillStyle = colors.accent
        const pulse = 0.35 + 0.2 * Math.sin(performance.now() / 180)
        ctx.globalAlpha = pulse
        ctx.fillRect(width - 10, 8, 6, 6)
        ctx.globalAlpha = 1
        return
      }
      if (!buffer || duration <= 0) return
      const colors = readThemeColors()
      const selA = Math.min(start, end)
      const selB = Math.max(start, end)
      const bandLanes =
        spectralBandsEnabled && appearance === 'studio' && (viz === 'waveform' || viz === 'split') ? engine.spectralLaneSamples() : null
      if (bandLanes && bandLanes.length > 0) {
        const laneCount = bandLanes.length
        for (let lane = 0; lane < laneCount; lane++) {
          const band = bandLanes[lane]!
          const data = band.samples
          const laneH = height / laneCount
          const top0 = lane * laneH
          const samplesPerSec = data.length / duration
          const s = Math.floor(view.start * samplesPerSec)
          const e = Math.max(s + 1, Math.floor(view.end * samplesPerSec))
          const { min, max, peak } = computeMinMax(data, s, e, width)
          const gain = (normalizeView ? verticalGain(peak) : 1) * waveformVisualGain(engine.getSnapshot().liveParams.gain)
          const mid = top0 + laneH / 2
          const half = laneH * 0.38
          const span = Math.max(0.0001, view.end - view.start)
          ctx.globalAlpha = band.dim ? 0.28 : 1
          let lastSelected: boolean | null = null
          for (let x = 0; x < width; x++) {
            const t = view.start + (x / width) * span
            const selected = t >= selA && t <= selB
            if (selected !== lastSelected) {
              ctx.fillStyle = selected ? colors.waveformSelected : colors.waveform
              lastSelected = selected
            }
            const hi = Math.max(-1, Math.min(1, (max[x] ?? 0) * gain))
            const lo = Math.max(-1, Math.min(1, (min[x] ?? 0) * gain))
            const top = mid - hi * half
            const bottom = mid - lo * half
            ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
          }
          ctx.globalAlpha = 0.35
          ctx.fillStyle = colors.waveform
          ctx.fillRect(0, top0 + laneH - 1, width, 1)
          ctx.globalAlpha = 1
        }
        const span = Math.max(0.0001, view.end - view.start)
        const strokeFade = (from: number, to: number, side: 'in' | 'out', bend: number) => {
          if (!(to > from + 1e-6)) return
          ctx.beginPath()
          ctx.strokeStyle = colors.envelope
          ctx.lineWidth = Math.max(1, dpr)
          ctx.setLineDash([3 * dpr, 3 * dpr])
          const n = Math.max(20, Math.floor(((to - from) / span) * width))
          for (let i = 0; i <= n; i++) {
            const u = i / n
            const t = from + u * (to - from)
            const x = ((t - view.start) / span) * width
            const g = side === 'in' ? fadeGain(u, fadeCurve, bend) : fadeGain(1 - u, fadeCurve, bend)
            const y = (1 - g) * height
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.setLineDash([])
        }
        const inDur = clampFadeLengthToLoop(fadeIn, start, end)
        const outDur = clampFadeLengthToLoop(fadeOut, start, end)
        strokeFade(fadeOriginTime('in', start, end), start + inDur, 'in', fadeInBend)
        strokeFade(end - outDur, fadeOriginTime('out', start, end), 'out', fadeOutBend)
        return
      }
      const snapNow = engine.getSnapshot()
      const foldMono = snapNow.channelLayout === 'mono' || snapNow.params.makeMono > 0.5
      const mixed = foldMono ? engine.getMono() ?? mixToMono(buffer) : null
      const layout = waveformLaneLayout({
        foldMono,
        stereoLayout: snapNow.channelLayout === 'stereo',
        sourceChannels: buffer.numberOfChannels,
        panPct: snapNow.liveParams.pan,
        leftDb: snapNow.liveParams.channelGainL,
        rightDb: snapNow.liveParams.channelGainR,
      })
      const lanes = layout.lanes
      for (let lane = 0; lane < lanes; lane++) {
        const srcCh = buffer.numberOfChannels < 2 ? 0 : Math.min(lane, buffer.numberOfChannels - 1)
        const data = mixed ?? buffer.getChannelData(srcCh)
        const laneH = height / lanes
        const top0 = lane * laneH
        const samplesPerSec = data.length / duration
        const s = Math.floor(view.start * samplesPerSec)
        const e = Math.max(s + 1, Math.floor(view.end * samplesPerSec))
        const cached = mixed ? [] : mipsCovering(data.length, engine.getSourceMips()[srcCh])
        const { min, max, peak } = computeMinMaxCached(data, cached, s, e, width)
        const gain =
          (normalizeView ? verticalGain(peak) : 1) *
          (layout.gains[lane] ?? 1) *
          waveformVisualGain(snapNow.liveParams.gain)
        const mid = top0 + laneH / 2
        const half = laneH * 0.42
        const span = Math.max(0.0001, view.end - view.start)
        let lastSelected: boolean | null = null
        for (let x = 0; x < width; x++) {
          const t = view.start + (x / width) * span
          const selected = t >= selA && t <= selB
          if (selected !== lastSelected) {
            ctx.fillStyle = selected ? colors.waveformSelected : colors.waveform
            lastSelected = selected
          }
          const hi = Math.max(-1, Math.min(1, (max[x] ?? 0) * gain))
          const lo = Math.max(-1, Math.min(1, (min[x] ?? 0) * gain))
          const top = mid - hi * half
          const bottom = mid - lo * half
          if (appearance === 'sensory') {
            const amp = Math.max(Math.abs(hi), Math.abs(lo))
            ctx.globalAlpha = selected ? 0.1 : 0.045
            ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
            ctx.globalAlpha = selected ? 0.28 : 0.1
            const grains = 1 + Math.floor(amp * 3)
            for (let g = 0; g < grains; g++) {
              const h = (x * 13 + g * 97 + lane * 31) % 1000
              const u = h / 1000
              const y = mid - (lo + u * (hi - lo)) * half
              ctx.fillRect(x, y, 1, Math.max(1, dpr * 0.8))
            }
            ctx.globalAlpha = 1
          } else {
            ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
          }
        }
        if (lane === 0) peaksRef.current = { min, max }
      }
      const span = Math.max(0.0001, view.end - view.start)
      if (appearance === 'sensory') return
      const strokeFade = (from: number, to: number, side: 'in' | 'out', bend: number) => {
        if (!(to > from + 1e-6)) return
        ctx.beginPath()
        ctx.strokeStyle = colors.envelope
        ctx.lineWidth = Math.max(1, dpr)
        ctx.setLineDash([3 * dpr, 3 * dpr])
        const n = Math.max(20, Math.floor(((to - from) / span) * width))
        for (let i = 0; i <= n; i++) {
          const u = i / n
          const t = from + u * (to - from)
          const x = ((t - view.start) / span) * width
          const g = side === 'in' ? fadeGain(u, fadeCurve, bend) : fadeGain(1 - u, fadeCurve, bend)
          const y = (1 - g) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
      const inDur = clampFadeLengthToLoop(fadeIn, start, end)
      const outDur = clampFadeLengthToLoop(fadeOut, start, end)
      strokeFade(fadeOriginTime('in', start, end), start + inDur, 'in', fadeInBend)
      strokeFade(end - outDur, fadeOriginTime('out', start, end), 'out', fadeOutBend)
    }
    let frame = 0
    const tick = () => {
      draw()
      if (engine.getSnapshot().recording) frame = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      unsub()
    }
  }, [view, normalizeView, loaded, duration, viz, contentRev, start, end, fadeIn, fadeOut, fadeCurve, fadeInBend, fadeOutBend, appearance, snap.params.makeMono, snap.params.pan, snap.params.channelGainL, snap.params.channelGainR, snap.params.gain, snap.channelLayout, snap.recording, snap.liveParams.gain, snap.liveParams.pan, snap.liveParams.channelGainL, snap.liveParams.channelGainR, snap.spectral.enabled, snap.spectral.ready, snap.spectral.computing, snap.spectral.crossoversHz, snap.spectral.bands])

  useEffect(() => {
    let frame = 0
    let lastFx = 0
    const tick = (now: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        frame = requestAnimationFrame(tick)
        return
      }
      const el = playheadRef.current
      if (el) {
        const frac = timeToFrac(engine.getSourcePlayheadSeconds(), viewRef.current)
        if (frac >= 0 && frac <= 1) {
          el.style.display = ''
          el.style.left = `${frac * 100}%`
        } else {
          el.style.display = 'none'
        }
      }
      const fxCanvas = fxCanvasRef.current
      const snap = engine.getSnapshot()
      const mode = fxMode
      if (fxCanvas && mode && !snap.chain.find((m) => m.type === mode)?.bypassed) {
        if (now - lastFx < (snap.playing ? 33 : 80)) {
          frame = requestAnimationFrame(tick)
          return
        }
        lastFx = now
        const rect = fxCanvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = Math.max(1, Math.floor(rect.width * dpr))
        const height = Math.max(1, Math.floor(rect.height * dpr))
        if (fxCanvas.width !== width || fxCanvas.height !== height) {
          fxCanvas.width = width
          fxCanvas.height = height
        }
        const ctx = fxCanvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          const view = viewRef.current
          const now = performance.now() / 1000
          if (mode === 'delay') {
            const taps = delayTaps(snap.params, snap.delayType, snap.params.bpm, now)
            drawDelayOverlay(ctx, width, height, view.start, view.end, snap.params.start, taps)
          } else {
            drawReverbOverlay(
              ctx,
              width,
              height,
              view.start,
              view.end,
              snap.params.start,
              reverbTail(snap.params, snap.reverbType, snap.params.bpm),
              now,
            )
          }
        }
      } else if (fxCanvas) {
        const ctx = fxCanvas.getContext('2d')
        ctx?.clearRect(0, 0, fxCanvas.width, fxCanvas.height)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fxMode])

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const onWheel = (event: WheelEvent) => {
      const { duration: d } = stateRef.current
      if (d <= 0) return
      event.preventDefault()
      const rect = overlay.getBoundingClientRect()
      const v = viewRef.current
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const span = v.end - v.start
        const delta = wheelPanSeconds(event.deltaX, event.deltaY, event.shiftKey, span, rect.width)
        if (delta !== null) setView(panView(v, delta, d))
      } else {
        const focus = fracToTime((event.clientX - rect.left) / rect.width, v)
        setView(zoomAround(v, event.deltaY > 0 ? 1.2 : 1 / 1.2, focus, d))
      }
    }
    overlay.addEventListener('wheel', onWheel, { passive: false })
    return () => overlay.removeEventListener('wheel', onWheel)
  }, [])

  const pointers = useRef(new Map<number, number>())
  const drag = useRef<{
    mode: DragMode
    span: number
    originT: number
    originY: number
    originX: number
    originView: View
    origin: { start: number; end: number }
    button: number
    pointerType: string
    fx?: SpaceHit
    transientIndex?: number
    autoNodeId?: string
    autoSegmentId?: string
    originTension?: number
  } | null>(null)
  const pinch = useRef<{ dist: number; view: View; focus: number } | null>(null)

  useEffect(() => {
    return onPointerReset(() => {
      drag.current = null
      pinch.current = null
      pointers.current.clear()
      setPanning(false)
      setFadeDrag(null)
      if (overlayRef.current) delete overlayRef.current.dataset.cursor
    })
  }, [])

  const onEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (sensory) return
    if (event.altKey || event.metaKey || event.ctrlKey) return
    if (blocksPlayheadArrowKey(event.target)) return
    const delta = playheadNudgeSeconds(event.key, event.shiftKey)
    if (delta == null || !loaded || !(duration > 0)) return
    event.preventDefault()
    engine.nudgePlayhead(delta, 'sample')
    const el = playheadRef.current
    if (!el) return
    const frac = timeToFrac(engine.getSourcePlayheadSeconds(), viewRef.current)
    if (frac >= 0 && frac <= 1) {
      el.style.display = ''
      el.style.left = `${frac * 100}%`
    } else {
      el.style.display = 'none'
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0) return
    const overlay = overlayRef.current
    if (!overlay) return
    if (!sensory && !blocksPlayheadArrowKey(event.target)) {
      editorRef.current?.focus({ preventScroll: true })
    }
    event.preventDefault()
    overlay.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, event.clientX)

    if (pointers.current.size === 2) {
      drag.current = null
      const xs = [...pointers.current.values()]
      const rect = overlay.getBoundingClientRect()
      const midFrac = ((xs[0] + xs[1]) / 2 - rect.left) / rect.width
      pinch.current = {
        dist: Math.max(1, Math.abs(xs[0] - xs[1])),
        view: viewRef.current,
        focus: fracToTime(midFrac, viewRef.current),
      }
      return
    }

    const rect = overlay.getBoundingClientRect()
    const width = rect.width
    const x = event.clientX - rect.left
    const startX = timeToFrac(start, viewRef.current) * width
    const endX = timeToFrac(end, viewRef.current) * width
    const t = fracToTime(x / width, viewRef.current)
    const hit = simple ? handlePx.current : selectionBoundaryHitPx(event.pointerType)
    const y = event.clientY - rect.top

    if (viz === 'automation') {
      const target = event.target as HTMLElement | null
      const doc = engine.getSnapshot().automation
      const lane = doc.lanes.find((item) => item.paramId === doc.selectedParamId)
      const tensionEl = target?.closest?.('[data-auto-tension]') as HTMLElement | null
      const tensionId = tensionEl?.dataset.autoTension
      if (tensionEl && tensionId) {
        const anchor = lane?.nodes.find((node) => node.id === tensionId)
        setAutoFocus({ nodeId: null, segmentId: tensionId })
        onGraphEdit?.()
        drag.current = {
          mode: 'autoTension',
          span: end - start,
          originT: t,
          originY: y,
          originX: event.clientX,
          originView: { ...viewRef.current },
          origin: { start, end },
          button: event.button,
          pointerType: event.pointerType,
          autoSegmentId: tensionId,
          originTension: nodeTension(anchor),
        }
        return
      }
      const nodeEl = target?.closest?.('[data-auto-node]') as HTMLElement | null
      const nodeId = nodeEl?.dataset.autoNode
      if (nodeEl && nodeId) {
        setAutoFocus({ nodeId, segmentId: segmentIdForNode(lane?.nodes ?? [], nodeId) })
        nodeEl.focus({ preventScroll: true })
        onGraphEdit?.()
        drag.current = {
          mode: 'autoNode',
          span: end - start,
          originT: t,
          originY: y,
          originX: event.clientX,
          originView: { ...viewRef.current },
          origin: { start, end },
          button: event.button,
          pointerType: event.pointerType,
          autoNodeId: nodeId,
        }
        return
      }
      const segmentEl = target?.closest?.('[data-auto-segment]') as HTMLElement | null
      const segmentId = segmentEl?.dataset.autoSegment
      if (segmentEl && segmentId) {
        setAutoFocus({ nodeId: null, segmentId })
        return
      }
      const under = segmentAtTime(lane?.nodes ?? [], t)
      if (phoneFocus === 'auto' && under) setAutoFocus({ nodeId: null, segmentId: under })
      else setAutoFocus(EMPTY_AUTOMATION_FOCUS)
    }

    const zoneAttr = (event.target as HTMLElement | null)?.closest?.('[data-boundary-zone]') as HTMLElement | null
    const handleAttr = (event.target as HTMLElement | null)?.closest?.('[data-edge]') as HTMLElement | null
    const transientAttr = (event.target as HTMLElement | null)?.closest?.('[data-transient]') as HTMLElement | null
    const boundaryZone = zoneAttr?.dataset.boundaryZone === 'fade' || zoneAttr?.dataset.boundaryZone === 'edge'
      ? zoneAttr.dataset.boundaryZone
      : undefined
    const mode: DragMode = simple
      ? resolveSimpleWaveformDrag({
      altOrMiddle: event.altKey || event.button === 1 || event.buttons === 4,
          x,
          startX,
          endX,
          hitPx: hit,
          edge: handleAttr?.dataset.edge === 'start' || handleAttr?.dataset.edge === 'end' ? handleAttr.dataset.edge : undefined,
        })
      : resolveWaveformDrag({
      altOrMiddle: event.altKey || event.button === 1 || event.buttons === 4,
      shift: event.shiftKey,
      x,
      y,
      height: rect.height,
      startX,
      endX,
      fadeInX: startX,
      fadeOutX: endX,
      hitPx: hit,
      coarse: event.pointerType === 'touch' || event.pointerType === 'pen',
      boundaryZone,
      edge: handleAttr?.dataset.edge === 'start' || handleAttr?.dataset.edge === 'end' ? handleAttr.dataset.edge : undefined,
      transient: transientAttr?.dataset.transient != null,
    })
    const transientIndex = mode === 'transient' && transientAttr?.dataset.transient != null
      ? Number(transientAttr.dataset.transient)
      : undefined

    const usingRegionHandle =
      mode === 'fadeIn' ||
      mode === 'fadeOut' ||
      mode === 'fadeInShape' ||
      mode === 'fadeOutShape' ||
      mode === 'start' ||
      mode === 'end' ||
      mode === 'transient'

    if (!usingRegionHandle && fxMode && tool === 'select' && !simple) {
      const snap = engine.getSnapshot()
      const taps = delayTaps(snap.params, snap.delayType, snap.params.bpm)
      const tail = reverbTail(snap.params, snap.reverbType, snap.params.bpm)
      const spaceHit = hitSpaceOverlay(
        x,
        y,
        width,
        rect.height,
        viewRef.current.start,
        viewRef.current.end,
        start,
        fxMode,
        taps,
        tail,
        { xs: [startX, endX], radius: hit, top: SPACE_HANDLE_TOP_PX },
      )
      if (spaceHit) {
        drag.current = {
          mode: 'fx',
          span: end - start,
          originT: t,
          originY: y,
          originX: event.clientX,
          originView: { ...viewRef.current },
          origin: { start, end },
          button: event.button,
          pointerType: event.pointerType,
          fx: spaceHit,
        }
        return
      }
    }

    if (mode === 'fadeIn' || mode === 'fadeInShape') {
      onFades({ fadeFocus: 'in' })
      setFadeDrag('in')
    } else if (mode === 'fadeOut' || mode === 'fadeOutShape') {
      onFades({ fadeFocus: 'out' })
      setFadeDrag('out')
    }
    if (mode === 'playhead') engine.seekSeconds(t, 'sample')
    if (mode === 'start' || mode === 'end' || mode === 'move') onGraphEdit?.()
    const originTransient = transientIndex != null ? transients[transientIndex] : t
    drag.current = {
      mode,
      span: end - start,
      originT: originTransient ?? t,
      originY: event.clientY - rect.top,
      originX: event.clientX,
      originView: { ...viewRef.current },
      origin: { start, end },
      button: event.button,
      pointerType: event.pointerType,
      transientIndex,
    }
    setPanning(mode === 'pan')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current
    if (overlay && !sensory && !simple && !drag.current) {
      const rect = overlay.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const width = rect.width
      const startX = timeToFrac(start, viewRef.current) * width
      const endX = timeToFrac(end, viewRef.current) * width
      const coarse = event.pointerType === 'touch' || event.pointerType === 'pen'
      const kind = resolveWaveformDrag({
        altOrMiddle: false,
        shift: event.shiftKey,
        x,
        y,
        height: rect.height,
        startX,
        endX,
        fadeInX: startX,
        fadeOutX: endX,
        hitPx: selectionBoundaryHitPx(event.pointerType),
        coarse,
        transient: false,
      })
      const cursor = kind === 'fadeIn' || kind === 'fadeOut' ? 'fade' : kind === 'start' || kind === 'end' ? 'edge' : kind === 'move' ? 'move' : ''
      if (overlay.dataset.cursor !== cursor) overlay.dataset.cursor = cursor
    }
    if (!pointers.current.has(event.pointerId)) return
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      endPointer(event)
      return
    }
    pointers.current.set(event.pointerId, event.clientX)
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()

    if (pinch.current && pointers.current.size >= 2) {
      const xs = [...pointers.current.values()]
      const dist = Math.max(1, Math.abs(xs[0] - xs[1]))
      const factor = pinch.current.dist / dist
      setView(zoomAround(pinch.current.view, factor, pinch.current.focus, duration))
      return
    }
    if (!drag.current) return
    const next = fracToTime((event.clientX - rect.left) / rect.width, viewRef.current)
    const { mode, span, originT, origin, fx, originX, originView } = drag.current
    if (mode === 'autoTension' && drag.current.autoSegmentId) {
      const dy = (drag.current.originY - (event.clientY - rect.top)) / Math.max(1, rect.height)
      engine.setAutomationTension(drag.current.autoSegmentId, (drag.current.originTension ?? 0) + dy * 2)
      return
    }
    if (mode === 'autoNode' && drag.current.autoNodeId) {
      const yFrac = (event.clientY - rect.top) / Math.max(1, rect.height)
      const value = phoneFocus === 'auto' ? focusLaneValue(yFrac) : normalizedFromLaneY(event.clientY - rect.top, rect.height)
      engine.moveAutomationNode(drag.current.autoNodeId, next, value)
      return
    }
    if (mode === 'fx' && fx) {
      engine.setParams(
        dragSpaceOverlay(
          fx,
          originT,
          next,
          drag.current.originY,
          event.clientY - rect.top,
          rect.height,
          engine.getSnapshot().params,
        ),
      )
      return
    }
    if (mode === 'pan') {
      const spanSec = originView.end - originView.start
      const delta = -((event.clientX - originX) / Math.max(1, rect.width)) * spanSec
      setView(panView(originView, delta, duration))
      return
    }
    if (mode === 'playhead') {
      const dx = Math.abs(event.clientX - originX)
      const promoted = promotePlayheadDrag({
        simple,
        button: drag.current.button,
        pointerType: drag.current.pointerType,
        dx,
      })
      if (promoted === 'pan') {
        drag.current.mode = 'pan'
        setPanning(true)
        const spanSec = originView.end - originView.start
        const delta = -((event.clientX - originX) / Math.max(1, rect.width)) * spanSec
        setView(panView(originView, delta, duration))
        return
      }
      if (promoted === 'playhead' || viz === 'automation') {
        engine.seekSeconds(next, 'sample')
        return
      }
      drag.current.mode = 'select'
      onGraphEdit?.()
      const spanSel = selectionFromAnchor(originT, next)
      engine.setRegion(spanSel.start, spanSel.end)
      return
    }
    if (mode === 'select') {
      const spanSel = selectionFromAnchor(originT, next)
      engine.setRegion(spanSel.start, spanSel.end)
      return
    }
    if (mode === 'start') engine.setParam('start', next)
    else if (mode === 'end') engine.setParam('end', next)
    else if (mode === 'fadeIn') {
      onFades({
        fadeIn: fadeLengthFromDiamondTime('in', start, end, next),
        fadeFocus: 'in',
      })
    } else if (mode === 'fadeOut') {
      onFades({
        fadeOut: fadeLengthFromDiamondTime('out', start, end, next),
        fadeFocus: 'out',
      })
    } else if (mode === 'fadeInShape') {
      onFades({
        fadeFocus: 'in',
        fadeInBend: fadeBendFromMidGain(
          1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
          fadeCurve,
        ),
      })
    } else if (mode === 'fadeOutShape') {
      onFades({
        fadeFocus: 'out',
        fadeOutBend: fadeBendFromMidGain(
          1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
          fadeCurve,
        ),
      })
    }
    else if (mode === 'transient' && drag.current.transientIndex != null) {
      engine.setTransientTime(drag.current.transientIndex, next)
    }
    else if (mode === 'move') {
      const delta = next - originT
      const maxStart = Math.max(0, duration - span)
      const s = Math.min(maxStart, Math.max(0, origin.start + delta))
      engine.setRegion(s, s + span)
    }
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      overlayRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      const dragState = drag.current
      const mode = dragState?.mode
      const transientIndex = dragState?.transientIndex
      const originT = dragState?.originT ?? 0
      drag.current = null
      setPanning(false)
      setFadeDrag(null)
      if (overlayRef.current) overlayRef.current.dataset.cursor = ''
      if (mode === 'transient' && transientIndex != null) {
        const to = engine.getSnapshot().transients[transientIndex] ?? originT
        engine.commitTransientWarp(transientIndex, originT, to)
      }
      if (mode === 'autoNode' || mode === 'autoTension') onAutomationCommit?.()
      if (mode === 'start' || mode === 'end' || mode === 'move' || mode === 'select') {
        if (autoSnap) {
          if (mode === 'start' || mode === 'move' || mode === 'select') engine.snapToZero('start')
          if (mode === 'end' || mode === 'move' || mode === 'select') engine.snapToZero('end')
        }
        onRegionCommit()
      }
      if (
        mode === 'fadeIn' ||
        mode === 'fadeOut' ||
        mode === 'fadeInShape' ||
        mode === 'fadeOutShape'
      ) {
        onFadesCommit?.()
      }
    }
  }

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (viz === 'automation') {
      event.preventDefault()
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('[data-auto-node]')) return
      const overlay = overlayRef.current
      if (!overlay || duration <= 0) return
      const rect = overlay.getBoundingClientRect()
      const time = fracToTime((event.clientX - rect.left) / Math.max(1, rect.width), viewRef.current)
      const yFrac = (event.clientY - rect.top) / Math.max(1, rect.height)
      const value = phoneFocus === 'auto' ? focusLaneValue(yFrac) : normalizedFromLaneY(event.clientY - rect.top, rect.height)
      const id = engine.addAutomationNode(time, value)
      if (!id) return
      const lane = engine.getSnapshot().automation.lanes.find((item) => item.paramId === engine.getSnapshot().automation.selectedParamId)
      setAutoFocus({ nodeId: id, segmentId: segmentIdForNode(lane?.nodes ?? [], id) })
      onAutomationCommit?.()
      return
    }
    if (duration <= 0) return
    if (phoneFocus === 'hearing') {
      const current = viewRef.current
      const selSpan = Math.max(0.001, end - start)
      const viewSpan = Math.max(0.001, current.end - current.start)
      const coversSelection = current.start <= start + selSpan * 0.2 && current.end >= end - selSpan * 0.2
      const tight = viewSpan <= selSpan * 1.8 && viewSpan < duration * 0.98
      const whole = start <= 0.001 && end >= duration - 0.001
      if ((coversSelection && tight) || (whole && viewSpan < duration * 0.98)) setView(fitView(duration))
      else setView(zoomToSelection(start, end, duration))
      return
    }
    const full = start <= 0.001 && end >= duration - 0.001
    setView(full ? fitView(duration) : zoomToSelection(start, end, duration))
  }

  const pct = (t: number) => timeToFrac(t, view) * 100
  const startPct = pct(start)
  const endPct = pct(end)
  const regionLeft = Math.max(0, Math.min(100, startPct))
  const regionRight = Math.max(0, Math.min(100, endPct))
  const ticks = useMemo(
    () =>
      rulerMarks(
        view.start,
        view.end,
        duration,
        plotSize.width > 0 ? rulerMinFracGap(plotSize.width, phone ? 96 : 58) : 0.16,
      ),
    [view, duration, plotSize.width, phone],
  )

  const showFadeAffordances = phoneFocus === 'wave' && snap.canClearSelection
  const applyDefaultFade = (side: 'in' | 'out') => {
    const seconds = defaultSelectionFadeSeconds(start, end)
    if (!(seconds > 0)) return
    if (side === 'in') onFades({ fadeIn: seconds, fadeFocus: 'in' })
    else onFades({ fadeOut: seconds, fadeFocus: 'out' })
    onFadesCommit?.()
  }
  const addAutomationNodeAtPlayhead = () => {
    const time = automationInsertTime(engine.getSourcePlayheadSeconds(), view.start, view.end)
    const doc = engine.getSnapshot().automation
    const lane = doc.lanes.find((item) => item.paramId === doc.selectedParamId)
    const nodes = [...(lane?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    const value = sampleEnvelope(nodes, time) ?? 0.5
    const id = engine.addAutomationNode(time, value)
    if (!id) return
    const next = engine.getSnapshot().automation.lanes.find((item) => item.paramId === doc.selectedParamId)
    setAutoFocus({ nodeId: id, segmentId: segmentIdForNode(next?.nodes ?? [], id) })
    onAutomationCommit?.()
  }
  const deleteSelectedAutomationNode = () => {
    const selected = autoFocus.nodeId
    if (!selected) return
    engine.deleteAutomationNode(selected)
    setAutoFocus(EMPTY_AUTOMATION_FOCUS)
    onAutomationCommit?.()
  }
  useLayoutEffect(() => {
    addAutomationNodeRef.current = addAutomationNodeAtPlayhead
    deleteAutomationNodeRef.current = deleteSelectedAutomationNode
    applyFadeRef.current = applyDefaultFade
  })
  const hearingFocus = phoneFocus === 'hearing'
  const showWave = hearingFocus || phoneFocus === 'wave' || viz === 'waveform' || viz === 'split' || viz === 'automation'
  const automationView = viz === 'automation' && !sensory && !simple
  const automationLanes = automationView ? automatedLanes(snap.automation) : []
  const automationLane = automationLanes.find((lane) => lane.paramId === snap.automation.selectedParamId) ?? null
  const activeNodes = automationLane
    ? [...automationLane.nodes].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    : []
  const activeColor = automationColor(colorIndexForParam(snap.automation, snap.automation.selectedParamId))
  const activeKind = effectKindForParam(snap.automation.selectedParamId)
  const activeTitle = activeKind
    ? automationLaneTitle(
        automationEffectLabel(activeKind, t.modules, t.waveform.automationComb),
        paramLabel(snap.automation.selectedParamId),
      )
    : paramLabel(snap.automation.selectedParamId)
  const tensionSegment = activeNodes.find((node) => node.id === autoFocus.segmentId)
  const tensionIndex = tensionSegment ? activeNodes.findIndex((node) => node.id === tensionSegment.id) : -1
  const tensionNext = tensionIndex >= 0 ? activeNodes[tensionIndex + 1] : undefined
  const tensionTime = tensionSegment && tensionNext ? (tensionSegment.time + tensionNext.time) / 2 : null
  const tensionValue =
    tensionSegment && tensionNext && nodeCurve(tensionSegment) === 'smooth'
      ? sampleEnvelope(activeNodes, tensionTime ?? tensionSegment.time)
      : null
  const activeDef = PARAMS[snap.automation.selectedParamId]
  const placedLabels = automationView
    ? placeAutomationLabels(
        activeNodes.flatMap((node) => {
          const frac = timeToFrac(node.time, view)
          if (frac < -0.02 || frac > 1.02) return []
          const selected = node.id === autoFocus.nodeId
          const hovered = node.id === hoverNodeId
          return [
            {
              id: node.id,
              x: frac,
              y: phoneFocus === 'auto' ? focusLaneFraction(node.value) : 1 - node.value,
              text: formatAutomationNodeValue(envelopeToParam(activeDef.id, node.value), activeDef),
              priority: selected ? 3 : hovered ? 2 : 1,
            },
          ]
        }),
        plotSize.width,
        plotSize.height,
      )
    : []
  const showArrangement = arrangement === 'multi' && !sensory && !simple && phoneFocus == null
  const mixTrack = snap.tracks.find((item) => item.id === snap.selectedTrackId) ?? snap.tracks[0] ?? null
  const mixDim = Boolean(mixTrack && anyTrackSoloed(snap.tracks) && !mixTrack.solo)
  const shownViz = phone ? phoneDisplayViz(viz) : viz
  const phoneEq = phone && shownViz === 'eq-split'
  const showSpec =
    !showArrangement &&
    !phoneEq &&
    phoneFocus !== 'wave' &&
    !hearingFocus &&
    (shownViz === 'spectrum' || shownViz === 'split' || shownViz === 'eq-split')
  const eqFocus = phoneFocus === 'eq'
  const eqFocusClean = phoneEq || eqFocus
  const showEqConsole = !showArrangement && shownViz === 'eq-split' && !phone && !eqFocusClean && !hearingFocus
  const zoomed = duration > 0 && view.end - view.start < duration * 0.92
  const splitStage = !eqFocus && (viz === 'split' || viz === 'eq-split')

    return (
    <div
      className={`${styles.editor} ${hearingFocus ? styles.hearingEditor : ''} ${sensory ? styles.sensory : ''} ${simple ? styles.simple : ''} ${phone ? styles.phone : ''} ${phoneFocus ? styles.phoneFocus : ''}`}
      data-waveform-editor=""
    >
      <div className={`${styles.stage} ${splitStage ? styles.split : ''} ${showEqConsole ? styles.eqStage : ''}`}>
        <div
          ref={editorRef}
          className={styles.wrap}
          hidden={!showWave || showArrangement}
          role="region"
          aria-label="Waveform editor"
          tabIndex={sensory ? undefined : 0}
          onKeyDown={onEditorKeyDown}
          style={
            hearingFocus
              ? { flex: `${hearingWaveShare} 1 0%`, minHeight: 72 }
              : viz === 'split'
                ? { flex: waveShare }
                : undefined
          }
        >
          {automationView ? (
            <div className={styles.autoBar}>
              <span className={styles.autoTrack} title={snap.tracks.find((track) => track.id === snap.selectedTrackId)?.name ?? ''}>
                {`T${Math.max(1, snap.tracks.findIndex((track) => track.id === snap.selectedTrackId) + 1)}`}
              </span>
              <span className={styles.autoParam} title={activeTitle}>
                {activeTitle}
              </span>
            </div>
          ) : null}
          <div className={`${styles.wavePane} ${mixDim && arrangement !== 'multi' && !sensory && !simple ? styles.waveDim : ''}`}>
            {sensory ? null : <VizBackground inset={simple ? 'fill' : 'plot'} />}
            {!automationView && !sensory && !simple && arrangement !== 'multi' && snap.tracks.filter(trackHasAudio).length > 1 ? (
              <div className={styles.trackTabs} role="tablist" aria-label={t.waveform.tracksAria}>
                {snap.tracks.map((track) => {
                  const on = track.id === snap.selectedTrackId
                  return (
                    <button
                      key={track.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      title={track.fileName || track.name}
                      className={`${styles.trackTab} ${on ? styles.trackTabOn : ''}`}
                      onClick={() => (onSelectTrack ? onSelectTrack(track.id) : engine.selectTrack(track.id))}
                    >
                      <span>{track.name}</span>
                      {track.fileName ? <span className={styles.trackTabFile}>{track.fileName}</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
            <HearingWaveOverlay viewStart={view.start} viewEnd={view.end} />
            <HearingTransientGuides viewStart={view.start} viewEnd={view.end} showInputMarks={showTransients} />
            {hearingFocus ? <HearingWaveLegend /> : null}
            <HearingRevealMark viewStart={view.start} viewEnd={view.end} />
            {spectralBandsEnabled && snap.spectral.enabled && snap.spectral.ready && !sensory && !simple && (viz === 'waveform' || viz === 'split') ? (
              <div className={styles.bandLaneLabels} aria-hidden="true">
                {snap.spectral.bands.map((band) => (
                  <span key={band.id}>{spectralBandCopy(band.id, t.waveform.spectral)}</span>
                ))}
              </div>
            ) : null}
            {loaded && (snap.channelLayout === 'mono' || snap.params.makeMono > 0.5) ? (
              <span className={styles.monoBadge}>{t.waveform.mono}</span>
            ) : null}
            {automationView ? (
              <div className={styles.autoLegend} aria-hidden="true">
                {automationLanes.map((lane) => {
                  const active = lane.paramId === snap.automation.selectedParamId
                  return (
                    <span
                      key={lane.paramId}
                      className={`${styles.autoLegendItem} ${active ? styles.autoLegendOn : ''}`}
                      style={{ color: automationColor(lane.colorIndex) }}
                    >
                      <i />
                      {active ? activeTitle : null}
                    </span>
                  )
                })}
                {automationLane ? null : (
                  <span className={`${styles.autoLegendItem} ${styles.autoLegendOn}`} style={{ color: activeColor }}>
                    <i />
                    {activeTitle}
                  </span>
                )}
              </div>
            ) : null}
            <canvas ref={fxCanvasRef} className={styles.fxCanvas} hidden={sensory || simple} aria-hidden="true" />
            <div
              ref={overlayRef}
              className={`${styles.overlay} ${automationView ? styles.autoOverlay : ''} ${panning ? `${styles.overlayPan} ${styles.grabbing}` : ''}`}
              onPointerDown={loaded ? onPointerDown : undefined}
              onPointerMove={loaded ? onPointerMove : undefined}
              onPointerUp={loaded ? endPointer : undefined}
              onPointerCancel={loaded ? endPointer : undefined}
              onDoubleClick={loaded ? onDoubleClick : undefined}
            >
              {loaded && duration > 0 ? (
                <>
                  <div
                    className={styles.regionFrame}
                    style={{ left: `${regionLeft}%`, width: `${Math.max(0, regionRight - regionLeft)}%` }}
                  />
                  {!sensory && !simple ? (
                    <>
                      {(['start', 'end'] as const).map((edge) => {
                        const left = edge === 'start' ? startPct : endPct
                        if (left < -2 || left > 102) return null
                        const fadeLabel = edge === 'start' ? t.waveform.fadeIn : t.waveform.fadeOut
                        const edgeLabel = edge === 'start' ? t.waveform.regionStart : t.waveform.regionEnd
                        return (
                          <div key={edge} className={styles.boundaryHit} data-edge={edge} style={{ left: `${left}%` }}>
                            <div
                              className={`${styles.boundaryFade} ${showFadeAffordances ? styles.boundaryFadeFocus : ''}`}
                              data-edge={edge}
                              data-boundary-zone="fade"
                              title={fadeLabel}
                              aria-label={fadeLabel}
                            >
                              {showFadeAffordances ? (
                                <span
                                  className={styles.fadeGlyph}
                                  data-fade-handle={edge === 'start' ? 'in' : 'out'}
                                  aria-hidden="true"
                                >
                                  {edge === 'start' ? '↗' : '↘'}
                                </span>
                              ) : null}
                            </div>
                            <div
                              className={`${styles.boundaryEdge} ${showFadeAffordances ? styles.boundaryEdgeFocus : ''}`}
                              data-edge={edge}
                              data-boundary-zone="edge"
                              title={edgeLabel}
                              aria-label={edgeLabel}
                            />
                          </div>
                        )
                      })}
                    </>
                  ) : simple ? (
                    <>
                      <div
                        className={`${styles.simpleEdge} ${styles.simpleEdgeStart} ${trimHandles ? styles.simpleEdgeHot : ''}`}
                        data-edge="start"
                        style={{ left: `${startPct}%` }}
                        role="slider"
                        tabIndex={0}
                        aria-valuemin={0}
                        aria-valuemax={end}
                        aria-valuenow={start}
                        aria-label={t.simple.regionStartAria(start.toFixed(1))}
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                          event.preventDefault()
                          const step = event.shiftKey ? 0.01 : 0.05
                          engine.setParam('start', start + (event.key === 'ArrowRight' ? step : -step))
                          onRegionCommit()
                        }}
                      />
                      <div
                        className={`${styles.simpleEdge} ${styles.simpleEdgeEnd} ${trimHandles ? styles.simpleEdgeHot : ''}`}
                        data-edge="end"
                        style={{ left: `${endPct}%` }}
                        role="slider"
                        tabIndex={0}
                        aria-valuemin={start}
                        aria-valuemax={duration}
                        aria-valuenow={end}
                        aria-label={t.simple.regionEndAria(end.toFixed(1))}
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                          event.preventDefault()
                          const step = event.shiftKey ? 0.01 : 0.05
                          engine.setParam('end', end + (event.key === 'ArrowRight' ? step : -step))
                          onRegionCommit()
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.sensoryEdge}
                        data-edge="start"
                        style={{ left: `${startPct}%` }}
                        aria-label={t.waveform.regionStart}
                      />
                      <button
                        type="button"
                        className={styles.sensoryEdge}
                        data-edge="end"
                        style={{ left: `${endPct}%` }}
                        aria-label={t.waveform.regionEnd}
                      />
                    </>
                  )}
                  <div ref={playheadRef} className={styles.playhead} />
                  {fadeDrag ? (
                    <div className={styles.fadeHint} data-fade-hint={fadeDrag}>
                      {t.focus.fadeMs(
                        fadeDrag === 'in' ? t.waveform.fadeIn : t.waveform.fadeOut,
                        Math.round((fadeDrag === 'in' ? clampFadeLengthToLoop(fadeIn, start, end) : clampFadeLengthToLoop(fadeOut, start, end)) * 1000),
                      )}
                    </div>
                  ) : null}
                  {automationView ? (
                    <>
                      <svg
                        className={styles.autoSvg}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        {[0, 25, 50, 75, 100].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            x2="100"
                            y1={y}
                            y2={y}
                            className={styles.autoGrid}
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {automationLanes.map((lane) => {
                          const active = lane.paramId === snap.automation.selectedParamId
                          const drawn = lanePolyline(lane.nodes, view.start, view.end)
                          const points = drawn && phoneFocus === 'auto' ? focusLanePolyline(drawn) : drawn
                          if (!points) return null
                          const color = automationColor(lane.colorIndex)
                          return (
                            <polyline
                              key={lane.paramId}
                              points={points}
                              fill="none"
                              stroke={color}
                              strokeWidth={active && phoneFocus === 'auto' ? 2 : 1}
                              strokeOpacity={active ? 1 : phoneFocus === 'auto' ? 0.12 : 0.28}
                              vectorEffect="non-scaling-stroke"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                            />
                          )
                        })}
                        {activeNodes.slice(0, -1).map((node, index) => {
                          const next = activeNodes[index + 1]
                          if (!next) return null
                          const drawn = segmentPolyline(node, next, view.start, view.end)
                          const points = drawn && phoneFocus === 'auto' ? focusLanePolyline(drawn) : drawn
                          if (!points) return null
                          return (
                            <polyline
                              key={node.id}
                              points={points}
                              data-auto-segment={node.id}
                              className={styles.autoHit}
                              vectorEffect="non-scaling-stroke"
                            />
                          )
                        })}
                      </svg>
                      {activeNodes.map((node) => {
                        const frac = timeToFrac(node.time, view)
                        if (frac < -0.02 || frac > 1.02) return null
                        const selected = node.id === autoFocus.nodeId
                        const valueLabel = formatAutomationNodeValue(envelopeToParam(activeDef.id, node.value), activeDef)
                        return (
                          <button
                            key={node.id}
                            type="button"
                            data-auto-node={node.id}
                            className={`${styles.autoNode} ${selected ? styles.autoNodeOn : ''}`}
                            style={{ left: `${frac * 100}%`, top: `${(phoneFocus === 'auto' ? focusLaneFraction(node.value) : 1 - node.value) * 100}%`, color: activeColor }}
                            aria-label={t.waveform.automationNode(valueLabel)}
                            title={valueLabel}
                            aria-pressed={selected}
                            onPointerEnter={() => setHoverNodeId(node.id)}
                            onPointerLeave={() => setHoverNodeId((current) => (current === node.id ? null : current))}
                          />
                        )
                      })}
                      {placedLabels.map((label) =>
                        label.visible ? (
                          <span
                            key={label.id}
                            className={`${styles.autoValue} ${label.id === autoFocus.nodeId || label.id === hoverNodeId ? styles.autoValueOn : ''}`}
                            style={{ left: `${label.left}%`, top: `${label.top}%` }}
                            data-auto-value={label.id}
                            aria-hidden="true"
                          >
                            {label.text}
                          </span>
                        ) : null,
                      )}
                      {tensionSegment && tensionNext && tensionValue != null && tensionTime != null && timeToFrac(tensionTime, view) >= -0.02 && timeToFrac(tensionTime, view) <= 1.02 ? (
                        <button
                          type="button"
                          data-auto-tension={tensionSegment.id}
                          className={styles.autoTension}
                          style={{
                            left: `${timeToFrac(tensionTime, view) * 100}%`,
                            top: `${(phoneFocus === 'auto' ? focusLaneFraction(tensionValue) : 1 - tensionValue) * 100}%`,
                            background: activeColor,
                          }}
                          aria-label={t.waveform.automationTensionHandle}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {showTransients && !sensory && !simple
                    ? transients.map((t, i) => {
                        const left = pct(t)
                        if (left < -1 || left > 101) return null
                        return (
                          <div
                            key={`${i}:${t.toFixed(4)}`}
                            className={styles.transient}
                            data-transient={i}
                            style={{ left: `${left}%` }}
                            role="slider"
                            aria-label={`Transient ${i + 1}`}
                          />
                        )
                      })
                    : null}
                </>
              ) : (
                <div className={styles.empty}>
                  <span>{emptyLabel ?? t.waveform.empty}</span>
                  {onLoadSample ? (
                    <button type="button" className={`${styles.demo} ${styles.loadPrimary}`} onClick={onLoadSample}>
                      {t.header.loadSample}
                    </button>
                  ) : null}
                  <button type="button" className={styles.demo} onClick={onLoadDemo}>
                    {t.waveform.loadDemo}
                  </button>
                </div>
              )}
            </div>
            <div className={styles.ruler} hidden={sensory || simple}>
              {loaded
                ? ticks.map((mark) => (
                    <span
                      key={mark.t}
                      data-time-tick=""
                      className={`${styles.tick} ${mark.frac <= 0.04 ? styles.tickStart : ''} ${mark.frac >= 0.96 ? styles.tickEnd : ''}`}
                      style={{ left: `${mark.frac * 100}%` }}
                    >
                      {mark.label}
                    </span>
                  ))
                : (
                    <span>—</span>
                  )}
            </div>
          </div>
          {loaded && duration > 0 && !sensory && !simple && (!phone || zoomed) && !phoneFocus ? (
            <Overview
              thin={phone}
              duration={duration}
              start={start}
              end={end}
              view={view}
              contentRev={contentRev}
              onScrub={setView}
            />
          ) : null}
          {onEnterFocus && !phoneFocus ? (
            <EnterFocusButton
              corner
              label={automationView ? 'Automation' : 'Wave'}
              onClick={() => onEnterFocus(automationView ? 'auto' : 'wave')}
            />
          ) : null}
        </div>
        {showArrangement ? (
          <MultiTrackView
            phone={phone}
            onSelectTrack={onSelectTrack}
            onEditTrack={onEditTrack}
            onInspectEffect={onInspectEffect}
          />
        ) : null}
        {viz === 'split' && showWave && showSpec ? (
          <button
            type="button"
            className={styles.splitHandle}
            aria-label="Resize waveform and FFT"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              splitDrag.current = { y: event.clientY, share: waveShareRef.current, kind: 'wave' }
            }}
            onPointerMove={(event) => {
              const drag = splitDrag.current
              if (!drag || drag.kind !== 'wave' || drag.share == null) return
              const stage = event.currentTarget.parentElement
              if (!stage) return
              const h = stage.getBoundingClientRect().height
              if (h < 80) return
              const next = Math.min(0.82, Math.max(0.28, drag.share + (event.clientY - drag.y) / h))
              waveShareRef.current = next
              setWaveShare(next)
            }}
            onPointerUp={() => {
              if (!splitDrag.current || splitDrag.current.kind !== 'wave') return
              splitDrag.current = null
              try {
                localStorage.setItem(SPLIT_PREF, String(waveShareRef.current))
              } catch {
                /* private mode */
              }
            }}
          />
        ) : null}
        {showSpec ? (
          <div
            className={`${styles.spec} ${viz === 'spectrum' || eqFocus ? styles.specSolo : ''}`}
            style={
              viz === 'split'
                ? { flex: 1 - waveShare }
                : undefined
            }
          >
            <Spectrum
              active={showSpec}
              compact={phone}
              phoneFocus={eqFocus}
              suppressAnalyzerChrome={phoneFocus === 'fft'}
              analyzerOpen={analyzerOpen}
              onAnalyzerClose={onAnalyzerClose}
              onGraphEdit={onGraphEdit}
              onEnterFocus={onEnterFocus && !phoneFocus ? () => onEnterFocus('fft') : undefined}
            />
          </div>
        ) : null}
        {hearingFocus ? (
          <button
            type="button"
            className={styles.splitHandle}
            aria-label="Resize waveform"
            title="Drag to shrink or grow the waveform"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              splitDrag.current = { y: event.clientY, share: hearingWaveRef.current, kind: 'wave' }
            }}
            onPointerMove={(event) => {
              const drag = splitDrag.current
              if (!drag || drag.kind !== 'wave' || drag.share == null || !hearingFocus) return
              const stage = event.currentTarget.parentElement
              if (!stage) return
              const h = stage.getBoundingClientRect().height
              if (h < 80) return
              const next = Math.min(HEARING_WAVE_MAX, Math.max(HEARING_WAVE_MIN, drag.share + (event.clientY - drag.y) / h))
              hearingWaveRef.current = next
              setHearingWaveShare(next)
            }}
            onPointerUp={() => {
              if (!splitDrag.current || splitDrag.current.kind !== 'wave') return
              splitDrag.current = null
              try {
                localStorage.setItem(HEARING_WAVE_PREF, String(hearingWaveRef.current))
              } catch {
                /* private mode */
              }
            }}
          />
        ) : null}
        {hearingFocus ? (
          <div style={{ flex: `${Math.max(0.12, 1 - hearingWaveShare)} 1 0%`, minHeight: 96, minWidth: 0, display: 'flex' }}>
            <HearingFocusStage />
          </div>
        ) : null}
        {phoneEq ? (
          <PhoneEqGraph
            instanceId={phoneEqId}
            onSelectModule={onSelectModule}
            phoneFocus={phoneFocus === 'eq'}
            onEnterFocus={onEnterFocus && phoneFocus !== 'eq' ? () => onEnterFocus('eq') : undefined}
          />
        ) : null}
        {showEqConsole ? (
          <>
            <button
              type="button"
              className={`${styles.splitHandle} ${styles.eqSplitHandle}`}
              aria-label="Resize FFT and EQ strips"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                splitDrag.current = { y: event.clientY, height: eqStripHeightRef.current, kind: 'eq' }
              }}
              onPointerMove={(event) => {
                const drag = splitDrag.current
                if (!drag || drag.kind !== 'eq' || drag.height == null) return
                const stage = event.currentTarget.parentElement
                if (!stage) return
                const h = stage.getBoundingClientRect().height
                if (h < 80) return
                const next = clampEqStripHeight(drag.height + (drag.y - event.clientY), h)
                eqStripHeightRef.current = next
                setEqStripHeight(next)
              }}
              onPointerUp={() => {
                if (!splitDrag.current || splitDrag.current.kind !== 'eq') return
                splitDrag.current = null
                try {
                  localStorage.setItem(EQ_STRIPS_PREF, String(eqStripHeightRef.current))
                } catch {
                  /* private mode */
                }
              }}
            />
            <div
              className={styles.eqConsole}
              style={{ height: eqStripHeight, flexBasis: eqStripHeight }}
            >
              <EqConsole
                onFocusModule={onSelectModule}
                onEnterFocus={onEnterFocus && !phoneFocus ? () => onEnterFocus('eq') : undefined}
              />
            </div>
          </>
        ) : null}
      </div>
      {loaded && duration > 0 && !showWave && !showArrangement && !phone && !phoneFocus ? (
        <Overview
          duration={duration}
          start={start}
          end={end}
          view={view}
          contentRev={contentRev}
          onScrub={setView}
        />
      ) : null}
      {spectralBandsEnabled && !sensory && !simple && !phone && !phoneFocus ? <SpectralMixer onCommit={onSpectralCommit} /> : null}
      {hearingFocus ? <LoudnessMeter /> : null}
    </div>
  )
})

