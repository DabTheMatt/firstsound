import {
  defaultChain,
  insertChainModule,
  normalizeChain,
  parseChain,
  reorderChain,
  setBypassed,
  removeChainModule,
  type ChainModule,
  type ModuleType,
} from '../chain/chain'
import { defaultParamValues, PARAMS, PLAYBACK_DIRECTIONS } from '../parameters/definitions'
import {
  applyParamValue,
  clamp,
  clampRegion,
  clampScrubTime,
  dbToGain,
  defaultPlayRegion,
  fullPlayRegion,
  parkPlayheadOnStop,
  pitchRatio,
  snapPlayheadToRegion,
  toNormalized,
  wrapPlayheadIntoRegion,
  playbackNeedsStretch,
} from '../parameters/mapping'
import type {
  EngineMode,
  EqListenMode,
  FilterType,
  ParamId,
  PlaybackDirection,
  PresetV1,
  ScrubMode,
  StretchInterpAlgo,
} from '../parameters/types'
import {
  anyFxLfoActive,
  clampLfoSlot,
  cloneFxLfos,
  defaultFxLfo,
  defaultFxLfos,
  defaultLfoHold,
  defaultLfoShown,
  EQ_BAND_LFO_IDS,
  EQ_BAND_LFO_KINDS,
  FX_LFO_SLOTS,
  eqBandHasLfo,
  fxLfoKindForParam,
  isFxLfoKind,
  isFxLfoTarget,
  lfoBinding,
  LFO_DEPTH_DEFAULT,
  LFO_RATE_DEFAULT,
  lfoShownFromMap,
  nextFreeLfoSlot,
  parseFxLfos,
  stepTransportClock,
  type FxLfo,
  type FxLfoKind,
  type FxLfoMap,
  type LfoHoldState,
} from '../fx/lfo'
import {
  automationHasNodes,
  cloneAutomation,
  defaultAutomation,
  ensureAutomationLane,
  insertAutomationNode,
  parseAutomation,
  relocateAutomationNode,
  removeAutomationLane,
  removeAutomationNode,
  envelopeToParam,
  laneFor,
  resolvePerformanceParams,
  sampleEnvelope,
  selectAutomationParam,
  setAutomationLaneColor,
  updateAutomationCurve,
  updateAutomationTension,
  type AutomationCurve,
  type AutomationDocument,
} from '../automation/automation'
import {
  DELAY_TYPE_OPTIONS,
  DELAY_TYPE_WEIGHTS,
  DISTORTION_TYPE_OPTIONS,
  DISTORTION_TYPE_WEIGHTS,
  REVERB_TYPE_OPTIONS,
  REVERB_TYPE_WEIGHTS,
  participatingEntries,
  type EngineSelectId,
} from '../random/catalog'
import { isRandomizable, randomParamValue } from '../random/distributions'
import {
  defaultEqBandFields,
  generateRandomEqBands,
  preferredGeneratedBand,
  randomizeEqBandFields,
  resolveEqFilterCount,
} from '../random/eqGenerate'
import { eqShadowField, moduleRandomKind, participatingTargets } from '../random/groups'
import { LFO_RANDOM_DEFAULT_FIELDS, randomLfoPatch } from '../random/lfoRandom'
import { isAutoRandomizable } from '../random/metadata'
import { pickDifferent } from '../random/rng'
import { applyRandomOffset, offsetForTarget } from '../random/ownership'
import { loadRandomDocument, parseRandomDocument, saveRandomDocument } from '../random/persist'
import { hasAutoRandom, randomBudgetScale, randomIntervalSec, stepRandom } from '../random/schedule'
import {
  cloneRandomDocument,
  defaultParamRandom,
  defaultRandomDocument,
  defaultRandomRuntime,
  nearestFreeRate,
  type EqRandomSettings,
  type LfoRandomField,
  type ParamRandom,
  type RandomDocument,
  type RandomRuntime,
} from '../random/types'
import {
  combAsEqBands,
  defaultCombFilter,
  parseCombFilter,
  type CombFilterState,
} from './comb'
import { selectEqBand } from './eqBandSelection'
import { ANALYSER_FFT_IDLE, clampAnalyserFftSize } from './analyserBudget'
import { SPECTRUM_FLOOR_DB } from './spectrumBands'
import { createPinkNoiseBuffer } from './pinkNoise'
import { DEMO_FILE_NAME, renderDemoSample } from './demoSample'
import { micAccessMessage } from './micAccess'
import {
  applyDelayGraph,
  applyReverbGraph,
  buildReverbBuffer,
  createDelayGraph,
  createReverbGraph,
  reverbImpulseKey,
  silenceDelayGraph,
  silenceReverbGraph,
  stopDelayGraph,
  stopReverbGraph,
} from '../fx/graphs'
import { applyLimiterGraph, limiterReductionDb } from '../fx/limiter'
import { applyCompressorGraph, compressorReductionDb } from '../fx/compressor'
import { legacyDensityToGrainOverlap, legacyInterpToQualityIndex, migrateSpaceParams } from '../fx/migrate'
import { commitParamEdit, commitParamPatch } from '../parameters/links'
import { mixWhenEnablingReverb, reverbMixEngagesModule } from '../fx/reverbEngage'
import { distortionDryWet, NOISE_CUT_TAU_SEC, NOISE_PAUSE_FADE_TAU_SEC } from '../fx/distortion'
import { applyDistortionGraph, stopDistortionGraph } from '../fx/distortionGraph'
import { distortionTypeColorPatch, distortionTypeProfile } from '../fx/distortionProfiles'
import {
  applyFilterModulation,
  FILTER_PARAM_IDS,
  filterLfoShapeAt,
  filterModNeedsClock,
  followerEnvelope,
  rmsFromTimeDomain,
} from '../fx/filter'
import { applyFilterGraph } from '../fx/filterGraph'
import { applyMidSideGraph } from '../fx/midSideGraph'
import { MS_PARAM_IDS } from '../fx/midSide'
import {
  randomizeMidSide as randomizeMidSidePatch,
  type MidSideRecipeId,
  midSideRecipePatch,
  MIDSIDE_RECIPES,
} from '../fx/midSidePresets'
import { filterPresetPatch, randomizeFilterPatch, type FilterPresetId } from '../fx/filterPresets'
import { delayTypeColorPatch } from '../fx/delayProfiles'
import { effectDefaultPatch, type EffectDefaultKind } from '../fx/effectDefaults'
import { findSpacePreset, type SpacePreset } from '../fx/presets'
import {
  parseDelayType,
  parseDistortionNoiseKind,
  parseDistortionType,
  parseReverbType,
  type DelayType,
  type DistortionNoiseKind,
  type DistortionType,
  type ReverbType,
} from '../fx/types'
import {
  applyAutoFades,
  canRedo,
  canUndo,
  clampPrep,
  clonePcmFromBuffer,
  commit,
  createHistory,
  defaultPrep,
  defaultRenderOptions,
  detectSilence,
  encodeWav,
  exportFileName,
  findZeroCrossing as snapFindZero,
  isTrimmed,
  nextVariationName,
  pcmDuration,
  prepEqual,
  renderPrep,
  resetHistory,
  type ExportSettings,
  type History,
  type Pcm,
  type RenderOptions,
  type SamplePrepState,
  type SampleVariation,
  undo as undoHistory,
  redo as redoHistory,
  PREP_MIN_REGION,
  ZERO_SEARCH_SEC,
  ZERO_WARN_SEC,
} from '../samplePrep'
import type { SilenceProposal } from '../samplePrep/prepare'
import { pingPongChannel, reverseChannel, reverseRegionInPlace, reverseTime, applyGainInPlace } from './buffers'
import {
  copyEqBand,
  createEqBandId,
  defaultEqBandAt,
  defaultEqBands,
  initializeCreatedEqBand,
  EQ_MAX_BANDS,
  EQ_POOL_BANDS,
  filterStageCount,
  parseEqBands,
  eqBypassAfterBandEdit,
  bandIsActive,
  planEqBandInsert,
  type EqBand,
  type EqFilterType,
} from './eqBands'
import {
  canClearSampleSelection,
  canCopySampleSelection,
  canDeleteSampleSelection,
  canInsertSilence,
  canMuteSampleSelection,
  canPasteClipboard,
  cloneCapture,
  copyFrameRange,
  deleteFrameRange,
  deleteFrameSpan,
  insertFrameForTime,
  insertPcmAtFrame,
  muteFrameRange,
  muteFrameSpan,
  insertSilence,
  mapAutomation,
  mapMarkerTimes,
  mapPlayhead,
  mapRange,
  prepareClipboardForDestination,
  selectionFrameSpan,
  silenceFrameCount,
  type AudioClipboard,
  type SampleEditCapture,
  type SamplePcmSnapshot,
  type TimelineEdit,
} from './sampleEdit'
import {
  applyIdentityBiquad,
  cloneEqBands,
  ensureBandStages,
  growEqGraph,
  type EqBandPath,
  type EqChannelMode,
  type EqLane,
} from './eqGraph'
import { eqHeardBandLists, modulatedEqBands, withEqBandCenters } from './eqPerformance'
import {
  antiClickSeconds,
  loopCrossfadeSeconds,
  nextLoopSegment,
  rampGainLinear,
  scheduleEdgeFades,
  type LoopSegmentPlan,
} from './antiClick'
import { setSmoothedAudioParam } from './paramSmooth'
import { convolverHasBuffer, setConvolverPairBuffer } from './convolverCrossfade'
import {
  copyChannel,
  duplicateMonoToStereo,
  mixChannelsToMono,
  type ChannelLayoutMode,
} from './channelLayout'
import { findEqPreset } from '../fx/eqPresets'
import { findModulePreset } from '../fx/modulePresets'
import { planProjectStart, projectDurationOf, type TrackSpan } from '../mix/schedule'
import { loopBounds, resolveTrackPlayback, type TrackClock } from '../mix/playback'
import { bufferCues, sourceNeedsStretch, type BufferCue } from '../mix/trackVoice'
import {
  clampMix,
  clearTrackAudio,
  cloneTracks,
  defaultTracks,
  ensureTrackSlots,
  leadVoiceMixGain,
  moveTrack,
  outputMixGain,
  parseTracks,
  patchTrack,
  selectedTrack,
  trackAudible,
  trackLevelGain,
  trackNameAfterLoad,
  tracksEqual,
  writeTrackRegion,
  type MixTrack,
} from '../mix/tracks'
import {
  applyTrackMixerParams,
  createTrackMixerStrip,
  disableTrackMidSide,
  disconnectTrackMixerStrip,
  enableTrackMidSide,
  type TrackMixerStrip,
} from '../mix/trackMixer'
import {
  cloneTrackRack,
  copySharedParams,
  createTrackRack,
  isSharedParam,
  parseTrackRacks,
  serializeTrackRack,
  trackFxCount,
  type RackEqState,
  type TrackRack,
} from '../mix/trackRack'
import {
  pingPongFadeCurve,
  pingPongFadeCurveFrom,
  regionFadeCurveFrom,
  regionFadeGain,
  type FadeCurve,
} from './fades'
import { motionValue } from './motion'
import { mixToMono, buildPeakMips, type PeakMip } from './peaks'
import {
  bandAudibleGains,
  cloneSpectralState,
  clampCrossovers,
  defaultSpectralBands,
  defaultSpectralState,
  decomposeComplementary,
  mixBandChannels,
  mixToMonoChannel,
  reconstructionError,
  spectralStatesEqual,
  type Decomposition,
  type ReconstructionReport,
  type SpectralBand,
  type SpectralSnapshot,
  type SpectralState,
} from '../spectral/bands'
import { addTap, emptyTapTempo, type TapTempoState } from './tapTempo'
import { estimateTempo, detectTransients } from './transients'
import { clampWarpTime, neighborTimes, remapWarpTimes, warpChannel } from './warp'
import { applyStereoStage, forceStereoUpmix } from './stereoStage'
import { createChainSlot, moduleMixGains, type ChainSlot } from './chainGraph'
import { writeCombCoefficients, writeEqBandCoefficients } from './eqGraph'
import {
  renderExportPcm,
  renderProcessedPcm,
  traceExport,
  type ExportEqState,
  type ExportProgressPhase,
  type ProcessingSnapshot,
} from './offlineRender'
import { prepForWorkingExport, selectionExportAvailable, type WorkingExportClock } from './exportTail'
import { peakNormalizeGain, peakOfBuffer, renderRegion } from './renderRegion'
import {
  effectiveInterpAlgo,
  playbackReadWrap,
  resampleInto,
  type InterpBudget,
  type ReadWrap,
} from './resample'
import {
  advanceStretchControl,
  smoothTowardLogDt,
  stretchLookahead,
  stretchSchedule,
} from './stretch'
import { findZeroCrossing, indexToSeconds, secondsToIndex } from './zeroCrossing'

export type EqModuleState = RackEqState

export type AudioStatus = 'idle' | 'blocked' | 'running'

export type EngineSnapshot = {
  fileName: string
  duration: number
  sampleRate: number
  channelCount: number
  sampleLoaded: boolean
  canInsertSilence: boolean
  canDeleteSelection: boolean
  canMuteSelection: boolean
  canClearSelection: boolean
  canCopySelection: boolean
  canCutSelection: boolean
  canPaste: boolean
  playing: boolean
  loop: boolean
  engineMode: EngineMode
  direction: PlaybackDirection
  filterType: FilterType
  audioStatus: AudioStatus
  scrubMode: ScrubMode
  params: Record<ParamId, number>
  /**
   * Parameter values after automation (while playing), LFO, and filter modulation.
   * Same as `params` when transport is stopped and no modulator is running.
   */
  liveParams: Record<ParamId, number>
  /** Transport time used to build `liveParams`. Stopped playback stays at 0. */
  transportSec: number
  automation: AutomationDocument
  chain: ChainModule[]
  eqBands: EqBand[]
  eqById: Record<string, EqModuleState>
  eqPlotBands: EqBand[]
  comb: CombFilterState
  eqListen: EqListenMode
  eqChannelMode: EqChannelMode
  channelLayout: ChannelLayoutMode
  limiterReduction: number
  recording: boolean
  recMonitor: number
  recordSeconds: number
  recordPeaks: Float32Array
  recordError: string | null
  muted: boolean
  delayType: DelayType
  reverbType: ReverbType
  distortionType: DistortionType
  distortionNoiseKind: DistortionNoiseKind
  noiseMuted: boolean
  fxLfos: FxLfoMap
  random: {
    chaos: boolean
    warned: boolean
    prompt: boolean
    budgetLimited: boolean
    generators: RandomDocument['generators']
    participation: RandomDocument['participation']
    eq: EqRandomSettings
    lfo: RandomDocument['lfo']
    /** Bumps when Whole EQ or a selected-band random should reveal a band. */
    eqPick: { index: number; token: number } | null
  }
  lfoShown: Record<FxLfoKind, number>
  spacePresetId: string | null
  hasSource: boolean
  prep: SamplePrepState
  canUndoPrep: boolean
  canRedoPrep: boolean
  previewPlaying: boolean
  previewLoop: boolean
  sourceDuration: number
  sourceSampleRate: number
  sourceChannels: number
  prepApplied: boolean
  bufferRev: number
  zeroNotice: string | null
  silenceProposal: SilenceProposal | null
  variations: { id: string; name: string }[]
  tracks: MixTrack[]
  /**
   * Per-track speed and input gain published for the waveform.
   * The rack remains the owner; this is a read model, not a second store.
   */
  trackClocks: Record<string, { speed: number; gainDb: number; pitch: number }>
  selectedTrackId: string
  /** Inserted effects on each track. Input and Output are not counted. */
  trackFxCounts: Record<string, number>
  /** Live DSP slots per track. Zero until the audio context exists. */
  trackSlotCounts: Record<string, number>
  /** True when any slot holds audio, including a slot that is not selected. */
  projectAudible: boolean
  projectDuration: number
  masterMix: number
  transients: number[]
  showTransients: boolean
  tempoSource: 'default' | 'detected' | 'tapped' | 'manual'
  tapCount: number
  tempoNotice: string | null
  spectral: SpectralSnapshot
}

type Listener = () => void

const LOOKAHEAD = 0.08
const SCHEDULER_MS = 20
/** Long slow grains overlap many hops; the pool must outlive the longest window. */
const STRETCH_GRAIN_POOL = 128

type StretchControlSeed = {
  speed: number
  pitch: number
  windowSpeed?: number
  windowPitch?: number
}
const MIN_REGION = 0.05

function createContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (Ctor) {
    try {
      return new Ctor()
    } catch {
      /* Headless runs have no output device. Buffer edits still need a context. */
    }
  }
  const Offline = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
  if (Offline) return new Offline(2, 128, 48000) as unknown as AudioContext
  throw new Error('Web Audio is not available in this browser.')
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

function setPlaybackAudioSession(): void {
  try {
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession && nav.audioSession.type !== 'playback') {
      nav.audioSession.type = 'playback'
    }
  } catch {
    /* audioSession unsupported — Web Audio still works elsewhere. */
  }
}

function setPlayAndRecordAudioSession(): void {
  try {
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession) nav.audioSession.type = 'play-and-record'
  } catch {
    /* optional */
  }
}

type ActiveVoice = {
  src: AudioBufferSourceNode
  musical: GainNode
  edge: GainNode
  startWhen: number
  stopWhen: number
  fromRel: number
  span: number
  duration: number
  pingPong: boolean
}

type Slot = ChainSlot

type TrackStretchCursor = {
  head: number
  dir: number
  speed: number
  pitch: number
  windowSpeed: number
  windowPitch: number
  next: number
  stopAt: number
  start: number
  end: number
  loop: boolean
  direction: PlaybackDirection
  budget: number
  consumed: number
}


/**
 * The node-web-audio-api test polyfill replaces `window` without timers.
 * Browsers keep `window.setInterval`; headless runs fall back to the global timer.
 */
function hostSetInterval(fn: () => void, ms: number): number {
  const timer = typeof window.setInterval === 'function' ? window.setInterval.bind(window) : setInterval
  return timer(fn, ms) as unknown as number
}

function hostClearInterval(id: number): void {
  const clear = typeof window.clearInterval === 'function' ? window.clearInterval.bind(window) : clearInterval
  clear(id)
}

/**
 * Client-side sample instrument engine.
 * React must not drive audio timing — this class owns the clock.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  /** Buffer factory when the output device is not open yet. */
  private scratchCtx: BaseAudioContext | null = null
  /** Post-chain sum. Every track reaches the limiter through this node. */
  private sumBus: GainNode | null = null
  private tracks: MixTrack[] = defaultTracks()
  private selectedTrackId = this.tracks[0]!.id
  private masterMix = 100
  private trackBuffers = new Map<string, AudioBuffer>()
  /** Stable per-track mixer. Parameter edits do not replace these nodes. */
  private trackStrips = new Map<string, TrackMixerStrip>()
  /**
   * Bumps when a strip is created, removed, or its Mid/Side matrix is
   * inserted or removed. Volume, pan, mute, solo, mid, and side do not.
   */
  private mixerStructure = 0
  private companionSources: AudioBufferSourceNode[] = []
  private projectVoices: { id: string; src: AudioBufferSourceNode }[] = []
  private stretchCursors = new Map<string, TrackStretchCursor>()
  /** Grains tagged by track so one reschedule cannot stop another track. */
  private stretchSources: { id: string; src: AudioBufferSourceNode }[] = []
  private reversedCache = new WeakMap<AudioBuffer, AudioBuffer>()
  private pingpongCache = new WeakMap<AudioBuffer, AudioBuffer>()
  private loadToken = new Map<string, number>()
  private mixerHeard = new Map<string, { pan: number; level: number; midDb: number; sideDb: number }>()
  private projectWhen = 0
  private projectOrigin = 0
  private projectRestartAt = Number.POSITIVE_INFINITY
  private projectEndAt = Number.POSITIVE_INFINITY
  private usingProjectTransport = false
  private safetyGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private analyser: AnalyserNode | null = null
  private analyserPre: AnalyserNode | null = null
  private analyserEq: AnalyserNode | null = null
  /** Zero-gain pull so spectrum taps stay in the graph without reaching the speakers. */
  private analyserSink: GainNode | null = null
  /** Second silent pull for track-local before/after taps. */
  private analyserPull: GainNode | null = null
  private analyserLimiterPre: AnalyserNode | null = null
  private analyserLimiterPost: AnalyserNode | null = null
  private analyserCompressorPre: AnalyserNode | null = null
  private analyserCompressorPost: AnalyserNode | null = null
  private analyserL: AnalyserNode | null = null
  private analyserR: AnalyserNode | null = null
  /** Per-track chain, parameters, EQ, and modulation. Not AudioNodes. */
  private racks = new Map<string, TrackRack>()
  /** While set, rack getters follow this track instead of the editing selection. */
  private editingTrackId: string | null = null
  private seededRandom = false
  /** Suppresses transport-clock advances while several racks are applied in one tick. */
  private suppressClock = false
  private trackSlots = new Map<string, Map<string, Slot>>()
  /** Single master output gain. Track Output slots stay at unity. */
  private masterOutput: GainNode | null = null
  /** Inspector module whose input/output the track analysers follow. */
  private analyserFocusId: string | null = null
  /** False while Multi view hides the detailed editor. Master meters stay up. */
  private monitorTaps = true
  private regionFade: {
    fadeIn: number
    fadeOut: number
    curve: FadeCurve
    fadeInBend: number
    fadeOutBend: number
  } = {
    fadeIn: 0.01,
    fadeOut: 0.01,
    curve: 'equalPower',
    fadeInBend: 0.5,
    fadeOutBend: 0.5,
  }
  private voices: ActiveVoice[] = []
  private loopTimer = 0
  private loopGen = 0
  private loopCursorWhen = 0
  private loopCursorOffset = 0
  private loopRegionStart = 0
  private loopRegionEnd = 0
  private loopOverlapSec = 0
  private loopScheduling = false
  private loopBuffer: AudioBuffer | null = null
  private loopFromRelBase = 0
  private loopSpan = 0
  private loopPing = false
  private buffer: AudioBuffer | null = null
  private sourceBuffer: AudioBuffer | null = null
  private reversed: AudioBuffer | null = null
  private mono: Float32Array | null = null
  private fileName = ''
  private playing = false
  private loop = true
  private engineMode: EngineMode = 'playback'
  private direction: PlaybackDirection = 'forward'
  private audioStatus: AudioStatus = 'idle'
  private scrubMode: ScrubMode = 'region'
  private muted = false
  private filterFollowBuf = new Uint8Array(1024)
  private eqPick: { index: number; token: number } | null = null
  private eqPickToken = 0
  private randomWarned = false
  private randomPrompt = false
  private randomPendingId: ParamId | null = null
  private randomPendingEq = false
  private randomPendingLfo: ParamId | null = null
  private randomBudgetLimited = false
  private randomDirty = false
  private randomUiAt = 0
  /** One-shot wins over an auto event in the same audio tick. */
  private randomHold: ParamId | null = null
  private lfoTimer = 0
  private exportBusy = false
  private lfoClockSec = 0
  private lastTransportSec = 0
  private lfoWallMs = 0
  /** Filter ADS keeps the pre-existing free-running clock. FX LFOs do not. */
  private filterClockSec = 0
  private filterWallMs = 0
  private channelLayout: ChannelLayoutMode = 'original'
  private clipboard: AudioClipboard | null = null
  private noiseGain: GainNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private recStream: MediaStream | null = null
  private recSource: MediaStreamAudioSourceNode | null = null
  private recProc: ScriptProcessorNode | null = null
  private recMute: GainNode | null = null
  private recMonitor = 0
  private recChunks: Float32Array[] = []
  private recPreview: number[] = []
  private recording = false
  private recordError: string | null = null
  private hiddenPlaying = false
  private grainDensitySlew = 8
  private listeners = new Set<Listener>()
  private snapshot: EngineSnapshot
  private snapshotDirty = false
  private emitFrame = 0
  private source: AudioBufferSourceNode | null = null
  private playCtxTime = 0
  private playOffset = 0
  private playFullSample = false
  private nextGrainTime = 0
  private schedulerId = 0
  private stretchHead = 0
  private stretchDir = 1
  private stretchSpeed = 1
  private stretchPitch = 0
  /** Slow follower for grain length. The read head uses stretchSpeed directly. */
  private windowSpeed = 1
  private windowPitch = 0
  private stretchGrainPool: AudioBuffer[] = []
  private stretchGrainPoolIndex = 0
  private visibilityBound = false
  private unlocked = false
  private motionRandCur = 0
  private motionRandTarget = 0
  private motionClock = 0
  private reconnecting = false
  private sourceMono: Float32Array | null = null
  private sourceMips: PeakMip[][] = []
  private prep: SamplePrepState = defaultPrep(0)
  private prepHistory: History<SamplePrepState> = createHistory(this.prep)
  private prepGestureOrigin: SamplePrepState | null = null
  private prepApplied = false
  private bufferRev = 0
  private previewLoop = true
  private previewPlaying = false
  private previewSource: AudioBufferSourceNode | null = null
  private previewGain: GainNode | null = null
  private zeroNotice: string | null = null
  private silenceProposal: SilenceProposal | null = null
  private variations: SampleVariation[] = []
  private variationSeq = 0
  private transients: number[] = []
  private showTransients = false
  private tempoSource: EngineSnapshot['tempoSource'] = 'default'
  private tapTempoState: TapTempoState = emptyTapTempo()
  private tempoNotice: string | null = null
  private spectral: SpectralState = defaultSpectralState()
  private spectralReady = false
  private spectralComputing = false
  private spectralKey = ''
  /** Shared envelope delta for every track's filter follower in one tick. */
  private followDt = 0.016
  private spectralPendingKey = ''
  private spectralJob = 0
  private spectralBandsPcm: Float32Array[][] | null = null
  private spectralMono = new Map<string, Float32Array>()
  private spectralMix: AudioBuffer | null = null
  private spectralMixKey = ''
  private spectralReversed: AudioBuffer | null = null
  private spectralReversedOf: AudioBuffer | null = null
  private tempoWrite: 'engine' | 'ui' = 'ui'

  constructor() {
    if (this.randomDoc.chaos) this.randomWarned = true
    this.snapshot = this.buildSnapshot()
  }

  private activeTrackId(): string {
    return this.editingTrackId ?? this.selectedTrackId
  }

  private ensureRack(id: string): TrackRack {
    const existing = this.racks.get(id)
    if (existing) return existing
    const randomDoc = !this.seededRandom ? loadRandomDocument() : defaultRandomDocument()
    this.seededRandom = true
    const rack = createTrackRack(randomDoc)
    const sibling = this.racks.values().next().value as TrackRack | undefined
    if (sibling) copySharedParams(sibling.params, rack.params)
    this.racks.set(id, rack)
    return rack
  }

  private rack(): TrackRack {
    return this.ensureRack(this.activeTrackId())
  }

  private withEditing(id: string, fn: () => void): void {
    const prev = this.editingTrackId
    this.editingTrackId = id
    try {
      fn()
    } finally {
      this.editingTrackId = prev
    }
  }

  private touchRacks(fn: (rack: TrackRack) => void): void {
    for (const track of this.tracks) fn(this.ensureRack(track.id))
  }

  /** Clearing a slot drops its inserts. Shared transport params stay. */
  private resetTrackRack(id: string): void {
    const previous = this.racks.get(id)
    if (previous?.reverbIrTimer) window.clearTimeout(previous.reverbIrTimer)
    const fresh = createTrackRack(defaultRandomDocument())
    const sibling = [...this.racks.values()].find((rack) => rack !== previous)
    if (sibling) copySharedParams(sibling.params, fresh.params)
    else if (previous) copySharedParams(previous.params, fresh.params)
    this.racks.set(id, fresh)
  }

  private broadcastShared(source: Record<ParamId, number> = this.params): void {
    for (const rack of this.racks.values()) copySharedParams(source, rack.params)
  }

  private get chain(): ChainModule[] {
    return this.rack().chain
  }
  private set chain(value: ChainModule[]) {
    this.rack().chain = value
  }

  private get params(): Record<ParamId, number> {
    return this.rack().params
  }
  private set params(value: Record<ParamId, number>) {
    this.rack().params = value
    this.broadcastShared(value)
  }

  private get slots(): Map<string, Slot> {
    return this.trackSlotMap(this.activeTrackId())
  }

  private trackSlotMap(id: string): Map<string, Slot> {
    let slots = this.trackSlots.get(id)
    if (!slots) {
      slots = new Map()
      this.trackSlots.set(id, slots)
    }
    return slots
  }

  private get eqById(): Map<string, EqModuleState> {
    return this.rack().eqById
  }
  private set eqById(value: Map<string, EqModuleState>) {
    this.rack().eqById = value
  }

  private get eqBands(): EqBand[] {
    return this.rack().eqBands
  }
  private set eqBands(value: EqBand[]) {
    this.rack().eqBands = value
  }

  private get comb(): CombFilterState {
    return this.rack().comb
  }
  private set comb(value: CombFilterState) {
    this.rack().comb = value
  }

  private get eqListen(): EqListenMode {
    return this.rack().eqListen
  }
  private set eqListen(value: EqListenMode) {
    this.rack().eqListen = value
  }

  private get eqChannelMode(): EqChannelMode {
    return this.rack().eqChannelMode
  }
  private set eqChannelMode(value: EqChannelMode) {
    this.rack().eqChannelMode = value
  }

  private get filterType(): FilterType {
    return this.rack().filterType
  }
  private set filterType(value: FilterType) {
    this.rack().filterType = value
  }

  private get delayType(): DelayType {
    return this.rack().delayType
  }
  private set delayType(value: DelayType) {
    this.rack().delayType = value
  }

  private get reverbType(): ReverbType {
    return this.rack().reverbType
  }
  private set reverbType(value: ReverbType) {
    this.rack().reverbType = value
  }

  private get distortionType(): DistortionType {
    return this.rack().distortionType
  }
  private set distortionType(value: DistortionType) {
    this.rack().distortionType = value
  }

  private get distortionNoiseKind(): DistortionNoiseKind {
    return this.rack().distortionNoiseKind
  }
  private set distortionNoiseKind(value: DistortionNoiseKind) {
    this.rack().distortionNoiseKind = value
  }

  private get fxLfos(): FxLfoMap {
    return this.rack().fxLfos
  }
  private set fxLfos(value: FxLfoMap) {
    this.rack().fxLfos = value
  }

  private get automation(): AutomationDocument {
    return this.rack().automation
  }
  private set automation(value: AutomationDocument) {
    this.rack().automation = value
  }

  private get randomDoc(): RandomDocument {
    return this.rack().randomDoc
  }
  private set randomDoc(value: RandomDocument) {
    this.rack().randomDoc = value
  }

  private get randomOffsets(): Partial<Record<ParamId, number>> {
    return this.rack().randomOffsets
  }
  private set randomOffsets(value: Partial<Record<ParamId, number>>) {
    this.rack().randomOffsets = value
  }

  private get randomRuntime(): RandomRuntime {
    return this.rack().randomRuntime
  }
  private set randomRuntime(value: RandomRuntime) {
    this.rack().randomRuntime = value
  }

  private get lfoHold(): LfoHoldState {
    return this.rack().lfoHold
  }
  private set lfoHold(value: LfoHoldState) {
    this.rack().lfoHold = value
  }

  private get lfoShown(): Record<FxLfoKind, number> {
    return this.rack().lfoShown
  }
  private set lfoShown(value: Record<FxLfoKind, number>) {
    this.rack().lfoShown = value
  }

  private get spaceLatched(): boolean {
    return this.rack().spaceLatched
  }
  private set spaceLatched(value: boolean) {
    this.rack().spaceLatched = value
  }

  private get spacePresetId(): string | null {
    return this.rack().spacePresetId
  }
  private set spacePresetId(value: string | null) {
    this.rack().spacePresetId = value
  }

  private get noiseMuted(): boolean {
    return this.rack().noiseMuted
  }
  private set noiseMuted(value: boolean) {
    this.rack().noiseMuted = value
  }

  private get noiseFadeTau(): number {
    return this.rack().noiseFadeTau
  }
  private set noiseFadeTau(value: number) {
    this.rack().noiseFadeTau = value
  }

  private get reverbIrKey(): string {
    return this.rack().reverbIrKey
  }
  private set reverbIrKey(value: string) {
    this.rack().reverbIrKey = value
  }

  private get reverbIrTimer(): number {
    return this.rack().reverbIrTimer
  }
  private set reverbIrTimer(value: number) {
    this.rack().reverbIrTimer = value
  }

  private get filterFollower(): number {
    return this.rack().filterFollower
  }
  private set filterFollower(value: number) {
    this.rack().filterFollower = value
  }

  private get filterEnvOrigin(): number {
    return this.rack().filterEnvOrigin
  }
  private set filterEnvOrigin(value: number) {
    this.rack().filterEnvOrigin = value
  }

  private get filterSnh(): { index: number; value: number } {
    return this.rack().filterSnh
  }

  private get filterFollowStamp(): number {
    return this.rack().filterFollowStamp
  }
  private set filterFollowStamp(value: number) {
    this.rack().filterFollowStamp = value
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): EngineSnapshot => {
    if (this.snapshotDirty) {
      this.snapshot = this.buildSnapshot()
      this.snapshotDirty = false
    }
    return this.snapshot
  }

  getBuffer(): AudioBuffer | null {
    return this.buffer
  }

  getTrackBuffer(id: string): AudioBuffer | null {
    return this.trackBuffers.get(id) ?? (id === this.selectedTrackId ? this.buffer : null)
  }

  /** Post-mixer, pre-master tap. Null until the audio graph exists. */
  getTrackAnalyser(id: string): AnalyserNode | null {
    return this.trackStrips.get(id)?.meter ?? null
  }

  /** Post-mixer stereo taps. Null until the audio graph exists. */
  getTrackMeterPair(id: string): { left: AnalyserNode; right: AnalyserNode } | null {
    const strip = this.trackStrips.get(id)
    if (!strip) return null
    return { left: strip.meterL, right: strip.meterR }
  }

  /**
   * Headless graph. An OfflineAudioContext can schedule every track without
   * an output device. Playback still treats it as a running project clock.
   */
  useOfflineGraph(ctx: BaseAudioContext): void {
    this.ctx = ctx as AudioContext
    this.buildSlots()
    this.connectSlots()
    this.audioStatus = 'running'
    this.unlocked = true
  }

  /** Test and diagnostics. View changes and mixer edits leave this still. */
  mixerStructureGeneration(): number {
    return this.mixerStructure
  }

  /**
   * Native buffer voice for one track, if it is not on the stretch cursor.
   * Identity stays put when a different track is edited.
   */
  trackVoiceNode(id: string): AudioBufferSourceNode | null {
    return this.projectVoices.find((voice) => voice.id === id)?.src ?? null
  }

  trackStretching(id: string): boolean {
    return this.stretchCursors.has(id)
  }

  trackVoiceAlive(id: string): boolean {
    return this.trackStretching(id) || this.trackVoiceNode(id) != null
  }

  getMono(): Float32Array | null {
    return this.mono
  }

  getSourceBuffer(): AudioBuffer | null {
    return this.sourceBuffer
  }

  getSourceMono(): Float32Array | null {
    return this.sourceMono
  }

  getSourceMips(): PeakMip[][] {
    return this.sourceMips
  }

  getPrep(): SamplePrepState {
    return this.prep
  }

  setSpectralEnabled(enabled: boolean): void {
    if (this.spectral.enabled === enabled) return
    this.spectral = {
      ...this.spectral,
      enabled,
      analyser: enabled ? this.spectral.analyser : 'sum',
    }
    if (!enabled) {
      this.spectralJob += 1
      this.spectralPendingKey = ''
      this.spectralReady = false
      this.spectralComputing = false
      this.spectralMix = null
      this.spectralMixKey = ''
      this.emit()
      if (this.playing) void this.play()
      return
    }
    this.ensureSpectral(false)
    this.emit()
  }

  setSpectralBand(id: string, patch: Partial<Pick<SpectralBand, 'gainDb' | 'mute' | 'solo'>>): void {
    const bands = this.spectral.bands.map((band) => (band.id === id ? { ...band, ...patch, id: band.id } : band))
    const next = { ...this.spectral, bands }
    if (spectralStatesEqual(this.spectral, next)) return
    this.spectral = next
    this.spectralMix = null
    this.spectralMixKey = ''
    this.spectralReversed = null
    this.emit()
    if (this.playing && this.spectral.enabled) void this.play()
  }

  setSpectralCrossovers(hz: readonly number[]): void {
    const sampleRate = this.buffer?.sampleRate ?? 44100
    const crossoversHz = clampCrossovers(hz, sampleRate)
    if (
      crossoversHz.length === this.spectral.crossoversHz.length &&
      crossoversHz.every((value, index) => value === this.spectral.crossoversHz[index])
    ) {
      return
    }
    const count = crossoversHz.length + 1
    const bands =
      this.spectral.bands.length === count
        ? this.spectral.bands
        : defaultSpectralBands(Array.from({ length: count }, (_, index) => this.spectral.bands[index]?.id ?? `band-${index + 1}`))
    this.spectral = { ...this.spectral, crossoversHz, bands }
    this.spectralKey = ''
    this.spectralBandsPcm = null
    this.spectralReady = false
    if (this.spectral.enabled) this.ensureSpectral(false)
    this.emit()
  }

  setSpectralAnalyser(analyser: 'sum' | string): void {
    const known = analyser === 'sum' || this.spectral.bands.some((band) => band.id === analyser)
    const next = known ? analyser : 'sum'
    if (this.spectral.analyser === next) return
    this.spectral = { ...this.spectral, analyser: next }
    this.emit()
  }

  replaceSpectral(state: SpectralState): void {
    const next = cloneSpectralState(state)
    if (spectralStatesEqual(this.spectral, next) && this.spectralReady === next.enabled) return
    this.spectral = next
    this.spectralMix = null
    this.spectralMixKey = ''
    this.spectralKey = ''
    this.spectralBandsPcm = null
    this.spectralReady = false
    if (next.enabled) this.ensureSpectral(true)
    else {
      this.spectralJob += 1
      this.spectralComputing = false
    }
    this.emit()
    if (this.playing) void this.play()
  }

  /** Mono mix of one decomposed band. Null until the split is ready. */
  spectralBandMono(id: string): Float32Array | null {
    if (!this.spectral.enabled) return null
    this.ensureSpectral(false)
    const cached = this.spectralMono.get(id)
    if (cached) return cached
    const index = this.spectral.bands.findIndex((band) => band.id === id)
    const channels = index >= 0 ? this.spectralBandsPcm?.[index] : null
    if (!channels || channels.length === 0) return null
    const mono = mixToMonoChannel(channels)
    this.spectralMono.set(id, mono)
    return mono
  }

  spectralLaneSamples(): { id: string; samples: Float32Array; dim: boolean }[] | null {
    if (!this.spectral.enabled || !this.spectralReady || !this.spectralBandsPcm) return null
    const soloing = this.spectral.bands.some((band) => band.solo)
    return this.spectral.bands.map((band) => ({
      id: band.id,
      samples: this.spectralBandMono(band.id) ?? new Float32Array(),
      dim: band.mute || (soloing && !band.solo),
    }))
  }

  /** Working audio the transport and export actually play. */
  audibleChannel(index: number): Float32Array | null {
    const buffer = this.audibleForwardBuffer()
    if (!buffer || index < 0 || index >= buffer.numberOfChannels) return null
    return buffer.getChannelData(index)
  }

  spectralReconstruction(): ReconstructionReport | null {
    if (!this.buffer || !this.spectral.enabled) return null
    this.ensureSpectral(true)
    if (!this.spectralBandsPcm) return null
    const original = this.buffer.getChannelData(0)
    const sum = mixBandChannels(this.spectralBandsPcm, this.spectralBandsPcm.map(() => 1))[0]
    if (!sum) return null
    return reconstructionError(original, sum)
  }

  getAnalyser(
    tap: 'pre' | 'post' | 'eq' | 'limiterPre' | 'limiterPost' | 'compressorPre' | 'compressorPost' = 'post',
  ): AnalyserNode | null {
    if (tap === 'pre') return this.monitorTaps ? this.analyserPre ?? this.analyser : this.analyser
    // Track EQ output. Null unless the detailed editor is showing that EQ.
    if (tap === 'eq') {
      const focused = this.analyserFocusId
        ? this.ensureRack(this.selectedTrackId).chain.find((mod) => mod.instanceId === this.analyserFocusId)
        : undefined
      return this.monitorTaps && focused?.type === 'eq' ? this.analyserEq : null
    }
    if (tap === 'limiterPre') return this.analyserLimiterPre
    if (tap === 'limiterPost') return this.analyserLimiterPost
    if (tap === 'compressorPre') return this.analyserCompressorPre ?? this.analyserLimiterPre
    if (tap === 'compressorPost') return this.analyserCompressorPost ?? this.analyserLimiterPost
    return this.analyser
  }

  setSpectrumFftSize(size: number): void {
    const fft = clampAnalyserFftSize(size)
    for (const node of [this.analyser, this.analyserPre, this.analyserEq]) {
      if (node && node.fftSize !== fft) node.fftSize = fft
    }
  }

  getLimiterReduction(): number {
    const slot = [...this.slots.values()].find((s) => s.type === 'limiter')
    return limiterReductionDb(slot?.limiterFx)
  }

  getCompressorReduction(): number {
    const slot = [...this.slots.values()].find((s) => s.type === 'compressor')
    return compressorReductionDb(slot?.compressorFx)
  }

  setRegionFades(
    fadeIn: number,
    fadeOut: number,
    curve: FadeCurve,
    fadeInBend = 0.5,
    fadeOutBend = 0.5,
  ): void {
    const next = {
      fadeIn: Math.max(0, fadeIn),
      fadeOut: Math.max(0, fadeOut),
      curve,
      fadeInBend: Math.min(1, Math.max(0, fadeInBend)),
      fadeOutBend: Math.min(1, Math.max(0, fadeOutBend)),
    }
    const same =
      this.regionFade.fadeIn === next.fadeIn &&
      this.regionFade.fadeOut === next.fadeOut &&
      this.regionFade.curve === next.curve &&
      this.regionFade.fadeInBend === next.fadeInBend &&
      this.regionFade.fadeOutBend === next.fadeOutBend
    if (same) return
    this.regionFade = next
    this.emit()
    if (this.playing && this.engineMode === 'playback') this.retargetPlayingFade()
  }

  getChannelAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    return { left: this.analyserL, right: this.analyserR }
  }

  /**
   * Sample time of the sounding playhead.
   * `speed` is the transport rate. Callers that are already inside liveParams
   * must pass the stored manual speed so automation does not recurse through
   * the modulated value.
   */
  private transportSeconds(speed: number): number {
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.playing ? this.playbackRegion(duration) : this.region(duration)
    if (!this.playing || !this.ctx || duration <= 0) {
      if (duration <= 0) return 0
      return clamp(this.playOffset, 0, duration)
    }
    if (this.engineMode === 'grain') {
      const p = clamp(this.params.position / 100 + this.motionOffset(this.ctx.currentTime) * 0.5, 0, 1)
      return start + p * (end - start)
    }
    // Stretch scheduler owns the head — don't reconstruct from wall clock.
    if (this.schedulerId && this.engineMode === 'playback') {
      return clamp(this.stretchHead, start, end)
    }
    const tempo = Math.max(0.01, speed)
    const elapsed = (this.ctx.currentTime - this.playCtxTime) * tempo
    const span = Math.max(end - start, MIN_REGION)
    if (this.direction === 'pingpong') {
      const cycle = Math.max(span, 2 * span - (this.loop ? this.loopOverlapSec : 0))
      const phase = this.loop ? elapsed % cycle : Math.min(elapsed, cycle)
      const leg = Math.min(span, cycle / 2)
      return phase <= leg ? start + phase : end - (phase - leg)
    }
    if (this.loop) {
      const period = Math.max(MIN_REGION * 0.25, span - this.loopOverlapSec)
      if (this.direction === 'reverse') {
        const rel = (end - this.playOffset + elapsed) % period
        return end - (rel < 0 ? rel + period : rel)
      }
      const rel = (this.playOffset - start + elapsed) % period
      return start + (rel < 0 ? rel + period : rel)
    }
    return this.direction === 'reverse'
      ? Math.max(start, this.playOffset - elapsed)
      : Math.min(end, this.playOffset + elapsed)
  }

  getPlayheadSeconds(): number {
    if (this.usingProjectTransport && this.playing && this.ctx) return this.projectPlayhead()
    if (this.loadedTrackCount() > 1 && (!this.playing || !this.ctx || (this.buffer?.duration ?? 0) <= 0)) {
      const dur = this.projectDuration()
      return dur > 0 ? Math.min(Math.max(0, this.playOffset), dur) : 0
    }
    if (!this.playing || !this.ctx || (this.buffer?.duration ?? 0) <= 0) {
      return this.transportSeconds(this.params.speed)
    }
    return this.transportSeconds(Math.max(0.01, this.liveParams().speed))
  }

  getProjectDuration(): number {
    return this.projectDuration()
  }

  async unlock(): Promise<void> {
    await this.ensureContext()
  }

  async loadDemoTone(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    const rendered = renderDemoSample(this.ctx.sampleRate)
    const buffer = this.ctx.createBuffer(2, rendered.left.length, rendered.sampleRate)
    buffer.getChannelData(0).set(rendered.left)
    buffer.getChannelData(1).set(rendered.right)
    this.stopVoices()
    this.playing = false
    this.fileName = DEMO_FILE_NAME
    this.applyLoadedBuffer(buffer, true, 'inset', this.selectedTrackId)
  }

  async loadArrayBuffer(data: ArrayBuffer, fileName: string): Promise<void> {
    await this.loadTrackArrayBuffer(this.selectedTrackId, data, fileName)
  }

  async loadTrackArrayBuffer(id: string, data: ArrayBuffer, fileName: string): Promise<boolean> {
    const token = (this.loadToken.get(id) ?? 0) + 1
    this.loadToken.set(id, token)
    await this.ensureContext()
    if (this.loadToken.get(id) !== token) return false
    if (!this.ctx) return false
    const track = this.tracks.find((item) => item.id === id) ?? null
    if (!track) return false
    let decoded: AudioBuffer
    try {
      const copy = data.byteLength > 0 ? data.slice(0) : data
      decoded = await this.ctx.decodeAudioData(copy)
    } catch {
      return false
    }
    if (this.loadToken.get(id) !== token) return false
    if (!this.tracks.some((item) => item.id === id)) return false
    const wasPlaying = this.playing
    const playhead = wasPlaying ? this.getPlayheadSeconds() : this.playOffset
    this.stopVoices()
    this.playing = false
    if (id === this.selectedTrackId) this.fileName = fileName
    this.applyLoadedBuffer(decoded, true, 'inset', id, fileName)
    if (this.loadedTrackCount() > 1) this.playOffset = playhead
    if (id !== this.selectedTrackId) this.selectTrack(id)
    if (wasPlaying) void this.play()
    return Boolean(this.trackBuffers.get(id))
  }

  /** Test and offline helper. Same ownership rules as loadTrackArrayBuffer. */
  loadTrackPcm(
    id: string,
    channels: readonly Float32Array[],
    sampleRate: number,
    fileName = 'sample.wav',
  ): boolean {
    const track = this.tracks.find((item) => item.id === id)
    const buffer = this.bufferFromChannels(channels, sampleRate)
    if (!track || !buffer) return false
    if (track.id === this.selectedTrackId) this.fileName = fileName
    this.applyLoadedBuffer(buffer, true, 'inset', track.id, fileName)
    return Boolean(this.trackBuffers.get(track.id))
  }

  async play(): Promise<void> {
    await this.ensureContext()
    this.bindWorkingFromTrack(this.selectedTrackId)
    const hasLead = Boolean(this.buffer)
    const loaded = this.loadedTrackCount()
    if (!this.ctx || loaded === 0) return
    if (this.audioStatus === 'blocked') return
    this.stopVoices()
    this.playing = true
    const started = typeof performance !== 'undefined' ? performance.now() : 0
    this.lfoWallMs = started
    this.filterWallMs = started
    this.syncLfoClock()
    this.touchRacks((rack) => {
      rack.filterEnvOrigin = this.filterClockSec
      rack.filterFollower = 0
      rack.spaceLatched = false
      rack.noiseMuted = false
      rack.noiseFadeTau = NOISE_CUT_TAU_SEC
    })
    this.applyLiveAudio()
    const linearProject = loaded > 1 && this.engineMode === 'playback'
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.playbackRegion(duration)
    this.playCtxTime = this.ctx.currentTime
    if (linearProject) {
      const project = this.projectDuration()
      if (this.playFullSample || this.playOffset < 0 || this.playOffset >= project - 0.001) this.playOffset = 0
    } else if (this.playFullSample) {
      this.playOffset = 0
    } else {
      const parked = parkPlayheadOnStop(start, end, this.direction === 'reverse')
      const held = this.playOffset
      const atEnd = this.direction === 'reverse' ? held <= start + 0.001 : held >= end - 0.001
      this.playOffset = held >= start && held <= end && !atEnd ? held : parked
    }
    if (linearProject) {
      this.usingProjectTransport = true
      this.applyTrackMix(0.01)
      this.startProjectVoices(this.ctx.currentTime, this.playOffset, true)
      this.emit()
      return
    }
    if (hasLead) {
      if (this.engineMode === 'grain') {
        this.nextGrainTime = this.ctx.currentTime
        this.schedulerId = window.setInterval(() => this.scheduleGrains(), SCHEDULER_MS)
        this.scheduleGrains()
      } else {
        this.startRegionPlayback()
      }
    }
    if (loaded > 1) this.startSyncedCompanions(this.ctx.currentTime, this.playOffset)
    this.emit()
  }

  stop(): void {
    this.stopVoices()
    this.playing = false
    this.lfoWallMs = 0
    this.filterWallMs = 0
    this.syncLfoClock()
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.region(duration)
    this.playOffset = parkPlayheadOnStop(start, end, this.direction === 'reverse')
    if (this.engineMode === 'grain') {
      this.params.position = applyParamValue(this.direction === 'reverse' ? 100 : 0, PARAMS.position)
    }
    this.touchRacks((rack) => {
      rack.noiseMuted = true
      rack.noiseFadeTau = NOISE_CUT_TAU_SEC
    })
    this.killFx('all')
    this.playFullSample = false
    this.applyLiveAudio()
    this.emit()
  }

  /** Keep the playhead; fade distortion noise instead of cutting it. */
  pause(): void {
    if (!this.playing) return
    this.playOffset = this.getPlayheadSeconds()
    this.stopVoices()
    this.playing = false
    this.lfoWallMs = 0
    this.filterWallMs = 0
    this.syncLfoClock()
    if (this.ctx) this.playCtxTime = this.ctx.currentTime
    this.touchRacks((rack) => {
      rack.noiseMuted = true
      rack.noiseFadeTau = NOISE_PAUSE_FADE_TAU_SEC
    })
    this.applyLiveAudio(NOISE_PAUSE_FADE_TAU_SEC)
    this.emit()
  }

  togglePlay(): void {
    if (this.playing) this.pause()
    else void this.play()
  }

  /** Silence the distortion noise generator. Drive / mix stay put. */
  killNoise(): void {
    this.noiseMuted = true
    this.noiseFadeTau = NOISE_CUT_TAU_SEC
    this.applyLiveAudio(0.01)
    this.emit()
  }

  playFromStart(): void {
    this.playFullSample = true
    this.playOffset = 0
    this.params.position = applyParamValue(0, PARAMS.position)
    void this.play()
  }

  setLoop(loop: boolean): void {
    this.loop = loop
    if (this.playing) void this.play()
    else this.emit()
  }

  seekSeconds(time: number, mode: ScrubMode = this.scrubMode): void {
    const bufferDuration = this.buffer?.duration ?? 0
    const project = this.loadedTrackCount() > 1 ? this.projectDuration() : 0
    const duration = Math.max(bufferDuration, project)
    if (duration <= 0) return
    const { start, end } = this.region(bufferDuration || duration)
    const offset =
      project > 0 && mode === 'sample' ? Math.min(duration, Math.max(0, time)) : clampScrubTime(time, mode, start, end, duration)
    this.playOffset = offset
    if (this.ctx) this.playCtxTime = this.ctx.currentTime
    if (this.usingProjectTransport && this.playing && this.ctx && this.engineMode === 'playback') {
      this.startProjectVoices(this.ctx.currentTime, offset, true)
      this.emit()
      return
    }
    if (this.engineMode === 'grain') {
      const span = Math.max(end - start, MIN_REGION)
      if (offset >= start && offset <= end) {
        this.params.position = applyParamValue(((offset - start) / span) * 100, PARAMS.position)
        this.applyLiveAudio()
      }
      this.emit()
      return
    }
    if (this.playing) {
      if (this.direction === 'forward' && this.engineMode === 'playback') {
        this.stopVoices()
        this.startRegionPlayback()
        if (this.loadedTrackCount() > 1 && this.ctx) this.startSyncedCompanions(this.ctx.currentTime, this.playOffset)
        this.emit()
      } else {
        void this.play()
      }
    } else {
      this.emit()
    }
  }

  nudgePlayhead(delta: number, mode: ScrubMode = this.scrubMode): void {
    this.seekSeconds(this.getPlayheadSeconds() + delta, mode)
  }

  setScrubMode(mode: ScrubMode): void {
    if (this.scrubMode === mode) return
    this.scrubMode = mode
    const duration = this.buffer?.duration ?? 0
    if (duration > 0 && mode === 'region') {
      const { start, end } = this.region(duration)
      this.playOffset = clamp(this.playOffset, start, end)
      if (this.engineMode === 'grain') {
        const span = Math.max(end - start, MIN_REGION)
        this.params.position = applyParamValue(
          ((this.playOffset - start) / span) * 100,
          PARAMS.position,
        )
      }
    }
    this.emit()
  }

  setEngineMode(mode: EngineMode): void {
    if (this.engineMode === mode) return
    this.engineMode = mode
    this.chain = this.chain.map((mod) =>
      mod.type === 'grain' ? { ...mod, bypassed: mode === 'playback' } : mod,
    )
    if (this.playing) void this.play()
    else this.emit()
  }

  setDirection(direction: PlaybackDirection): void {
    const id = this.activeTrackId()
    const track = this.tracks.find((item) => item.id === id)
    if (!track || track.direction === direction) {
      if (id === this.selectedTrackId && this.direction !== direction) {
        this.direction = direction
        this.emit()
      }
      return
    }
    this.tracks = patchTrack(this.tracks, id, { direction })
    if (id === this.selectedTrackId) this.direction = direction
    if (this.usingProjectTransport && this.playing) this.rescheduleTrack(id)
    else if (this.playing && id === this.selectedTrackId) void this.play()
    else this.emit()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.rampSafety(this.playbackSafetyGain())
    this.emit()
  }

  setRecMonitor(value: number): void {
    this.recMonitor = Math.min(1, Math.max(0, value))
    if (this.ctx && this.recMute) {
      setSmoothedAudioParam(this.recMute.gain, this.recMonitor, this.ctx.currentTime, 'gain')
    }
    this.emit()
  }

  setParam(id: ParamId, value: number): void {
    this.spacePresetId = null
    if (id === 'bpm' && this.tempoWrite === 'ui') this.tempoSource = 'manual'
    const duration = this.buffer?.duration ?? 0
    if (id === 'start' || id === 'end') {
      const next = { ...this.params, [id]: value }
      const region = clampRegion(next.start, next.end, duration, MIN_REGION)
      this.params.start = region.start
      this.params.end = region.end
      this.syncSelectedTrackRegion()
      this.syncPrepSelection(region.start, region.end)
      this.applyRegionChange()
    } else {
      const turningStereoOn = id === 'delayStereo' && value > 0.5 && this.params.delayStereo <= 0.5
      const turningReverbStereoOn = id === 'reverbStereo' && value > 0.5 && this.params.reverbStereo <= 0.5
      const previous = this.params[id]
      this.forgetRandomOffset(id)
      this.params[id] = applyParamValue(value, PARAMS[id])
      if (id === 'distortionNoise' && this.noiseMuted) this.noiseMuted = false
      if (turningStereoOn) this.copyDelayLeftToRight()
      if (turningReverbStereoOn && this.params.reverbWidth < 20) this.params.reverbWidth = 125
      commitParamEdit(this.params, id, previous)
      if (isSharedParam(id)) this.broadcastShared()
      this.mirrorMixerParam(id)
      if (
        id === 'speed' ||
        id === 'pitch' ||
        id === 'stretchInterp' ||
        id === 'stretchInterpOn' ||
        id === 'stretchInterpAlgo'
      ) {
        this.syncRateVoices()
      }
      const clicky =
        id === 'speed' ||
        id === 'pitch' ||
        id === 'grainSize' ||
        id === 'density' ||
        id === 'stretchInterp' ||
        id === 'grainPitch'
      this.applyLiveAudio(clicky ? 0.07 : 0.03)
      this.syncLfoClock()
      if (id === 'reverbWet' || id === 'reverbDry') this.engageReverbFromMix()
      if (id === 'delayWet' || id === 'delayWetR' || id === 'delayDry' || id === 'delayDryR') this.engageDelayFromMix()
      if (
        id === 'saturation' ||
        id === 'saturationMix' ||
        id === 'distortionNoise' ||
        id === 'distortionBits' ||
        id === 'distortionDownsample'
      ) {
        this.engageDistortionFromDrive()
      }
      if ((FILTER_PARAM_IDS as string[]).includes(id)) this.engageFilter()
      if ((MS_PARAM_IDS as string[]).includes(id)) this.engageMidSide()
    }
    if (id === 'position') {
      const dur = this.buffer?.duration ?? 0
      const { start, end } = this.region(dur)
      this.playOffset = start + (this.params.position / 100) * Math.max(end - start, 0)
    }
    this.emit()
  }

  setParams(patch: Partial<Record<ParamId, number>>): void {
    this.spacePresetId = null
    const previous = {
      delayLinkLR: this.params.delayLinkLR,
      delayCorrelate: this.params.delayCorrelate,
      reverbCorrelate: this.params.reverbCorrelate,
    }
    const keys: ParamId[] = []
    for (const key of Object.keys(patch) as ParamId[]) {
      const value = patch[key]
      if (typeof value !== 'number') continue
      this.forgetRandomOffset(key)
      this.params[key] = applyParamValue(value, PARAMS[key])
      keys.push(key)
    }
    commitParamPatch(this.params, keys, previous)
    if (keys.some((id) => isSharedParam(id))) this.broadcastShared()
    if ('distortionNoise' in patch && this.noiseMuted) this.noiseMuted = false
    this.applyLiveAudio()
    this.syncLfoClock()
    this.engageReverbFromMix()
    this.engageDelayFromMix()
    this.engageDistortionFromDrive()
    if (FILTER_PARAM_IDS.some((id) => id in patch)) this.engageFilter()
    if (MS_PARAM_IDS.some((id) => id in patch)) this.engageMidSide()
    this.emit()
  }

  randomizeParam(id: ParamId): boolean {
    if (!isRandomizable(id)) return false
    const gen = this.randomDoc.generators[id] ?? defaultParamRandom()
    const next = randomParamValue({
      id,
      current: this.randomCenter(id),
      intensity: gen.intensity,
      chaos: this.randomDoc.chaos,
      bpm: this.params.bpm,
    })
    if (this.randomOwns(id)) {
      this.randomHold = id
      this.randomOffsets[id] = offsetForTarget(this.automatedCenter(id), next, id)
      delete this.randomRuntime.glides[id]
      if (this.ctx) this.applyLiveAudio(0.02)
      this.randomHold = null
      this.emit()
      return true
    }
    const shadow = eqShadowField(id)
    if (shadow) {
      this.forgetRandomOffset(id)
      this.setEqBand(shadow.index, { [shadow.field]: next })
      return true
    }
    this.setParam(id, next)
    return true
  }

  setParamRandom(id: ParamId, patch: Partial<ParamRandom>): void {
    if (!isRandomizable(id)) return
    const prev = this.randomDoc.generators[id] ?? defaultParamRandom()
    const next: ParamRandom = { ...prev, ...patch }
    if (patch.rateHz != null) next.rateHz = nearestFreeRate(patch.rateHz)
    next.intensity = Math.min(1, Math.max(0, next.intensity))
    if (next.auto && !this.randomDoc.chaos) next.auto = prev.auto && this.randomDoc.chaos
    if (!next.auto) {
      delete this.randomRuntime.lastSec[id]
      delete this.randomRuntime.glides[id]
    }
    this.randomDoc = {
      ...this.randomDoc,
      generators: { ...this.randomDoc.generators, [id]: next },
    }
    this.persistRandom()
    this.syncLfoClock()
    if (id === 'speed' || id === 'pitch') this.syncRateVoices()
    this.emit()
  }

  setChaos(enabled: boolean): void {
    if (this.randomDoc.chaos === enabled) return
    this.randomDoc = { ...this.randomDoc, chaos: enabled }
    if (!enabled) this.randomRuntime = defaultRandomRuntime()
    this.persistRandom()
    this.syncLfoClock()
    this.syncRateVoices()
    this.emit()
  }

  /** First enable in this session opens the warning. Later enables apply immediately. */
  requestChaos(pendingId?: ParamId): void {
    if (this.randomDoc.chaos) {
      if (pendingId) {
        this.setParamRandom(pendingId, { auto: true })
        return
      }
      this.setChaos(false)
      return
    }
    if (this.randomWarned) {
      this.setChaos(true)
      if (pendingId) this.setParamRandom(pendingId, { auto: true })
      if (this.randomPendingEq) {
        this.randomPendingEq = false
        this.setEqRandom({ auto: true })
      }
      if (this.randomPendingLfo) {
        const id = this.randomPendingLfo
        this.randomPendingLfo = null
        this.setLfoRandom(id, { gen: { auto: true } })
      }
      return
    }
    this.randomPendingId = pendingId ?? null
    this.randomPrompt = true
    this.emit()
  }

  confirmChaos(): void {
    this.randomWarned = true
    this.randomPrompt = false
    const pending = this.randomPendingId
    const pendingEq = this.randomPendingEq
    const pendingLfo = this.randomPendingLfo
    this.randomPendingId = null
    this.randomPendingEq = false
    this.randomPendingLfo = null
    this.setChaos(true)
    if (pending) this.setParamRandom(pending, { auto: true })
    if (pendingEq) this.setEqRandom({ auto: true })
    if (pendingLfo) this.setLfoRandom(pendingLfo, { gen: { auto: true } })
  }

  cancelChaos(): void {
    this.randomPrompt = false
    this.randomPendingId = null
    this.randomPendingEq = false
    this.randomPendingLfo = null
    this.emit()
  }

  armEqAuto(): void {
    if (this.randomDoc.eq.auto && this.randomDoc.chaos) {
      this.setEqRandom({ auto: false })
      return
    }
    if (!this.randomDoc.chaos) {
      this.randomPendingEq = true
      this.requestChaos()
      return
    }
    this.setEqRandom({ auto: true })
  }

  armLfoAuto(id: ParamId): void {
    const current = this.randomDoc.lfo[id]
    if (current?.gen.auto && this.randomDoc.chaos) {
      this.setLfoRandom(id, { gen: { auto: false } })
      return
    }
    if (!this.randomDoc.chaos) {
      this.randomPendingLfo = id
      this.requestChaos()
      return
    }
    this.setLfoRandom(id, { gen: { auto: true } })
  }

  setRandomParticipation(kind: string, ids: readonly string[]): void {
    this.randomDoc = {
      ...this.randomDoc,
      participation: {
        ...this.randomDoc.participation,
        [kind]: ids.filter((id) => isRandomizable(id as ParamId) || id.startsWith('sel:')),
      },
    }
    this.persistRandom()
    this.emit()
  }

  setEqRandom(patch: Partial<EqRandomSettings>): void {
    const prev = this.randomDoc.eq
    const next: EqRandomSettings = {
      ...prev,
      ...patch,
      gen: patch.gen ? { ...prev.gen, ...patch.gen } : prev.gen,
      bandFields: patch.bandFields ? patch.bandFields.slice() : prev.bandFields,
    }
    if (patch.gen?.rateHz != null) next.gen.rateHz = nearestFreeRate(patch.gen.rateHz)
    next.gen.intensity = Math.min(1, Math.max(0, next.gen.intensity))
    if (next.auto && !this.randomDoc.chaos) next.auto = false
    if (!next.auto) this.randomRuntime.eqLastSec = null
    this.randomDoc = { ...this.randomDoc, eq: next }
    this.persistRandom()
    this.syncLfoClock()
    this.emit()
  }

  setLfoRandom(id: ParamId, patch: { fields?: readonly LfoRandomField[]; gen?: Partial<ParamRandom> }): void {
    const prev = this.randomDoc.lfo[id] ?? { fields: [...LFO_RANDOM_DEFAULT_FIELDS], gen: defaultParamRandom() }
    const next = {
      fields: patch.fields ? [...patch.fields] : prev.fields.slice(),
      gen: { ...prev.gen, ...patch.gen },
    }
    if (patch.gen?.rateHz != null) next.gen.rateHz = nearestFreeRate(patch.gen.rateHz)
    next.gen.intensity = Math.min(1, Math.max(0, next.gen.intensity))
    if (next.gen.auto && !this.randomDoc.chaos) next.gen.auto = false
    if (!next.gen.auto) delete this.randomRuntime.lfoLastSec[id]
    this.randomDoc = { ...this.randomDoc, lfo: { ...this.randomDoc.lfo, [id]: next } }
    this.persistRandom()
    this.syncLfoClock()
    this.emit()
  }

  /** Arm or disarm Auto Random on the effect's participating parameters together. */
  setEffectAuto(kind: FxLfoKind, auto: boolean): void {
    if (auto && !this.randomDoc.chaos) return
    const selected = new Set(participatingTargets(this.randomDoc, kind))
    const generators = { ...this.randomDoc.generators }
    for (const id of participatingTargets({ ...this.randomDoc, participation: {} }, kind)) {
      if (!isAutoRandomizable(id)) continue
      const prev = generators[id] ?? defaultParamRandom()
      const next = { ...prev, auto: auto && selected.has(id) }
      generators[id] = next
      if (!next.auto) {
        delete this.randomRuntime.lastSec[id]
        delete this.randomRuntime.glides[id]
      }
    }
    this.randomDoc = { ...this.randomDoc, generators }
    this.persistRandom()
    this.syncLfoClock()
    this.emit()
  }

  randomizeEffect(kind: FxLfoKind): boolean {
    const bandIndex = EQ_BAND_LFO_KINDS.indexOf(kind)
    if (bandIndex >= 0) return this.randomizeEqBand(bandIndex)
    const entries = participatingEntries(this.randomDoc, kind)
    for (const entry of entries) {
      if (entry.selectId) this.applyRandomSelect(entry.selectId)
    }
    const patch: Partial<Record<ParamId, number>> = {}
    let changed = entries.some((entry) => entry.selectId)
    const chaos = this.randomDoc.chaos
    for (const id of entries.flatMap((entry) => (entry.paramId ? [entry.paramId] : []))) {
      const gen = this.randomDoc.generators[id] ?? defaultParamRandom()
      const next = randomParamValue({
        id,
        current: this.randomCenter(id),
        intensity: gen.intensity,
        chaos,
        bpm: this.params.bpm,
      })
      if (this.randomOwns(id)) {
        this.randomOffsets[id] = offsetForTarget(this.automatedCenter(id), next, id)
        delete this.randomRuntime.glides[id]
        changed = true
        continue
      }
      const shadow = eqShadowField(id)
      if (shadow) {
        this.writeEqBandQuiet(shadow.index, { [shadow.field]: next })
        changed = true
        continue
      }
      patch[id] = next
    }
    if (Object.keys(patch).length > 0) {
      this.setParams(patch)
      return true
    }
    if (changed) {
      if (this.ctx) this.applyLiveAudio(0.03)
      this.emit()
    }
    return changed
  }

  randomizeModule(type: ModuleType): boolean {
    const kind = moduleRandomKind(type)
    if (!kind) return false
    return this.randomizeEffect(kind)
  }

  randomizeEqBand(index: number, includeType = true): boolean {
    const id = this.primaryEqId()
    const bands = this.eqEditBands(this.eqState(id))
    const band = bands[index]
    if (!band || band.type === 'off') return false
    const stored = this.randomDoc.eq.bandFields
    const fields = (stored && stored.length > 0 ? stored : defaultEqBandFields(band.type)).filter((field) =>
      includeType ? true : field !== 'type',
    )
    const chaos = this.randomDoc.chaos
    const patch = randomizeEqBandFields(band, fields, chaos ? 0.75 : 0.5, chaos, Math.random)
    const base: Partial<EqBand> = {}
    if (patch.type) base.type = patch.type
    if (patch.slope != null) base.slope = patch.slope
    const ids = EQ_BAND_LFO_IDS[index]
    const assign = (field: 'frequency' | 'gain' | 'q', param: ParamId | undefined, value: number | undefined) => {
      if (value == null || !param) return
      if (this.randomOwns(param)) {
        this.randomOffsets[param] = offsetForTarget(this.automatedCenter(param), value, param)
        delete this.randomRuntime.glides[param]
        return
      }
      base[field] = value
    }
    assign('frequency', ids?.freq, patch.frequency)
    assign('gain', ids?.gain, patch.gain)
    assign('q', ids?.q, patch.q)
    if (!ids) {
      if (patch.frequency != null) base.frequency = patch.frequency
      if (patch.gain != null) base.gain = patch.gain
      if (patch.q != null) base.q = patch.q
    }
    this.setEqBand(index, base, id)
    this.revealEqBand(id, index)
    return true
  }

  /**
   * Replace the EQ with 1–6 generated filters in one band write.
   * Bands are sorted low to high. Stable ids are new, so old LFO and
   * automation routes on those slots are dropped instead of following the index.
   */
  generateRandomEq(instanceId?: string): number | null {
    const id = instanceId ?? this.primaryEqId()
    if (!this.chain.some((mod) => mod.instanceId === id && mod.type === 'eq')) return null
    const chaos = this.randomDoc.chaos
    const count = resolveEqFilterCount(this.randomDoc.eq.count, Math.random)
    const bands = generateRandomEqBands({
      count,
      chaos,
      intensity: chaos ? 0.8 : 0.55,
    })
    this.replaceEqBands(bands, id, true)
    const picked = preferredGeneratedBand(bands)
    this.revealEqBand(id, picked)
    return picked
  }

  /**
   * One band-list write and one EQ coefficient pass.
   * `detachStale` clears modulation only where the stable band id at that index changed.
   */
  replaceEqBands(bands: readonly EqBand[], instanceId?: string, detachStale = true): void {
    const id = instanceId ?? this.primaryEqId()
    if (!this.chain.some((mod) => mod.instanceId === id && mod.type === 'eq')) return
    const st = this.eqState(id)
    const previous = this.eqEditBands(st).map((band) => ({ ...band }))
    const next = bands.map((band) => ({ ...band, id: band.id || createEqBandId() }))
    this.writeEqEditBands(st, next)
    this.eqById.set(id, st)
    if (detachStale) this.detachStaleEqModulation(previous, next)
    this.syncPrimaryEq()
    const slot = this.slots.get(id)
    if (slot?.eq && this.ctx) growEqGraph(this.ctx, slot.eq, next.length)
    this.syncEqLfoParams(id)
    this.filterType = this.eqBands[0]?.type ?? 'off'
    this.applyEq(0.03)
    const mod = this.chain.find((item) => item.instanceId === id)
    const bypass = eqBypassAfterBandEdit(Boolean(mod?.bypassed), next)
    if (mod && mod.bypassed !== bypass) {
      this.setModuleBypass(id, bypass)
      return
    }
    this.emit()
  }

  /** Randomize the LFO already routed to this parameter. Does not allocate another slot. */
  randomizeParameterLfo(id: ParamId): boolean {
    const kind = fxLfoKindForParam(id)
    if (!kind) return false
    let binding = lfoBinding(this.fxLfos, id)
    if (!binding) {
      let slot = nextFreeLfoSlot(this.fxLfos[kind])
      if (slot == null) return false
      const shown = this.lfoShown[kind] ?? 1
      if (slot >= shown) {
        const added = this.addFxLfo(kind)
        if (added == null) return false
        slot = added
      }
      const current = this.fxLfos[kind][slot] ?? defaultFxLfo()
      this.setFxLfo(kind, slot, {
        target: id,
        depth: current.depth > 0 ? current.depth : LFO_DEPTH_DEFAULT,
        rateHz: current.rateHz || LFO_RATE_DEFAULT,
        shape: current.shape,
      })
      binding = lfoBinding(this.fxLfos, id)
    }
    if (!binding || binding.lfo.target !== id) return false
    const stored = this.randomDoc.lfo[id]
    const fields = stored?.fields?.length ? stored.fields : LFO_RANDOM_DEFAULT_FIELDS
    const patch = randomLfoPatch({
      lfo: binding.lfo,
      fields,
      chaos: this.randomDoc.chaos,
      intensity: stored?.gen.intensity ?? 0.55,
      nowSec: this.lfoTime(),
    })
    this.setFxLfo(binding.kind, binding.slot, patch)
    return true
  }

  private applyRandomSelect(id: EngineSelectId): void {
    if (id === 'playbackDirection') {
      const options = PLAYBACK_DIRECTIONS.map((item) => item.value)
      const current = this.tracks.find((track) => track.id === this.activeTrackId())?.direction ?? this.direction
      this.setDirection(pickDifferent(options, current, undefined, Math.random))
      return
    }
    if (id === 'delayType') {
      this.setDelayType(pickDifferent(DELAY_TYPE_OPTIONS, this.delayType, DELAY_TYPE_WEIGHTS, Math.random))
      return
    }
    if (id === 'reverbType') {
      const next = pickDifferent(REVERB_TYPE_OPTIONS, this.reverbType, REVERB_TYPE_WEIGHTS, Math.random)
      if (next !== 'custom') this.setReverbType(next)
      return
    }
    this.setDistortionType(pickDifferent(DISTORTION_TYPE_OPTIONS, this.distortionType, DISTORTION_TYPE_WEIGHTS, Math.random))
  }

  private revealEqBand(instanceId: string, index: number): void {
    if (this.activeTrackId() !== this.selectedTrackId) return
    this.eqPickToken += 1
    this.eqPick = { index, token: this.eqPickToken }
    selectEqBand({ instanceId, index })
  }

  /** Drop LFO and automation when the band id at a slot is no longer the one that owned them. */
  private detachStaleEqModulation(previous: readonly EqBand[], next: readonly EqBand[]): void {
    for (let index = 0; index < EQ_BAND_LFO_KINDS.length; index++) {
      const before = previous[index]
      const after = next[index]
      if (!before?.id) continue
      if (before.id === after?.id && after.type !== 'off') continue
      const hadRoute = eqBandHasLfo(this.fxLfos, index) || before.type !== 'off'
      if (!hadRoute && before.type === 'off') continue
      this.clearEqBandModulation(index)
    }
  }

  private randomOwns(id: ParamId): boolean {
    if (!this.playing) return false
    return (laneFor(this.automation, id)?.nodes.length ?? 0) > 0
  }

  private automatedCenter(id: ParamId): number {
    const lane = laneFor(this.automation, id)
    if (!lane || lane.nodes.length === 0) return this.params[id]
    const transport = this.playing ? this.transportSeconds(Math.max(0.01, this.params.speed)) : 0
    return envelopeToParam(id, sampleEnvelope(lane.nodes, transport) ?? 0)
  }

  private randomCenter(id: ParamId): number {
    if (!this.randomOwns(id)) return this.params[id]
    return applyRandomOffset(this.automatedCenter(id), id, this.randomOffsets[id] ?? 0)
  }

  private forgetRandomOffset(id: ParamId): void {
    delete this.randomOffsets[id]
    delete this.randomRuntime.glides[id]
  }

  private persistRandom(): void {
    saveRandomDocument(this.randomDoc)
  }

  private advanceRandom(): void {
    const step = stepRandom({
      doc: this.randomDoc,
      runtime: this.randomRuntime,
      offsets: this.randomOffsets,
      params: this.params,
      automation: this.automation,
      playing: this.playing,
      clockSec: this.lfoClockSec,
      transportSec: this.lastTransportSec,
      bpm: this.params.bpm,
    })
    if (this.randomHold) {
      const held = this.randomOffsets[this.randomHold]
      if (held != null) step.offsets[this.randomHold] = held
      step.writes = step.writes.filter((write) => write.id !== this.randomHold)
      delete step.runtime.glides[this.randomHold]
    }
    this.randomRuntime = step.runtime
    this.randomOffsets = step.offsets
    this.randomBudgetLimited = step.budgetLimited
    if (step.writes.length > 0) {
      this.randomDirty = true
      for (const write of step.writes) this.writeRandomBase(write.id, write.value)
    }
    this.advanceLfoRandom()
    this.advanceEqRandom()
  }

  /** Auto Random for an existing LFO. Runs on the shared transport clock, not a UI timer. */
  private advanceLfoRandom(): void {
    if (!this.playing || !this.randomDoc.chaos) return
    const scale = randomBudgetScale(this.randomDoc, this.params.bpm)
    for (const id of Object.keys(this.randomDoc.lfo) as ParamId[]) {
      const target = this.randomDoc.lfo[id]
      if (!target?.gen.auto || target.fields.length === 0) continue
      const interval = Math.max(0.05, randomIntervalSec(target.gen, this.params.bpm) * scale)
      const last = this.randomRuntime.lfoLastSec[id]
      if (last == null) {
        this.randomRuntime.lfoLastSec[id] = this.lfoClockSec
        continue
      }
      if (this.lfoClockSec + 1e-6 < last + interval) continue
      this.randomRuntime.lfoLastSec[id] = this.lfoClockSec
      const binding = lfoBinding(this.fxLfos, id)
      if (!binding || binding.lfo.target !== id) continue
      const patch = randomLfoPatch({
        lfo: binding.lfo,
        fields: target.fields,
        chaos: true,
        intensity: target.gen.intensity,
        nowSec: this.lfoTime(),
      })
      const slot = this.fxLfos[binding.kind][binding.slot] ?? defaultFxLfo()
      this.fxLfos[binding.kind][binding.slot] = { ...slot, ...patch }
      this.randomDirty = true
    }
  }

  /** Whole-EQ or selected-band Auto Random. Topology changes stay at least one second apart. */
  private advanceEqRandom(): void {
    const eq = this.randomDoc.eq
    if (!this.playing || !this.randomDoc.chaos || !eq.auto) return
    const interval = Math.max(1, randomIntervalSec(eq.gen, this.params.bpm))
    if (this.randomRuntime.eqLastSec == null) {
      this.randomRuntime.eqLastSec = this.lfoClockSec
      return
    }
    if (this.lfoClockSec + 1e-6 < this.randomRuntime.eqLastSec + interval) return
    this.randomRuntime.eqLastSec = this.lfoClockSec
    if (eq.scope === 'whole') {
      const id = this.primaryEqId()
      if (!this.chain.some((mod) => mod.instanceId === id && mod.type === 'eq')) return
      const bands = generateRandomEqBands({
        count: resolveEqFilterCount(eq.count, Math.random),
        chaos: true,
        intensity: eq.gen.intensity,
      })
      this.replaceEqBands(bands, id, true)
      this.revealEqBand(id, preferredGeneratedBand(bands))
      this.randomDirty = true
      return
    }
    const selected = this.eqPick?.index ?? 0
    this.randomizeEqBand(selected, true)
    this.randomDirty = true
  }

  private writeRandomBase(id: ParamId, value: number): void {
    delete this.randomOffsets[id]
    const shadow = eqShadowField(id)
    if (shadow) {
      this.writeEqBandQuiet(shadow.index, { [shadow.field]: value })
      return
    }
    const previous = this.params[id]
    this.params[id] = applyParamValue(value, PARAMS[id])
    commitParamEdit(this.params, id, previous)
    this.mirrorMixerParam(id)
    if (id === 'speed' || id === 'pitch') this.syncRateVoices()
  }

  private writeEqBandQuiet(index: number, patch: Partial<EqBand>): void {
    const id = this.primaryEqId()
    const st = this.eqState(id)
    const current = this.eqEditBands(st)
    const band = current[index]
    if (!band) return
    const nextBand = { ...band, ...patch }
    const next = current.map((item, i) => (i === index ? nextBand : item))
    this.writeEqEditBands(st, next)
    this.eqById.set(id, st)
    this.syncPrimaryEq()
    this.syncEqLfoParams(id)
  }

  private engageReverbFromMix(): void {
    if (!reverbMixEngagesModule(this.params.reverbWet)) return
    const reverb = this.chain.find((m) => m.type === 'reverb')
    if (reverb?.bypassed) this.setModuleBypass(reverb.instanceId, false)
  }

  private engageDelayFromMix(): void {
    if (this.params.delayWet < 1 && this.params.delayWetR < 1) return
    const delay = this.chain.find((m) => m.type === 'delay')
    if (delay?.bypassed) this.setModuleBypass(delay.instanceId, false)
  }

  private copyDelayLeftToRight(): void {
    this.params.delayTimeR = this.params.delayTime
    this.params.delaySyncR = this.params.delaySync
    this.params.delayNoteR = this.params.delayNote
    this.params.delayNoteKindR = this.params.delayNoteKind
    this.params.delayWetR = this.params.delayWet
    this.params.delayDryR = this.params.delayDry
    this.params.delayFeedbackR = this.params.delayFeedback
  }

  private engageDistortionFromDrive(): void {
    const p = this.params
    const active = distortionDryWet(
      this.distortionType,
      p.saturation,
      100,
      p.distortionBits,
      p.distortionDownsample,
      p.distortionNoise,
    ).wet > 0
    if (!active) return
    const mod = this.chain.find((m) => m.type === 'distortion')
    if (mod?.bypassed) this.setModuleBypass(mod.instanceId, false)
  }

  setDelayType(type: DelayType): void {
    if (this.delayType === type) return
    this.delayType = type
    const color = delayTypeColorPatch(type)
    for (const key of Object.keys(color) as ParamId[]) {
      const value = color[key]
      if (typeof value !== 'number') continue
      this.params[key] = applyParamValue(value, PARAMS[key])
    }
    this.applyLiveAudio()
    this.emit()
  }

  setDistortionType(type: DistortionType): void {
    if (this.distortionType === type) return
    this.distortionType = type
    this.noiseMuted = false
    this.noiseFadeTau = NOISE_CUT_TAU_SEC
    const color = distortionTypeColorPatch(type)
    for (const key of Object.keys(color) as ParamId[]) {
      const value = color[key]
      if (typeof value !== 'number') continue
      this.params[key] = applyParamValue(value, PARAMS[key])
    }
    this.distortionNoiseKind = distortionTypeProfile(type).noiseKind
    this.applyLiveAudio()
    this.engageDistortionFromDrive()
    this.emit()
  }

  setDistortionNoiseKind(kind: DistortionNoiseKind): void {
    if (this.distortionNoiseKind === kind) return
    this.distortionNoiseKind = kind
    this.applyLiveAudio()
    this.emit()
  }

  private engageFilter(): void {
    const mod = this.chain.find((m) => m.type === 'filter')
    if (mod?.bypassed) this.setModuleBypass(mod.instanceId, false)
  }

  private engageMidSide(): void {
    const mod = this.chain.find((m) => m.type === 'midside')
    if (mod?.bypassed) this.setModuleBypass(mod.instanceId, false)
  }

  applyFilterPreset(id: FilterPresetId): void {
    this.setParams(filterPresetPatch(id))
    this.wireFilterPresetLfo(id)
  }

  applyEqPreset(id: string, instanceId?: string): void {
    const preset = findEqPreset(id)
    if (!preset) return
    const eqId = instanceId ?? this.primaryEqId()
    if (!this.chain.some((m) => m.instanceId === eqId)) this.ensureModule('eq')
    const st = this.eqState(eqId)
    const bands = cloneEqBands(preset.bands)
    if (this.eqChannelMode === 'left') st.bandsL = bands
    else if (this.eqChannelMode === 'right') st.bandsR = bands
    else st.bands = bands
    this.eqById.set(eqId, st)
    this.syncPrimaryEq()
    this.syncEqLfoParams(eqId)
    this.applyEq(0.03)
    const mod = this.chain.find((m) => m.instanceId === eqId)
    if (mod?.bypassed) this.setModuleBypass(eqId, false)
    else this.emit()
  }

  applyModulePreset(id: string): void {
    const preset = findModulePreset(id)
    if (!preset) return
    // Choose the model first. Its color defaults must not overwrite settings the preset lists.
    if (preset.distortionType) this.setDistortionType(preset.distortionType)
    this.setParams(preset.params)
    this.ensureModule(preset.kind === 'grain' ? 'grain' : preset.kind)
    if (preset.kind === 'grain') this.setEngineMode('grain')
    if (preset.lfo) {
      this.setFxLfo(preset.kind === 'filter' ? 'filter' : 'input', 0, {
        ...defaultFxLfo(),
        target: preset.lfo.target,
        depth: preset.lfo.depth,
        rateHz: preset.lfo.rateHz,
        shape: preset.lfo.shape,
      })
    } else if (preset.kind === 'filter') {
      this.setFxLfo('filter', 0, { target: null, depth: 0 })
    }
    const mod = this.chain.find((m) => m.type === preset.kind)
    if (mod?.bypassed) this.setModuleBypass(mod.instanceId, false)
  }

  private wireFilterPresetLfo(_id: FilterPresetId): void {
    const depth = this.params.filterLfoDepth
    if (!(depth > 1)) {
      this.setFxLfo('filter', 0, { target: null, depth: 0 })
      return
    }
    const shapeRaw = filterLfoShapeAt(this.params.filterLfoShape)
    const shape =
      shapeRaw === 'triangle' || shapeRaw === 'square' || shapeRaw === 'saw' || shapeRaw === 'snh' || shapeRaw === 'sine'
        ? shapeRaw
        : 'sine'
    this.setFxLfo('filter', 0, {
      ...defaultFxLfo(),
      target: 'filterCutoff',
      depth: Math.min(1, depth / 100),
      rateHz: Math.max(0.05, this.params.filterLfoRate || 0.2),
      shape,
    })
  }

  setChannelLayout(mode: ChannelLayoutMode): void {
    this.channelLayout = mode
    this.params.makeMono = mode === 'mono' ? 1 : 0
    this.applyPlaybackLayout()
    this.applyLiveAudio(0.02)
    this.emit()
  }

  setEqChannelMode(mode: EqChannelMode): void {
    if (this.eqChannelMode === mode) return
    if (this.eqChannelMode === 'shared' && mode !== 'shared') {
      for (const st of this.eqById.values()) {
        if (!st.bandsL.length) st.bandsL = cloneEqBands(st.bands)
        if (!st.bandsR.length) st.bandsR = cloneEqBands(st.bands)
      }
    }
    if (mode === 'shared' && this.eqChannelMode !== 'shared') {
      for (const st of this.eqById.values()) {
        const from = this.eqChannelMode === 'right' ? st.bandsR : st.bandsL
        if (from.length) st.bands = cloneEqBands(from)
      }
    }
    this.eqChannelMode = mode
    this.syncEqLfoParams(this.primaryEqId())
    this.syncPrimaryEq()
    this.applyEq(0.03)
    this.emit()
  }

  ensureModule(type: ModuleType): string | null {
    const existing = this.chain.find((m) => m.type === type)
    if (existing) return existing.instanceId
    return this.insertModule(type, Math.max(0, this.chain.length - 2))
  }

  /**
   * Open every missing module in one splice. Sensory macros used to insert
   * them one at a time, and each insert muted the master, waited, and
   * reconnected the whole graph.
   */
  ensureModules(types: readonly ModuleType[]): void {
    let chain = this.chain
    const added: ChainModule[] = []
    for (const type of types) {
      if (chain.some((mod) => mod.type === type)) continue
      const next = insertChainModule(chain, type, Math.max(0, chain.length - 2))
      const mod = next.find((item) => !chain.some((old) => old.instanceId === item.instanceId))
      if (!mod || modulesEqual(next, chain)) continue
      chain = next
      added.push(mod)
    }
    if (!added.length) return
    this.chain = chain
    for (const mod of added) {
      if (mod.type === 'eq') this.eqById.set(mod.instanceId, cloneEqState())
      if (mod.type === 'grain') this.engineMode = 'grain'
    }
    this.mountAddedSlots(added)
    this.emit()
  }

  randomizeFilter(): void {
    this.setParams(randomizeFilterPatch())
  }

  resetFilter(): void {
    this.resetEffect('filter')
  }

  applyMidSideRecipe(id: MidSideRecipeId): void {
    const recipe = MIDSIDE_RECIPES.find((item) => item.id === id)
    this.setParams(midSideRecipePatch(id))
    if (recipe?.lfo) this.setFxLfo('midside', 0, { ...defaultFxLfo(), ...recipe.lfo })
    else this.setFxLfo('midside', 0, { target: null })
  }

  randomizeMidSide(): void {
    const next = randomizeMidSidePatch()
    this.setParams(next.params)
    if (next.lfo) {
      this.setFxLfo('midside', 0, { ...defaultFxLfo(), ...next.lfo })
    } else {
      this.setFxLfo('midside', 0, { target: null })
    }
  }

  resetMidSide(): void {
    this.resetEffect('midside')
  }

  /** Restore one effect to its original parameter values. Does not change bypass. */
  resetEffect(kind: EffectDefaultKind, instanceId?: string): void {
    if (kind === 'eq') {
      this.resetEqToDefault(instanceId)
      return
    }
    const keptSpace = this.spacePresetId
    this.setParams(effectDefaultPatch(kind))
    if (kind !== 'delay' && kind !== 'reverb' && keptSpace) this.spacePresetId = keptSpace
    if (kind === 'delay') this.delayType = 'digital'
    if (kind === 'reverb') {
      this.reverbType = 'hall'
      this.reverbIrKey = ''
    }
    if (kind === 'distortion') {
      this.distortionType = 'saturation'
      this.distortionNoiseKind = distortionTypeProfile('saturation').noiseKind
    }
    this.clearLfoKind(kind)
    this.applyLiveAudio()
    this.emit()
  }

  private clearLfoKind(kind: FxLfoKind): void {
    for (let slot = 0; slot < FX_LFO_SLOTS; slot++) {
      this.fxLfos[kind][slot] = defaultFxLfo()
    }
  }

  /**
   * Deleting a band drops every LFO slot and automation lane for that index.
   * A later strip that reuses the slot must not inherit rate, depth, shape,
   * routing, bypass, phase, or an automation curve.
   */
  private clearEqBandModulation(bandIndex: number): void {
    const ids = EQ_BAND_LFO_IDS[bandIndex]
    const kind = EQ_BAND_LFO_KINDS[bandIndex]
    if (!ids || !kind) return
    this.clearLfoKind(kind)
    this.lfoShown[kind] = 1
    let automation = this.automation
    for (const paramId of [ids.freq, ids.gain, ids.q]) {
      automation = removeAutomationLane(automation, paramId)
    }
    this.automation = automation
    this.syncLfoClock()
  }

  private resetEqToDefault(instanceId?: string): void {
    const eqId = instanceId ?? this.primaryEqId()
    if (!this.chain.some((mod) => mod.instanceId === eqId && mod.type === 'eq')) return
    const st = this.eqState(eqId)
    st.bands = defaultEqBands()
    st.bandsL = []
    st.bandsR = []
    st.comb = defaultCombFilter()
    this.eqById.set(eqId, st)
    this.syncPrimaryEq()
    this.syncEqLfoParams(eqId)
    if (eqId === this.primaryEqId()) {
      for (const lfoKind of EQ_BAND_LFO_KINDS) this.clearLfoKind(lfoKind)
      this.clearLfoKind('eqcf')
    }
    this.applyEq(0.03)
    this.emit()
  }

  copyMidSideScope(left: Uint8Array, right: Uint8Array): boolean {
    for (const slot of this.slots.values()) {
      if (!slot.midSideFx) continue
      slot.midSideFx.analyserL.getByteTimeDomainData(left as Uint8Array<ArrayBuffer>)
      slot.midSideFx.analyserR.getByteTimeDomainData(right as Uint8Array<ArrayBuffer>)
      return true
    }
    return false
  }

  setReverbType(type: ReverbType): void {
    if (this.reverbType === type) return
    this.reverbType = type
    const preset = this.spacePresetId ? findSpacePreset(this.spacePresetId) : undefined
    if (!preset || preset.kind !== 'reverb' || preset.reverbType !== type) {
      this.spacePresetId = null
    }
    this.reverbIrKey = ''
    this.applyLiveAudio()
    this.emit()
  }

  setFxLfo(kind: FxLfoKind, slot: number, patch: Partial<FxLfo>): void {
    if (!isFxLfoKind(kind)) return
    const i = clampLfoSlot(slot)
    const cur = this.fxLfos[kind][i] ?? defaultFxLfo()
    const next: FxLfo = { ...cur, ...patch }
    if (patch.target !== undefined) {
      next.target = patch.target && isFxLfoTarget(kind, patch.target) ? patch.target : null
      if (next.target) {
        next.phaseOriginSec = this.lfoTime()
        for (let s = 0; s < FX_LFO_SLOTS; s++) {
          const other = this.fxLfos[kind][s]
          if (s !== i && other?.target === next.target) other.target = null
        }
      }
    }
    this.fxLfos[kind][i] = next
    this.syncLfoClock()
    this.applyLiveAudio(patch.target !== undefined ? 0.06 : 0.02)
    if (cur.target === 'speed' || cur.target === 'pitch' || next.target === 'speed' || next.target === 'pitch') {
      this.syncRateVoices()
    }
    this.emit()
    if (anyFxLfoActive(this.fxLfos)) void this.ensureContext()
  }

  setFxLfoTarget(kind: FxLfoKind, slot: number, target: ParamId | null): void {
    this.setFxLfo(kind, slot, { target })
  }

  addFxLfo(kind: FxLfoKind): number | null {
    if (!isFxLfoKind(kind)) return null
    if (this.lfoShown[kind] >= FX_LFO_SLOTS) return null
    const slot = this.lfoShown[kind]
    this.fxLfos[kind][slot] = defaultFxLfo()
    this.lfoShown[kind] = slot + 1
    this.emit()
    return slot
  }

  applySpacePreset(preset: SpacePreset | string): void {
    const next = typeof preset === 'string' ? findSpacePreset(preset) : preset
    if (!next) return
    if (next.delayType) this.delayType = next.delayType
    if (next.reverbType) this.reverbType = next.reverbType
    this.spacePresetId = next.id
    const previous = {
      delayLinkLR: this.params.delayLinkLR,
      delayCorrelate: this.params.delayCorrelate,
      reverbCorrelate: this.params.reverbCorrelate,
    }
    const keys: ParamId[] = []
    for (const key of Object.keys(next.params) as ParamId[]) {
      const value = next.params[key]
      if (typeof value !== 'number') continue
      this.params[key] = applyParamValue(value, PARAMS[key])
      keys.push(key)
    }
    commitParamPatch(this.params, keys, previous)
    this.applyLiveAudio()
    const type = next.kind
    const mod = this.chain.find((m) => m.type === type)
    if (mod?.bypassed) this.setModuleBypass(mod.instanceId, false)
    else this.emit()
  }

  /** Cut delay/reverb recirculation and rebuild empty buffers. */
  killFx(which: 'delay' | 'reverb' | 'all' = 'all'): void {
    const keepLive = this.playing
    const ids = keepLive ? [this.selectedTrackId] : this.tracks.map((track) => track.id)
    for (const id of ids) this.withEditing(id, () => this.killRackFx(which, keepLive))
    if (keepLive) this.applyLiveAudio()
    this.emit()
  }

  private killRackFx(which: 'delay' | 'reverb' | 'all', keepLive: boolean): void {
    this.spaceLatched = !keepLive
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const kinds = which === 'all' ? (['delay', 'reverb'] as const) : ([which] as const)
    for (const slot of this.slots.values()) {
      if (!kinds.includes(slot.type as 'delay' | 'reverb')) continue
      if (slot.delayFx) silenceDelayGraph(slot.delayFx, now)
      if (slot.reverbFx) silenceReverbGraph(slot.reverbFx, now)
    }
    this.rebuildSpaceGraphs(kinds)
    if (!keepLive) {
      for (const slot of this.slots.values()) {
        if (!kinds.includes(slot.type as 'delay' | 'reverb')) continue
        setSmoothedAudioParam(slot.wet.gain, 0, now, 'gain')
      }
    }
  }

  setRegion(start: number, end: number): void {
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(start, end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    this.syncSelectedTrackRegion()
    this.syncPrepSelection(region.start, region.end)
    this.applyRegionChange()
    this.emit()
  }

  /** Keep the prep selection on the same loop the waveform highlight shows. */
  private syncPrepSelection(start: number, end: number): void {
    if (this.prepApplied || !(this.sourceDuration() > 0)) return
    this.prep = clampPrep(
      { ...this.prep, selectionStart: start, selectionEnd: end },
      this.sourceDuration(),
    )
  }

  private workingExportClock(bufferDuration: number): WorkingExportClock {
    return {
      bufferDuration,
      regionStart: this.params.start,
      regionEnd: this.params.end,
    }
  }

  private sourceDuration(): number {
    return this.sourceBuffer?.duration ?? 0
  }

  beginPrepGesture(): void {
    this.prepGestureOrigin = { ...this.prep }
  }

  setPrepLive(patch: Partial<SamplePrepState>, emit = false): void {
    this.prep = clampPrep({ ...this.prep, ...patch }, this.sourceDuration())
    if (emit) this.emit()
  }

  endPrepGesture(): void {
    const origin = this.prepGestureOrigin
    this.prepGestureOrigin = null
    if (!origin) return
    if (this.prep.fadeAuto) this.prep = applyAutoFades(this.prep)
    this.prepHistory = commit({ ...this.prepHistory, current: origin }, this.prep, prepEqual)
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  commitPrep(patch: Partial<SamplePrepState>): void {
    const next = clampPrep({ ...this.prep, ...patch }, this.sourceDuration())
    this.prepHistory = commit(this.prepHistory, next, prepEqual)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  undoPrep(): void {
    if (!canUndo(this.prepHistory)) return
    this.prepHistory = undoHistory(this.prepHistory)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  redoPrep(): void {
    if (!canRedo(this.prepHistory)) return
    this.prepHistory = redoHistory(this.prepHistory)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  private syncInstrumentRegionFromPrep(): void {
    if (this.prepApplied) return
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(
      this.prep.selectionStart,
      this.prep.selectionEnd,
      duration,
      Math.min(MIN_REGION, Math.max(PREP_MIN_REGION, duration)),
    )
    this.params.start = region.start
    this.params.end = region.end
    this.syncSelectedTrackRegion()
    this.applyRegionChange()
  }

  snapZero(which: 'start' | 'end'): void {
    const channels: Float32Array[] = []
    if (this.sourceBuffer) {
      for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
        channels.push(this.sourceBuffer.getChannelData(c))
      }
    }
    const sr = this.sourceBuffer?.sampleRate ?? 0
    const t = which === 'start' ? this.prep.selectionStart : this.prep.selectionEnd
    const hit = snapFindZero(channels, sr, t, ZERO_SEARCH_SEC, ZERO_WARN_SEC)
    this.zeroNotice = null
    if (!hit) {
      this.zeroNotice = 'No clean zero crossing nearby'
      this.emit()
      return
    }
    if (hit.far) {
      this.zeroNotice = `Nearest zero is ${Math.round(hit.distanceSec * 1000)} ms away — not moved`
      this.emit()
      return
    }
    const patch =
      which === 'start' ? { selectionStart: hit.seconds } : { selectionEnd: hit.seconds }
    const clean = hit.score < 0.08
    this.commitPrep(this.prep.fadeAuto ? applyAutoFades({ ...this.prep, ...patch }, clean) : patch)
  }

  trimToSelection(): void {
    this.commitPrep(
      applyAutoFades(
        {
          ...this.prep,
          windowStart: this.prep.selectionStart,
          windowEnd: this.prep.selectionEnd,
        },
        false,
      ),
    )
  }

  /** Crop the working sample to the play region and cover the whole new buffer. */
  async trimPlayRegion(): Promise<boolean> {
    await this.ensureContext()
    if (!this.ctx || !this.buffer) return false
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    const rendered = renderRegion(this.buffer, this.ctx, {
      start: this.params.start,
      end: this.params.end,
      reverse: false,
      fadeIn: 0,
      fadeOut: 0,
      fadeCurve: 'linear',
      gain: 1,
    })
    this.fileName = stemName(this.fileName) + '_trim.wav'
    this.applyLoadedBuffer(rendered, false, 'full', this.selectedTrackId)
    return true
  }

  detectSilenceMarkers(): void {
    const channels: Float32Array[] = []
    if (this.sourceBuffer) {
      for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
        channels.push(this.sourceBuffer.getChannelData(c))
      }
    }
    const sr = this.sourceBuffer?.sampleRate ?? 0
    this.silenceProposal = detectSilence(channels, sr)
    this.emit()
  }

  markSampleTransients(): void {
    const region = this.analysisFull()
    if (!region) {
      this.tempoNotice = 'Load a sample first.'
      this.emit()
      return
    }
    this.transients = detectTransients(region.samples, region.sampleRate, region.offsetSec)
    this.showTransients = this.transients.length > 0
    this.tempoNotice = this.transients.length
      ? `Marked ${this.transients.length} transients.`
      : 'No clear transients in this sample.'
    this.emit()
  }

  setShowTransients(show: boolean): void {
    this.showTransients = show
    if (show && !this.transients.length) this.markSampleTransients()
    else this.emit()
  }

  setTransientTime(index: number, time: number): void {
    if (!this.transients.length) return
    const duration = this.buffer?.duration ?? 0
    const { prev, next } = neighborTimes(this.transients, index, duration)
    const nextTime = clampWarpTime(time, prev, next)
    const copy = this.transients.slice()
    copy[index] = nextTime
    this.transients = copy
    this.emit()
  }

  commitTransientWarp(index: number, fromSec: number, toSec: number): void {
    const buffer = this.detachWorkingBuffer()
    if (!buffer || index < 0 || index >= this.transients.length) return
    const origin = this.transients.slice()
    origin[index] = fromSec
    const duration = buffer.duration
    const sr = buffer.sampleRate
    const { prev, next } = neighborTimes(origin, index, duration)
    const clamped = clampWarpTime(toSec, prev, next)
    if (Math.abs(clamped - fromSec) < 1e-4) {
      this.setTransientTime(index, clamped)
      return
    }
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const warped = warpChannel(buffer.getChannelData(ch), sr, fromSec, clamped, prev, next)
      buffer.getChannelData(ch).set(warped)
    }
    this.transients = remapWarpTimes(origin, fromSec, clamped, prev, next)
    this.showTransients = true
    this.afterBufferEditKeepTransients()
  }

  detectSampleTempo(): void {
    const region = this.analysisFull()
    if (!region) {
      this.tempoNotice = 'Load a sample first.'
      this.emit()
      return
    }
    const guess = estimateTempo(region.samples, region.sampleRate, region.offsetSec, region.durationSec)
    if (!guess) {
      this.tempoNotice = 'No steady tempo found in this sample.'
      this.emit()
      return
    }
    this.tempoSource = 'detected'
    this.writeTempo(guess.bpm)
    this.tempoNotice = `Detected ${guess.bpm.toFixed(1)} BPM.`
    this.emit()
  }

  tapSampleTempo(): void {
    const now = performance.now() / 1000
    const next = addTap(this.tapTempoState, now)
    this.tapTempoState = next.state
    if (next.bpm === null) {
      this.tempoNotice = `Tap ${next.state.times.length} — keep tapping the beat.`
      this.emit()
      return
    }
    this.tempoSource = 'tapped'
    this.writeTempo(next.bpm)
    this.tempoNotice = `Tap tempo ${next.bpm.toFixed(1)} BPM (${next.state.times.length} taps).`
    this.emit()
  }

  resetTapTempo(): void {
    this.tapTempoState = emptyTapTempo()
    this.tempoNotice = null
    this.emit()
  }

  private writeTempo(bpm: number): void {
    this.tempoWrite = 'engine'
    this.setParam('bpm', bpm)
    this.tempoWrite = 'ui'
  }

  private resetTempoAnalysis(resetBpm = false): void {
    this.transients = []
    this.showTransients = false
    this.tapTempoState = emptyTapTempo()
    this.tempoNotice = null
    this.tempoSource = 'default'
    if (resetBpm) this.params.bpm = PARAMS.bpm.defaultValue
  }

  private analysisFull(): {
    samples: Float32Array
    sampleRate: number
    offsetSec: number
    durationSec: number
  } | null {
    const buffer = this.buffer
    const mono = this.mono
    if (!buffer || !mono || !mono.length) return null
    const sr = buffer.sampleRate
    const maxSec = 45
    const maxN = Math.min(mono.length, Math.max(1, Math.floor(maxSec * sr)))
    const samples = maxN < mono.length ? mono.subarray(0, maxN) : mono
    return {
      samples,
      sampleRate: sr,
      offsetSec: 0,
      durationSec: samples.length / Math.max(1, sr),
    }
  }

  applySilenceProposal(): void {
    if (!this.silenceProposal) return
    const { startSec, endSec } = this.silenceProposal
    this.silenceProposal = null
    this.commitPrep(
      applyAutoFades(
        {
          ...this.prep,
          windowStart: startSec,
          windowEnd: endSec,
          selectionStart: startSec,
          selectionEnd: endSec,
        },
        false,
      ),
    )
  }

  dismissSilenceProposal(): void {
    this.silenceProposal = null
    this.emit()
  }

  clearZeroNotice(): void {
    this.zeroNotice = null
    this.emit()
  }

  setPreviewLoop(loop: boolean): void {
    this.previewLoop = loop
    if (this.previewPlaying) void this.playSelection()
    else this.emit()
  }

  async playSelection(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.sourceBuffer) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer || !this.previewGain) return
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = this.previewLoop
    src.connect(this.previewGain)
    src.start(0)
    src.onended = () => {
      if (this.previewSource === src) this.stopPreview()
    }
    this.previewSource = src
    this.previewPlaying = true
    this.emit()
  }

  async playAudition(edge: 'start' | 'end'): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.sourceBuffer || !this.previewGain) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer) return
    const windowSec = Math.min(0.35, Math.max(0.08, buffer.duration * 0.2))
    const offset = edge === 'start' ? 0 : Math.max(0, buffer.duration - windowSec)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.previewGain)
    src.start(0, offset, windowSec)
    src.onended = () => {
      if (this.previewSource === src) this.stopPreview()
    }
    this.previewSource = src
    this.previewPlaying = true
    this.emit()
  }

  stopPreview(): void {
    if (this.previewSource) {
      try {
        this.previewSource.onended = null
        this.previewSource.stop()
      } catch {
        /* already stopped */
      }
      this.previewSource.disconnect()
      this.previewSource = null
    }
    const was = this.previewPlaying
    this.previewPlaying = false
    if (was) this.emit()
  }

  toggleSelectionPlayback(): void {
    if (this.previewPlaying) this.stopPreview()
    else void this.playSelection()
  }

  saveVariation(name?: string): void {
    const label =
      name?.trim() ||
      this.prep.clipName.trim() ||
      nextVariationName(
        this.fileName,
        this.variations.map((v) => v.name),
      )
    this.variationSeq += 1
    const id = `clip-${this.variationSeq}`
    const prep = { ...this.prep, clipName: label }
    this.variations = [...this.variations, { id, name: label, prep }]
    this.prep = prep
    this.emit()
  }

  loadVariation(id: string): void {
    const found = this.variations.find((v) => v.id === id)
    if (!found) return
    const next = clampPrep({ ...found.prep }, this.sourceDuration())
    this.prepHistory = commit(this.prepHistory, next, prepEqual)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  enterSampleEdit(): void {
    if (!this.sourceBuffer) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    this.buffer = this.sourceBuffer
    this.reversed = this.buildReversed(this.sourceBuffer)
    this.mono = this.sourceMono
    this.prepApplied = false
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  async exportWav(
    settings: ExportSettings,
    hooks?: { onProgress?: (phase: ExportProgressPhase) => void },
  ): Promise<{ filename: string; blob: Blob; duration: number } | null> {
    return this.occupyExport(() => this.runExportWav(settings, hooks?.onProgress))
  }

  /** Offline bounce used by the simple editor. Shares the export lock. */
  renderAudiblePcm(
    source: Pcm,
    timelineStart = 0,
  ): Promise<Pcm> {
    return this.occupyExport(() =>
      renderProcessedPcm(source, this.processingSnapshot(), { timelineStart }),
    )
  }

  private async occupyExport<T>(work: () => Promise<T>): Promise<T> {
    if (this.exportBusy) throw new Error('Export is already running')
    this.exportBusy = true
    try {
      return await work()
    } finally {
      this.exportBusy = false
    }
  }

  private async runExportWav(
    settings: ExportSettings,
    onProgress?: (phase: ExportProgressPhase) => void,
  ): Promise<{ filename: string; blob: Blob; duration: number } | null> {
    if (this.spectral.enabled) this.ensureSpectral(true)
    // Selected-track bounce. Master-mix export sums track buffers later; see plannedExportTarget.
    const buffer = this.audibleForwardBuffer() ?? this.sourceBuffer
    if (!buffer) return null
    const scope = settings.scope ?? 'project'
    const clock = this.workingExportClock(buffer.duration)
    if (scope === 'selection' && !selectionExportAvailable(this.prep, clock)) return null
    onProgress?.('preparing')
    const pcm = await renderExportPcm(
      clonePcmFromBuffer(buffer),
      prepForWorkingExport(this.prep, scope, clock),
      { ...settings, scope },
      this.processingSnapshot(),
      { onProgress },
    )
    onProgress?.('encoding')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'function') {
        setTimeout(resolve, 0)
        return
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    const bytes = encodeWav(pcm, settings.bitDepth)
    traceExport('ENCODE COMPLETE', { bytes: bytes.byteLength })
    const partial = scope === 'selection' || isTrimmed(this.prep, this.sourceDuration())
    const filename = settings.name || exportFileName(this.fileName, partial, this.prep.clipName)
    const blob = new Blob([bytes], { type: 'audio/wav' })
    traceExport('FILE READY', { filename, bytes: blob.size })
    traceExport('EXPORT COMPLETE', { duration: pcmDuration(pcm) })
    return {
      filename: filename.endsWith('.wav') ? filename : `${filename}.wav`,
      blob,
      duration: pcmDuration(pcm),
    }
  }

  /** Chain, parameters, automation, and modulation the offline render must match. */
  processingSnapshot(): ProcessingSnapshot {
    const eqById: Record<string, ExportEqState> = {}
    for (const [id, st] of this.eqById) {
      eqById[id] = {
        bands: st.bands.map((band) => ({ ...band })),
        bandsL: st.bandsL.map((band) => ({ ...band })),
        bandsR: st.bandsR.map((band) => ({ ...band })),
        comb: { ...st.comb },
      }
    }
    const primary = this.primaryEqId()
    if (!eqById[primary]) {
      eqById[primary] = {
        bands: this.eqBands.map((band) => ({ ...band })),
        bandsL: [],
        bandsR: [],
        comb: { ...this.comb },
      }
    }
    return {
      chain: this.chain.map((mod) => ({ ...mod })),
      params: { ...this.params },
      automation: cloneAutomation(this.automation),
      fxLfos: cloneFxLfos(this.fxLfos),
      eqById,
      eqChannelMode: this.eqChannelMode,
      primaryEqId: primary,
      distortionType: this.distortionType,
      distortionNoiseKind: this.distortionNoiseKind,
      delayType: this.delayType,
      reverbType: this.reverbType,
      voiceGain: leadVoiceMixGain(this.tracks, this.selectedTrackId),
      masterGain: outputMixGain(this.masterMix),
      trackMix: this.tracks.map((track) => ({
        id: track.id,
        mix: track.mix,
        pan: track.pan,
        midDb: track.midDb,
        sideDb: track.sideDb,
        muted: track.muted,
        solo: track.solo,
        channels: track.channelCount,
      })),
      noiseMuted: this.noiseMuted,
      noiseFadeTau: this.noiseFadeTau,
      randomOffsets: { ...this.randomOffsets },
      trackRacks: this.serializedRacks(),
    }
  }

  renderCurrent(options?: RenderOptions): Pcm {
    if (!this.sourceBuffer) return { sampleRate: 44100, channels: [new Float32Array()] }
    return renderPrep(
      clonePcmFromBuffer(this.sourceBuffer),
      this.prep,
      options ?? defaultRenderOptions(this.prep),
    )
  }

  private pcmToBuffer(pcm: Pcm): AudioBuffer | null {
    if (!this.ctx) return null
    const frames = pcm.channels[0]?.length ?? 0
    if (frames < 1) return null
    const buffer = this.ctx.createBuffer(Math.max(1, pcm.channels.length), frames, pcm.sampleRate)
    for (let c = 0; c < pcm.channels.length; c++) {
      buffer.getChannelData(c).set(pcm.channels[c] ?? new Float32Array(frames))
    }
    return buffer
  }

  snapToZero(which: 'start' | 'end'): void {
    if (!this.buffer) return
    const time = which === 'start' ? this.params.start : this.params.end
    const channels: Float32Array[] = []
    for (let c = 0; c < this.buffer.numberOfChannels; c++) {
      channels.push(this.buffer.getChannelData(c))
    }
    const idx = secondsToIndex(time, this.buffer.sampleRate, this.buffer.length)
    const radius = Math.round(this.buffer.sampleRate * 0.08)
    const found = findZeroCrossing(channels, idx, radius)
    this.setParam(which, indexToSeconds(found, this.buffer.sampleRate))
  }

  private applyRegionChange(): void {
    if (this.playing && this.engineMode === 'playback') this.retargetPlayingRegion()
    else this.applyLiveAudio()
  }

  /** Keep the playing voice on the same fragment the playhead shows after a loop edit. */
  private retargetPlayingRegion(): void {
    if (!this.playing || this.engineMode !== 'playback' || !this.ctx) {
      this.applyLiveAudio()
      return
    }
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.playbackRegion(duration)
    const reverse = this.direction === 'reverse'
    const shown = this.getPlayheadSeconds()
    const head = this.loop
      ? wrapPlayheadIntoRegion(shown, start, end, MIN_REGION)
      : snapPlayheadToRegion(shown, start, end, reverse)
    const stretchSeed =
      this.schedulerId !== 0
        ? {
            speed: this.stretchSpeed,
            pitch: this.stretchPitch,
            windowSpeed: this.windowSpeed,
            windowPitch: this.windowPitch,
          }
        : null
    this.playOffset = head
    this.playCtxTime = this.ctx.currentTime
    this.stretchHead = head
    this.filterEnvOrigin = this.filterClockSec
    if (this.usingProjectTransport) {
      this.playOffset = shown
      this.applyLiveAudio()
      return
    }
    this.stopVoices()
    this.startRegionPlayback(stretchSeed)
    if (this.loadedTrackCount() > 1) this.startSyncedCompanions(this.ctx.currentTime, this.playOffset)
    this.applyLiveAudio()
  }

  setAutomationParam(id: ParamId): void {
    const next = selectAutomationParam(this.automation, id)
    if (next === this.automation) return
    this.automation = next
    this.emit()
  }

  /**
   * Arms a parameter for editing. A new lane gets a flat envelope at the
   * current knob value so playback stays put until the curve is edited.
   * An existing lane is only selected.
   * With a sample loaded, the envelope spans that buffer. Before a sample
   * exists, it spans the default one-second region so the lane is real
   * and a later file still holds the stored value.
   */
  armAutomation(id: ParamId): void {
    const loaded = this.buffer?.duration ?? 0
    const duration = loaded > 0 ? loaded : Math.max(this.params.end, 1)
    const normalized = toNormalized(this.params[id], PARAMS[id])
    const next = ensureAutomationLane(this.automation, id, normalized, duration)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  addAutomationNode(time: number, value: number): string | null {
    const duration = this.buffer?.duration ?? 0
    const inserted = insertAutomationNode(this.automation, time, value, duration)
    if (!inserted) return null
    this.automation = inserted.doc
    this.afterAutomationEdit()
    return inserted.id
  }

  /** Live drag. History is committed once by the caller when the pointer lifts. */
  moveAutomationNode(id: string, time: number, value: number): void {
    const duration = this.buffer?.duration ?? 0
    const next = relocateAutomationNode(this.automation, id, time, value, duration)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  deleteAutomationNode(id: string): void {
    const next = removeAutomationNode(this.automation, id)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  /** Removes one parameter's envelope. The effect and its manual value stay. */
  removeAutomation(paramId: ParamId): void {
    const next = removeAutomationLane(this.automation, paramId)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  setAutomationCurve(id: string, curve: AutomationCurve): void {
    const next = updateAutomationCurve(this.automation, id, curve)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  /** Line color only. The envelope and the audio graph stay as they are. */
  setAutomationColor(paramId: ParamId, colorIndex: number): void {
    const next = setAutomationLaneColor(this.automation, paramId, colorIndex)
    if (next === this.automation) return
    this.automation = next
    this.emit()
  }

  /** Live tension drag. History is committed once by the caller when the pointer lifts. */
  setAutomationTension(id: string, tension: number): void {
    const next = updateAutomationTension(this.automation, id, tension)
    if (next === this.automation) return
    this.automation = next
    this.afterAutomationEdit()
  }

  replaceAutomation(doc: AutomationDocument): void {
    const next = parseAutomation(doc)
    this.automation = next
    this.afterAutomationEdit()
  }

  private afterAutomationEdit(): void {
    this.syncLfoClock()
    if (this.ctx) this.applyLiveAudio(0.02)
    this.emit()
  }

  resetParam(id: ParamId): void {
    if (id === 'start') {
      this.setParam('start', 0)
      return
    }
    if (id === 'end') {
      this.setParam('end', this.buffer?.duration ?? 1)
      return
    }
    this.setParam(id, PARAMS[id].defaultValue)
  }

  resetAll(): void {
    const duration = this.buffer?.duration ?? 0
    for (const rack of this.racks.values()) {
      if (rack.reverbIrTimer) window.clearTimeout(rack.reverbIrTimer)
    }
    this.racks.clear()
    this.seededRandom = true
    const region = defaultPlayRegion(duration, MIN_REGION)
    this.tracks = defaultTracks(region.start, region.end)
    this.selectedTrackId = this.tracks[0]!.id
    this.params = defaultParamValues()
    this.params.start = region.start
    this.params.end = region.end
    this.engineMode = 'playback'
    this.direction = 'forward'
    this.filterType = 'off'
    this.delayType = 'digital'
    this.reverbType = 'hall'
    this.distortionType = 'saturation'
    this.distortionNoiseKind = 'white'
    this.fxLfos = defaultFxLfos()
    this.automation = defaultAutomation()
    this.randomDoc = defaultRandomDocument()
    this.randomOffsets = {}
    this.randomRuntime = defaultRandomRuntime()
    this.randomBudgetLimited = false
    this.persistRandom()
    this.lfoHold = defaultLfoHold()
    this.lfoShown = defaultLfoShown()
    this.lfoClockSec = 0
    this.lfoWallMs = 0
    this.filterClockSec = 0
    this.filterWallMs = 0
    this.reverbIrKey = ''
    this.eqById = new Map()
    this.eqBands = defaultEqBands()
    this.comb = defaultCombFilter()
    this.eqListen = 'sample'
    this.stopNoise()
    this.noiseMuted = false
    this.noiseFadeTau = NOISE_CUT_TAU_SEC
    this.chain = defaultChain()
    this.masterMix = 100
    this.trackBuffers.clear()
    this.clearTrackStrips()
    this.seedEqStates()
    this.muted = false
    this.syncLfoClock()
    this.rebuildAllGraphs()
    this.applyLiveAudio()
    this.emit()
  }

  reorderModules(fromIndex: number, toIndex: number): void {
    const next = reorderChain(this.chain, fromIndex, toIndex)
    if (next === this.chain || modulesEqual(next, this.chain)) return
    this.chain = next
    void this.rebuildGraph()
  }

  insertModule(type: ModuleType, afterIndex: number): string | null {
    const next = insertChainModule(this.chain, type, afterIndex)
    if (modulesEqual(next, this.chain)) return null
    const added = next.find((mod) => !this.chain.some((m) => m.instanceId === mod.instanceId))
    this.chain = next
    if (added?.type === 'eq') this.eqById.set(added.instanceId, cloneEqState())
    if (added?.type === 'grain') this.engineMode = 'grain'
    this.mountAddedSlots(added ? [added] : [])
    this.emit()
    return added?.instanceId ?? null
  }

  removeModule(instanceId: string): void {
    const next = removeChainModule(this.chain, instanceId)
    if (modulesEqual(next, this.chain)) return
    this.chain = next
    this.eqById.delete(instanceId)
    if (!this.chain.some((m) => m.type === 'grain' && !m.bypassed)) this.engineMode = 'playback'
    this.syncPrimaryEq()
    if (this.playing && this.engineMode === 'grain') void this.play()
    void this.rebuildGraph()
  }

  /** Select the first empty slot. Does not copy another track's buffer. */
  addTrack(): string | null {
    const empty = this.tracks.find((track) => !this.trackBuffers.has(track.id))
    if (!empty) return null
    this.selectTrack(empty.id)
    return empty.id
  }

  duplicateTrack(id: string): string | null {
    const source = this.tracks.find((track) => track.id === id)
    const empty = this.tracks.find((track) => track.id !== id && !this.trackBuffers.has(track.id))
    if (!source || !empty) return null
    const shared = this.trackBuffers.get(id) ?? (id === this.selectedTrackId ? this.buffer : null)
    if (shared) this.trackBuffers.set(empty.id, shared)
    this.racks.set(empty.id, cloneTrackRack(this.ensureRack(id)))
    this.tracks = patchTrack(this.tracks, empty.id, {
      name: source.nameLocked ? `${source.name}`.slice(0, 24) : source.name,
      nameLocked: false,
      mix: source.mix,
      fileName: source.fileName,
      channelCount: shared?.numberOfChannels ?? source.channelCount,
      start: source.start,
      end: source.end,
      stereoDisplay: 'combined',
      loop: source.loop,
      direction: source.direction,
      pan: source.pan,
      midDb: source.midDb,
      sideDb: source.sideDb,
    })
    if (this.ctx) {
      this.withEditing(empty.id, () => this.syncTrackSlots())
      this.ensureTrackStrips(false)
      this.connectTrack(empty.id)
    }
    this.bufferRev++
    this.emit()
    return empty.id
  }

  removeTrack(id: string): void {
    this.clearTrack(id)
  }

  clearTrack(id: string): void {
    if (!this.tracks.some((track) => track.id === id)) return
    this.resetTrackRack(id)
    if (this.ctx) {
      this.withEditing(id, () => {
        for (const slot of this.slots.values()) this.releaseSlot(slot)
        this.slots.clear()
        this.syncTrackSlots()
      })
      this.connectTrack(id)
      if (id === this.selectedTrackId) this.retargetMonitorTaps()
    }
    const wasPlaying = this.playing
    const playhead = wasPlaying ? this.getPlayheadSeconds() : this.playOffset
    this.trackBuffers.delete(id)
    this.tracks = clearTrackAudio(this.tracks, id)
    if (id === this.selectedTrackId) {
      this.buffer = null
      this.sourceBuffer = null
      this.reversed = null
      this.mono = null
      this.fileName = ''
      this.params.start = 0
      this.params.end = 0
    }
    this.bufferRev++
    const remaining = this.loadedTrackCount()
    if (remaining === 0) {
      if (wasPlaying) this.stop()
      else this.emit()
      return
    }
    if (wasPlaying && this.ctx && this.usingProjectTransport && remaining > 1) {
      this.playOffset = playhead
      this.startProjectVoices(this.ctx.currentTime, playhead, true)
      this.emit()
      return
    }
    if (wasPlaying) {
      this.playOffset = playhead
      void this.play()
      return
    }
    this.emit()
  }

  reorderTracks(from: number, to: number): void {
    const next = moveTrack(this.tracks, from, to)
    if (tracksEqual(next, this.tracks)) return
    this.tracks = next
    this.emit()
  }

  setTrack(id: string, patch: Partial<Omit<MixTrack, 'id'>>): void {
    const next = patchTrack(this.tracks, id, patch)
    if (tracksEqual(next, this.tracks)) return
    this.tracks = next
    const track = this.tracks.find((item) => item.id === id)
    if (id === this.selectedTrackId && (patch.start != null || patch.end != null)) {
      if (track && !this.usingProjectTransport) this.applyTrackRegion(track)
      else if (track) {
        this.params.start = track.start
        this.params.end = track.end
      }
    }
    if (id === this.selectedTrackId && patch.direction) this.direction = patch.direction
    if (track && (patch.mix != null || patch.pan != null || patch.midDb != null || patch.sideDb != null)) {
      this.withEditing(id, () => {
        if (patch.mix != null) {
          this.forgetRandomOffset('mixVolume')
          this.params.mixVolume = track.mix
        }
        if (patch.pan != null) {
          this.forgetRandomOffset('mixPan')
          this.params.mixPan = track.pan
        }
        if (patch.midDb != null) {
          this.forgetRandomOffset('mixMid')
          this.params.mixMid = track.midDb
        }
        if (patch.sideDb != null) {
          this.forgetRandomOffset('mixSide')
          this.params.mixSide = track.sideDb
        }
      })
    }
    this.applyLiveAudio(0.02)
    if (
      this.usingProjectTransport &&
      this.playing &&
      (patch.loop != null || patch.direction != null)
    ) {
      this.rescheduleTrack(id)
    }
    this.emit()
  }

  /**
   * Apply a loop-region drag. `commit` replaces only this track's source.
   * Moves in between update the model and the waveform without restarting audio.
   */
  setTrackLoop(id: string, loopStart: number, loopEnd: number, commit: boolean): void {
    this.setTrack(id, { loopStart, loopEnd })
    if (commit) this.rescheduleTrack(id)
  }

  selectTrack(id: string): void {
    const track = this.tracks.find((item) => item.id === id)
    if (!track || track.id === this.selectedTrackId) return
    this.syncSelectedTrackRegion()
    const playhead = this.playing ? this.getPlayheadSeconds() : this.playOffset
    this.selectedTrackId = track.id
    this.direction = track.direction
    this.bindWorkingFromTrack(track.id)
    const duration = this.trackBuffers.get(track.id)?.duration ?? 0
    if (duration > 0) {
      const region = clampRegion(track.start, track.end, duration, MIN_REGION)
      this.params.start = region.start
      this.params.end = region.end
      this.tracks = writeTrackRegion(this.tracks, track.id, region.start, region.end)
    }
    this.playOffset = playhead
    this.fileName = track.fileName ?? ''
    if (this.ctx) this.retargetMonitorTaps()
    this.emit()
  }

  setMasterMix(mix: number): void {
    const next = clampMix(mix)
    if (next === this.masterMix) return
    this.masterMix = next
    this.applyLiveAudio(0.01)
    this.emit()
  }

  setModuleBypass(instanceId: string, bypassed: boolean): void {
    this.chain = setBypassed(this.chain, instanceId, bypassed)
    const grain = this.chain.find((m) => m.instanceId === instanceId && m.type === 'grain')
    if (grain) this.engineMode = grain.bypassed ? 'playback' : 'grain'
    this.applyBypassRamps()
    if (grain && this.playing) void this.play()
    else this.emit()
  }

  toggleModuleBypass(instanceId: string): void {
    const mod = this.chain.find((m) => m.instanceId === instanceId)
    if (!mod) return
    if (mod.bypassed && mod.type === 'reverb') {
      const previous = this.params.reverbWet
      this.params.reverbWet = mixWhenEnablingReverb(this.params.reverbWet)
      commitParamEdit(this.params, 'reverbWet', previous)
    }
    this.setModuleBypass(instanceId, !mod.bypassed)
  }

  setEqBand(index: number, patch: Partial<EqBand>, instanceId?: string): void {
    const ids = EQ_BAND_LFO_IDS[index]
    if (ids) {
      if (patch.frequency != null) this.forgetRandomOffset(ids.freq)
      if (patch.gain != null) this.forgetRandomOffset(ids.gain)
      if (patch.q != null) this.forgetRandomOffset(ids.q)
    }
    const id = instanceId ?? this.primaryEqId()
    const st = this.eqState(id)
    const current = this.eqEditBands(st)
    const band = current[index]
    if (!band) return
    const removing = band.type !== 'off' && patch.type === 'off'
    const nextBand = initializeCreatedEqBand(band, patch, removing ? false : eqBandHasLfo(this.fxLfos, index))
    if (removing) nextBand.lfoExpanded = false
    if (eqBandUiEqual(band, nextBand)) return
    const next = current.map((item, i) => (i === index ? nextBand : item))
    this.writeEqEditBands(st, next)
    this.eqById.set(id, st)
    this.syncPrimaryEq()
    if (removing) this.clearEqBandModulation(index)
    if (eqBandAudioEqual(band, nextBand)) {
      this.emit()
      return
    }
    this.syncEqLfoParams(id)
    this.filterType = this.eqBands[0]?.type ?? 'off'
    this.applyEq(0.03)
    const mod = this.chain.find((m) => m.instanceId === id)
    const bypass = eqBypassAfterBandEdit(Boolean(mod?.bypassed), next)
    if (mod && mod.bypassed !== bypass) {
      this.setModuleBypass(id, bypass)
      this.applyEq(0.03)
      return
    }
    this.emit()
  }

  addEqBand(instanceId?: string): number | null {
    const id = instanceId ?? this.primaryEqId()
    const st = this.eqState(id)
    const current = this.eqEditBands(st)
    if (current.length >= EQ_MAX_BANDS) return null
    const index = current.length
    this.writeEqEditBands(st, [...current, defaultEqBandAt(index)])
    this.eqById.set(id, st)
    const slot = this.slots.get(id)
    if (slot?.eq && this.ctx) growEqGraph(this.ctx, slot.eq, this.eqEditBands(st).length)
    this.syncPrimaryEq()
    this.syncEqLfoParams(id)
    this.applyEq(0.03)
    this.emit()
    return index
  }

  /**
   * Create one EQ strip at the end of the active sequence.
   * The ADD control is not a band and is not used as an insertion index.
   */
  createEqStrip(type: EqFilterType, instanceId?: string): number | null {
    if (type === 'off') return null
    const id = instanceId ?? this.primaryEqId()
    if (!this.chain.some((mod) => mod.instanceId === id && mod.type === 'eq')) return null
    const current = this.eqEditBands(this.eqState(id))
    const plan = planEqBandInsert(current)
    if (!plan) return null
    let index = plan.kind === 'use' ? plan.index : this.addEqBand(id)
    if (index == null) return null
    const slope = type === 'highpass' || type === 'lowpass' ? 48 : undefined
    this.setEqBand(index, slope ? { type, slope } : { type }, id)
    return index
  }

  setComb(patch: Partial<CombFilterState>, instanceId?: string): void {
    const id = instanceId ?? this.primaryEqId()
    const st = this.eqState(id)
    st.comb = { ...st.comb, ...patch }
    this.eqById.set(id, st)
    this.syncPrimaryEq()
    this.syncEqLfoParams(id)
    this.applyEq(0.03)
    this.emit()
  }

  setEqListen(mode: EqListenMode): void {
    if (this.eqListen === mode) return
    this.eqListen = mode
    void this.ensureContext().then(() => {
      this.syncEqListen()
      this.retargetMonitorTaps()
      this.applyBypassRamps(0.02)
      this.emit()
    })
  }

  async startMicRecord(): Promise<void> {
    if (this.recording) return
    this.recordError = null
    this.emit()

    // iOS Safari / standalone PWA invalidate user-activation across awaits.
    // Request the mic first, before ensureContext() yields the gesture.
    if (!navigator.mediaDevices?.getUserMedia) {
      this.recordError = 'Microphone API is unavailable in this browser.'
      this.emit()
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      this.recordError = micAccessMessage(err)
      this.emit()
      return
    }

    try {
      await this.ensureContext()
      if (!this.ctx) {
        stream.getTracks().forEach((t) => t.stop())
        this.recordError = 'Audio engine failed to start.'
        this.emit()
        return
      }
      if (this.playing) this.pause()
      this.recording = true
      this.rampSafety(this.playbackSafetyGain())
      // Prefer speaker playback while the mic is open (iOS play-and-record).
      setPlayAndRecordAudioSession()
      this.recStream = stream
    this.recChunks = []
    this.recPreview = []
      const src = this.ctx.createMediaStreamSource(stream)
      const proc = this.ctx.createScriptProcessor(4096, 1, 1)
      const mute = this.ctx.createGain()
      mute.gain.value = this.recMonitor
      proc.onaudioprocess = (event) => {
        if (!this.recording) return
        const block = new Float32Array(event.inputBuffer.getChannelData(0))
        this.recChunks.push(block)
        const hop = 256
        for (let i = 0; i < block.length; i += hop) {
          let peak = 0
          const end = Math.min(block.length, i + hop)
          for (let s = i; s < end; s++) peak = Math.max(peak, Math.abs(block[s] ?? 0))
          this.recPreview.push(peak)
        }
        if (this.recPreview.length % 8 === 0) this.emit()
      }
      src.connect(proc)
      proc.connect(mute)
      mute.connect(this.ctx.destination)
      this.recSource = src
      this.recProc = proc
      this.recMute = mute
      this.emit()
    } catch {
      this.recording = false
      stream.getTracks().forEach((t) => t.stop())
      this.recordError = 'Microphone opened, but recording could not start.'
      this.rampSafety(this.playbackSafetyGain())
      this.emit()
    }
  }

  stopMicRecord(): void {
    if (!this.recording && !this.recStream) return
    this.recording = false
    const chunks = this.recChunks
    this.recChunks = []
    this.recPreview = []
    try {
      this.recProc?.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      this.recSource?.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      this.recMute?.disconnect()
    } catch {
      /* already disconnected */
    }
    this.recProc = null
    this.recSource = null
    this.recMute = null
    this.recStream?.getTracks().forEach((t) => t.stop())
    this.recStream = null
    setPlaybackAudioSession()
    this.rampSafety(this.playbackSafetyGain())
    if (!this.ctx || chunks.length === 0) {
      this.emit()
      return
    }
    let total = 0
    for (const c of chunks) total += c.length
    if (total < this.ctx.sampleRate * 0.05) {
      this.recordError = 'Recording was too short.'
      this.emit()
      return
    }
    const buffer = this.ctx.createBuffer(1, total, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let offset = 0
    for (const c of chunks) {
      data.set(c, offset)
      offset += c.length
    }
    this.stopVoices()
    this.playing = false
    this.fileName = `mic-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.wav`
    this.applyLoadedBuffer(buffer, true, 'inset', this.selectedTrackId)
  }

  toPreset(): PresetV1 {
    return {
      instrument: 'field',
      version: 2,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      reverse: this.direction === 'reverse',
      filterType: this.filterType,
      params: { ...this.params },
      chain: this.chain.map((m) => ({ ...m })),
      eqBands: this.eqBands.map((b) => ({ ...b })),
      comb: { ...this.comb },
      muted: this.muted,
      delayType: this.delayType,
      reverbType: this.reverbType,
      distortionType: this.distortionType,
      distortionNoiseKind: this.distortionNoiseKind,
      fxLfos: cloneFxLfos(this.fxLfos),
      automation: cloneAutomation(this.automation),
      random: cloneRandomDocument(this.randomDoc),
      tracks: cloneTracks(this.tracks),
      selectedTrackId: this.selectedTrackId,
      masterMix: this.masterMix,
      trackRacks: this.serializedRacks(),
    }
  }

  private serializedRacks(): Record<string, ReturnType<typeof serializeTrackRack>> {
    const out: Record<string, ReturnType<typeof serializeTrackRack>> = {}
    for (const track of this.tracks) out[track.id] = serializeTrackRack(this.ensureRack(track.id))
    return out
  }

  /** Older projects stored mixer levels on the track only. */
  private adoptMixerBases(): void {
    for (const track of this.tracks) {
      const rack = this.ensureRack(track.id)
      rack.params.mixVolume = track.mix
      rack.params.mixPan = track.pan
      rack.params.mixMid = track.midDb
      rack.params.mixSide = track.sideDb
    }
  }

  private adoptPresetRacks(preset: PresetV1, legacyHost: string): void {
    const parsed = parseTrackRacks(preset.trackRacks)
    for (const rack of this.racks.values()) {
      if (rack.reverbIrTimer) window.clearTimeout(rack.reverbIrTimer)
    }
    if (parsed) {
      this.racks.clear()
      this.seededRandom = true
      for (const [id, rack] of Object.entries(parsed)) this.racks.set(id, rack)
    } else {
      const host = this.ensureRack(legacyHost)
      this.racks.clear()
      this.seededRandom = true
      this.racks.set(this.selectedTrackId, host)
    }
    for (const track of this.tracks) this.ensureRack(track.id)
    this.broadcastShared(this.ensureRack(this.selectedTrackId).params)
  }

  applyPreset(preset: PresetV1): void {
    const legacyHost = this.selectedTrackId
    this.loop = preset.loop
    this.engineMode = preset.engineMode
    this.direction = preset.direction ?? (preset.reverse ? 'reverse' : 'forward')
    this.filterType = preset.filterType ?? 'off'
    this.muted = preset.muted ?? false
    this.delayType = parseDelayType(preset.delayType) ?? 'digital'
    this.reverbType = parseReverbType(preset.reverbType) ?? 'hall'
    this.distortionType = parseDistortionType(preset.distortionType) ?? 'saturation'
    this.distortionNoiseKind = parseDistortionNoiseKind(preset.distortionNoiseKind) ?? 'white'
    this.noiseMuted = false
    this.noiseFadeTau = NOISE_CUT_TAU_SEC
    this.fxLfos = parseFxLfos(preset.fxLfos)
    this.automation = parseAutomation(preset.automation)
    this.randomDoc = parseRandomDocument(preset.random)
    this.randomOffsets = {}
    this.randomRuntime = defaultRandomRuntime()
    this.randomBudgetLimited = false
    if (this.randomDoc.chaos) this.randomWarned = true
    this.persistRandom()
    this.lfoHold = defaultLfoHold()
    this.lfoShown = lfoShownFromMap(this.fxLfos)
    this.reverbIrKey = ''
    const incoming = { ...preset.params }
    if ((preset.version ?? 1) < 2) {
      if (typeof incoming.stretchInterp === 'number') {
        incoming.stretchInterp = legacyDensityToGrainOverlap(incoming.stretchInterp)
      }
      const on = typeof incoming.stretchInterpOn === 'number' ? incoming.stretchInterpOn : 0
      const algo = typeof incoming.stretchInterpAlgo === 'number' ? incoming.stretchInterpAlgo : 2
      incoming.stretchInterpAlgo = legacyInterpToQualityIndex(algo, on)
      incoming.stretchInterpOn = 1
    }
    const migrated = migrateSpaceParams(incoming)
    for (const id of Object.keys(this.params) as ParamId[]) {
      const value = migrated[id]
      if (typeof value === 'number') {
        this.params[id] = value
      }
    }
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(this.params.start, this.params.end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    const parsedChain = parseChain(preset.chain)
    if (parsedChain) this.chain = parsedChain
    const parsedEq = parseEqBands(preset.eqBands)
    if (parsedEq) this.eqBands = parsedEq
    else if (this.filterType !== 'off') {
      const first = this.eqBands[0]
      if (first) {
        this.eqBands = [
          {
            ...first,
            type: this.filterType as EqFilterType,
            frequency: this.params.filterCutoff,
            q: this.params.filterReso,
          },
          ...this.eqBands.slice(1),
        ]
      }
    }
    const parsedComb = parseCombFilter(preset.comb)
    if (parsedComb) this.comb = parsedComb
    const savedBands = this.eqBands
    const savedComb = this.comb
    this.eqById = new Map()
    this.seedEqStates()
    this.eqById.set(this.primaryEqId(), cloneEqState(savedBands, savedComb))
    this.syncPrimaryEq()
    this.syncEqLfoParams(this.primaryEqId())
    this.syncLfoClock()
    const parsedTracks = parseTracks(preset.tracks ?? preset.mixLayers)
    this.tracks = ensureTrackSlots(parsedTracks ?? defaultTracks(region.start, region.end), region.start, region.end)
    this.hydrateTrackRegions(region.start, region.end)
    const wanted = typeof preset.selectedTrackId === 'string' ? preset.selectedTrackId : this.tracks[0]!.id
    this.selectedTrackId = this.tracks.some((track) => track.id === wanted) ? wanted : this.tracks[0]!.id
    this.adoptPresetRacks(preset, legacyHost)
    this.adoptMixerBases()
    if (typeof preset.masterMix === 'number') this.masterMix = clampMix(preset.masterMix)
    const selected = selectedTrack(this.tracks, this.selectedTrackId)
    if (selected && selected.end > selected.start) {
      const trackRegion = clampRegion(selected.start, selected.end, duration, MIN_REGION)
      this.params.start = trackRegion.start
      this.params.end = trackRegion.end
    }
    this.rebuildAllGraphs()
    if (this.playing) void this.play()
  }

  /** Bake the current edit into the working buffer and load it as the instrument sample. */
  async useAsSample(edit?: {
    fadeIn: number
    fadeOut: number
    fadeCurve: FadeCurve
    fadeInBend?: number
    fadeOutBend?: number
    reverse: boolean
    normalize: boolean
  }): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    if (edit && this.buffer) {
      const peak = peakOfBuffer(this.buffer, this.params.start, this.params.end)
      const gain = edit.normalize ? peakNormalizeGain(peak, -1) : 1
      const rendered = renderRegion(this.buffer, this.ctx, {
        start: this.params.start,
        end: this.params.end,
        reverse: edit.reverse,
        fadeIn: edit.fadeIn,
        fadeOut: edit.fadeOut,
        fadeCurve: edit.fadeCurve,
        fadeInBend: edit.fadeInBend,
        fadeOutBend: edit.fadeOutBend,
        gain,
      })
      this.fileName = stemName(this.fileName) + '_sample.wav'
      this.applyLoadedBuffer(rendered, false, 'full', this.selectedTrackId)
      return
    }
    if (!this.sourceBuffer) return
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer) return
    this.buffer = buffer
    this.reversed = this.buildReversed(buffer)
    this.mono = mixToMono(buffer)
    this.params.start = 0
    this.params.end = buffer.duration
    this.playOffset = 0
    this.prepApplied = true
    this.emit()
  }

  revertToSource(): void {
    if (!this.sourceBuffer) return
    this.stopVoices()
    this.playing = false
    this.applyLoadedBuffer(this.sourceBuffer, false, 'inset', this.selectedTrackId)
  }

  /** Peak-normalize the current play region in place (does not crop). */
  normalizeRegion(): void {
    const buffer = this.detachWorkingBuffer()
    if (!buffer) return
    const { start, end } = this.region(buffer.duration)
    const gain = peakNormalizeGain(peakOfBuffer(buffer, start, end), -1)
    const idx = this.regionIndices(buffer)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      applyGainInPlace(buffer.getChannelData(ch), idx.start, idx.end, gain)
    }
    this.afterBufferEdit()
  }

  /** Reverse the current play region in place (does not crop). */
  reverseRegion(): void {
    const buffer = this.detachWorkingBuffer()
    if (!buffer) return
    const idx = this.regionIndices(buffer)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      reverseRegionInPlace(buffer.getChannelData(ch), idx.start, idx.end)
    }
    if (this.direction === 'reverse') this.direction = 'forward'
    this.afterBufferEdit()
  }

  captureSampleEdit(): SampleEditCapture | null {
    const buffer = this.buffer
    if (!buffer || !(buffer.sampleRate > 0) || buffer.length < 1) return null
    const channels: Float32Array[] = []
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const copy = new Float32Array(buffer.length)
      copy.set(buffer.getChannelData(ch))
      channels.push(copy)
    }
    return cloneCapture({
      sampleRate: buffer.sampleRate,
      channels,
      playhead: this.getPlayheadSeconds(),
      transients: this.transients.slice(),
      start: this.params.start,
      end: this.params.end,
      automation: this.automation,
    })
  }

  /** Restore PCM, playhead, and markers. Region and automation stay with history. */
  restoreSamplePcm(snap: SamplePcmSnapshot): void {
    const previous = this.buffer
    if (!previous) return
    const next = this.bufferFromChannels(snap.channels, snap.sampleRate)
    if (!next) return
    this.stopVoices()
    this.playing = false
    this.installEditedBuffer(next, previous)
    const duration = next.duration
    this.playOffset = Math.min(duration, Math.max(0, snap.playhead))
    this.transients = snap.transients.slice()
    this.showTransients = this.transients.length > 0
    this.emit()
  }

  /** Install raw PCM as the working sample. The output device can stay closed. */
  loadPcm(channels: readonly Float32Array[], sampleRate: number, fileName = 'sample.wav'): boolean {
    const buffer = this.bufferFromChannels(channels, sampleRate)
    if (!buffer) return false
    this.stopVoices()
    this.playing = false
    this.fileName = fileName
    this.applyLoadedBuffer(buffer, true, 'inset', this.selectedTrackId, fileName)
    return true
  }

  /** Insert 1.0s of digital silence at the playhead. One call is one edit. */
  insertSilenceAtPlayhead(): boolean {
    const buffer = this.buffer
    if (!buffer || !this.bufferFactory()) return false
    const silenceFrames = silenceFrameCount(buffer.sampleRate)
    if (silenceFrames < 1) return false
    const playhead = this.freezePlayhead()
    const atFrame = insertFrameForTime(playhead, buffer.sampleRate, buffer.length)
    const channels = readBufferChannels(buffer)
    const nextChannels = insertSilence(channels, atFrame, silenceFrames)
    const next = this.bufferFromChannels(nextChannels, buffer.sampleRate)
    if (!next) return false
    const edit: TimelineEdit = {
      kind: 'insert',
      atSec: atFrame / buffer.sampleRate,
      deltaSec: silenceFrames / buffer.sampleRate,
    }
    this.installEditedBuffer(next, buffer)
    this.applyTimelineEdit(edit)
    return true
  }

  /** Copy the selected frames into the internal clipboard. The source sample is unchanged. */
  copySampleSelection(): boolean {
    const buffer = this.buffer
    if (!buffer) return false
    const span = selectionFrameSpan(this.params.start, this.params.end, buffer.sampleRate, buffer.length)
    if (!span) return false
    const channels = copyFrameRange(readBufferChannels(buffer), span.start, span.end)
    if (!channels) return false
    this.clipboard = { sampleRate: buffer.sampleRate, channels }
    this.emit()
    return true
  }

  /**
   * Copy the selection, then delete it and close the gap.
   * One call is one edit. The clipboard is left unchanged when the delete cannot run.
   */
  cutSampleSelection(): boolean {
    const buffer = this.buffer
    if (!buffer || !this.bufferFactory()) return false
    const span = deleteFrameSpan(this.params.start, this.params.end, buffer.sampleRate, buffer.length)
    if (!span) return false
    const source = readBufferChannels(buffer)
    const copied = copyFrameRange(source, span.start, span.end)
    const nextChannels = deleteFrameRange(source, span.start, span.end)
    if (!copied || !nextChannels) return false
    const next = this.bufferFromChannels(nextChannels, buffer.sampleRate)
    if (!next) return false
    this.clipboard = { sampleRate: buffer.sampleRate, channels: copied }
    this.freezePlayhead()
    this.installEditedBuffer(next, buffer)
    this.applyTimelineEdit({
      kind: 'delete',
      startSec: span.start / buffer.sampleRate,
      endSec: span.end / buffer.sampleRate,
    })
    return true
  }

  /**
   * Insert clipboard audio at the playhead, shifting the tail right.
   * Channel layout and sample rate are adapted to the destination. One call is one edit.
   */
  pasteAtPlayhead(): boolean {
    const buffer = this.buffer
    const clip = this.clipboard
    if (!buffer || !clip || !this.bufferFactory()) return false
    const clipChannels = prepareClipboardForDestination(clip, buffer.sampleRate, buffer.numberOfChannels)
    if (!clipChannels || (clipChannels[0]?.length ?? 0) < 1) return false
    const playhead = this.freezePlayhead()
    const atFrame = insertFrameForTime(playhead, buffer.sampleRate, buffer.length)
    const nextChannels = insertPcmAtFrame(readBufferChannels(buffer), atFrame, clipChannels)
    if (!nextChannels) return false
    const next = this.bufferFromChannels(nextChannels, buffer.sampleRate)
    if (!next) return false
    const inserted = clipChannels[0]!.length
    this.installEditedBuffer(next, buffer)
    this.applyTimelineEdit({
      kind: 'insert',
      atSec: atFrame / buffer.sampleRate,
      deltaSec: inserted / buffer.sampleRate,
    })
    return true
  }

  /** Remove the highlighted region and close the gap. One call is one edit. */
  deleteSampleSelection(): boolean {
    const buffer = this.buffer
    if (!buffer || !this.bufferFactory()) return false
    const span = deleteFrameSpan(this.params.start, this.params.end, buffer.sampleRate, buffer.length)
    if (!span) return false
    this.freezePlayhead()
    const nextChannels = deleteFrameRange(readBufferChannels(buffer), span.start, span.end)
    if (!nextChannels) return false
    const next = this.bufferFromChannels(nextChannels, buffer.sampleRate)
    if (!next) return false
    const edit: TimelineEdit = {
      kind: 'delete',
      startSec: span.start / buffer.sampleRate,
      endSec: span.end / buffer.sampleRate,
    }
    this.installEditedBuffer(next, buffer)
    this.applyTimelineEdit(edit)
    return true
  }

  /**
   * Replace the highlighted samples with digital silence.
   * Duration, channel count, selection, automation, and markers stay put.
   * One call is one edit. Does not start playback.
   */
  muteSampleSelection(): boolean {
    const buffer = this.buffer
    if (!buffer || !this.bufferFactory()) return false
    const span = muteFrameSpan(this.params.start, this.params.end, buffer.sampleRate, buffer.length)
    if (!span) return false
    const nextChannels = muteFrameRange(readBufferChannels(buffer), span.start, span.end)
    if (!nextChannels) return false
    const next = this.bufferFromChannels(nextChannels, buffer.sampleRate)
    if (!next) return false
    this.freezePlayhead()
    this.installEditedBuffer(next, buffer)
    this.emit()
    return true
  }

  /** Deselect the highlight. The sample itself is unchanged. */
  clearSampleSelection(): boolean {
    const duration = this.buffer?.duration ?? 0
    if (!canClearSampleSelection(this.params.start, this.params.end, duration)) return false
    this.setRegion(0, duration)
    return true
  }

  renderEdit(edit: {
    fadeIn: number
    fadeOut: number
    fadeCurve: FadeCurve
    fadeInBend?: number
    fadeOutBend?: number
    reverse: boolean
    normalize: boolean
  }): AudioBuffer | null {
    if (!this.ctx || !this.buffer) return null
    const peak = peakOfBuffer(this.buffer, this.params.start, this.params.end)
    const gain = edit.normalize ? peakNormalizeGain(peak, -1) : 1
    return renderRegion(this.buffer, this.ctx, {
      start: this.params.start,
      end: this.params.end,
      reverse: edit.reverse,
      fadeIn: edit.fadeIn,
      fadeOut: edit.fadeOut,
      fadeCurve: edit.fadeCurve,
      fadeInBend: edit.fadeInBend,
      fadeOutBend: edit.fadeOutBend,
      gain,
    })
  }

  private applyLoadedBuffer(
    buffer: AudioBuffer,
    asSource: boolean,
    regionMode: 'inset' | 'full' = 'inset',
    trackId = this.selectedTrackId,
    sampleName?: string,
  ): void {
    const target = selectedTrack(this.tracks, trackId) ?? this.tracks[0]
    const targetId = target?.id ?? this.selectedTrackId
    this.trackBuffers.set(targetId, buffer)
    const bindEditor = targetId === this.selectedTrackId
    if (bindEditor) {
      if (asSource) {
        this.sourceBuffer = buffer
        this.channelLayout = 'original'
        this.params.makeMono = 0
        this.buffer = buffer
      } else {
        this.buffer = buffer
      }
      this.reversed = this.buildReversed(this.buffer)
      this.mono = mixToMono(this.buffer)
      if (asSource) this.applyPlaybackLayout()
    }
    let start = 0
    let end = buffer.duration
    if (asSource) {
      if (bindEditor) {
        this.sourceMono = this.mono
        this.sourceMips = []
        if (this.sourceBuffer) {
          for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
            this.sourceMips.push(buildPeakMips(this.sourceBuffer.getChannelData(c)))
          }
        }
        this.variations = []
        this.variationSeq = 0
        this.prepApplied = false
        this.prep = defaultPrep(buffer.duration)
        this.prepHistory = resetHistory(this.prep)
        this.silenceProposal = null
        this.zeroNotice = null
        this.resetTempoAnalysis(true)
        this.stopPreview()
      this.params = {
        ...this.params,
        start: this.prep.selectionStart,
        end: this.prep.selectionEnd,
      }
      this.playOffset = 0
        start = this.params.start
        end = this.params.end
      } else {
        const region = defaultPlayRegion(buffer.duration, MIN_REGION)
        start = region.start
        end = region.end
      }
    } else {
      const region =
        regionMode === 'full'
          ? fullPlayRegion(buffer.duration)
          : defaultPlayRegion(buffer.duration, MIN_REGION)
      start = region.start
      end = region.end
      if (bindEditor) {
        this.params = { ...this.params, start, end }
        this.playOffset = start
        this.resetTempoAnalysis()
        if (regionMode === 'full') {
          this.prepApplied = true
          this.prep = clampPrep(
            {
              ...this.prep,
              windowStart: 0,
              windowEnd: buffer.duration,
              selectionStart: start,
              selectionEnd: end,
            },
            Math.max(this.sourceDuration(), buffer.duration),
          )
        }
      }
    }
    const existing = this.tracks.find((track) => track.id === targetId)
    const fileName =
      sampleName ?? (bindEditor && this.fileName ? this.fileName : existing?.fileName ?? null)
    const named = sampleName && existing ? trackNameAfterLoad(existing, sampleName) : null
    this.tracks = patchTrack(this.tracks, targetId, {
      start,
      end,
      fileName,
      channelCount: buffer.numberOfChannels,
      ...(sampleName ? { stereoDisplay: 'combined' as const } : {}),
      ...(named ? { name: named.name, nameLocked: named.nameLocked } : {}),
    })
    this.bufferRev++
    this.applyLiveAudio()
    this.emit()
  }

  private freezePlayhead(): number {
    const time = this.getPlayheadSeconds()
    this.stopVoices()
    this.playing = false
    this.playOffset = time
    return time
  }

  private bufferFactory(): BaseAudioContext | null {
    if (this.ctx) return this.ctx
    if (this.scratchCtx) return this.scratchCtx
    const Offline = (globalThis as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
    if (!Offline) return null
    this.scratchCtx = new Offline(2, 128, 48000)
    return this.scratchCtx
  }

  private bufferFromChannels(channels: readonly Float32Array[], sampleRate: number): AudioBuffer | null {
    const ctx = this.bufferFactory()
    if (!ctx) return null
    const length = channels[0]?.length ?? 0
    if (length < 1 || !(sampleRate > 0) || channels.length < 1) return null
    const buffer = ctx.createBuffer(channels.length, length, sampleRate)
    for (let ch = 0; ch < channels.length; ch++) {
      buffer.getChannelData(ch).set(channels[ch] ?? new Float32Array(length))
    }
    return buffer
  }

  /** Swap the working sample. The source follows when it was the same buffer. */
  private installEditedBuffer(next: AudioBuffer, previous: AudioBuffer): void {
    const shareSource = this.sourceBuffer === previous
    this.buffer = next
    this.trackBuffers.set(this.selectedTrackId, next)
    if (shareSource) {
      this.sourceBuffer = next
      this.sourceMono = mixToMono(next)
      this.sourceMips = []
      for (let ch = 0; ch < next.numberOfChannels; ch++) {
        this.sourceMips.push(buildPeakMips(next.getChannelData(ch)))
      }
    }
    this.reversed = this.buildReversed(next)
    this.mono = mixToMono(next)
    this.tracks = patchTrack(this.tracks, this.selectedTrackId, { channelCount: next.numberOfChannels })
    this.bufferRev++
  }

  private applyTimelineEdit(edit: TimelineEdit): void {
    const duration = this.buffer?.duration ?? 0
    const previousPlayhead = this.playOffset
    if (edit.kind === 'delete') {
      this.params.start = 0
      this.params.end = duration
    } else {
      const mapped = mapRange(this.params.start, this.params.end, edit)
      const region = clampRegion(mapped.start, mapped.end, duration, MIN_REGION)
      this.params.start = region.start
      this.params.end = region.end
    }
    this.syncSelectedTrackRegion()
    this.playOffset = mapPlayhead(previousPlayhead, edit, duration)
    this.automation = mapAutomation(this.automation, edit)
    this.transients = mapMarkerTimes(this.transients, edit)
    this.showTransients = this.transients.length > 0
    if (!this.prepApplied) {
      const window = mapRange(this.prep.windowStart, this.prep.windowEnd, edit)
      const selection =
        edit.kind === 'delete'
          ? { start: 0, end: duration }
          : mapRange(this.prep.selectionStart, this.prep.selectionEnd, edit)
      const clock = Math.max(duration, this.sourceDuration())
      this.prep = clampPrep(
        {
          ...this.prep,
          windowStart: window.start,
          windowEnd: edit.kind === 'insert' ? Math.max(window.end, duration) : window.end,
          selectionStart: selection.start,
          selectionEnd: selection.end,
        },
        clock,
      )
      this.syncPrepSelection(this.params.start, this.params.end)
    }
    this.applyRegionChange()
    this.emit()
  }

  private detachWorkingBuffer(): AudioBuffer | null {
    if (!this.ctx || !this.buffer) return null
    if (this.buffer !== this.sourceBuffer) return this.buffer
    const src = this.buffer
    const copy = this.ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate)
    for (let ch = 0; ch < src.numberOfChannels; ch++) {
      copy.getChannelData(ch).set(src.getChannelData(ch))
    }
    this.buffer = copy
    return copy
  }

  private regionIndices(buffer: AudioBuffer): { start: number; end: number } {
    const { start, end } = this.region(buffer.duration)
    const sr = buffer.sampleRate
    const s = Math.min(Math.max(0, Math.floor(start * sr)), buffer.length)
    const e = Math.min(buffer.length, Math.max(s + 1, Math.floor(end * sr)))
    return { start: s, end: e }
  }

  private afterBufferEdit(): void {
    if (!this.buffer) return
    this.reversed = this.buildReversed(this.buffer)
    this.mono = mixToMono(this.buffer)
    this.resetTempoAnalysis()
    this.bufferRev++
    if (this.buffer) this.trackBuffers.set(this.selectedTrackId, this.buffer)
    if (this.playing) void this.play()
    else this.emit()
  }

  private afterBufferEditKeepTransients(): void {
    if (!this.buffer) return
    this.reversed = this.buildReversed(this.buffer)
    this.mono = mixToMono(this.buffer)
    this.bufferRev++
    if (this.buffer) this.trackBuffers.set(this.selectedTrackId, this.buffer)
    if (this.playing) void this.play()
    else this.emit()
  }

  private buildReversed(buffer: AudioBuffer): AudioBuffer | null {
    const ctx = this.bufferFactory()
    if (!ctx) return null
    const rev = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate,
    )
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      rev.getChannelData(ch).set(reverseChannel(buffer.getChannelData(ch)))
    }
    return rev
  }

  private spectralCacheKey(): string {
    const buffer = this.buffer
    if (!buffer) return ''
    return `${this.bufferRev}|${buffer.sampleRate}|${buffer.length}|${buffer.numberOfChannels}|${this.spectral.crossoversHz.join(',')}`
  }

  private ensureSpectral(sync: boolean): void {
    if (!this.spectral.enabled || !this.buffer) {
      this.spectralReady = false
      this.spectralComputing = false
      return
    }
    const key = this.spectralCacheKey()
    if (this.spectralKey === key && this.spectralBandsPcm) {
      this.spectralReady = true
      this.spectralComputing = false
      return
    }
    if (!sync && this.spectralPendingKey === key) return
    const sampleRate = this.buffer.sampleRate
    const crossovers = this.spectral.crossoversHz.slice()
    const channels = Array.from({ length: this.buffer.numberOfChannels }, (_, index) =>
      Float32Array.from(this.buffer!.getChannelData(index)),
    )
    const heavy = (channels[0]?.length ?? 0) > 200_000
    const apply = (split: Decomposition) => {
      if (this.spectralCacheKey() !== key || !this.spectral.enabled) return
      this.spectralKey = key
      this.spectralPendingKey = ''
      this.spectralBandsPcm = split.bands
      this.spectralMono.clear()
      this.spectralMix = null
      this.spectralMixKey = ''
      this.spectralReversed = null
      this.spectralReady = true
      this.spectralComputing = false
      this.emit()
      if (this.playing) void this.play()
    }
    if (heavy && !sync) {
      this.spectralReady = false
      this.spectralComputing = true
      this.spectralPendingKey = key
      const job = ++this.spectralJob
      setTimeout(() => {
        if (job !== this.spectralJob) return
        apply(decomposeComplementary(channels, sampleRate, crossovers))
      }, 0)
      return
    }
    this.spectralJob += 1
    this.spectralPendingKey = ''
    apply(decomposeComplementary(channels, sampleRate, crossovers))
  }

  /** Original buffer, or the summed band mix when Spectral Bands is on. */
  private audibleForwardBuffer(): AudioBuffer | null {
    if (!this.spectral.enabled || !this.buffer) return this.buffer
    this.ensureSpectral(false)
    if (!this.spectralReady || !this.spectralBandsPcm || this.spectralKey !== this.spectralCacheKey()) return this.buffer
    const gains = bandAudibleGains(this.spectral.bands)
    const mixKey = `${this.spectralKey}|${gains.join(',')}`
    if (this.spectralMix && this.spectralMixKey === mixKey) return this.spectralMix
    const mixed = mixBandChannels(this.spectralBandsPcm, gains)
    const buffer = this.bufferFromChannels(mixed, this.buffer.sampleRate)
    if (!buffer) return this.buffer
    this.spectralMix = buffer
    this.spectralMixKey = mixKey
    this.spectralReversed = null
    return buffer
  }

  private activeBuffer(): AudioBuffer | null {
    const forward = this.audibleForwardBuffer()
    if (!forward) return null
    if (this.direction !== 'reverse') return forward
    if (forward === this.buffer) return this.reversed
    if (this.spectralReversed && this.spectralReversedOf === forward) return this.spectralReversed
    this.spectralReversed = this.buildReversed(forward)
    this.spectralReversedOf = forward
    return this.spectralReversed
  }

  private buildPingPong(startSec: number, endSec: number): AudioBuffer | null {
    const source = this.audibleForwardBuffer()
    if (!this.ctx || !source) return null
    const sr = source.sampleRate
    const s = Math.floor(startSec * sr)
    const e = Math.floor(endSec * sr)
    const len = Math.max(2, (e - s) * 2)
    const pp = this.ctx.createBuffer(source.numberOfChannels, len, sr)
    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      pp.getChannelData(ch).set(pingPongChannel(source.getChannelData(ch), s, e))
    }
    return pp
  }

  private region(duration: number) {
    return clampRegion(this.params.start, this.params.end, duration, MIN_REGION)
  }

  /** Selection, or the whole file when playing from the sample start. */
  private playbackRegion(duration: number) {
    if (this.playFullSample) return { start: 0, end: Math.max(duration, MIN_REGION) }
    return this.region(duration)
  }

  private async ensureContext(): Promise<void> {
    // Node tests mutate LFO state without a browser. Skip the context entirely.
    if (typeof window === 'undefined') return
    setPlaybackAudioSession()
    if (!this.ctx) {
      this.ctx = createContext()
      this.buildSlots()
      this.connectSlots()
      this.bindVisibility()
    }
    if (this.ctx.state === 'suspended' && !(this.ctx instanceof OfflineAudioContext)) {
      try {
        await this.ctx.resume()
      } catch {
        // The file picker can end the user-gesture. Decode still works while
        // the context is suspended; playback resumes on the next gesture.
      }
    }
    if (!this.unlocked && this.ctx.state === 'running') {
      this.primeOutput()
      this.unlocked = true
    }
    if (!(this.unlocked && this.audioStatus === 'running')) {
      const offline = this.ctx instanceof OfflineAudioContext
      this.audioStatus = this.ctx.state === 'running' || offline ? 'running' : 'blocked'
    }
    this.syncLfoClock()
    this.emit()
  }

  private buildSlots(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    this.safetyGain = ctx.createGain()
    this.safetyGain.gain.value = this.playbackSafetyGain()
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -0.1
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.001
    this.limiter.release.value = 0.05
    this.analyser = ctx.createAnalyser()
    configureSpectrumAnalyser(this.analyser)
    this.analyserPre = ctx.createAnalyser()
    configureSpectrumAnalyser(this.analyserPre)
    this.analyserEq = ctx.createAnalyser()
    configureSpectrumAnalyser(this.analyserEq)
    this.analyserSink = ctx.createGain()
    this.analyserSink.gain.value = 0
    this.analyserSink.connect(ctx.destination)
    this.analyserLimiterPre = ctx.createAnalyser()
    this.analyserLimiterPost = ctx.createAnalyser()
    this.analyserLimiterPre.fftSize = 2048
    this.analyserLimiterPost.fftSize = 2048
    this.analyserLimiterPre.smoothingTimeConstant = 0
    this.analyserLimiterPost.smoothingTimeConstant = 0
    this.analyserCompressorPre = ctx.createAnalyser()
    this.analyserCompressorPost = ctx.createAnalyser()
    this.analyserCompressorPre.fftSize = 2048
    this.analyserCompressorPost.fftSize = 2048
    this.analyserCompressorPre.smoothingTimeConstant = 0
    this.analyserCompressorPost.smoothingTimeConstant = 0
    this.analyserL = ctx.createAnalyser()
    this.analyserR = ctx.createAnalyser()
    this.analyserL.fftSize = 2048
    this.analyserR.fftSize = 2048
    this.analyserL.smoothingTimeConstant = 0.4
    this.analyserR.smoothingTimeConstant = 0.4
    this.previewGain = ctx.createGain()
    this.previewGain.gain.value = 1
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0
    this.sumBus = ctx.createGain()
    this.sumBus.gain.value = 1
    forceStereoUpmix(this.sumBus)
    this.masterOutput = ctx.createGain()
    this.masterOutput.gain.value = 1
    forceStereoUpmix(this.masterOutput)
    this.analyserPull = ctx.createGain()
    this.analyserPull.gain.value = 0
    this.analyserPull.connect(ctx.destination)

    this.ensureTrackStrips(false)
    for (const track of this.tracks) {
      this.withEditing(track.id, () => {
        for (const mod of normalizeChain(this.chain)) {
          if (!this.slots.has(mod.instanceId)) this.slots.set(mod.instanceId, this.createSlot(mod))
        }
      })
    }
    this.applyLiveAudio()
    this.applyBypassRamps(0)
  }

  private createSlot(mod: ChainModule): Slot {
    const ctx = this.ctx!
    const bands =
      mod.type === 'eq' ? Math.max(EQ_POOL_BANDS, this.eqEditBands(this.eqState(mod.instanceId)).length) : EQ_POOL_BANDS
    const slot = createChainSlot(ctx, mod, bands)
    if (this.activeTrackId() === this.selectedTrackId) {
      if (slot.compressorFx) this.analyserCompressorPost = slot.compressorFx.analyserPost
      if (slot.limiterFx) this.analyserLimiterPost = slot.limiterFx.analyserPost
    }
    return slot
  }

  private applyTrackMix(smoothing: number): void {
    if (!this.ctx || !this.sumBus) return
    this.ensureTrackStrips(false)
    const now = this.ctx.currentTime
    for (const track of this.tracks) {
      const strip = this.trackStrips.get(track.id)
      if (!strip) continue
      const heard = this.mixerHeard.get(track.id)
      applyTrackMixerParams(
        strip,
        {
          pan: heard?.pan ?? track.pan,
          level: heard?.level ?? trackLevelGain(track.mix),
          gate: trackAudible(track, this.tracks) ? 1 : 0,
          midDb: heard?.midDb ?? track.midDb,
          sideDb: heard?.sideDb ?? track.sideDb,
        },
        now,
      )
    }
    rampGainExact(this.sumBus.gain, outputMixGain(this.masterMix), now, smoothing)
  }

  private syncSelectedTrackRegion(): void {
    const id = this.selectedTrackId
    if (!this.tracks.some((track) => track.id === id)) return
    this.tracks = writeTrackRegion(this.tracks, id, this.params.start, this.params.end)
  }

  private hydrateTrackRegions(start: number, end: number): void {
    this.tracks = this.tracks.map((track) => {
      const duration = this.trackBuffers.get(track.id)?.duration ?? this.buffer?.duration ?? 0
      const hasRegion = track.end > track.start
      const region = clampRegion(
        hasRegion ? track.start : start,
        hasRegion ? track.end : end,
        duration,
        MIN_REGION,
      )
      return { ...track, start: region.start, end: region.end }
    })
  }

  private applyTrackRegion(track: MixTrack): void {
    const duration = this.trackBuffers.get(track.id)?.duration ?? this.buffer?.duration ?? 0
    const region = clampRegion(track.start, track.end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    this.tracks = writeTrackRegion(this.tracks, track.id, region.start, region.end)
    const span = Math.max(region.end - region.start, 0)
    this.playOffset = region.start + (this.params.position / 100) * span
    this.applyRegionChange()
  }

  private connectSlots(): void {
    if (!this.ctx || !this.safetyGain || !this.limiter || !this.analyser || !this.sumBus || !this.masterOutput) return
    this.ensureTrackStrips(true)
    for (const track of this.tracks) this.connectTrack(track.id)
    this.connectMaster()
    this.retargetMonitorTaps()
  }

  /** Master sum → output gain → safety limiter → meters. One limiter for the mix. */
  private connectMaster(): void {
    if (!this.ctx || !this.sumBus || !this.masterOutput || !this.limiter || !this.safetyGain || !this.analyser) return
    try {
      this.sumBus.disconnect()
    } catch {
      /* first wire */
    }
    try {
      this.masterOutput.disconnect()
    } catch {
      /* first wire */
    }
    try {
      this.limiter.disconnect()
    } catch {
      /* first wire */
    }
    try {
      this.safetyGain.disconnect()
    } catch {
      /* first wire */
    }
    this.sumBus.connect(this.masterOutput)
    this.masterOutput.connect(this.limiter)
    forceStereoUpmix(this.limiter)
    forceStereoUpmix(this.safetyGain)
    this.limiter.connect(this.safetyGain)
    this.safetyGain.connect(this.ctx.destination)
    this.limiter.connect(this.analyser)
    this.pullAnalyser(this.analyser)
    if (this.previewGain) {
      try {
        this.previewGain.disconnect()
      } catch {
        /* not yet connected */
      }
      this.previewGain.connect(this.limiter)
    }
    const split = this.ctx.createChannelSplitter(2)
    this.limiter.connect(split)
    if (this.analyserL) split.connect(this.analyserL, 0)
    if (this.analyserR) split.connect(this.analyserR, 1)
  }

  private orderedSlots(id: string): Slot[] {
    return this.ensureRack(id)
      .chain.map((mod) => this.trackSlotMap(id).get(mod.instanceId))
      .filter((slot): slot is Slot => Boolean(slot))
  }

  /**
   * source → mixer input → effect chain → postFx → mid/side → pan → level → gate → sum.
   * Disconnects the insert send and slot outputs only, so a playing source stays on the strip input.
   */
  private connectTrack(id: string): void {
    const strip = this.trackStrips.get(id)
    const ordered = this.orderedSlots(id)
    if (!strip || !this.sumBus) return
    try {
      strip.fxInsert.disconnect()
    } catch {
      /* not connected yet */
    }
    for (const slot of ordered) {
      try {
        slot.output.disconnect()
      } catch {
        /* not connected yet */
      }
    }
    try {
      strip.output.disconnect()
    } catch {
      /* not connected yet */
    }
    if (ordered.length === 0) strip.fxInsert.connect(strip.postFx)
    else {
      strip.fxInsert.connect(ordered[0]!.input)
      for (let i = 0; i < ordered.length - 1; i++) ordered[i]!.output.connect(ordered[i + 1]!.input)
      ordered.at(-1)!.output.connect(strip.postFx)
    }
    strip.output.connect(this.sumBus)
  }

  private leadInput(): GainNode | null {
    this.ensureTrackStrips(false)
    return this.trackStrips.get(this.selectedTrackId)?.input ?? null
  }

  /** Drop side-chain taps so a graph rebuild cannot sum stale connections into the FFT. */
  private disconnectSpectrumTaps(): void {
    const pre = this.analyserPre
    const eq = this.analyserEq
    const pulls = [pre, eq, this.analyserLimiterPre, this.analyserCompressorPre]
    for (const slots of this.trackSlots.values()) {
      for (const slot of slots.values()) {
        for (const tap of pulls) {
          if (!tap) continue
          try {
            slot.input.disconnect(tap)
          } catch {
            /* not connected */
          }
          try {
            slot.output.disconnect(tap)
          } catch {
            /* not connected */
          }
        }
      }
    }
    try {
      this.noiseGain?.disconnect()
    } catch {
      /* not connected */
    }
  }

  /**
   * One before-tap and one after-tap for the selected track.
   * Multi view disconnects them so hidden editors do not run FFTs.
   * The master meter tap stays on the safety limiter.
   */
  setMonitorTaps(enabled: boolean, focusId: string | null = this.analyserFocusId): void {
    this.monitorTaps = enabled
    this.analyserFocusId = focusId
    if (this.ctx) this.retargetMonitorTaps()
  }

  private retargetMonitorTaps(): void {
    if (!this.ctx) return
    this.disconnectSpectrumTaps()
    const pull = this.analyserPull
    const release = (node: AnalyserNode | null) => {
      if (!node || !pull) return
      try {
        node.disconnect(pull)
      } catch {
        /* not pulled */
      }
    }
    release(this.analyserPre)
    release(this.analyserEq)
    release(this.analyserLimiterPre)
    release(this.analyserCompressorPre)
    if (!this.monitorTaps) return
    const id = this.selectedTrackId
    const ordered = this.orderedSlots(id)
    if (!ordered.length) return
    const focus = this.analyserFocusId ? ordered.find((slot) => slot.instanceId === this.analyserFocusId) : undefined
    const before = focus?.input ?? ordered[0]!.input
    if (this.analyserPre) {
      before.connect(this.analyserPre)
      this.pullAnalyser(this.analyserPre, pull)
    }
    if (focus?.type === 'eq' && this.analyserEq) {
      focus.output.connect(this.analyserEq)
      this.pullAnalyser(this.analyserEq, pull)
    }
    const lim = ordered.find((slot) => slot.type === 'limiter')
    if (lim && this.analyserLimiterPre) {
      lim.input.connect(this.analyserLimiterPre)
      this.pullAnalyser(this.analyserLimiterPre, pull)
      if (lim.limiterFx) this.analyserLimiterPost = lim.limiterFx.analyserPost
    }
    const comp = ordered.find((slot) => slot.type === 'compressor')
    if (comp && this.analyserCompressorPre) {
      comp.input.connect(this.analyserCompressorPre)
      this.pullAnalyser(this.analyserCompressorPre, pull)
      if (comp.compressorFx) this.analyserCompressorPost = comp.compressorFx.analyserPost
    }
    const tone = focus?.type === 'eq' || focus?.type === 'filter' ? focus : ordered.find((slot) => slot.type === 'eq' || slot.type === 'filter')
    if (tone && this.noiseGain && this.eqListen === 'filters' && this.activeTrackId() === this.selectedTrackId) {
      this.noiseGain.connect(tone.input)
    }
  }

  /** Keep a tap processing. Sink gain is 0, so this does not reach the speakers. */
  private pullAnalyser(node: AnalyserNode | null, sink: GainNode | null = this.analyserSink): void {
    if (!node || !sink) return
    try {
      node.disconnect(sink)
    } catch {
      /* not yet pulled */
    }
    node.connect(sink)
  }

  /**
   * Splice new slots into the running chain without the playback mute.
   * The disconnect and reconnect happen in one turn, so the audio thread
   * does not render a hole. A full rebuild is only for a graph that is
   * not connected yet.
   */
  private mountAddedSlots(added: ChainModule[]): void {
    if (!added.length) return
    if (!this.ctx || !this.sumBus || this.reconnecting) {
      void this.rebuildGraph()
      return
    }
    for (const mod of added) {
      if (mod.type === 'eq') this.eqState(mod.instanceId)
      if (!this.slots.has(mod.instanceId)) this.slots.set(mod.instanceId, this.createSlot(mod))
    }
    this.rewireLive()
    this.applyLiveAudio()
    this.applyBypassRamps(0.012)
  }

  private rewireLive(): void {
    if (this.reconnecting) {
      this.graphRebuildQueued = true
      return
    }
    this.connectTrack(this.activeTrackId())
    this.retargetMonitorTaps()
  }

  private graphRebuildQueued = false

  private releaseSlot(slot: Slot | undefined): void {
    if (!slot) return
    if (slot.distortionFx) stopDistortionGraph(slot.distortionFx)
    if (slot.delayFx) stopDelayGraph(slot.delayFx)
    if (slot.reverbFx) stopReverbGraph(slot.reverbFx)
    try {
      slot.input.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      slot.output.disconnect()
    } catch {
      /* already disconnected */
    }
  }

  /** Create or drop slots for the active track only. */
  private syncTrackSlots(): void {
    const live = new Set(this.chain.map((mod) => mod.instanceId))
    for (const id of [...this.slots.keys()]) {
      if (!live.has(id)) {
        this.releaseSlot(this.slots.get(id))
        this.slots.delete(id)
      }
    }
    for (const mod of normalizeChain(this.chain)) {
      const existing = this.slots.get(mod.instanceId)
      if (existing && existing.type !== mod.type) {
        this.releaseSlot(existing)
        this.slots.delete(mod.instanceId)
      }
      if (!this.slots.has(mod.instanceId)) this.slots.set(mod.instanceId, this.createSlot(mod))
      if (mod.type === 'eq') this.eqState(mod.instanceId)
    }
  }

  private async rebuildGraph(): Promise<void> {
    const trackId = this.activeTrackId()
    if (!this.ctx) {
      this.emit()
      return
    }
    if (this.reconnecting) {
      this.graphRebuildQueued = true
      this.emit()
      return
    }
    this.reconnecting = true
    const strip = this.trackStrips.get(trackId)
    if (strip) rampGainExact(strip.level.gain, 0, this.ctx.currentTime, 0.012)
    await waitMs(16)
    if (!this.ctx) {
      this.reconnecting = false
      return
    }
    this.withEditing(trackId, () => this.syncTrackSlots())
    this.ensureTrackStrips(false)
    this.connectTrack(trackId)
    this.retargetMonitorTaps()
    this.applyLiveAudio()
    this.reconnecting = false
    if (this.graphRebuildQueued) {
      this.graphRebuildQueued = false
      void this.rebuildGraph()
      return
    }
    this.emit()
  }

  /** Project load and reset. Playback is already stopped. */
  private rebuildAllGraphs(): void {
    if (!this.ctx) {
      this.emit()
      return
    }
    for (const slots of this.trackSlots.values()) {
      for (const slot of slots.values()) this.releaseSlot(slot)
    }
    this.trackSlots.clear()
    this.ensureTrackStrips(false)
    for (const track of this.tracks) {
      this.withEditing(track.id, () => this.syncTrackSlots())
    }
    this.connectSlots()
    this.applyLiveAudio()
    this.emit()
  }

  private rebuildSpaceGraphs(kinds: readonly ('delay' | 'reverb')[]): void {
    if (!this.ctx) return
    const ctx = this.ctx
    for (const slot of this.slots.values()) {
      if (slot.type === 'delay' && kinds.includes('delay') && slot.delayFx) {
        stopDelayGraph(slot.delayFx)
        try {
          slot.wet.disconnect()
        } catch {
          /* already disconnected */
        }
        slot.delayFx = createDelayGraph(ctx, slot.wet, slot.output, slot.input)
        silenceDelayGraph(slot.delayFx, ctx.currentTime)
      }
      if (slot.type === 'reverb' && kinds.includes('reverb') && slot.reverbFx) {
        stopReverbGraph(slot.reverbFx)
        try {
          slot.wet.disconnect()
        } catch {
          /* already disconnected */
        }
        slot.reverbFx = createReverbGraph(ctx, slot.wet, slot.output, slot.input)
        silenceReverbGraph(slot.reverbFx, ctx.currentTime)
        this.reverbIrKey = ''
      }
    }
  }

  private playbackSafetyGain(): number {
    if (this.recording || this.muted) return 0.0001
    return 1
  }

  private rampSafety(value: number): void {
    if (!this.ctx || !this.safetyGain) return
    const now = this.ctx.currentTime
    setSmoothedAudioParam(this.safetyGain.gain, value, now, 'gain')
  }

  private applyBypassRamps(smoothing = 0.01): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const params = this.liveParams()
    const flags = { eqListenFilters: this.eqListen === 'filters', spaceLatched: this.spaceLatched }
    for (const mod of this.chain) {
      const slot = this.slots.get(mod.instanceId)
      if (!slot) continue
      const mix = moduleMixGains(mod, params, this.distortionType, flags)
      rampGainExact(slot.dry.gain, mix.dry, now, smoothing)
      rampGainExact(slot.wet.gain, mix.wet, now, smoothing)
      if (mix.muteDelayChannels && slot.delayFx) {
        rampGainExact(slot.delayFx.chanDryL.gain, 0, now, smoothing)
        rampGainExact(slot.delayFx.chanDryR.gain, 0, now, smoothing)
        rampGainExact(slot.delayFx.chanWetL.gain, 1, now, smoothing)
        rampGainExact(slot.delayFx.chanWetR.gain, 1, now, smoothing)
      }
      if (mod.type === 'delay' || mod.type === 'reverb') {
        rampGainExact(slot.output.gain, mix.output, now, smoothing)
      }
    }
  }

  private primeOutput(): void {
    if (!this.ctx) return
    const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.ctx.destination)
    src.start(0)
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return
    this.visibilityBound = true
    const hide = () => {
      if (!this.ctx) return
      this.hiddenPlaying = this.playing
      if (this.playing) this.pause()
      void this.ctx.suspend()
    }
    const show = () => {
      if (!this.ctx) return
      void this.ctx.resume().then(() => {
        this.audioStatus = this.ctx?.state === 'running' ? 'running' : 'blocked'
        if (this.hiddenPlaying) {
          this.hiddenPlaying = false
          void this.play()
        }
        this.emit()
      })
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hide()
      else show()
    })
    window.addEventListener('pagehide', hide)
    window.addEventListener('freeze', hide)
    window.addEventListener('pageshow', show)
    window.addEventListener('resume', show)
  }

  setFilterType(type: FilterType): void {
    this.setEqBand(0, { type: type as EqFilterType })
  }

  private applyEq(smoothing: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const nyquist = this.ctx.sampleRate / 2
    const clock = {
      transportSec: this.playing ? this.transportSeconds(Math.max(0.01, this.params.speed)) : 0,
      lfoTimeSec: this.lfoTime(),
      playing: this.playing,
      hold: this.lfoHold,
      randomOffsets: this.randomOffsets,
    }
    for (const slot of this.slots.values()) {
      if (slot.type !== 'eq' || !slot.eq) continue
      const st = this.eqState(slot.instanceId)
      const overlay = slot.instanceId === this.primaryEqId()
      const heard = eqHeardBandLists(this.eqChannelMode, st.bands, st.bandsL, st.bandsR)
      const left = overlay
        ? modulatedEqBands(heard.left, this.params, this.automation, clock, this.fxLfos)
        : { bands: heard.left, live: this.params }
      const right =
        heard.left === heard.right
          ? left
          : overlay
            ? modulatedEqBands(heard.right, this.params, this.automation, clock, this.fxLfos)
            : { bands: heard.right, live: this.params }
      const comb = overlay ? this.liveComb(st.comb, left.live) : st.comb
      this.syncEqLane(slot.eq.left, left.bands, comb, now, smoothing, nyquist)
      this.syncEqLane(slot.eq.right, right.bands, comb, now, smoothing, nyquist)
    }
  }

  private liveComb(comb: CombFilterState, live: Record<ParamId, number>): CombFilterState {
    return {
      ...comb,
      teeth: live.eqcfTeeth ?? comb.teeth,
      gain: live.eqcfGain ?? comb.gain,
      spacing: live.eqcfSpacing ?? comb.spacing,
      frequency: live.eqcfFreq ?? comb.frequency,
    }
  }

  private syncEqLfoParams(instanceId: string): void {
    if (instanceId !== this.primaryEqId()) return
    const st = this.eqState(instanceId)
    const edited = this.eqEditBands(st)
    for (let i = 0; i < EQ_BAND_LFO_IDS.length; i++) {
      const band = edited[i]
      const ids = EQ_BAND_LFO_IDS[i]
      if (!band || !ids) continue
      this.params[ids.freq] = band.frequency
      this.params[ids.gain] = band.gain
      this.params[ids.q] = band.q
    }
    this.params.eqcfTeeth = st.comb.teeth
    this.params.eqcfGain = st.comb.gain
    this.params.eqcfSpacing = st.comb.spacing
    this.params.eqcfFreq = st.comb.frequency
  }

  private syncEqLane(
    lane: EqLane,
    bands: EqBand[],
    comb: CombFilterState,
    now: number,
    smoothing: number,
    nyquist: number,
  ): void {
    const count = Math.max(lane.bands.length, bands.length)
    for (let i = 0; i < count; i++) {
      const path = lane.bands[i]
      if (!path) continue
      this.syncEqBand(path, bands[i], now, smoothing, nyquist)
    }
    this.syncEqComb(lane, comb, now, smoothing, nyquist)
  }

  private syncEqBand(
    path: EqBandPath,
    band: EqBand | undefined,
    now: number,
    smoothing: number,
    nyquist: number,
  ): void {
    const sig = eqTopologySignature(band)
    if (path.forceCommit) {
      path.forceCommit = false
      path.arm = 'live'
      this.commitEqBand(path, band, sig, now, nyquist)
      return
    }
    if (path.signature === sig) {
      if (band && bandIsActive(band)) this.smoothEqBand(path, band, now, smoothing, nyquist)
      return
    }
    if (path.arm === 'muting') return
    const fade = antiClickSeconds(this.ctx?.sampleRate ?? 48000, 1)
    const alreadyDry = path.wet.gain.value <= 0.001
    if (alreadyDry) {
      // Wet is already silent, so the coefficient write cannot reach the output.
      // The open ramp is delayed a few milliseconds on the audio clock so the
      // new filter state settles before it is heard.
      this.commitEqBand(path, band, sig, now, nyquist)
      return
    }
    path.arm = 'muting'
    const token = ++path.token
    rampGainLinear(path.wet.gain, 0, now, fade)
    rampGainLinear(path.dry.gain, 1, now, fade)
    window.setTimeout(() => {
      if (!this.ctx || path.token !== token) return
      path.forceCommit = true
      path.arm = 'live'
      this.applyEq(0.008)
    }, (fade + 0.003) * 1000)
  }

  private commitEqBand(
    path: EqBandPath,
    band: EqBand | undefined,
    sig: string,
    now: number,
    nyquist: number,
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    const active = Boolean(band && bandIsActive(band))
    const stages = active && band ? filterStageCount(band) : 1
    ensureBandStages(ctx, path, stages)
    this.writeEqBandCoeffs(path, active ? band : undefined, now, true, nyquist, 0.005)
    path.signature = sig
    const fade = antiClickSeconds(ctx.sampleRate, 1)
    if (active) {
      const openAt = now + 0.004
      const wet = path.wet.gain
      const dry = path.dry.gain
      // Ramp to the closed state. setValueAtTime(0) here is a step from
      // whatever cancelAndHold just captured.
      wet.cancelAndHoldAtTime(now)
      wet.linearRampToValueAtTime(0, openAt)
      wet.linearRampToValueAtTime(1, openAt + fade)
      dry.cancelAndHoldAtTime(now)
      dry.linearRampToValueAtTime(1, openAt)
      dry.linearRampToValueAtTime(0, openAt + fade)
      return
    }
    rampGainLinear(path.wet.gain, 0, now, fade)
    rampGainLinear(path.dry.gain, 1, now, fade)
    for (const node of path.stages) applyIdentityBiquad(node)
  }

  private smoothEqBand(
    path: EqBandPath,
    band: EqBand,
    now: number,
    smoothing: number,
    nyquist: number,
  ): void {
    // Short time constant: continuous, but the drag still feels immediate.
    const tau = Math.min(0.012, Math.max(0.004, smoothing))
    this.writeEqBandCoeffs(path, band, now, false, nyquist, tau)
  }

  private writeEqBandCoeffs(
    path: EqBandPath,
    band: EqBand | undefined,
    now: number,
    immediate: boolean,
    nyquist: number,
    smoothing: number,
  ): void {
    writeEqBandCoefficients(path, band, now, immediate, nyquist, smoothing)
  }

  private syncEqComb(
    lane: EqLane,
    comb: CombFilterState,
    now: number,
    smoothing: number,
    nyquist: number,
  ): void {
    const bands = combAsEqBands(comb)
    const sig = comb.enabled ? `on:${bands.length}:${comb.spacingMode}` : 'off'
    if (lane.combForce) {
      lane.combForce = false
      lane.combArm = 'live'
      this.commitEqComb(lane, bands, sig, now, nyquist)
      return
    }
    if (lane.combSignature === sig) {
      if (comb.enabled) this.smoothEqComb(lane, bands, now, smoothing, nyquist)
      return
    }
    if (lane.combArm === 'muting') return
    const fade = antiClickSeconds(this.ctx?.sampleRate ?? 48000, 1)
    if (lane.combWet.gain.value <= 0.001) {
      this.commitEqComb(lane, bands, sig, now, nyquist)
      return
    }
    lane.combArm = 'muting'
    const token = ++lane.combToken
    rampGainLinear(lane.combWet.gain, 0, now, fade)
    rampGainLinear(lane.combDry.gain, 1, now, fade)
    window.setTimeout(() => {
      if (!this.ctx || lane.combToken !== token) return
      lane.combForce = true
      lane.combArm = 'live'
      this.applyEq(0.008)
    }, (fade + 0.003) * 1000)
  }

  private commitEqComb(
    lane: EqLane,
    bands: EqBand[],
    sig: string,
    now: number,
    nyquist: number,
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    this.writeCombCoeffs(lane, bands, now, true, nyquist, 0.005)
    lane.combSignature = sig
    const fade = antiClickSeconds(ctx.sampleRate, 1)
    if (bands.length > 0) {
      const openAt = now + 0.004
      const wet = lane.combWet.gain
      const dry = lane.combDry.gain
      wet.cancelAndHoldAtTime(now)
      wet.linearRampToValueAtTime(0, openAt)
      wet.linearRampToValueAtTime(1, openAt + fade)
      dry.cancelAndHoldAtTime(now)
      dry.linearRampToValueAtTime(1, openAt)
      dry.linearRampToValueAtTime(0, openAt + fade)
      return
    }
    rampGainLinear(lane.combWet.gain, 0, now, fade)
    rampGainLinear(lane.combDry.gain, 1, now, fade)
    for (const node of lane.comb) applyIdentityBiquad(node)
  }

  private smoothEqComb(
    lane: EqLane,
    bands: EqBand[],
    now: number,
    smoothing: number,
    nyquist: number,
  ): void {
    const tau = Math.min(0.012, Math.max(0.004, smoothing))
    this.writeCombCoeffs(lane, bands, now, false, nyquist, tau)
  }

  private writeCombCoeffs(
    lane: EqLane,
    bands: EqBand[],
    now: number,
    immediate: boolean,
    nyquist: number,
    smoothing: number,
  ): void {
    writeCombCoefficients(lane, bands, now, immediate, nyquist, smoothing)
  }

  private syncEqListen(): void {
    if (!this.ctx || !this.noiseGain) return
    const now = this.ctx.currentTime
    const filters = this.eqListen === 'filters'
    for (const [id, strip] of this.trackStrips) {
      const duck = filters && id === this.selectedTrackId
      setSmoothedAudioParam(strip.input.gain, duck ? 0.0001 : 1, now, 'gain')
    }
    if (filters) {
      setSmoothedAudioParam(this.noiseGain.gain, 0.35, now, 'gain')
      this.startNoise()
    } else {
      setSmoothedAudioParam(this.noiseGain.gain, 0, now, 'gain')
      this.stopNoise()
    }
  }

  private startNoise(): void {
    if (!this.ctx || !this.noiseGain || this.noiseSource) return
    const src = this.ctx.createBufferSource()
    src.buffer = createPinkNoiseBuffer(this.ctx, 2)
    src.loop = true
    src.connect(this.noiseGain)
    src.start()
    this.noiseSource = src
  }

  private stopNoise(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop()
      } catch {
        /* already stopped */
      }
      try {
        this.noiseSource.disconnect()
      } catch {
        /* already disconnected */
      }
      this.noiseSource = null
    }
  }

  /**
   * FX LFO phase follows transport: it advances only while playing.
   * Pause parks the phase. Play continues. Stop does not zero it.
   * Filter ADS uses its own clock so a paused LFO does not freeze that envelope.
   */
  private stepClocks(): { lfoSec: number; filterSec: number } {
    if (this.suppressClock) return { lfoSec: this.lfoClockSec, filterSec: this.filterClockSec }
    const now = typeof performance !== 'undefined' ? performance.now() : 0
    const lfo = stepTransportClock({ sec: this.lfoClockSec, wallMs: this.lfoWallMs }, now, this.playing)
    this.lfoClockSec = lfo.sec
    this.lfoWallMs = lfo.wallMs
    const filter = stepTransportClock(
      { sec: this.filterClockSec, wallMs: this.filterWallMs },
      now,
      this.playing || filterModNeedsClock(this.params),
    )
    this.filterClockSec = filter.sec
    this.filterWallMs = filter.wallMs
    return { lfoSec: lfo.sec, filterSec: filter.sec }
  }

  private lfoTime(): number {
    return this.stepClocks().lfoSec
  }

  /** One project playhead while several tracks are running. Otherwise this rack's speed. */
  private transportForEditing(): number {
    if (this.usingProjectTransport && this.playing) return this.projectPlayhead()
    if (this.playing) return this.transportSeconds(Math.max(0.01, this.params.speed))
    return 0
  }

  private liveParams(): Record<ParamId, number> {
    if (!this.suppressClock) {
      const now = typeof performance !== 'undefined' ? performance.now() : 0
      const stamp = this.filterFollowStamp
      this.followDt = stamp > 0 ? Math.min(0.05, (now - stamp) / 1000) : 0.016
      this.filterFollowStamp = now
      this.lastTransportSec = this.transportForEditing()
      this.stepClocks()
    }
    this.updateFilterFollower(this.followDt)
    const transport = this.lastTransportSec
    const clocks = { lfoSec: this.lfoClockSec, filterSec: this.filterClockSec }
    const primaryId = this.chain.find((mod) => mod.type === 'eq')?.instanceId
    const primaryBands = primaryId ? this.eqById.get(primaryId) : undefined
    const manual = primaryBands
      ? withEqBandCenters(this.params, this.eqEditBands(primaryBands))
      : this.params
    const performed = resolvePerformanceParams(
      manual,
      this.automation,
      transport,
      this.playing,
      this.fxLfos,
      clocks.lfoSec,
      this.lfoHold,
      undefined,
      this.randomOffsets,
    )
    return applyFilterModulation(performed, {
      timeSec: clocks.filterSec,
      playing: this.playing,
      envOriginSec: this.filterEnvOrigin,
      follower01: this.filterFollower,
      snh: this.filterSnh,
    })
  }

  private updateFilterFollower(dtSec: number): void {
    let level = 0
    for (const slot of this.slots.values()) {
      if (!slot.filterFx) continue
      slot.filterFx.analyser.getByteTimeDomainData(this.filterFollowBuf)
      level = Math.max(level, rmsFromTimeDomain(this.filterFollowBuf))
    }
    this.filterFollower = followerEnvelope(
      this.filterFollower,
      Math.min(1, level * 3.4),
      Math.max(0.001, dtSec),
      this.params.filterEnvAttack,
      this.params.filterEnvRelease,
    )
  }

  private syncLfoClock(): void {
    const lfoRunning = this.playing && this.tracks.some((track) => anyFxLfoActive(this.ensureRack(track.id).fxLfos))
    const filterRunning = this.tracks.some((track) => filterModNeedsClock(this.ensureRack(track.id).params))
    const automation = this.playing && this.tracks.some((track) => automationHasNodes(this.ensureRack(track.id).automation))
    const randomRunning = this.playing && this.tracks.some((track) => hasAutoRandom(this.ensureRack(track.id).randomDoc))
    const active = lfoRunning || filterRunning || automation || randomRunning
    if (active && !this.lfoTimer) {
      this.lfoTimer = window.setInterval(() => {
        this.applyLiveAudio(0.028)
        // Automation-only ticks stay off the React snapshot. The playhead is drawn
        // from getPlayheadSeconds on its own frame, not from an audio-rate emit.
        // A paused transport does not keep the FX LFO interval alive.
        // Auto Random refreshes the UI at control rate, not once per event.
        if ((this.playing && anyFxLfoActive(this.fxLfos)) || filterModNeedsClock(this.params)) {
          this.randomDirty = false
          this.emit()
        } else if (this.randomDirty) {
          const nowMs = typeof performance !== 'undefined' ? performance.now() : 0
          if (nowMs - this.randomUiAt >= 100) {
            this.randomUiAt = nowMs
            this.randomDirty = false
            this.emit()
          }
        }
      }, 16)
    }
    if (!active && this.lfoTimer) {
      window.clearInterval(this.lfoTimer)
      this.lfoTimer = 0
    }
  }

  private applyFxParams(smoothing: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const params = this.liveParams()
    const bpm = params.bpm
    for (const slot of this.slots.values()) {
      if (slot.filterFx) {
        applyFilterGraph(slot.filterFx, params, now, smoothing, this.ctx.sampleRate)
      }
      if (slot.midSideFx) {
        applyMidSideGraph(slot.midSideFx, params, now, smoothing)
      }
      if (slot.distortionFx) {
        applyDistortionGraph(
          slot.distortionFx,
          params,
          this.distortionType,
          this.distortionNoiseKind,
          now,
          smoothing,
          this.ctx.sampleRate,
          this.noiseMuted,
          this.noiseFadeTau,
        )
      }
      if (slot.compressorFx) applyCompressorGraph(slot.compressorFx, params, now, smoothing)
      if (slot.limiterFx) applyLimiterGraph(slot.limiterFx, params, now, smoothing)
      if (slot.delayFx) {
        if (this.spaceLatched) silenceDelayGraph(slot.delayFx, now)
        else applyDelayGraph(slot.delayFx, params, this.delayType, bpm, now, smoothing, this.ctx)
      }
      if (slot.reverbFx) {
        const fx = slot.reverbFx
        if (this.spaceLatched) silenceReverbGraph(fx, now)
        else applyReverbGraph(fx, params, this.reverbType, bpm, now, smoothing)
        const key = reverbImpulseKey(params, this.reverbType)
        if (key !== this.reverbIrKey || !convolverHasBuffer(fx.conv)) {
          const trackId = this.activeTrackId()
          this.reverbIrKey = key
          if (this.reverbIrTimer) window.clearTimeout(this.reverbIrTimer)
          if (!convolverHasBuffer(fx.conv)) {
            setConvolverPairBuffer(fx.conv, buildReverbBuffer(this.ctx, params, this.reverbType), now)
          } else {
            this.reverbIrTimer = window.setTimeout(() => {
              const owner = this.racks.get(trackId)
              if (owner) owner.reverbIrTimer = 0
              if (!this.ctx || !fx) return
              this.withEditing(trackId, () => {
                if (!this.ctx) return
                setConvolverPairBuffer(
                  fx.conv,
                  buildReverbBuffer(this.ctx, this.liveParams(), this.reverbType),
                  this.ctx.currentTime,
                )
              })
            }, 40)
          }
        }
      }
    }
  }

  private applyLiveAudio(smoothing = 0.03): void {
    if (!this.ctx) return
    const nowMs = typeof performance !== 'undefined' ? performance.now() : 0
    const stamp = this.filterFollowStamp
    this.followDt = stamp > 0 ? Math.min(0.05, (nowMs - stamp) / 1000) : 0.016
    this.stepClocks()
    this.suppressClock = true
    const selected = this.selectedTrackId
    try {
      const order = this.tracks.map((track) => track.id).filter((id) => id !== selected)
      order.push(selected)
      for (const id of order) {
        this.withEditing(id, () => {
          this.filterFollowStamp = nowMs
          this.lastTransportSec = this.transportForEditing()
          this.advanceRandom()
          this.applyRackDsp(smoothing)
        })
      }
    } finally {
      this.suppressClock = false
    }
    this.applyMasterOutput(smoothing)
    this.applyTrackMix(smoothing)
    this.syncEqListen()
    if (this.playing && this.engineMode === 'playback' && !this.usingProjectTransport && this.loadedTrackCount() < 2) {
      const live = this.liveParams()
      const now = this.ctx.currentTime
      if (playbackNeedsStretch(live.speed, live.pitch) && !this.schedulerId) {
        this.handoffToStretch(now)
      } else if (this.source && !this.schedulerId && this.loopScheduling) {
        try {
          setSmoothedAudioParam(this.source.playbackRate, 1, now, 'pitch')
        } catch {
          /* voice already stopped */
        }
      }
    }
  }

  /** Input and inserts for the rack currently being edited. Output gain stays on the master. */
  private applyRackDsp(smoothing: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const gainSlot = [...this.slots.values()].find((s) => s.type === 'gain')
    const outSlot = [...this.slots.values()].find((s) => s.type === 'output')
    const live = this.liveParams()
    const channels = this.trackBuffers.get(this.activeTrackId())?.numberOfChannels ?? this.buffer?.numberOfChannels ?? 2
    if (gainSlot?.stereo) {
      applyStereoStage(
        gainSlot.stereo,
        {
          gainDb: live.gain,
          pan: live.pan,
          leftDb: live.channelGainL,
          rightDb: live.channelGainR,
          mono: live.makeMono > 0.5,
          invert: live.invertPhase > 0.5,
          sourceChannels: channels,
        },
        now,
        smoothing,
      )
    } else if (gainSlot) {
      setSmoothedAudioParam(gainSlot.output.gain, dbToGain(live.gain), now, 'gain')
    }
    if (outSlot) setSmoothedAudioParam(outSlot.output.gain, 1, now, 'gain')
    this.mixerHeard.set(this.activeTrackId(), {
      pan: live.mixPan,
      level: trackLevelGain(live.mixVolume),
      midDb: live.mixMid,
      sideDb: live.mixSide,
    })
    this.applyEq(smoothing)
    this.applyFxParams(smoothing)
    this.applyBypassRamps(smoothing)
  }

  private applyMasterOutput(_smoothing: number): void {
    if (!this.ctx || !this.masterOutput) return
    setSmoothedAudioParam(this.masterOutput.gain, dbToGain(this.params.outputGain), this.ctx.currentTime, 'gain')
  }

  /** Soft-fade the buffer voice before starting grain stretch (avoids clicks on speed/pitch). */
  private handoffToStretch(now: number): void {
    if (!this.ctx) return
    const pos = this.getPlayheadSeconds()
    this.releaseVoices(true)
    this.loopScheduling = false
    this.loopOverlapSec = 0
    this.playOffset = pos
    this.playCtxTime = now
    // The buffer voice was locked at 1× / 0 st. Seed the glide there so the
    // first grains do not snap to the new Speed or Pitch.
    this.startStretchPlayback({ speed: 1, pitch: 0 })
  }

  private retargetPlayingFade(): void {
    if (!this.ctx || !this.playing || !this.buffer || this.schedulerId || this.voices.length === 0) return
    const now = this.ctx.currentTime
    const duration = this.buffer.duration
    const { start, end } = this.playbackRegion(duration)
    const span = Math.max(end - start, MIN_REGION)
    const tempo = Math.max(PARAMS.speed.min, this.liveParams().speed)
    const fade = this.regionFade
    for (const voice of this.voices) {
      const remaining = voice.stopWhen - now
      if (remaining < 0.02) continue
      let curve: Float32Array
      if (voice.pingPong) {
        const elapsed = Math.max(0, (now - voice.startWhen) * tempo)
        curve = pingPongFadeCurveFrom(
          elapsed,
          voice.span,
          fade.fadeIn,
          fade.fadeOut,
          fade.curve,
          remaining * tempo,
          96,
          fade.fadeInBend,
          fade.fadeOutBend,
        )
      } else {
        const head = this.getPlayheadSeconds()
        const fromRel =
          this.direction === 'reverse'
            ? Math.min(span, Math.max(0, end - head))
            : Math.min(span, Math.max(0, head - start))
        curve = regionFadeCurveFrom(
          fromRel,
          span,
          fade.fadeIn,
          fade.fadeOut,
          fade.curve,
          96,
          fade.fadeInBend,
          fade.fadeOutBend,
        )
      }
      try {
        const g = voice.musical.gain
        g.cancelAndHoldAtTime(now)
        g.setValueCurveAtTime(curve, now, remaining)
      } catch {
        /* overlap with a finishing curve */
      }
    }
  }

  private motionOffset(t: number): number {
    return motionValue(
      this.params.motionDepth,
      this.params.motionRate,
      this.params.motionJitter,
      this.motionRandCur,
      t,
    )
  }

  private advanceMotion(): void {
    if (this.params.motionDepth <= 0 || this.params.motionJitter <= 0) return
    const dt = SCHEDULER_MS / 1000
    this.motionClock += dt
    const period = 1 / Math.max(this.params.motionRate, 0.02)
    if (this.motionClock >= period) {
      this.motionClock -= period
      this.motionRandTarget = Math.random() * 2 - 1
    }
    this.motionRandCur += (this.motionRandTarget - this.motionRandCur) * Math.min(1, dt * 4)
  }

  private startRegionPlayback(stretchSeed?: StretchControlSeed | null): void {
    const live = this.liveParams()
    if (playbackNeedsStretch(live.speed, live.pitch)) {
      this.loopScheduling = false
      this.loopOverlapSec = 0
      this.startStretchPlayback(stretchSeed)
      return
    }
    this.startBufferLoop()
  }

  /**
   * Schedule region passes on the audio clock. The next pass is overlapped
   * with the current one, so a loop restart is a few-millisecond crossfade
   * instead of an `onended` gap.
   */
  private startBufferLoop(): void {
    const ctx = this.ctx
    const lead = this.leadInput()
    if (!ctx || !lead) return
    const ping = this.direction === 'pingpong'
    if (ping) {
      if (!this.buffer) return
      const { start, end } = this.playbackRegion(this.buffer.duration)
      const built = this.buildPingPong(start, end)
      if (!built) return
      this.loopBuffer = built
      this.loopPing = true
      this.loopRegionStart = 0
      this.loopRegionEnd = built.duration
      this.loopSpan = Math.max(end - start, MIN_REGION)
      this.loopFromRelBase = 0
      this.loopCursorOffset = 0
    } else {
      const buffer = this.activeBuffer()
      if (!buffer) return
      const duration = buffer.duration
      const { start, end } = this.playbackRegion(duration)
      const reverse = this.direction === 'reverse'
      const full = this.playFullSample
      const loopStart = reverse && !full ? reverseTime(end, duration) : start
      const loopEnd = reverse && !full ? reverseTime(start, duration) : end
      const mapped = reverse && !full ? reverseTime(this.playOffset, duration) : this.playOffset
      this.loopBuffer = buffer
      this.loopPing = false
      this.loopRegionStart = loopStart
      this.loopRegionEnd = Math.max(loopStart + 0.001, loopEnd)
      this.loopSpan = Math.max(loopEnd - loopStart, MIN_REGION)
      this.loopCursorOffset = Math.min(
        Math.max(mapped, loopStart),
        Math.max(loopStart, loopEnd - 0.001),
      )
      this.loopFromRelBase = loopStart
    }
    const span = Math.max(0.001, this.loopRegionEnd - this.loopRegionStart)
    const xf = loopCrossfadeSeconds(ctx.sampleRate, 1, span)
    this.loopOverlapSec = this.loop ? xf : 0
    this.loopCursorWhen = ctx.currentTime
    this.playCtxTime = ctx.currentTime
    this.loopScheduling = true
    if (this.loopTimer) {
      hostClearInterval(this.loopTimer)
      this.loopTimer = 0
    }
    this.loopGen += 1
    this.ensureTransportTimer()
    this.pumpTransport(this.loopGen)
  }

  private ensureTransportTimer(): void {
    if (this.loopTimer || !this.ctx) return
    const gen = this.loopGen
    this.loopTimer = hostSetInterval(() => this.pumpTransport(gen), 30)
  }

  private pumpTransport(gen: number): void {
    if (gen !== this.loopGen || !this.playing || !this.ctx) return
    const now = this.ctx.currentTime
    this.retireVoices(this.voices, now)
    if (this.loopScheduling) this.pumpLead(now)
    this.pumpProject(now)
    if (this.stretchCursors.size) this.pumpTrackStretches(now)
  }

  private pumpLead(now: number): void {
    if (!this.loopScheduling || !this.loopBuffer) return
    const lead = this.leadInput()
    if (!lead) return
    const horizon = now + 0.14
    let guard = 0
    while (this.loopCursorWhen < horizon && guard++ < 6 && this.voices.length < 8) {
      const xf = this.loopOverlapSec || loopCrossfadeSeconds(this.ctx?.sampleRate ?? 48000, 1, this.loopSpan)
      const step = nextLoopSegment(
        { when: this.loopCursorWhen, offset: this.loopCursorOffset },
        this.loopRegionStart,
        this.loopRegionEnd,
        this.loop,
        xf,
      )
      const fromRel = this.loopPing
        ? 0
        : Math.max(0, step.segment.offset - this.loopFromRelBase)
      const loopRestart =
        this.loop &&
        Math.abs(step.segment.offset - this.loopRegionStart) < 0.0001 &&
        this.voices.length > 0
      if (loopRestart) this.filterEnvOrigin = this.filterClockSec
      const voice = this.spawnSegment(this.loopBuffer, lead, step.segment, fromRel, this.loopSpan, this.loopPing)
      if (!voice) break
      this.voices.push(voice)
      this.rememberVoice(voice)
      if (!step.next) {
        voice.src.onended = () => {
          if (!this.playing || !this.voices.some((item) => item.src === voice.src)) return
          this.stop()
        }
        this.loopCursorWhen = Number.POSITIVE_INFINITY
        break
      }
      this.loopCursorWhen = step.next.when
      this.loopCursorOffset = step.next.offset
    }
  }

  private spawnSegment(
    buffer: AudioBuffer,
    dest: AudioNode | null,
    segment: LoopSegmentPlan,
    fromRel: number,
    span: number,
    pingPong: boolean,
  ): ActiveVoice | null {
    const ctx = this.ctx
    if (!ctx || !dest) return null
    const when = Math.max(segment.when, ctx.currentTime)
    const offset = Math.min(Math.max(0, segment.offset), Math.max(0, buffer.duration - 0.001))
    const room = Math.max(0.001, buffer.duration - offset)
    const duration = Math.max(0.001, Math.min(segment.duration, room))
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = false
    src.playbackRate.value = 1
    const musical = ctx.createGain()
    const edge = ctx.createGain()
    const curve = pingPong
      ? pingPongFadeCurve(
          span,
          this.regionFade.fadeIn,
          this.regionFade.fadeOut,
          this.regionFade.curve,
          128,
          this.regionFade.fadeInBend,
          this.regionFade.fadeOutBend,
        )
      : regionFadeCurveFrom(
          fromRel,
          Math.max(span, duration),
          this.regionFade.fadeIn,
          this.regionFade.fadeOut,
          this.regionFade.curve,
          96,
          this.regionFade.fadeInBend,
          this.regionFade.fadeOutBend,
        )
    try {
      musical.gain.setValueCurveAtTime(curve, when, Math.max(0.008, duration))
    } catch {
      musical.gain.value = curve[0] ?? 1
    }
    if (segment.fadeIn > 0.0005) edge.gain.value = 0
    scheduleEdgeFades(edge.gain, when, duration, segment.fadeIn, segment.fadeOut)
    src.connect(musical)
    musical.connect(edge)
    edge.connect(dest)
    try {
      src.start(when, offset, duration)
      src.stop(when + duration)
    } catch {
      try {
        src.disconnect()
      } catch {
        /* start rejected */
      }
      return null
    }
    return {
      src,
      musical,
      edge,
      startWhen: when,
      stopWhen: when + duration,
      fromRel,
      span,
      duration,
      pingPong,
    }
  }

  private rememberVoice(voice: ActiveVoice): void {
    this.source = voice.src
  }

  private retireVoices(list: ActiveVoice[], now: number): void {
    let droppedLead = false
    for (let i = list.length - 1; i >= 0; i--) {
      const voice = list[i]
      if (!voice || voice.stopWhen + 0.03 >= now) continue
      if (list === this.voices && voice.src === this.source) droppedLead = true
      this.disconnectVoice(voice)
      list.splice(i, 1)
    }
    if (!droppedLead) return
    const live = this.voices[this.voices.length - 1]
    if (live) this.rememberVoice(live)
    else this.source = null
  }

  private releaseVoices(fade: boolean): void {
    const pending = this.voices.splice(0, this.voices.length)
    for (const voice of pending) this.releaseVoice(voice, fade)
    this.source = null
  }

  private releaseVoice(voice: ActiveVoice, fade: boolean): void {
    const ctx = this.ctx
    try {
      voice.src.onended = null
    } catch {
      /* already cleared */
    }
    if (!ctx || !fade) {
      try {
        voice.src.stop()
      } catch {
        /* already stopped */
      }
      this.disconnectVoice(voice)
      return
    }
    const now = ctx.currentTime
    if (voice.startWhen > now + 0.001) {
      try {
        voice.src.stop()
      } catch {
        /* not started */
      }
      this.disconnectVoice(voice)
      return
    }
    const sec = antiClickSeconds(ctx.sampleRate, 1)
    try {
      rampGainLinear(voice.edge.gain, 0, now, sec)
      voice.src.stop(now + sec)
    } catch {
      try {
        voice.src.stop()
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => this.disconnectVoice(voice), sec * 1000 + 40)
  }

  private disconnectVoice(voice: ActiveVoice): void {
    try {
      voice.src.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      voice.musical.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      voice.edge.disconnect()
    } catch {
      /* already disconnected */
    }
  }

  private acquireResampleGrain(length: number, channels: number, sampleRate: number): AudioBuffer | null {
    const ctx = this.ctx
    if (!ctx) return null
    const n = Math.max(64, length)
    const i = this.stretchGrainPoolIndex
    this.stretchGrainPoolIndex = (i + 1) % STRETCH_GRAIN_POOL
    let buf = this.stretchGrainPool[i]
    if (!buf || buf.numberOfChannels !== channels || buf.sampleRate !== sampleRate || buf.length < n) {
      buf = ctx.createBuffer(channels, n, sampleRate)
      this.stretchGrainPool[i] = buf
    }
    return buf
  }

  private fillResampledGrain(
    dest: AudioBuffer,
    source: AudioBuffer,
    offsetSec: number,
    count: number,
    step: number,
    algo: StretchInterpAlgo,
    gain: number,
    windowed: boolean,
    budget: InterpBudget,
    wrap?: ReadWrap,
  ): void {
    const pos = offsetSec * source.sampleRate
    const n = Math.min(count, dest.length)
    const ch = Math.min(dest.numberOfChannels, source.numberOfChannels)
    for (let c = 0; c < ch; c++) {
      resampleInto(
        dest.getChannelData(c),
        n,
        source.getChannelData(c),
        pos,
        step,
        algo,
        windowed,
        gain,
        budget,
        wrap,
      )
    }
  }

  private startStretchPlayback(seed?: StretchControlSeed | null): void {
    if (!this.ctx) return
    const live = this.liveParams()
    this.nextGrainTime = this.ctx.currentTime
    this.stretchHead = this.playOffset
    this.stretchDir = this.direction === 'reverse' ? -1 : 1
    const speed = Math.max(PARAMS.speed.min, seed?.speed ?? live.speed)
    const pitch = seed?.pitch ?? live.pitch
    this.stretchSpeed = speed
    this.stretchPitch = pitch
    this.windowSpeed = Math.max(PARAMS.speed.min, seed?.windowSpeed ?? speed)
    this.windowPitch = seed?.windowPitch ?? pitch
    this.schedulerId = window.setInterval(() => this.scheduleStretch(), SCHEDULER_MS)
    this.scheduleStretch()
  }

  private wrapStretchHead(head: number, start: number, end: number): number | null {
    const span = Math.max(end - start, MIN_REGION)
    if (this.direction === 'pingpong') {
      let h = head
      for (let i = 0; i < 8; i++) {
        if (h > end) {
          h = end - (h - end)
          this.stretchDir = -1
        } else if (h < start) {
          h = start + (start - h)
          this.stretchDir = 1
        } else break
      }
      return clamp(h, start, end)
    }
    if (this.loop) {
      if (head >= end) return start + ((head - start) % span)
      if (head < start) {
        const back = (start - head) % span
        return end - (back === 0 ? span : back)
      }
      return head
    }
    if (head >= end || head < start) return null
    return head
  }

  private scheduleStretch(): void {
    const buffer = this.buffer
    if (!this.playing || this.engineMode !== 'playback' || !this.ctx || !buffer || !this.leadInput()) {
      return
    }
    const ctx = this.ctx
    const duration = buffer.duration
    const live = this.liveParams()
    const algo = effectiveInterpAlgo(live.stretchInterpOn, live.stretchInterpAlgo)
    const targetSpeed = Math.max(PARAMS.speed.min, live.speed)
    const horizonBase = stretchSchedule(
      live.stretchInterp,
      this.windowSpeed,
      this.windowPitch,
      this.stretchSpeed,
      targetSpeed,
      this.stretchPitch,
      live.pitch,
    )
    const horizon = ctx.currentTime + stretchLookahead(horizonBase.hopSec)
    const { start, end } = this.playbackRegion(duration)
    const span = Math.max(end - start, MIN_REGION)
    const reverse = this.direction === 'reverse'
    const playBuffer = reverse && this.reversed ? this.reversed : buffer
    const wrap =
      this.loop && this.direction !== 'pingpong'
        ? playbackReadWrap(playBuffer.sampleRate, start, end, duration, reverse, true, false)
        : undefined

    // Grains that missed their slot during a UI hitch must not all start on
    // this sample. Skip the hole and keep the read head with the clock.
    if (this.nextGrainTime < ctx.currentTime - 0.001) {
      const late = ctx.currentTime - this.nextGrainTime
      this.stretchHead += late * Math.max(this.stretchSpeed, PARAMS.speed.min) * this.stretchDir
      const caught = this.wrapStretchHead(this.stretchHead, start, end)
      if (caught == null) {
        this.stop()
        return
      }
      this.stretchHead = caught
      this.nextGrainTime = ctx.currentTime
    }

    while (this.nextGrainTime < horizon) {
      const t = Math.max(this.nextGrainTime, ctx.currentTime)
      const step = advanceStretchControl(
        {
          speed: this.stretchSpeed,
          pitch: this.stretchPitch,
          windowSpeed: this.windowSpeed,
          windowPitch: this.windowPitch,
        },
        targetSpeed,
        live.pitch,
        live.stretchInterp,
      )
      this.stretchSpeed = step.speed
      this.stretchPitch = step.pitch
      this.windowSpeed = step.windowSpeed
      this.windowPitch = step.windowPitch
      const rate = step.readPitch
      const wrapped = this.wrapStretchHead(this.stretchHead, start, end)
      if (wrapped == null) {
        this.stop()
        return
      }
      this.stretchHead = wrapped
      const mapped = reverse ? reverseTime(this.stretchHead, duration) : this.stretchHead
      const offset = Math.min(Math.max(mapped, 0), Math.max(0, playBuffer.duration - 0.01))
      const playbackRel =
        this.direction === 'reverse'
          ? Math.max(0, end - this.stretchHead)
          : Math.max(0, this.stretchHead - start)
      const fadeAmp = regionFadeGain(
        playbackRel,
        span,
        this.regionFade.fadeIn,
        this.regionFade.fadeOut,
        this.regionFade.curve,
        this.regionFade.fadeInBend,
        this.regionFade.fadeOutBend,
      )
      const grainDur = step.grainSec
      const count = Math.max(32, Math.ceil(grainDur * playBuffer.sampleRate))
      const grainBuf = this.acquireResampleGrain(count, playBuffer.numberOfChannels, playBuffer.sampleRate)
      if (!grainBuf) return
      this.fillResampledGrain(
        grainBuf,
        playBuffer,
        offset,
        count,
        rate,
        algo,
        step.peak * fadeAmp,
        true,
        'realtime',
        wrap,
      )
      const src = ctx.createBufferSource()
      src.buffer = grainBuf
      const lead = this.leadInput()
      if (!lead) return
      src.connect(lead)
      src.start(t, 0, grainDur)
      src.stop(t + grainDur + 0.02)
      this.stretchHead += step.sourceAdvance * this.stretchDir
      this.nextGrainTime += step.hopSec
    }
  }

  private scheduleGrains(): void {
    const buffer = this.activeBuffer()
    if (!this.playing || this.engineMode !== 'grain' || !this.ctx || !buffer || !this.leadInput()) {
      return
    }
    const ctx = this.ctx
    const duration = buffer.duration
    const horizon = ctx.currentTime + LOOKAHEAD
    const live = this.liveParams()
    const density = Math.max(live.density * Math.max(live.speed, 0.25), 0.5)
    this.grainDensitySlew = smoothTowardLogDt(
      Math.max(this.grainDensitySlew, 0.5),
      density,
      SCHEDULER_MS / 1000,
      0.08,
    )
    const interval = 1 / this.grainDensitySlew
    const grainDur = live.grainSize / 1000
    const { start, end } = this.playbackRegion(duration)
    const span = Math.max(end - start, MIN_REGION)
    const amp = 0.35 / Math.sqrt(this.grainDensitySlew / 8)
    this.advanceMotion()

    if (this.nextGrainTime < ctx.currentTime) this.nextGrainTime = ctx.currentTime

    while (this.nextGrainTime < horizon) {
      const t = this.nextGrainTime
      const scatter = live.scatter / 100
      const pos = clamp(live.position / 100 + this.motionOffset(t) * 0.5, 0, 1)
      const jitter = (Math.random() * 2 - 1) * scatter * span * 0.5
      let offset = start + pos * span + jitter
      offset = Math.min(Math.max(offset, start), Math.max(start, end - grainDur * 0.25))
      const grainPitch =
        live.grainPitch + (Math.random() * 2 - 1) * live.pitchSpread
      const rate = pitchRatio(live.pitch + grainPitch)

      const playbackRel =
        this.direction === 'reverse' ? Math.max(0, end - offset) : Math.max(0, offset - start)
      const fadeAmp = regionFadeGain(
        playbackRel,
        span,
        this.regionFade.fadeIn,
        this.regionFade.fadeOut,
        this.regionFade.curve,
        this.regionFade.fadeInBend,
        this.regionFade.fadeOutBend,
      )
      const src = ctx.createBufferSource()
      const gain = ctx.createGain()
      const attack = Math.min(0.02, grainDur * 0.3)
      const releaseStart = Math.max(attack, grainDur - grainDur * 0.35)
      const peak = amp * fadeAmp
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(peak, t + attack)
      gain.gain.linearRampToValueAtTime(peak, t + releaseStart)
      gain.gain.linearRampToValueAtTime(0, t + grainDur)
      const dur = Math.min(grainDur, Math.max(0.01, duration - offset))
      const grainOffset =
        this.direction === 'reverse' ? Math.max(0, duration - offset - dur) : offset
      const algo = effectiveInterpAlgo(live.stretchInterpOn, live.stretchInterpAlgo)
      if (Math.abs(rate - 1) > 0.01) {
        const count = Math.max(32, Math.ceil(dur * buffer.sampleRate))
        const grainBuf = this.acquireResampleGrain(count, buffer.numberOfChannels, buffer.sampleRate)
        if (!grainBuf) return
        this.fillResampledGrain(grainBuf, buffer, grainOffset, count, rate, algo, 1, false, 'realtime')
        src.buffer = grainBuf
        src.connect(gain)
        const lead = this.leadInput()
        if (!lead) return
        gain.connect(lead)
        src.start(t, 0, dur)
      } else {
        src.buffer = buffer
        src.connect(gain)
        const lead = this.leadInput()
        if (!lead) return
        gain.connect(lead)
        src.start(t, grainOffset, dur)
      }
      src.stop(t + dur + 0.02)
      this.nextGrainTime += interval
    }
  }

  private stopVoices(): void {
    if (this.schedulerId) {
      window.clearInterval(this.schedulerId)
      this.schedulerId = 0
    }
    if (this.loopTimer) {
      hostClearInterval(this.loopTimer)
      this.loopTimer = 0
    }
    this.loopGen += 1
    this.loopScheduling = false
    this.loopOverlapSec = 0
    this.usingProjectTransport = false
    this.releaseVoices(Boolean(this.ctx))
    this.stopCompanionVoices()
    this.stopProjectVoices()
  }

  private bindWorkingFromTrack(id: string): void {
    const buffer = this.trackBuffers.get(id) ?? null
    this.buffer = buffer
    if (buffer) {
      this.reversed = this.buildReversed(buffer)
      this.mono = mixToMono(buffer)
      const name = this.tracks.find((track) => track.id === id)?.fileName
      if (name) this.fileName = name
    } else {
      this.reversed = null
      this.mono = null
    }
  }

  private trackIsStereo(track: MixTrack): boolean {
    const channels = this.trackBuffers.get(track.id)?.numberOfChannels ?? track.channelCount
    return channels >= 2
  }

  /**
   * Create missing strips and open or close Mid/Side when the channel count
   * changes. Volume, pan, mute, solo, mid, and side never change this topology.
   * `force` rewires every track chain. A structure change rewires only that track.
   */
  private ensureTrackStrips(force: boolean): void {
    if (!this.ctx || !this.sumBus) return
    const live = new Set(this.tracks.map((track) => track.id))
    for (const id of [...this.trackStrips.keys()]) {
      if (!live.has(id)) this.dropTrackStrip(id)
    }
    for (const track of this.tracks) {
      let strip = this.trackStrips.get(track.id)
      let structure = false
      if (!strip) {
        strip = createTrackMixerStrip(this.ctx)
        this.trackStrips.set(track.id, strip)
        this.pullAnalyser(strip.meter)
        structure = true
      }
      const stereo = this.trackIsStereo(track)
      if (stereo && !strip.stereo) {
        enableTrackMidSide(this.ctx, strip)
        structure = true
      } else if (!stereo && strip.stereo) {
        disableTrackMidSide(strip)
        structure = true
      }
      if (structure) this.mixerStructure += 1
      if (structure || force) this.connectTrack(track.id)
    }
  }

  private dropTrackStrip(id: string): void {
    const strip = this.trackStrips.get(id)
    if (!strip) return
    disconnectTrackMixerStrip(strip)
    this.trackStrips.delete(id)
    this.mixerStructure += 1
  }

  private clearTrackStrips(): void {
    for (const id of [...this.trackStrips.keys()]) this.dropTrackStrip(id)
  }

  private loadedTrackCount(): number {
    let count = 0
    for (const track of this.tracks) if (this.trackBuffers.has(track.id)) count++
    return count
  }

  private trackSpans(): TrackSpan[] {
    return this.tracks.map((track) => ({
      id: track.id,
      duration: this.trackBuffers.get(track.id)?.duration ?? 0,
      loop: track.loop,
    }))
  }

  private projectDuration(): number {
    return projectDurationOf(this.trackSpans())
  }

  private projectPlayhead(): number {
    if (!this.ctx) return this.playOffset
    const elapsed = Math.max(0, this.ctx.currentTime - this.projectWhen)
    const dur = this.projectDuration()
    let time = this.projectOrigin + elapsed
    if (this.loop && dur > 0.001) time = ((time % dur) + dur) % dur
    else if (dur > 0) time = Math.min(time, dur)
    return time
  }

  private pumpProject(now: number): void {
    if (!this.usingProjectTransport || !this.playing) return
    if (this.loop) {
      if (now < this.projectRestartAt - 0.12) return
      const at = this.projectRestartAt
      this.projectRestartAt = Number.POSITIVE_INFINITY
      this.startProjectVoices(at, 0, false)
      return
    }
    if (now >= this.projectEndAt) this.stop()
  }

  private mirrorMixerParam(id: ParamId): void {
    if (id !== 'mixVolume' && id !== 'mixPan' && id !== 'mixMid' && id !== 'mixSide') return
    const trackId = this.activeTrackId()
    const patch =
      id === 'mixVolume'
        ? { mix: this.params.mixVolume }
        : id === 'mixPan'
          ? { pan: this.params.mixPan }
          : id === 'mixMid'
            ? { midDb: this.params.mixMid }
            : { sideDb: this.params.mixSide }
    this.tracks = patchTrack(this.tracks, trackId, patch)
  }

  /**
   * Switch a track between a native buffer voice and the stretch cursor when
   * speed or pitch starts or stops moving. An already-stretching voice keeps
   * its cursor; the shared pump reads the new value. This does not restart
   * every random tick.
   */
  private syncRateVoices(): void {
    if (!this.usingProjectTransport || !this.playing) return
    for (const track of this.tracks) {
      if (!this.trackBuffers.has(track.id)) continue
      const rack = this.ensureRack(track.id)
      const buffer = this.trackBuffers.get(track.id)
      const bounds = buffer ? loopBounds(buffer.duration, track.loop ? track.loopStart : 0, track.loop ? track.loopEnd : 0) : null
      const customPing = Boolean(
        buffer && bounds && track.direction === 'pingpong' && track.loop && (bounds.start > 0.001 || bounds.end < buffer.duration - 0.001),
      )
      const stretch = customPing || sourceNeedsStretch(rack.params.speed, rack.params.pitch, this.trackRateIsLive(track.id))
      if (stretch !== this.stretchCursors.has(track.id)) this.rescheduleTrack(track.id)
    }
  }

  /** Replace one track's source. Every other track's nodes stay connected. */
  private rescheduleTrack(id: string): void {
    if (!this.ctx || !this.playing || !this.usingProjectTransport) return
    const track = this.tracks.find((item) => item.id === id)
    if (!track) return
    const head = this.projectPlayhead()
    this.stopTrackVoice(id)
    const project = this.projectDuration()
    this.ensureTrackStrips(false)
    this.scheduleTrackSource(track, this.ctx.currentTime + 0.02, head, project, 'project')
  }

  private stopTrackVoice(id: string): void {
    const keptVoices = []
    for (const voice of this.projectVoices) {
      if (voice.id !== id) {
        keptVoices.push(voice)
        continue
      }
      try {
        voice.src.onended = null
        voice.src.stop()
      } catch {
        /* already stopped */
      }
      try {
        voice.src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    this.projectVoices = keptVoices
    this.stretchCursors.delete(id)
    const keptGrains = []
    for (const item of this.stretchSources) {
      if (item.id !== id) {
        keptGrains.push(item)
        continue
      }
      try {
        item.src.onended = null
        item.src.stop()
      } catch {
        /* already stopped */
      }
      try {
        item.src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    this.stretchSources = keptGrains
  }

  private trackRateIsLive(id: string): boolean {
    const rack = this.ensureRack(id)
    const moving = (paramId: ParamId) =>
      (laneFor(rack.automation, paramId)?.nodes.length ?? 0) > 0 ||
      rack.fxLfos.input.some((lfo) => lfo.target === paramId && lfo.depth > 0 && lfo.enabled !== false) ||
      Boolean(rack.randomDoc.chaos && rack.randomDoc.generators[paramId]?.auto)
    return moving('speed') || moving('pitch')
  }

  private reversedOf(buffer: AudioBuffer): AudioBuffer | null {
    const cached = this.reversedCache.get(buffer)
    if (cached) return cached
    const rev = this.buildReversed(buffer)
    if (rev) this.reversedCache.set(buffer, rev)
    return rev
  }

  private pingpongOf(buffer: AudioBuffer): AudioBuffer | null {
    const cached = this.pingpongCache.get(buffer)
    if (cached) return cached
    const ctx = this.bufferFactory()
    if (!ctx) return null
    const frames = buffer.length
    const pp = ctx.createBuffer(buffer.numberOfChannels, Math.max(2, frames * 2), buffer.sampleRate)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      pp.getChannelData(ch).set(pingPongChannel(buffer.getChannelData(ch), 0, frames))
    }
    this.pingpongCache.set(buffer, pp)
    return pp
  }

  private cueBuffer(buffer: AudioBuffer, cue: BufferCue): AudioBuffer | null {
    if (cue.buffer === 'reverse') return this.reversedOf(buffer)
    if (cue.buffer === 'pingpong') return this.pingpongOf(buffer)
    return buffer
  }

  private startCue(
    trackId: string,
    buffer: AudioBuffer,
    input: AudioNode,
    cue: BufferCue,
    t0: number,
    bucket: 'project' | 'companion',
  ): void {
    const ctx = this.ctx
    const playBuffer = this.cueBuffer(buffer, cue)
    if (!ctx || !playBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = playBuffer
    src.loop = cue.loop
    if (cue.loop) {
      const loopStart = Math.max(0, cue.loopStart)
      const loopEnd = Math.min(playBuffer.duration, Math.max(loopStart + 0.001, cue.loopEnd || playBuffer.duration))
      src.loopStart = loopStart
      src.loopEnd = loopEnd
    }
    src.connect(input)
    const at = t0 + cue.at
    const offset = Math.min(Math.max(0, cue.offset), Math.max(0, playBuffer.duration - 0.001))
    try {
      src.start(at, offset, Math.max(0.001, cue.duration))
    } catch {
      try {
        src.disconnect()
      } catch {
        /* unscheduled */
      }
      return
    }
    if (bucket === 'project') {
      src.onended = () => {
        this.projectVoices = this.projectVoices.filter((item) => item.src !== src)
        try {
          src.disconnect()
        } catch {
          /* already released */
        }
      }
      this.projectVoices.push({ id: trackId, src })
    } else {
      src.onended = () => {
        try {
          src.disconnect()
        } catch {
          /* already released */
        }
      }
      this.companionSources.push(src)
    }
  }

  private trackClock(track: MixTrack, buffer: AudioBuffer): TrackClock {
    const rack = this.ensureRack(track.id)
    return {
      sourceDuration: buffer.duration,
      speed: Math.max(PARAMS.speed.min, rack.params.speed),
      direction: track.direction,
      loop: track.loop,
      loopStart: track.loopStart,
      loopEnd: track.loopEnd,
    }
  }

  private armTrackStretch(track: MixTrack, buffer: AudioBuffer, t0: number, origin: number, projectDuration: number): void {
    const rack = this.ensureRack(track.id)
    const clock = this.trackClock(track, buffer)
    const resolved = resolveTrackPlayback(clock, origin)
    if (resolved.ended || resolved.sourceTime == null) return
    const speed = clock.speed
    const pitch = rack.params.pitch
    const span = Math.max(0.001, resolved.regionEnd - resolved.regionStart)
    const contentSource = track.direction === 'pingpong' ? span * 2 : span
    const budget = track.loop ? Number.POSITIVE_INFINITY : Math.max(0.001, contentSource - resolved.consumedSource)
    this.stretchCursors.set(track.id, {
      head: resolved.sourceTime,
      dir: resolved.playDirection,
      speed,
      pitch,
      windowSpeed: speed,
      windowPitch: pitch,
      next: t0,
      stopAt: t0 + Math.max(0.001, projectDuration - Math.max(0, origin)),
      start: resolved.regionStart,
      end: resolved.regionEnd,
      loop: track.loop,
      direction: track.direction,
      budget,
      consumed: 0,
    })
  }

  private scheduleTrackSource(
    track: MixTrack,
    t0: number,
    origin: number,
    projectDuration: number,
    bucket: 'project' | 'companion',
  ): void {
    const buffer = this.trackBuffers.get(track.id)
    const input = this.trackStrips.get(track.id)?.input
    if (!buffer || !input || !(buffer.duration > 0)) return
    const rack = this.ensureRack(track.id)
    const bounds = loopBounds(buffer.duration, track.loop ? track.loopStart : 0, track.loop ? track.loopEnd : 0)
    const customRegion = bounds.start > 0.001 || bounds.end < buffer.duration - 0.001
    const customPing = track.direction === 'pingpong' && track.loop && customRegion
    if (customPing || sourceNeedsStretch(rack.params.speed, rack.params.pitch, this.trackRateIsLive(track.id))) {
      this.armTrackStretch(track, buffer, t0, origin, projectDuration)
      return
    }
    const cues = bufferCues({
      sourceDuration: buffer.duration,
      origin,
      projectDuration,
      loop: track.loop,
      direction: track.direction,
      speed: 1,
      loopStart: track.loopStart,
      loopEnd: track.loopEnd,
    })
    for (const cue of cues) this.startCue(track.id, buffer, input, cue, t0, bucket)
  }

  /**
   * Every loaded track starts at one AudioContext time.
   * Loop, direction, speed, and pitch belong to the track. The project end is
   * the longest original source. Mute only closes the mixer gate.
   */
  private startProjectVoices(when: number, origin: number, replace: boolean): void {
    const ctx = this.ctx
    if (!ctx) return
    if (replace) this.stopProjectVoices()
    const spans = this.trackSpans()
    const plan = planProjectStart(spans, origin, when, 0.02)
    const future = when > ctx.currentTime + 0.005
    const t0 = future ? when : plan.when
    if (!future) {
      this.projectWhen = t0
      this.projectOrigin = plan.origin
    }
    this.ensureTrackStrips(false)
    const project = projectDurationOf(spans)
    for (const track of this.tracks) {
      this.scheduleTrackSource(track, t0, plan.origin, project, 'project')
    }
    const remain = Math.max(0.001, project - plan.origin)
    if (this.loop) {
      this.projectRestartAt = t0 + remain
      this.projectEndAt = Number.POSITIVE_INFINITY
    } else {
      this.projectRestartAt = Number.POSITIVE_INFINITY
      this.projectEndAt = t0 + remain
    }
    this.ensureTransportTimer()
  }

  private stopStretchSources(): void {
    const sources = this.stretchSources.splice(0, this.stretchSources.length)
    for (const item of sources) {
      try {
        item.src.onended = null
        item.src.stop()
      } catch {
        /* already stopped */
      }
      try {
        item.src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    this.stretchCursors.clear()
  }

  private stopProjectVoices(): void {
    const voices = this.projectVoices.splice(0, this.projectVoices.length)
    for (const voice of voices) {
      try {
        voice.src.onended = null
        voice.src.stop()
      } catch {
        /* already stopped */
      }
      try {
        voice.src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    this.stopStretchSources()
    this.projectRestartAt = Number.POSITIVE_INFINITY
    this.projectEndAt = Number.POSITIVE_INFINITY
  }

  /** Grain / stretch on the lead: other tracks still share the start time. */
  private startSyncedCompanions(when: number, origin: number): void {
    this.stopCompanionVoices()
    const ctx = this.ctx
    if (!ctx || !this.playing) return
    const spans = this.trackSpans().filter((span) => span.id !== this.selectedTrackId)
    const plan = planProjectStart(spans, origin, when, 0.02)
    this.ensureTrackStrips(false)
    const project = Math.max(projectDurationOf(this.trackSpans()), plan.origin)
    for (const track of this.tracks) {
      if (track.id === this.selectedTrackId) continue
      this.scheduleTrackSource(track, plan.when, plan.origin, project, 'companion')
    }
    if (this.stretchCursors.size) this.ensureTransportTimer()
  }

  private stopCompanionVoices(): void {
    const sources = this.companionSources.splice(0, this.companionSources.length)
    for (const src of sources) {
      try {
        src.onended = null
        src.stop()
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
  }

  private wrapStretchCursor(cursor: TrackStretchCursor): number | null {
    const span = Math.max(cursor.end - cursor.start, 0.001)
    if (cursor.direction === 'pingpong') {
      let head = cursor.head
      for (let i = 0; i < 8; i++) {
        if (head > cursor.end) {
          head = cursor.end - (head - cursor.end)
          cursor.dir = -1
        } else if (head < cursor.start) {
          head = cursor.start + (cursor.start - head)
          cursor.dir = 1
        } else break
      }
      return Math.min(cursor.end, Math.max(cursor.start, head))
    }
    if (cursor.loop) {
      if (cursor.head >= cursor.end) return cursor.start + ((cursor.head - cursor.start) % span)
      if (cursor.head < cursor.start) {
        const back = (cursor.start - cursor.head) % span
        return cursor.end - (back === 0 ? span : back)
      }
      return cursor.head
    }
    if (cursor.head >= cursor.end || cursor.head < cursor.start) return null
    return cursor.head
  }

  /** Shared transport timer. One pump schedules stretch grains for every track that needs them. */
  private pumpTrackStretches(now: number): void {
    const ctx = this.ctx
    if (!ctx) return
    for (const [id, cursor] of this.stretchCursors) {
      if (now >= cursor.stopAt) {
        this.stretchCursors.delete(id)
        continue
      }
      const buffer = this.trackBuffers.get(id)
      const input = this.trackStrips.get(id)?.input
      if (!buffer || !input) {
        this.stretchCursors.delete(id)
        continue
      }
      const rack = this.ensureRack(id)
      const transport = this.usingProjectTransport && this.playing ? this.projectPlayhead() : this.lastTransportSec
      const heard = resolvePerformanceParams(
        rack.params,
        rack.automation,
        transport,
        this.playing,
        rack.fxLfos,
        this.lfoClockSec,
        rack.lfoHold,
        undefined,
        rack.randomOffsets,
      )
      const targetSpeed = Math.max(PARAMS.speed.min, heard.speed)
      const horizon = Math.min(cursor.stopAt, now + stretchLookahead(stretchSchedule(heard.stretchInterp, cursor.windowSpeed, cursor.windowPitch, cursor.speed, targetSpeed, cursor.pitch, heard.pitch).hopSec))
      if (cursor.next < now - 0.001) {
        const late = now - cursor.next
        cursor.head += late * Math.max(cursor.speed, PARAMS.speed.min) * cursor.dir
        cursor.consumed += late * Math.max(cursor.speed, PARAMS.speed.min)
        const caught = this.wrapStretchCursor(cursor)
        if (caught == null || cursor.consumed >= cursor.budget) {
          this.stretchCursors.delete(id)
          continue
        }
        cursor.head = caught
        cursor.next = now
      }
      const playBuffer = cursor.direction === 'reverse' ? (this.reversedOf(buffer) ?? buffer) : buffer
      const algo = effectiveInterpAlgo(heard.stretchInterpOn, heard.stretchInterpAlgo)
      let guard = 0
      while (cursor.next < horizon && guard++ < 6) {
        const t = Math.max(cursor.next, ctx.currentTime)
        const step = advanceStretchControl(
          { speed: cursor.speed, pitch: cursor.pitch, windowSpeed: cursor.windowSpeed, windowPitch: cursor.windowPitch },
          targetSpeed,
          heard.pitch,
          heard.stretchInterp,
        )
        cursor.speed = step.speed
        cursor.pitch = step.pitch
        cursor.windowSpeed = step.windowSpeed
        cursor.windowPitch = step.windowPitch
        const wrapped = this.wrapStretchCursor(cursor)
        if (wrapped == null || cursor.consumed >= cursor.budget) {
          this.stretchCursors.delete(id)
          break
        }
        cursor.head = wrapped
        const mapped = cursor.direction === 'reverse' ? reverseTime(cursor.head, buffer.duration) : cursor.head
        const offset = Math.min(Math.max(mapped, 0), Math.max(0, playBuffer.duration - 0.01))
        const grainDur = step.grainSec
        const count = Math.max(32, Math.ceil(grainDur * playBuffer.sampleRate))
        const grainBuf = this.acquireResampleGrain(count, playBuffer.numberOfChannels, playBuffer.sampleRate)
        if (!grainBuf) break
        this.fillResampledGrain(grainBuf, playBuffer, offset, count, step.readPitch, algo, step.peak, true, 'realtime')
        const src = ctx.createBufferSource()
        src.buffer = grainBuf
        src.connect(input)
        try {
          src.start(t, 0, grainDur)
          src.stop(t + grainDur + 0.02)
        } catch {
          try {
            src.disconnect()
          } catch {
            /* start rejected */
          }
          break
        }
        this.stretchSources.push({ id, src })
        cursor.head += step.sourceAdvance * cursor.dir
        cursor.consumed += step.sourceAdvance
        cursor.next += step.hopSec
      }
    }
    if (this.stretchSources.length > 256) {
      const dropped = this.stretchSources.splice(0, this.stretchSources.length - 128)
      for (const item of dropped) {
        try {
          item.src.disconnect()
        } catch {
          /* already disconnected */
        }
      }
    }
  }

  private buildSnapshot(): EngineSnapshot {
    return {
      fileName: this.fileName,
      duration: this.buffer?.duration ?? 0,
      sampleRate: this.buffer?.sampleRate ?? this.ctx?.sampleRate ?? 0,
      channelCount: this.buffer?.numberOfChannels ?? 0,
      sampleLoaded: Boolean(this.buffer),
      projectAudible: this.loadedTrackCount() > 0,
      projectDuration: this.projectDuration(),
      canInsertSilence: canInsertSilence(this.buffer?.sampleRate ?? 0, this.buffer?.length ?? 0),
      canDeleteSelection: canDeleteSampleSelection(
        this.params.start,
        this.params.end,
        this.buffer?.sampleRate ?? 0,
        this.buffer?.length ?? 0,
      ),
      canMuteSelection: canMuteSampleSelection(
        this.params.start,
        this.params.end,
        this.buffer?.sampleRate ?? 0,
        this.buffer?.length ?? 0,
      ),
      canClearSelection: canClearSampleSelection(
        this.params.start,
        this.params.end,
        this.buffer?.duration ?? 0,
      ),
      canCopySelection: canCopySampleSelection(
        this.params.start,
        this.params.end,
        this.buffer?.sampleRate ?? 0,
        this.buffer?.length ?? 0,
      ),
      canCutSelection: canDeleteSampleSelection(
        this.params.start,
        this.params.end,
        this.buffer?.sampleRate ?? 0,
        this.buffer?.length ?? 0,
      ),
      canPaste: canPasteClipboard(
        this.clipboard,
        this.buffer?.sampleRate ?? 0,
        this.buffer?.length ?? 0,
        this.buffer?.numberOfChannels ?? 0,
      ),
      playing: this.playing,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      filterType: this.filterType,
      audioStatus: this.audioStatus,
      scrubMode: this.scrubMode,
      params: { ...this.params },
      liveParams: { ...this.liveParams() },
      transportSec: this.lastTransportSec,
      chain: this.chain.map((m) => ({ ...m })),
      eqBands: this.eqBands.map((b) => ({ ...b })),
      eqById: this.snapshotEqById(),
      eqPlotBands: this.plotEqBands(),
      comb: { ...this.comb },
      eqListen: this.eqListen,
      eqChannelMode: this.eqChannelMode,
      channelLayout: this.channelLayout,
      limiterReduction: this.getLimiterReduction(),
      recording: this.recording,
      recMonitor: this.recMonitor,
      recordSeconds: this.recPreview.length * (256 / Math.max(1, this.ctx?.sampleRate ?? 48000)),
      recordPeaks: Float32Array.from(this.recPreview),
      recordError: this.recordError,
      muted: this.muted,
      delayType: this.delayType,
      reverbType: this.reverbType,
      distortionType: this.distortionType,
      distortionNoiseKind: this.distortionNoiseKind,
      noiseMuted: this.noiseMuted,
      fxLfos: cloneFxLfos(this.fxLfos),
      automation: cloneAutomation(this.automation),
      random: {
        chaos: this.randomDoc.chaos,
        warned: this.randomWarned,
        prompt: this.randomPrompt,
        budgetLimited: this.randomBudgetLimited,
        generators: cloneRandomDocument(this.randomDoc).generators,
        participation: cloneRandomDocument(this.randomDoc).participation,
        eq: cloneRandomDocument(this.randomDoc).eq,
        lfo: cloneRandomDocument(this.randomDoc).lfo,
        eqPick: this.eqPick ? { ...this.eqPick } : null,
      },
      lfoShown: { ...this.lfoShown },
      spacePresetId: this.spacePresetId,
      hasSource: Boolean(this.sourceBuffer) && this.sourceBuffer !== this.buffer,
      prep: { ...this.prep },
      canUndoPrep: canUndo(this.prepHistory),
      canRedoPrep: canRedo(this.prepHistory),
      previewPlaying: this.previewPlaying,
      previewLoop: this.previewLoop,
      sourceDuration: this.sourceBuffer?.duration ?? 0,
      sourceSampleRate: this.sourceBuffer?.sampleRate ?? 0,
      sourceChannels: this.sourceBuffer?.numberOfChannels ?? 0,
      prepApplied: this.prepApplied,
      bufferRev: this.bufferRev,
      zeroNotice: this.zeroNotice,
      silenceProposal: this.silenceProposal,
      variations: this.variations.map((v) => ({ id: v.id, name: v.name })),
      tracks: cloneTracks(this.tracks),
      trackClocks: Object.fromEntries(
        this.tracks.map((track) => {
          const rack = this.ensureRack(track.id)
          return [track.id, { speed: rack.params.speed, gainDb: rack.params.gain, pitch: rack.params.pitch }]
        }),
      ),
      selectedTrackId: this.selectedTrackId,
      trackFxCounts: Object.fromEntries(this.tracks.map((track) => [track.id, trackFxCount(this.ensureRack(track.id).chain)])),
      trackSlotCounts: Object.fromEntries(
        this.tracks.map((track) => [track.id, this.trackSlots.get(track.id)?.size ?? 0]),
      ),
      masterMix: this.masterMix,
      transients: this.transients.slice(),
      showTransients: this.showTransients,
      tempoSource: this.tempoSource,
      tapCount: this.tapTempoState.times.length,
      tempoNotice: this.tempoNotice,
      spectral: {
        ...cloneSpectralState(this.spectral),
        ready: this.spectralReady,
        computing: this.spectralComputing,
      },
    }
  }

  private emit(): void {
    this.snapshotDirty = true
    if (typeof requestAnimationFrame !== 'function') {
      this.flushSnapshot()
      return
    }
    if (this.emitFrame) return
    this.emitFrame = requestAnimationFrame(() => {
      this.emitFrame = 0
      this.flushSnapshot()
    })
  }

  /**
   * React subscribes to the snapshot. A sensory drag used to notify on every
   * pointer sample, and that render stalled the grain scheduler. Listeners
   * hear one update per frame. getSnapshot still flushes immediately so a
   * caller in the same turn reads the edit it just made.
   */
  private flushSnapshot(): void {
    if (this.snapshotDirty) {
      this.snapshot = this.buildSnapshot()
      this.snapshotDirty = false
    }
    for (const listener of this.listeners) listener()
  }

  private primaryEqId(): string {
    return this.chain.find((m) => m.type === 'eq')?.instanceId ?? 'eq-1'
  }

  private eqState(instanceId: string): EqModuleState {
    let st = this.eqById.get(instanceId)
    if (!st) {
      st = cloneEqState()
      this.eqById.set(instanceId, st)
    }
    return st
  }

  private eqEditBands(st: EqModuleState): EqBand[] {
    if (this.eqChannelMode === 'left') return st.bandsL.length ? st.bandsL : st.bands
    if (this.eqChannelMode === 'right') return st.bandsR.length ? st.bandsR : st.bands
    return st.bands
  }

  private writeEqEditBands(st: EqModuleState, bands: EqBand[]): void {
    if (this.eqChannelMode === 'left') st.bandsL = bands
    else if (this.eqChannelMode === 'right') st.bandsR = bands
    else st.bands = bands
  }

  private applyPlaybackLayout(): void {
    const src = this.sourceBuffer
    if (!src || !this.ctx) return
    if (this.channelLayout === 'original') {
      this.buffer = src
    } else if (this.channelLayout === 'mono') {
      const lanes: Float32Array[] = []
      for (let c = 0; c < src.numberOfChannels; c++) lanes.push(copyChannel(src.getChannelData(c)))
      const mixed = mixChannelsToMono(lanes)
      const next = this.ctx.createBuffer(1, src.length, src.sampleRate)
      next.copyToChannel(mixed, 0)
      this.buffer = next
    } else {
      const leftSrc = src.getChannelData(0)
      const stereo =
        src.numberOfChannels < 2
          ? duplicateMonoToStereo(leftSrc)
          : { left: copyChannel(leftSrc), right: copyChannel(src.getChannelData(1)) }
      const next = this.ctx.createBuffer(2, src.length, src.sampleRate)
      next.copyToChannel(stereo.left, 0)
      next.copyToChannel(stereo.right, 1)
      this.buffer = next
    }
    this.reversed = this.buildReversed(this.buffer)
    this.mono = mixToMono(this.buffer)
  }

  private seedEqStates(): void {
    const next = new Map<string, EqModuleState>()
    for (const mod of this.chain) {
      if (mod.type !== 'eq') continue
      next.set(mod.instanceId, this.eqById.get(mod.instanceId) ?? cloneEqState())
    }
    this.eqById = next
    this.syncPrimaryEq()
  }

  private syncPrimaryEq(): void {
    const st = this.eqState(this.primaryEqId())
    this.eqBands = this.eqEditBands(st).map((b) => ({ ...b }))
    this.comb = { ...st.comb }
  }

  private plotEqBands(): EqBand[] {
    const out: EqBand[] = []
    for (const mod of this.chain) {
      if (mod.type !== 'eq' || mod.bypassed) continue
      const st = this.eqState(mod.instanceId)
      out.push(...this.eqEditBands(st), ...combAsEqBands(st.comb))
    }
    return out
  }

  private snapshotEqById(): Record<string, EqModuleState> {
    const rec: Record<string, EqModuleState> = {}
    for (const [id, st] of this.eqById) {
      rec[id] = {
        bands: this.eqEditBands(st).map((b) => ({ ...b })),
        bandsL: st.bandsL.map((b) => ({ ...b })),
        bandsR: st.bandsR.map((b) => ({ ...b })),
        comb: { ...st.comb },
      }
    }
    return rec
  }
}

function readBufferChannels(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = []
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) channels.push(buffer.getChannelData(ch))
  return channels
}

export const engine = new AudioEngine()

function cloneEqState(
  bands: EqBand[] = defaultEqBands(),
  comb: CombFilterState = defaultCombFilter(),
): EqModuleState {
  return {
    bands: bands.map((b) => copyEqBand(b)),
    bandsL: [],
    bandsR: [],
    comb: { ...comb },
  }
}

function eqBandAudioEqual(a: EqBand, b: EqBand): boolean {
  return (
    a.type === b.type &&
    a.frequency === b.frequency &&
    a.gain === b.gain &&
    a.q === b.q &&
    a.slope === b.slope &&
    Boolean(a.bypassed) === Boolean(b.bypassed)
  )
}

function eqBandUiEqual(a: EqBand, b: EqBand): boolean {
  return eqBandAudioEqual(a, b) && a.id === b.id && a.lfoExpanded === b.lfoExpanded
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Same FFT size, dB range, and mono downmix for Before and After.
 * Smoothing stays at 0: the plot runs its own FFT on the time-domain block.
 * A non-zero constant would smear getFloatFrequencyData and hide clicks.
 */
function configureSpectrumAnalyser(node: AnalyserNode): void {
  node.fftSize = ANALYSER_FFT_IDLE
  node.minDecibels = SPECTRUM_FLOOR_DB
  node.maxDecibels = 0
  node.smoothingTimeConstant = 0
  try {
    node.channelCount = 1
    node.channelCountMode = 'explicit'
    node.channelInterpretation = 'speakers'
  } catch {
    /* analyser may reject channelCount in some engines */
  }
}

function rampGainExact(param: AudioParam, value: number, now: number, _smoothing: number): void {
  const target = value <= 1e-5 ? 0 : value
  setSmoothedAudioParam(param, target, now, 'gain')
}

function eqTopologySignature(band: EqBand | undefined): string {
  if (!band || !bandIsActive(band)) return 'off'
  return `${band.type}:${filterStageCount(band)}`
}

function modulesEqual(a: ChainModule[], b: ChainModule[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (m, i) =>
      m.instanceId === b[i]?.instanceId &&
      m.type === b[i]?.type &&
      m.bypassed === b[i]?.bypassed,
  )
}

function stemName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '') || 'sample'
}
