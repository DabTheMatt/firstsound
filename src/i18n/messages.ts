import type { ModuleType } from '../audio/chain/chain'
import type { ParamId } from '../audio/parameters/types'
import type { EmotionalStateId } from '../sensory/emotionalStates'
import type { SensoryAxisId } from '../sensory/sensoryParameters'
import type { ThemeId } from '../theme/tokens'
import { PARAMS } from '../audio/parameters/definitions'
import { PL_PARAMS } from './plParams'
import type { CatalogId } from '../shed/construction/catalog'
import type { Locale } from './locale'
import { countNoun, polishCardinal } from './plural'

export type FeelingCopy = {
  label: string
  from: string
  to: string
  aria: string
}

export type SimpleToneCopy = {
  label: string
  hint: string
  aria: string
}

export type SimpleMessages = {
  fileUntitled: string
  cut: string
  trim: string
  setStart: string
  setEnd: string
  length: (value: string) => string
  startEnd: string
  fadeIn: string
  fadeOut: string
  fadeNone: string
  fadeShort: string
  fadeMedium: string
  fadeLong: string
  fadeInNone: string
  fadeInShort: string
  fadeInMedium: string
  fadeInLong: string
  fadeOutNone: string
  fadeOutShort: string
  fadeOutMedium: string
  fadeOutLong: string
  fadeInAria: (step: string) => string
  fadeOutAria: (step: string) => string
  regionStartAria: (value: string) => string
  regionEndAria: (value: string) => string
  closeSheet: string
  levelVolume: string
  levelHint: string
  levelDone: string
  tone: string
  moreTones: string
  lessTones: string
  customTone: string
  amount: string
  amountLess: string
  amountMore: string
  amountNone: string
  amountSubtle: string
  amountStrong: string
  edit: string
  sound: string
  effects: string
  selection: string
  trimToSelection: string
  clearSelection: string
  toneGroup: string
  clarity: string
  level: string
  evenOut: string
  gain: string
  gainValue: (db: string) => string
  gainAria: (db: string) => string
  tail: string
  tailOn: string
  tailOff: string
  reverb: string
  delay: string
  reverbHint: string
  delayHint: string
  effectOff: string
  effectOn: string
  enable: string
  spaceSmall: string
  spaceMedium: string
  spaceLarge: string
  echoShort: string
  echoMedium: string
  echoLong: string
  advanced: string
  openTechnical: string
  resetChanges: string
  moreEdit: string
  customEffect: string
  autoFix: string
  autoDone: string
  compare: string
  original: string
  after: string
  undo: string
  redo: string
  restore: string
  restoreConfirm: string
  restoreYes: string
  restoreNo: string
  save: string
  saveTitle: string
  saveName: string
  saveFormat: string
  saveFile: string
  moreSettings: string
  hideSettings: string
  sampleRate: string
  bitDepth: string
  channels: string
  stereo: string
  mono: string
  wav: string
  mp3: string
  loadSample: string
  play: string
  pause: string
  clock: (now: string, total: string) => string
  tones: Record<string, SimpleToneCopy>
}

export type Messages = {
  lang: { group: string; en: string; pl: string }
  gate: {
    title: string
    simple: string
    simpleCopy: string
    listen: string
    listenCopy: string
    control: string
    controlCopy: string
  }
  mode: {
    group: string
    simple: string
    sensory: string
    technical: string
    simpleShort: string
    sensoryShort: string
    technicalShort: string
  }
  simple: SimpleMessages
  header: {
    loadSample: string
    untitled: string
    record: string
    stop: string
    rec: string
    lfoCenter: string
    settings: string
    resetTitle: string
    resetConfirm: string
    resetCancel: string
    resetAction: string
    manual: string
    mono: string
    stereo: string
    channels: (n: number) => string
  }
  settings: {
    close: string
    closeLfo: string
    hint: string
    loadSample: string
    recordMic: string
    stopRecording: string
    savePreset: string
    loadPreset: string
    loadPresetHint: string
    loadDemo: string
    editSample: string
    resetAll: string
    revertSource: string
    undo: string
    redo: string
    saveToLibrary: string
    saveToLibraryPrompt: string
    libraryHint: string
    libraryEmpty: string
    exportLibrary: string
    deletePreset: (name: string) => string
    explainMarks: string
    explainMarksLabel: string
    explainMarksHint: string
  }
  workspace: {
    interface: string
    classic: string
    workspace: string
    experimental: string
    settingHint: string
    workspaces: string
    context: string
    close: string
    closeContext: string
    more: string
    less: string
    moreEdit: string
    analyzerLayer: string
    analyzerSettings: string
    eqLayout: string
    eqStrips: string
    eqInspector: string
    hearingNote: string
    hearingQuick: string
  }
  runtime: { refresh: string; refreshing: string; refreshTitle: string; uiLoadTitle: string }
  banner: { audioBlocked: string; inspector: string }
  mobile: {
    more: string
    back: string
    view: string
    analyzer: string
    expandWorkspace: string
    collapseWorkspace: string
    enterFocus: string
    exitFocus: string
    deleteBand: string
    expandContext: string
    collapseContext: string
    on: string
    off: string
    type: string
    addBand: string
    addEq: string
    freq: string
    gain: string
    q: string
    slope: string
    context: string
  }
  focus: {
    enter: string
    exit: string
    caption: string
    band: (index: number, type: string) => string
    bandName: (index: number) => string
    addNode: string
    deleteNode: string
    addAutomation: string
    lane: string
    eq: string
    auto: string
    wave: string
    waveFull: string
    fft: string
    hearing: string
    more: string
    fadeMs: (label: string, ms: number) => string
    filters: string
  }
  waveform: {
    empty: string
    editorAria: (fileName: string) => string
    editorEmpty: string
    editorSummary: (channels: string, duration: string, rate: string, playhead: string, selection: string) => string
    selectionRange: (start: string, end: string, duration: string) => string
    noSelection: string
    monoRecording: string
    stereoRecording: string
    channelCount: (count: number) => string
    sampleRate: (khz: string) => string
    loadDemo: string
    edit: string
    trim: string
    trimTitle: string
    insertSilence: string
    insertSilenceCaption: string
    deleteSelection: string
    deleteSelectionCaption: string
    muteSelection: string
    muteSelectionCaption: string
    clearSelection: string
    clearSelectionCaption: string
    copySelection: string
    copyCaption: string
    cutSelection: string
    cutCaption: string
    pastePlayhead: string
    pasteCaption: string
    moreEdits: string
    moreEditsCaption: string
    setPlayheadStart: string
    setPlayheadEnd: string
    toSampleStart: string
    toSampleEnd: string
    displayGroup: string
    undo: string
    redo: string
    fitSample: string
    fit: string
    fitSelection: string
    sel: string
    zoomSelection: string
    zoom: string
    normalizeView: string
    norm: string
    resetZoom: string
    reset: string
    waveTitle: string
    wave: string
    multiTitle: string
    multi: string
    spectrum: string
    splitTitle: string
    split: string
    eqTitle: string
    eqEnable: string
    eqOn: string
    eqAdd: string
    tracksTitle: string
    tracks: string
    zoomOut: string
    zoomIn: string
    scrollZoom: string
    mono: string
    fadeIn: string
    fadeOut: string
    autoFade: string
    autoFadeTitle: string
    hold: string
    holdOn: string
    holdOff: string
    resizeWave: string
    resizeSplit: string
    regionStart: string
    regionEnd: string
    tracksAria: string
    overviewAria: string
    zoomViewStart: string
    zoomViewEnd: string
    viewGroup: string
    automationTitle: string
    automationCaption: string
    automationEffect: string
    automationParameter: string
    automationHint: string
    automationLane: string
    automationNode: (label: string) => string
    automationComb: string
    automationAdd: string
    automationAddAction: string
    automationRemove: string
    automationRemoveTitle: string
    automationRemoveConfirm: string
    automationConfirm: string
    automationCancel: string
    automationEmpty: string
    automationColor: string
    automationColorChoose: string
    automationColorOption: (index: number) => string
    automationCurve: string
    automationSegmentCurve: string
    automationCurveIdle: string
    automationLinear: string
    automationSmooth: string
    automationStep: string
    automationTension: string
    automationTensionHandle: string
    automationNodes: string
    automationEditing: string
    automationLegend: string
    automationAllUsed: string
    automationSegmentHint: string
    background: string
    backgroundCaption: string
    backgroundLoad: string
    backgroundOpacity: string
    backgroundGrain: string
    backgroundRemove: string
    backgroundSession: string
    backgroundReject: string
    backgroundPaste: string
    spectral: {
      title: string
      experimental: string
      enable: string
      on: string
      off: string
      subBass: string
      lowMid: string
      highMid: string
      high: string
      gain: string
      mute: string
      solo: string
      crossoverLow: string
      crossoverMid: string
      crossoverHigh: string
      analyseSum: string
      analyseBand: string
      computing: string
    }
  }
  transport: {
    play: string
    pause: string
    stop: string
    playFromStart: string
    playFromStartTitle: string
    more: string
    killFx: string
    killFxTitle: string
    killNoise: string
    killNoiseTitle: string
    loop: string
    scrub: string
    scrubRange: string
    scrubSample: string
    undo: string
    redo: string
    playhead: string
    selection: string
    bpmTitle: string
    selStart: string
    selStartTitle: string
    selEnd: string
    selEndTitle: string
    export: string
    use: string
    useAsSample: string
    useTitle: string
    useHint: string
    selectionSr: (start: string, end: string) => string
  }
  chain: {
    aria: string
    group: string
    addEffect: string
    addAfter: (name: string) => string
    enable: (name: string) => string
    bypass: (name: string) => string
    enableShort: string
    bypassShort: string
    kill: (name: string) => string
    killTitle: (name: string) => string
    moveEarlier: string
    moveLater: string
    moveBefore: (moved: string, other: string) => string
    moveAfter: (moved: string, other: string) => string
    movedBefore: (moved: string, other: string) => string
    movedAfter: (moved: string, other: string) => string
    bypassOn: (name: string) => string
    bypassOff: (name: string) => string
    bypassedTag: string
    dragHint: string
  }
  modules: Record<ModuleType, string>
  inspector: {
    edit: string
    start: string
    end: string
    length: string
    zeroCrossing: string
    snapStart: string
    snapEnd: string
    grainFadesHelp: string
    fadeIn: string
    fadeOut: string
    curve: string
    linear: string
    equalPower: string
    exponential: string
    sCurve: string
    fadeHelp: string
    fadeHelpOut: string
    fadeHelpIn: string
    auto10: string
    fadesOff: string
    trim: string
    normalize: string
    reverse: string
    effectSettings: string
    main: string
    advanced: string
    gain: string
    panning: string
    bypassed: string
    active: string
    mute: string
    sampleTempo: string
    source: string
    taps: string
    hide: string
    show: string
    interpolation: string
    interpAlgo: string
    interpFast: string
    interpSmooth: string
    interpHigh: string
    interpFastTitle: string
    interpSmoothTitle: string
    interpHighTitle: string
    stretchHelp: string
    remove: string
  }
  theme: {
    group: string
    named: (name: string) => string
    system: string
    custom: string
    myThemes: string
    elementColors: string
    help: string
    themeName: string
    save: string
    deleteNamed: (name: string) => string
    colors: Record<string, string>
    names: Record<ThemeId, string>
    categories: {
      monochromatic: string
      color: string
      light: string
      eyes: string
    }
  }
  sensory: {
    strings: string
    stringsAria: string
    stringsHideAria: string
    menu: string
    play: string
    pause: string
    playPause: string
    loadDemo: string
    rest: string
    restAll: string
    restLevel: string
    doubleClickRest: string
    lfoConnected: string
    parameterStrings: string
    overview: string
    feelingsLeft: string
    feelingsRight: string
    startingPlaces: string
    surprise: string
    atmosphere: string
    atmosphereNamed: (name: string) => string
    themes: string
    color: string
    colorSoundAria: string
    colorSoundRest: string
    colorSoundRestAria: string
    colorSoundLight: string
    colorSoundDark: string
    colorSoundLabel: string
    colorSoundShow: string
    colorSoundHide: string
    places: string
    selectRegion: string
    overviewDrag: string
    timeShorter: string
    timeLonger: string
    timeAria: string
    pitchLower: string
    pitchHigher: string
    pitchAria: string
    balanced: string
    atmospheres: Record<string, string>
    emotions: Record<EmotionalStateId, string>
    feelings: Record<SensoryAxisId, FeelingCopy>
  }
  export: {
    title: string
    original: string
    hintCodec: string
    estimated: (time: string) => string
    exportProject: string
    exportSelection: string
    selectionUnavailable: string
    preparing: string
    rendering: string
    encoding: string
    exportFailed: string
    tailHint: string
    keepTail: string
    tailDropped: string
    cancel: string
    applyFades: string
    applyGain: string
    applyReverse: string
    applyNormalize: (db: number) => string
    depth16: string
    depth24: string
    depth32: string
    checkTitle: string
    checkRange: string
    fullAudio: string
    selection: string
    status: string
    settingsValid: string
    warning: string
    error: string
    info: string
    noAudio: string
    noAudioAction: string
    loadAudio: string
    invalidRange: string
    zeroLength: string
    outsideRange: string
    unsupportedFormat: string
    unsupportedRate: string
    unsupportedDepth: string
    effectsIncluded: (names: string) => string
    effectsLabel: string
    effectsNone: string
    clipUnknown: string
    clipDetected: string
    clipWithin: string
    resampleNote: string
    swapNeedsStereo: string
    help: string
    rateHelp: string
    depthHelpPcm: string
    depthHelpDither: string
    depthHelpFloat: string
    channelHelp: string
    rangeHelp: string
    formatHelp: string
    swap: string
    fileRate: string
    previewTitle: string
    preview: string
    previewStop: string
    previewStopAria: string
    previewPreparing: string
    previewReady: string
    previewPlaying: string
    previewStopped: string
    previewFailed: string
    previewUnavailable: string
    previewStopPlayback: string
    previewStopPlaybackAction: string
    previewDuration: string
    previewScope: string
    previewRange: (start: string, end: string) => string
    previewOutside: string
    previewNotEncoded: string
    previewNormalize: string
    previewTail: string
    previewSpeed: string
    previewPitch: string
    previewMonitor: string
    previewBusy: string
    previewSeconds: (seconds: number) => string
  }
  mix: {
    mixer: string
    tracks: string
    trackName: string
    mix: string
    output: string
    master: string
    outputMix: string
    out: string
    monitor: string
    monitorHint: string
    masterHint: string
    track: string
    openFx: string
    fx: string
    fxCount: (count: number) => string
    single: string
    multi: string
    singleTitle: string
    multiTitle: string
    loadAudio: string
    loadSample: string
    loop: string
    loopTrack: string
    setLoop: string
    loopStart: string
    loopEnd: string
    sourceEnd: string
    tracksView: string
    mixerView: string
    direction: string
    input: string
    trackInput: string
    dropAudio: string
    replaceDrop: string
    mixMore: string
    replaceAudio: string
    clearTrack: string
    volume: string
    pan: string
    mid: string
    side: string
    midSide: string
    trackMix: string
    muteTrack: (name: string) => string
    soloTrack: (name: string) => string
    volumeTrack: (name: string) => string
    panTrack: (name: string) => string
    midTrack: (name: string) => string
    sideTrack: (name: string) => string
    midSideTrack: (name: string) => string
    mono: string
    stereo: string
    expandStereo: string
    collapseStereo: string
    rename: string
    color: string
    empty: string
    replaceAsk: string
    replaceYes: string
    replaceNo: string
    left: string
    right: string
    reorder: string
  }
  meters: {
    resetClip: string
    resetClipTitle: string
    clip: string
    range: string
    rangeLabel: string
    strip: string
    peak: (channel: string) => string
    clipState: (state: string) => string
    clipOn: string
    clipOff: string
    readout: (channel: string, value: string) => string
  }
  lfo: {
    center: string
    lead: (slots: number) => string
    storedValue: string
    typeValue: string
  }
  modulation: {
    title: (name: string) => string
    rate: string
    depth: string
    shape: string
    lfo: string
    more: string
    remove: string
    close: string
    active: string
    inactive: string
    activeAria: string
    inactiveAria: string
    automationOn: string
    automationOff: string
    addAutomation: string
    affordance: (name: string, depth: string | null, automation: boolean) => string
  }
  random: {
    chaos: string
    title: (name: string) => string
    onceFor: (name: string) => string
    autoFor: (name: string) => string
    now: string
    auto: string
    on: string
    off: string
    free: string
    sync: string
    rate: string
    division: string
    intensity: string
    transition: string
    step: string
    smooth: string
    randomizeEffect: string
    randomizeBand: string
    randomizeEq: string
    parameterTip: string
    effectAria: (name: string) => string
    setupTip: string
    setupAria: string
    setupTitle: (name: string) => string
    targets: string
    modes: string
    all: string
    none: string
    behavior: string
    timing: string
    range: string
    autoAllowed: string
    showTarget: (name: string) => string
    hideTarget: (name: string) => string
    mixed: string
    appliesTo: string
    eqTypeNote: string
    noEqBands: string
    effectMenu: (name: string) => string
    chaosHint: string
    budget: string
    warning: string
    cancel: string
    enable: string
    randomize: string
    randomizeNow: string
    setup: string
    parameters: string
    selects: string
    scope: string
    scopeWhole: string
    scopeBand: string
    filterCount: string
    countRandom: string
    frequency: string
    gain: string
    q: string
    filterType: string
    slope: string
    wholeEq: string
    oneShot: string
    direction: string
    delayType: string
    reverbType: string
    distortionType: string
    lfoRate: string
    lfoDepth: string
    lfoShape: string
    lfoPhase: string
    lfoConnect: string
  }
  a11y: {
    title: string
    open: string
    back: string
    accessTitle: string
    accessSubtitle: string
    visualComfort: string
    interfaceSize: string
    interfaceSizeHelp: string
    textSize: string
    textSizeHelp: string
    interaction: string
    theme: string
    themeHelp: string
    reduceMotion: string
    reducedMotionHelp: string
    reducedMotionSystem: string
    larger: string
    largerHelp: string
    focus: string
    focusHelp: string
    highVisibility: string
    highVisibilityHelp: string
    cognitive: string
    attentionFocus: string
    attentionFocusHelp: string
    attentionStrength: string
    attentionStrengthHelp: string
    attentionSubtle: string
    attentionClear: string
    attentionHighlight: string
    attentionHighlightHelp: string
    attentionReduce: string
    attentionReduceHelp: string
    predictableLayout: string
    predictableLayoutHelp: string
    stablePanels: string
    stablePanelsHelp: string
    rememberLayout: string
    rememberLayoutHelp: string
    reduceLayout: string
    reduceLayoutHelp: string
    restoreLayout: string
    restoreLayoutHelp: string
    layoutRestored: string
    on: string
    off: string
    saved: string
    restore: string
    restoreHelp: string
    restored: string
    more: string
    tips: string
    tipsHelp: string
    sr: string
    srHelp: string
    shortcuts: string
    shortcutsHelp: string
    shortcutsTitle: string
    shortcutTab: string
    shortcutArrows: string
    shortcutShiftArrows: string
    shortcutHomeEnd: string
    shortcutPage: string
    shortcutReset: string
    shortcutSpace: string
    shortcutEsc: string
    skipToMain: string
    dragFree: string
    dragFreeHelp: string
    keyboardFirst: string
    keyboardFirstHelp: string
    keyboardFirstAlways: string
    waveformNav: string
    waveformNavHelp: string
    waveformNavAlways: string
    sensoryComfort: string
    sensoryComfortHelp: string
    sensoryComfortSection: string
    sensoryComfortApplies: string
    visualActivity: string
    visualActivityHelp: string
    visualActivityStandard: string
    visualActivityLow: string
    reduceDecorativeMotion: string
    reduceDecorativeMotionHelp: string
    calmMeters: string
    calmMetersHelp: string
    calmSpectrum: string
    calmSpectrumHelp: string
    reduceVisualEffects: string
    reduceVisualEffectsHelp: string
    quietNotifications: string
    quietNotificationsHelp: string
  }
  keyboard: {
    open: string
    jump: string
    close: string
    search: string
    empty: string
    destSearch: string
    destEmpty: string
    alwaysOn: string
    browserChord: string
    groups: {
      navigation: string
      transport: string
      editing: string
      effects: string
      automation: string
      guidedTasks: string
    }
    destinations: Record<
      | 'waveform'
      | 'transport'
      | 'effects'
      | 'inspector'
      | 'eq'
      | 'fft'
      | 'automation'
      | 'hearing'
      | 'guided'
      | 'export'
      | 'accessibility'
      | 'gain'
      | 'parameters',
      string
    >
    byId: Record<string, string>
  }
  dragFree: {
    selection: string
    start: string
    end: string
    setStart: string
    setEnd: string
    editTimes: string
    clear: string
    apply: string
    cancel: string
    goToTime: string
    go: string
    stepBack: string
    stepForward: string
    toStart: string
    toEnd: string
    preview: string
    trim: string
    trimWarn: string
    trimApply: string
    fadeIn: string
    fadeOut: string
    fadeLess: string
    fadeMore: string
    duration: string
    loop: string
    setLoopStart: string
    setLoopEnd: string
    editLoop: string
    eqBands: string
    editBand: string
    frequency: string
    gain: string
    q: string
    filterType: string
    chooseType: string
    bypass: string
    enable: string
    noEq: string
    noBands: string
    automation: string
    editPoint: string
    addPoint: string
    deletePoint: string
    pointTime: string
    pointValue: string
    noLane: string
    noPoints: string
    timeNote: string
    noSample: string
    errFormat: string
    errNegative: string
    errPast: string
    errOrder: string
    errShort: string
    errFade: string
    errRange: string
    appliedSelection: string
    appliedPlayhead: string
    appliedFade: string
    appliedTrim: string
    appliedLoop: string
    appliedBand: string
    appliedPoint: string
    deletedPoint: string
    nudgedPoint: string
    cleared: string
    selectionStartSr: (time: string) => string
    selectionEndSr: (time: string) => string
    playheadSr: (time: string) => string
    bandSr: (n: number, type: string) => string
    freqSr: (n: number, value: string) => string
    pointSr: (n: number, time: string) => string
    valueSr: (n: number, value: string) => string
    sensoryExact: string
  }
  markers: {
    open: string
    close: string
    add: string
    go: string
    edit: string
    remove: string
    save: string
    cancel: string
    name: string
    description: string
    showDescription: string
    hideDescription: string
    time: string
    empty: string
    needAudio: string
    needName: string
    list: string
    openCount: (count: number) => string
    addMarker: string
    emptyHint: string
    suggestions: string
    suggestionsCount: (count: number) => string
    suggestionsHelp: string
    saveDetected: string
    noSuggestions: string
    analysing: string
    moreSuggestions: string
    previousAction: string
    nextAction: string
    prevShort: string
    nextShort: string
    editTime: string
    editDescription: string
    actions: (name: string) => string
    defaultName: (index: number) => string
    pointLabel: (name: string, time: string) => string
    goTo: (name: string) => string
    editNamed: (name: string) => string
    deleteNamed: (name: string) => string
    added: (name: string, time: string) => string
    renamed: (name: string) => string
    described: (name: string) => string
    retimed: (name: string, time: string) => string
    deleted: (name: string) => string
    previous: (name: string, time: string) => string
    next: (name: string, time: string) => string
    none: string
    savedDetected: (name: string, time: string) => string
    color: string
    colors: {
      amber: string
      cyan: string
      green: string
      violet: string
      orange: string
      magenta: string
      blue: string
      neutral: string
    }
    recolored: (name: string, color: string) => string
  }
  view: {
    group: string
    workspace: string
    activity: string
    shed: string
  }
  shed: {
    scene: string
    toolbar: string
    zoomIn: string
    zoomOut: string
    resetView: string
    addElement: string
    library: string
    tower: string
    elementType: string
    height: string
    width: string
    roof: string
    helmet: string
    primary: string
    secondary: string
    detail: string
    ornament: string
    ornamentNone: string
    ornamentFinial: string
    ornamentRosette: string
    ornamentStar: string
    position: string
    positionX: string
    positionY: string
    layer: string
    layerForward: string
    layerBack: string
    reset: string
    duplicate: string
    deleteElement: string
    variant: string
    proportion: string
    windows: string
    floors: string
    entrance: string
    gable: string
    arches: string
    archHeight: string
    column: string
    pitch: string
    roofline: string
    ridge: string
    parapet: string
    density: string
    passage: string
    crenellation: string
    panLeft: string
    panRight: string
    panUp: string
    panDown: string
    panLeftShort: string
    panRightShort: string
    panUpShort: string
    panDownShort: string
    transparency: string
    saved: string
    savedHint: string
    restored: string
    close: string
    geometry: string
    appearance: string
    elementName: (type: string, selected: boolean) => string
    moveHint: string
    categories: {
      tower: string
      facade: string
      roof: string
      arcade: string
      gate: string
      attic: string
      ornament: string
    }
    descriptions: {
      tower: string
      facade: string
      roof: string
      arcade: string
      gate: string
      attic: string
      ornament: string
    }
    variants: {
      tower: readonly [string, string, string, string]
      facade: readonly [string, string, string]
      roof: readonly [string, string, string]
      arcade: readonly [string, string, string]
      gate: readonly [string, string, string]
      attic: readonly [string, string]
      ornament: readonly [string, string, string, string]
    }
    swatches: {
      brick: string
      ink: string
      parchment: string
      blue: string
      copper: string
      gold: string
      limestone: string
      gray: string
    }
    startBuild: string
    extend: string
    addLeft: string
    addRight: string
    addAbove: string
    connection: string
    deleteBranch: string
    deleteBranchHint: string
    deleteRoot: string
    deleteRootHint: string
    cancel: string
    freeSheet: string
    startConnected: string
    restoreFree: string
    relationRoot: string
    relationAbove: (parent: string) => string
    relationLeft: (parent: string) => string
    relationRight: (parent: string) => string
    linksAvailable: (list: string) => string
    linksNone: string
    structureLabel: (name: string, relation: string, links: string) => string
    tabs: {
      style: string
      geometry: string
      color: string
      details: string
      actions: string
    }
    directions: {
      LEFT: string
      RIGHT: string
      TOP: string
    }
    groups: {
      foundations: string
      floors: string
      arcades: string
      attics: string
      roofs: string
      towers: string
      ornaments: string
    }
    errors: {
      incompatible: string
      overlap: string
      anchor: string
      foundation: string
      support: string
      limit: string
      parent: string
    }
    pieces: Record<CatalogId, string>
    city: {
      modeGroup: string
      modeArchitecture: string
      modeCity: string
      scene: string
      plotsNote: string
      build: string
      place: string
      removeBuilding: string
      availablePlot: (street: string) => string
      occupiedPlot: (type: string, author: string) => string
      location: (street: string) => string
      noRecording: string
      recording: string
      author: string
      authors: string
      authorsNote: string
      buildings: string
      students: string
      availablePlots: string
      hideRanking: string
      showRanking: string
      close: string
      saved: string
      restored: string
      savedHint: string
      prototypeAuthor: string
      buildingType: string
      stats: string
      zoomToolbar: string
    }
  }
  activity: {
    region: string
    demoBadge: string
    demoNote: string
    recordings: string
    totalSize: string
    activeStudents: string
    last7Days: string
    timeline: string
    rangeGroup: string
    range7: string
    range30: string
    rangeAll: string
    timelineEmpty: string
    timelineSummary: (count: number, peak: string, day: string) => string
    timelineTable: string
    legend: string
    who: string
    day: string
    count: string
    students: string
    sortGroup: string
    sortCount: string
    sortRecent: string
    sortName: string
    meterLabel: (name: string, count: number, size: string) => string
    stateRecent: string
    stateEarlier: string
    stateNone: string
    level: string
    name: string
    lastActivity: string
    indicator: string
    recentRecordings: string
    filename: string
    student: string
    uploaded: string
    fileSize: string
    format: string
    noRecordings: string
    noStudents: string
    unknownStudent: string
    loadError: string
    loading: string
    missingSnapshot: string
    invalidSnapshot: string
    snapshotBadge: string
    snapshotNote: string
    publishedNote: string
    synchronized: (when: string) => string
    windowCounts: (students: string, last30: string) => string
    stale: string
    filenamesOmitted: string
    generated: (when: string) => string
  }
}

export const EN: Messages = {
  lang: { group: 'Language', en: 'English', pl: 'Polski' },
  gate: {
    title: 'How do you want to shape sound?',
    simple: 'Simple',
    simpleCopy: 'Prepare a sample quickly: trim, fade, sound, and export.',
    listen: 'Listen',
    listenCopy: 'Shape sound by feeling.',
    control: 'Control',
    controlCopy: 'Shape sound by parameters.',
  },
  mode: {
    group: 'Interface mode',
    simple: 'Simple',
    sensory: 'Sensory',
    technical: 'Technical',
    simpleShort: 'Simple',
    sensoryShort: 'Sensory',
    technicalShort: 'Technical',
  },
  simple: {
    fileUntitled: 'No sample',
    cut: 'Cut',
    trim: 'Trim',
    setStart: 'Set start',
    setEnd: 'Set end',
    length: (value) => `Length: ${value} s`,
    startEnd: 'Start and end',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    fadeNone: 'None',
    fadeShort: 'Short',
    fadeMedium: 'Medium',
    fadeLong: 'Long',
    fadeInNone: 'None',
    fadeInShort: 'Short',
    fadeInMedium: 'Medium',
    fadeInLong: 'Long',
    fadeOutNone: 'None',
    fadeOutShort: 'Short',
    fadeOutMedium: 'Medium',
    fadeOutLong: 'Long',
    fadeInAria: (step) => `Fade in: ${step}`,
    fadeOutAria: (step) => `Fade out: ${step}`,
    regionStartAria: (value) => `Sample start: ${value} seconds`,
    regionEndAria: (value) => `Sample end: ${value} seconds`,
    closeSheet: 'Close',
    levelVolume: 'Even out',
    levelHint: 'Bring the selection up to a steady level.',
    levelDone: 'Level evened out',
    tone: 'Sound',
    moreTones: 'More options',
    lessTones: 'Fewer options',
    customTone: 'Custom',
    amount: 'Amount',
    amountLess: 'Less',
    amountMore: 'More',
    amountNone: 'None',
    amountSubtle: 'Subtle',
    amountStrong: 'Strong',
    edit: 'Edit',
    sound: 'Sound',
    effects: 'Effects',
    selection: 'Selection',
    trimToSelection: 'Trim to selection',
    clearSelection: 'Clear',
    toneGroup: 'Tone',
    clarity: 'Clarity',
    level: 'Level',
    evenOut: 'Even out',
    gain: 'Gain',
    gainValue: (db) => `${db} dB`,
    gainAria: (db) => `Gain ${db} decibels`,
    tail: 'Effect tail',
    tailOn: 'With tail',
    tailOff: 'Without tail',
    reverb: 'Reverb',
    delay: 'Delay',
    reverbHint: 'Adds a sense of space.',
    delayHint: 'Adds repeating echoes.',
    effectOff: 'Off',
    effectOn: 'On',
    enable: 'Enable',
    spaceSmall: 'Small',
    spaceMedium: 'Medium',
    spaceLarge: 'Large',
    echoShort: 'Short',
    echoMedium: 'Medium',
    echoLong: 'Long',
    advanced: 'Advanced processing is active.',
    openTechnical: 'Open Technical',
    resetChanges: 'Reset changes',
    moreEdit: 'More edit controls',
    customEffect: 'Custom',
    autoFix: 'Improve automatically',
    autoDone: 'Sound improved',
    compare: 'Compare',
    original: 'Original',
    after: 'After',
    undo: 'Undo',
    redo: 'Redo',
    restore: 'Reset changes',
    restoreConfirm: 'Clears fades, tone, reverb, and delay. The loaded sample stays.',
    restoreYes: 'Reset',
    restoreNo: 'Keep edits',
    save: 'Export',
    saveTitle: 'Export',
    saveName: 'Name',
    saveFormat: 'Format',
    saveFile: 'Export',
    moreSettings: 'More settings',
    hideSettings: 'Fewer settings',
    sampleRate: 'Sample rate',
    bitDepth: 'Bit depth',
    channels: 'Channels',
    stereo: 'Stereo',
    mono: 'Mono',
    wav: 'WAV',
    mp3: 'MP3',
    loadSample: 'Open a sample',
    play: 'Play',
    pause: 'Pause',
    clock: (now, total) => `${now} / ${total}`,
    tones: {
      natural: {
        label: 'Natural',
        hint: 'No tone change.',
        aria: 'Tone: natural',
      },
      moreBass: {
        label: 'More bass',
        hint: 'Lifts the low end.',
        aria: 'Tone: more bass',
      },
      lessBass: {
        label: 'Less bass',
        hint: 'Reduces the low end.',
        aria: 'Tone: less bass',
      },
      brighter: {
        label: 'Brighter',
        hint: 'Opens the top.',
        aria: 'Tone: brighter',
      },
      warmer: {
        label: 'Warmer',
        hint: 'More body, a softer top.',
        aria: 'Tone: warmer',
      },
      lessHarsh: {
        label: 'Less harsh',
        hint: 'Soften sharp highs.',
        aria: 'Tone: less harsh',
      },
      clearer: {
        label: 'Clearer',
        hint: 'Less mud, a little more presence.',
        aria: 'Clarity: clearer',
      },
      softer: {
        label: 'Softer',
        hint: 'Rolls off the top.',
        aria: 'Clarity: softer',
      },
    },
  },
  header: {
    loadSample: 'Load sample',
    untitled: 'No sample',
    record: 'Record',
    stop: 'Stop',
    rec: 'Rec',
    lfoCenter: 'LFO control center',
    settings: 'Settings',
    resetTitle: 'Reset application',
    resetConfirm: 'Reset current FIELD session?',
    resetCancel: 'Cancel',
    resetAction: 'Reset',
    manual: 'Manual',
    mono: 'Mono',
    stereo: 'Stereo',
    channels: (n) => `${n} ch`,
  },
  settings: {
    close: 'Close settings',
    closeLfo: 'Close LFO center',
    hint:
      'iPhone/iPad: Load sample opens Files. Safari can decode WAV, AIFF, MP3, M4A/AAC, and CAF. OGG and WebM usually fail on iOS.',
    loadSample: 'Load sample',
    recordMic: 'Record microphone',
    stopRecording: 'Stop recording',
    savePreset: 'Save preset',
    loadPreset: 'Load instrument preset',
    loadPresetHint: 'Opens a FIELD JSON file saved with Save preset. Restores the full engine, chain, and EQ.',
    loadDemo: 'Generate demo sample',
    editSample: 'Edit sample',
    resetAll: 'Reset all',
    revertSource: 'Revert to source',
    undo: 'Undo',
    redo: 'Redo',
    saveToLibrary: 'Save to library',
    saveToLibraryPrompt: 'Name this instrument preset for this browser',
    libraryHint: 'Library lives in this browser. Export a pack to share or back up. There is no account server.',
    libraryEmpty: 'No saved library presets yet.',
    exportLibrary: 'Export library',
    deletePreset: (name) => `Delete ${name}`,
    explainMarks: 'Explain this',
    explainMarksLabel: 'Show info marks',
    explainMarksHint: 'Shows ⓘ beside inspector headings. F1 still explains the focused control when the marks are hidden.',
  },
  workspace: {
    interface: 'Technical interface',
    classic: 'Classic',
    workspace: 'Workspace',
    experimental: 'Experimental',
    settingHint: 'Workspace is the default Technical layout. It uses the same engine, project, and sound. Classic is available here.',
    workspaces: 'Technical workspaces',
    context: 'Context',
    close: 'Close',
    closeContext: 'Close context',
    more: 'More',
    less: 'Less',
    moreEdit: 'More edit commands',
    analyzerLayer: 'Analyzer layer',
    analyzerSettings: 'Analyzer settings',
    eqLayout: 'EQ layout',
    eqStrips: 'Show EQ strips',
    eqInspector: 'Show inspector',
    hearingNote: 'Full hearing analysis is this workspace. The quick panel is still available.',
    hearingQuick: 'Quick view',
  },
  runtime: {
    refresh: 'Refresh app',
    refreshing: 'Refreshing',
    refreshTitle: 'Reload the installed app and drop stale caches',
    uiLoadTitle: 'Main-thread event-loop load. Not process CPU.',
  },
  banner: {
    audioBlocked: 'Audio is paused by the browser. Tap Play to resume.',
    inspector: 'Inspector',
  },
  mobile: {
    more: 'More',
    back: 'Back',
    view: 'View',
    analyzer: 'Analyzer',
    expandWorkspace: 'Expand workspace',
    collapseWorkspace: 'Exit full workspace',
    enterFocus: 'Enter Focus Mode',
    exitFocus: 'Exit Focus Mode',
    deleteBand: 'Delete band',
    expandContext: 'Show parameters',
    collapseContext: 'Hide parameters',
    on: 'On',
    off: 'Off',
    type: 'Type',
    addBand: 'Add band',
    addEq: 'Add EQ',
    freq: 'Freq',
    gain: 'Gain',
    q: 'Q',
    slope: 'Slope',
    context: 'Effect parameters',
  },
  focus: {
    enter: 'Enter Focus Mode',
    exit: 'Exit Focus Mode',
    caption: 'Focus',
    band: (index, type) => `Band ${index} · ${type}`,
    bandName: (index) => `Band ${index}`,
    addNode: 'Add node',
    deleteNode: 'Delete node',
    addAutomation: 'Add automation',
    lane: 'Lane',
    eq: 'EQ',
    auto: 'Auto',
    wave: 'Wave',
    waveFull: 'Waveform',
    fft: 'FFT',
    hearing: 'Hearing',
    more: 'More edit actions',
    fadeMs: (label, ms) => `${label}  ${ms} ms`,
    filters: 'Filters',
  },
  waveform: {
    empty: 'Load a sample to begin',
    editorAria: (fileName) => `Waveform, ${fileName}.`,
    editorEmpty: 'Waveform editor. No sample loaded.',
    editorSummary: (channels, duration, rate, playhead, selection) =>
      `${channels} Duration ${duration}. ${rate} Playhead ${playhead}. ${selection} Arrow keys move the playhead.`,
    selectionRange: (start, end, duration) => `Selection from ${start} to ${end}. Duration ${duration}.`,
    noSelection: 'No partial selection.',
    monoRecording: 'Mono recording.',
    stereoRecording: 'Stereo recording.',
    channelCount: (count) =>
      `${countNoun('en', count, { one: 'channel', other: 'channels' }, { one: 'kanał', few: 'kanały', many: 'kanałów' })}.`,
    sampleRate: (khz) => `Sample rate ${khz} kilohertz.`,
    loadDemo: 'Generate demo sample',
    edit: 'Edit',
    trim: 'Trim',
    trimTitle: 'Trim to selection',
    insertSilence: 'Insert silence',
    insertSilenceCaption: 'Gap',
    deleteSelection: 'Delete selection',
    deleteSelectionCaption: 'Del',
    muteSelection: 'Mute Selection',
    muteSelectionCaption: 'Mute',
    clearSelection: 'Clear selection',
    clearSelectionCaption: 'Clear',
    copySelection: 'Copy selection (Ctrl+C)',
    copyCaption: 'Copy',
    cutSelection: 'Cut selection (Ctrl+X)',
    cutCaption: 'Cut',
    pastePlayhead: 'Paste at playhead (Ctrl+V)',
    pasteCaption: 'Paste',
    moreEdits: 'More edits',
    moreEditsCaption: 'More',
    setPlayheadStart: 'Set selection start',
    setPlayheadEnd: 'Set selection end',
    toSampleStart: 'Go to start',
    toSampleEnd: 'Go to end',
    displayGroup: 'Display',
    undo: 'Undo',
    redo: 'Redo',
    fitSample: 'Fit sample',
    fit: 'Fit',
    fitSelection: 'Fit selection',
    sel: 'Sel',
    zoomSelection: 'Zoom to selection',
    zoom: 'Zoom',
    normalizeView: 'Normalize view',
    norm: 'Norm',
    resetZoom: 'Reset zoom',
    reset: 'Reset',
    waveTitle: 'Single-track waveform',
    wave: 'Wave',
    multiTitle: 'Multi-track waveform',
    multi: 'Multi',
    spectrum: 'Spectrum',
    splitTitle: 'Split view',
    split: 'Split',
    eqTitle: 'EQ console',
    eqEnable: 'Enable EQ',
    eqOn: 'EQ on',
    eqAdd: 'Add EQ',
    tracksTitle: 'Tracks and mixer',
    tracks: 'Tracks',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    scrollZoom: 'Scroll to zoom',
    mono: 'Mono',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    autoFade: 'Auto',
    autoFadeTitle: 'Auto fade — 10 ms fade-in and fade-out',
    hold: 'Hold',
    holdOn: 'Hold is looping this fragment. The FFT and EQ graph follows the loop. Press to play on.',
    holdOff: 'Loop the fragment at the playhead. The FFT and EQ graph follows that loop.',
    resizeWave: 'Resize waveform',
    resizeSplit: 'Resize waveform and FFT',
    regionStart: 'Region start',
    regionEnd: 'Region end',
    tracksAria: 'Tracks',
    overviewAria: 'Sample overview. Click to set the playhead.',
    zoomViewStart: 'Zoom view start',
    zoomViewEnd: 'Zoom view end',
    viewGroup: 'View',
    automationTitle: 'Automation',
    automationCaption: 'Auto',
    automationEffect: 'Effect',
    automationParameter: 'Parameter',
    automationHint: 'Double-click the waveform to add a node. Drag moves it. Delete removes the selected node. Click a segment to set Linear, Smooth, or Step. Playback follows every automated parameter; this list only chooses the envelope you edit.',
    automationLane: 'Automation lane',
    automationNode: (label) => `Automation node, ${label}`,
    automationComb: 'EQ comb',
    automationAdd: 'Add parameter',
    automationAddAction: 'Add',
    automationRemove: 'Remove',
    automationRemoveTitle: 'Remove automation',
    automationRemoveConfirm: 'Remove this envelope? The effect stays.',
    automationConfirm: 'Remove',
    automationCancel: 'Cancel',
    automationEmpty: 'No automated parameters yet.',
    automationColor: 'Color',
    automationColorChoose: 'Choose automation color',
    automationColorOption: (index) => `Color ${index}`,
    automationCurve: 'Curve',
    automationSegmentCurve: 'Curve — selected segment',
    automationCurveIdle: 'Select this automation, then a segment.',
    automationLinear: 'Linear',
    automationSmooth: 'Smooth',
    automationStep: 'Step',
    automationTension: 'Tension',
    automationTensionHandle: 'Curve tension',
    automationNodes: 'Nodes',
    automationEditing: 'Editing',
    automationLegend: 'Automated parameters',
    automationAllUsed: 'Every parameter of this effect already has automation.',
    automationSegmentHint: 'Click a segment on the waveform.',
    background: 'Add background',
    backgroundCaption: 'Add background',
    backgroundLoad: 'Load Image',
    backgroundOpacity: 'Opacity',
    backgroundGrain: 'Grain',
    backgroundRemove: 'Remove',
    backgroundSession: 'Image stays for this session only. With this panel open, paste a JPG or PNG.',
    backgroundReject: 'Use a JPG or PNG.',
    backgroundPaste: 'Paste image',
    spectral: {
      title: 'Spectral Bands',
      experimental: 'Experimental',
      enable: 'Spectral Bands',
      on: 'On',
      off: 'Off',
      subBass: 'SUB / BASS',
      lowMid: 'LOW-MID',
      highMid: 'HIGH-MID',
      high: 'HIGH',
      gain: 'Gain',
      mute: 'Mute',
      solo: 'Solo',
      crossoverLow: 'Low split',
      crossoverMid: 'Mid split',
      crossoverHigh: 'High split',
      analyseSum: 'FFT sum',
      analyseBand: 'Analyze band',
      computing: 'Splitting…',
    },
  },
  transport: {
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    playFromStart: 'Play from start of sample',
    playFromStartTitle: 'Play from the start of the sample, not the selection',
    more: 'More',
    killFx: 'Kill FX',
    killFxTitle: 'Kill delay and reverb tails',
    killNoise: 'Kill noise',
    killNoiseTitle: 'Mutes the distortion Noise generator only — not mic feedback or other FX. Use Kill FX for delay/reverb tails.',
    loop: 'Loop',
    scrub: 'Scrub mode',
    scrubRange: 'Range',
    scrubSample: 'Sample',
    undo: 'Undo',
    redo: 'Redo',
    playhead: 'Playhead',
    selection: 'Selection',
    bpmTitle: 'Sample tempo used by delay/reverb sync',
    selStart: 'Sel start',
    selStartTitle: 'Jump the playhead to the start of the selection (loop in)',
    selEnd: 'Sel end',
    selEndTitle: 'Jump the playhead to the end of the selection (loop out)',
    export: 'Export',
    use: 'Use',
    useAsSample: 'Use as Sample',
    useTitle: 'Bake the current selection into a new sample (fades included) and load it as the working clip.',
    useHint: 'Bakes this selection (with fades) into the working sample.',
    selectionSr: (start, end) => `Selection ${start} to ${end}`,
  },
  chain: {
    aria: 'Signal chain',
    group: 'Chain',
    addEffect: 'Add effect',
    addAfter: (name) => `Add effect after ${name}`,
    enable: (name) => `Enable ${name}`,
    bypass: (name) => `Bypass ${name}`,
    enableShort: 'Enable',
    bypassShort: 'Bypass',
    kill: (name) => `Kill ${name}`,
    killTitle: (name) => `Kill ${name} tails`,
    moveEarlier: 'Move earlier in the signal chain',
    moveLater: 'Move later in the signal chain',
    moveBefore: (moved, other) => `Move ${moved} before ${other}`,
    moveAfter: (moved, other) => `Move ${moved} after ${other}`,
    movedBefore: (moved, other) => `${moved} moved before ${other}.`,
    movedAfter: (moved, other) => `${moved} moved after ${other}.`,
    bypassOn: (name) => `${name} bypass, on`,
    bypassOff: (name) => `${name} bypass, off`,
    bypassedTag: 'Bypassed',
    dragHint: 'Drag to reorder this effect. Input and Output stay fixed.',
  },
  modules: {
    gain: 'Input',
    grain: 'Grain',
    eq: 'EQ',
    distortion: 'Distortion',
    filter: 'Filter',
    midside: 'Mid/Side',
    delay: 'Delay',
    reverb: 'Reverb',
    compressor: 'Compressor',
    limiter: 'Limiter',
    output: 'Output',
  },
  inspector: {
    edit: 'Edit',
    start: 'Start',
    end: 'End',
    length: 'Length',
    zeroCrossing: 'Zero crossing',
    snapStart: 'Snap Start',
    snapEnd: 'Snap End',
    grainFadesHelp:
      'Grain plays from the cursor, so region fades are easy to miss. Use Playback to hear fade-in and fade-out on the selection.',
    fadeIn: 'Fade In',
    fadeOut: 'Fade Out',
    curve: 'Curve',
    linear: 'Lin',
    equalPower: 'EqPow',
    exponential: 'Exp',
    sCurve: 'S',
    fadeHelp:
      'The circle warps the selected fade inside the Lin / EqPow / Exp / S law. Fade starts on the loop edge. Higher Q pulls the knee earlier.',
    fadeHelpOut: 'fade-out',
    fadeHelpIn: 'fade-in',
    auto10: 'Auto 10 ms',
    fadesOff: 'Fades Off',
    trim: 'Trim',
    normalize: 'Normalize',
    reverse: 'Reverse',
    effectSettings: 'Effect settings',
    main: 'Main',
    advanced: 'Advanced',
    gain: 'Gain',
    panning: 'Panning',
    bypassed: 'Bypassed',
    active: 'Active',
    mute: 'Mute',
    sampleTempo: 'Sample tempo',
    source: 'Source',
    taps: 'Taps',
    hide: 'Hide inspector',
    show: 'Show inspector',
    interpolation: 'Interpolation',
    interpAlgo: 'Resampling quality. Matters when Pitch leaves 0 semitones.',
    interpFast: 'Fast',
    interpSmooth: 'Smooth',
    interpHigh: 'High Quality',
    interpFastTitle:
      'Linear resampling. Lowest CPU. Rougher, with more aliasing, when Pitch moves far from 0. Speed alone barely changes this, because each grain still plays at the original rate.',
    interpSmoothTitle:
      'Cubic resampling for everyday playback. Smoother than Fast between samples, still light on CPU. Bright material pitched up can still alias.',
    interpHighTitle:
      'Windowed sinc. Band-limits the read so high pitches stay cleaner. Higher CPU. A bounce uses a longer kernel than live playback.',
    stretchHelp:
      'Speed changes tempo without pitch. Pitch transposes without changing tempo. Grain Overlap is how much consecutive time-stretch grains cover each other: higher is smoother and softer on attacks, lower keeps transients clearer. Grains always overlap, so the train does not gap. Interpolation rebuilds samples between the original ones. It is most audible when Pitch leaves 0 — especially pitching up — and stays subtle if you only change Speed.',
    remove: 'Remove',
  },
  theme: {
    group: 'Theme',
    named: (name) => `Theme: ${name}`,
    system: 'System',
    custom: 'Custom',
    myThemes: 'My themes',
    elementColors: 'Element colors',
    help: 'Starts from the theme you had open. Save to keep it in My themes.',
    themeName: 'Theme name',
    save: 'Save',
    deleteNamed: (name) => `Delete ${name}`,
    colors: {
      bgApp: 'Background',
      bgPanel: 'Panel',
      bgElevated: 'Surface',
      textPrimary: 'Text',
      accent: 'Accent',
      waveform: 'Waveform',
      spectrum: 'Spectrum',
      playhead: 'Playhead',
      selection: 'Selection',
    },
    names: {
      'studio-dark': 'Studio Dark',
      'midnight-blue': 'Midnight Blue',
      oxide: 'Oxide',
      forest: 'Forest',
      'light-studio': 'Light Studio',
      oled: 'OLED',
      dusk: 'Dusk',
      'pop-art': 'Pop Art',
      classic: 'Classic',
      energetic: 'Energetic',
      'chaos-theory': 'Chaos Theory',
      neon: 'Neon',
      manga: 'Manga',
      'black-white': 'Black & White',
      noire: 'Noire',
      oscilloscope: 'Oscilloscope',
      custom: 'Custom',
      'soft-slate': 'Soft Slate',
      'warm-paper': 'Warm Paper',
    },
    categories: {
      monochromatic: 'Monochromatic',
      color: 'Color',
      light: 'Light',
      eyes: 'Eyes Friendly',
    },
  },
  sensory: {
    strings: 'Strings',
    stringsAria: 'Show parameter strings',
    stringsHideAria: 'Hide parameter strings',
    menu: 'Menu',
    play: 'Play',
    pause: 'Pause',
    playPause: 'Play or pause',
    loadDemo: 'Generate demo sample',
    rest: 'rest',
    restAll: 'Rest all sensory effects to the starting position',
    restLevel: 'rest',
    doubleClickRest: 'Double-click to rest.',
    lfoConnected: 'LFO connected.',
    parameterStrings: 'Parameter strings',
    overview: 'Sample overview',
    feelingsLeft: 'Effect feelings, left',
    feelingsRight: 'Effect feelings, right',
    startingPlaces: 'Starting places',
    surprise: 'surprise me',
    atmosphere: 'Atmosphere',
    atmosphereNamed: (name) => `Atmosphere: ${name}`,
    themes: 'Themes',
    color: 'Color',
    colorSoundAria: 'Sound color. Sideways changes the color, up and down changes light and dark. Double-click to rest.',
    colorSoundRest: 'rest',
    colorSoundRestAria: 'Return the sound color to rest',
    colorSoundLight: 'light',
    colorSoundDark: 'dark',
    colorSoundLabel: 'Color Sound',
    colorSoundShow: 'Show Color Sound',
    colorSoundHide: 'Hide Color Sound',
    places: 'Places',
    selectRegion: 'Drag the sound to slide it. Edges trim. Empty overview chooses a new fragment. Double-click to play.',
    overviewDrag: 'Drag the highlighted fragment to slide it. Drag empty space to choose a new one. Edges trim.',
    timeShorter: 'shorter',
    timeLonger: 'stretched',
    timeAria: 'Time, shorter and faster to longer and stretched. Double-click to rest.',
    pitchLower: 'lower',
    pitchHigher: 'higher',
    pitchAria: 'Pitch, lower to higher. Double-click to rest.',
    balanced: 'balanced',
    atmospheres: {
      bloom: 'Bloom',
      range: 'Range',
      ember: 'Ember',
      tide: 'Tide',
      canopy: 'Canopy',
      mirror: 'Mirror',
      canyon: 'Canyon',
      gleam: 'Gleam',
    },
    emotions: {
      intimate: 'intimate',
      distant: 'distant',
      fragile: 'fragile',
      heavy: 'heavy',
      dreamlike: 'dreamlike',
      raw: 'raw',
      floating: 'floating',
      restless: 'restless',
      tender: 'tender',
      broken: 'broken',
    },
    feelings: {
      character: { label: 'character', from: 'tight', to: 'open', aria: 'Character, tight to open. Double-click to rest.' },
      space: { label: 'space', from: 'close', to: 'vast', aria: 'Space, close to vast. Double-click to rest.' },
      echo: { label: 'echo', from: 'dry', to: 'echo', aria: 'Echo, dry to echo. Double-click to rest.' },
      grain: { label: 'grain', from: 'solid', to: 'grain', aria: 'Grain, solid to layered. Double-click to rest.' },
      dirt: { label: 'dirt', from: 'clean', to: 'dirt', aria: 'Dirt, clean to grit. Double-click to rest.' },
      tight: { label: 'tight', from: 'open', to: 'tight', aria: 'Tight, open to compressed. Double-click to rest.' },
      mod: { label: 'mod', from: 'still', to: 'mod', aria: 'Mod, still to modulated. Double-click to rest.' },
      drift: { label: 'drift', from: 'center', to: 'drift', aria: 'Drift, center to panorama. Double-click to rest.' },
      pan: { label: 'pan', from: 'still', to: 'pan', aria: 'Pan, still to orbiting. Double-click to rest.' },
      veil: { label: 'veil', from: 'clear', to: 'veil', aria: 'Veil, clear to distant. Double-click to rest.' },
      halo: { label: 'halo', from: 'bare', to: 'halo', aria: 'Halo, bare to blooming. Double-click to rest.' },
      well: { label: 'well', from: 'flat', to: 'well', aria: 'Well, flat to hollow. Double-click to rest.' },
      bloom: { label: 'bloom', from: 'still', to: 'bloom', aria: 'Bloom, still to rising cloud. Double-click to rest.' },
      plate: { label: 'plate', from: 'dry', to: 'plate', aria: 'Plate, dry to studio plate. Double-click to rest.' },
      spring: { label: 'spring', from: 'solid', to: 'spring', aria: 'Spring, solid to twang. Double-click to rest.' },
      shimmer: { label: 'shimmer', from: 'grounded', to: 'shimmer', aria: 'Shimmer, grounded to octave bloom. Double-click to rest.' },
      reverse: { label: 'reverse', from: 'forward', to: 'reverse', aria: 'Reverse, forward to swell. Double-click to rest.' },
      gate: { label: 'gate', from: 'open', to: 'gate', aria: 'Gate, open to chopped tail. Double-click to rest.' },
      fuzz: { label: 'fuzz', from: 'clean', to: 'fuzz', aria: 'Fuzz, clean to wool. Double-click to rest.' },
      crush: { label: 'crush', from: 'smooth', to: 'crush', aria: 'Crush, smooth to bitcrush. Double-click to rest.' },
      tape: { label: 'tape', from: 'clean', to: 'tape', aria: 'Tape, clean to saturated tape. Double-click to rest.' },
      fold: { label: 'fold', from: 'linear', to: 'fold', aria: 'Fold, linear to wavefold. Double-click to rest.' },
      vinyl: { label: 'vinyl', from: 'clean', to: 'vinyl', aria: 'Vinyl, clean to dusty record. Double-click to rest.' },
      sweep: { label: 'sweep', from: 'open', to: 'sweep', aria: 'Sweep, open to moving filter. Double-click to rest.' },
      dark: { label: 'dark', from: 'open', to: 'dark', aria: 'Dark, open to a warm low-pass. Double-click to rest.' },
      thin: { label: 'thin', from: 'full', to: 'thin', aria: 'Thin, full to high-pass. Double-click to rest.' },
      phone: { label: 'phone', from: 'wide', to: 'phone', aria: 'Phone, wide to telephone band. Double-click to rest.' },
      notch: { label: 'notch', from: 'full', to: 'notch', aria: 'Notch, full to a hollow cut. Double-click to rest.' },
      peak: { label: 'peak', from: 'flat', to: 'peak', aria: 'Peak, flat to a singing bump. Double-click to rest.' },
      comb: { label: 'comb', from: 'smooth', to: 'comb', aria: 'Comb, smooth to toothed. Double-click to rest.' },
      melt: { label: 'melt', from: 'fixed', to: 'melt', aria: 'Melt, fixed to morphing filter. Double-click to rest.' },
    },
  },
  export: {
    title: 'Export sample',
    original: 'Original',
    hintCodec: 'FLAC and AIFF are listed only when this build can encode them.',
    estimated: (time) => `Estimated duration ${time}`,
    exportProject: 'Export',
    exportSelection: 'Export selection',
    selectionUnavailable: 'Select a region shorter than the sample.',
    preparing: 'Preparing…',
    rendering: 'Rendering…',
    encoding: 'Encoding…',
    exportFailed: 'Export failed.',
    tailHint: 'Effect tails are included until the signal decays.',
    keepTail: 'Keep audio tail',
    tailDropped: 'The file ends with the audio. Effect tails are not kept.',
    cancel: 'Cancel',
    applyFades: 'Apply fade in / out',
    applyGain: 'Apply gain',
    applyReverse: 'Apply reverse',
    applyNormalize: (db) => `Normalize to ${db} dBFS`,
    depth16: '16-bit PCM',
    depth24: '24-bit PCM',
    depth32: '32-bit float',
    checkTitle: 'Export check',
    checkRange: 'Export range',
    fullAudio: 'Full audio',
    selection: 'Selection',
    status: 'Status',
    settingsValid: 'Settings valid',
    warning: 'Warning',
    error: 'Error',
    info: 'Info',
    noAudio: 'No audio is loaded.',
    noAudioAction: 'Load an audio file, then return to export.',
    loadAudio: 'Load audio',
    invalidRange: 'The export range is not valid.',
    zeroLength: 'The export range has no length.',
    outsideRange: 'The export range is outside the audio.',
    unsupportedFormat: 'This format is not supported.',
    unsupportedRate: 'This sample rate is not supported.',
    unsupportedDepth: 'This bit depth is not supported.',
    effectsIncluded: (names) => `Active effects are included: ${names}.`,
    effectsLabel: 'Effects',
    effectsNone: 'None',
    clipUnknown: 'Export level is not measured before the file is written. This check does not confirm the file is free of clipping.',
    clipDetected: 'The measured export output peaks above full scale.',
    clipWithin: 'The measured export output stays within full scale.',
    resampleNote: 'The file rate differs. Export uses the existing resampler.',
    swapNeedsStereo: 'Swap needs two channels. The file stays mono.',
    help: 'Checks these settings. It does not change the audio.',
    rateHelp: 'Selected sample rate. Internal processing stays floating point.',
    depthHelpPcm: 'Integer PCM. No dither. Internal processing stays floating point.',
    depthHelpDither: 'Integer PCM. 16-bit export applies TPDF dither.',
    depthHelpFloat: 'Floating-point file, not integer PCM. No dither.',
    channelHelp: 'Output channel format written to the file.',
    rangeHelp: 'Start, end, and duration must sit inside the audio.',
    formatHelp: 'WAV is the format this export can write.',
    swap: 'Swap L/R',
    fileRate: 'File sample rate.',
    previewTitle: 'Export preview',
    preview: 'Preview',
    previewStop: 'Stop',
    previewStopAria: 'Stop preview',
    previewPreparing: 'Preparing preview…',
    previewReady: 'Preview ready',
    previewPlaying: 'Preview playing',
    previewStopped: 'Preview stopped',
    previewFailed: 'Preview failed',
    previewUnavailable: 'Preview unavailable',
    previewStopPlayback: 'Stop playback before starting export preview.',
    previewStopPlaybackAction: 'Stop playback',
    previewDuration: 'Preview duration',
    previewScope: 'Preview range',
    previewRange: (start, end) => `Preview ${start}–${end}`,
    previewOutside: 'Playhead is outside the export range. Preview starts at the beginning of that range.',
    previewNotEncoded: 'Processed audio, not the encoded file.',
    previewNormalize: 'Normalize applies to the whole file. This window is not re-normalized.',
    previewTail: 'The tail matches export. Audio from before this window is not in the delay or reverb.',
    previewSpeed: 'Playback speed is not part of the export render.',
    previewPitch: 'Pitch is not part of the export render.',
    previewMonitor: 'Listening uses the monitor output, including its safety limiter.',
    previewBusy: 'Export is already running.',
    previewSeconds: (seconds) => `${seconds} s`,
  },
  mix: {
    mixer: 'Mixer',
    tracks: 'Tracks',
    trackName: 'Track name',
    mix: 'Mix',
    output: 'Output',
    master: 'Master',
    outputMix: 'Output mix',
    out: 'Out',
    monitor: 'Monitor',
    monitorHint: 'Mic level in the speakers while recording. Keep at 0 without headphones to avoid feedback.',
    masterHint: 'Sums every track after its own effect chain.',
    track: 'Track',
    openFx: 'Edit track effects',
    fx: 'FX',
    fxCount: (count) => `FX ${count}`,
    single: 'Single',
    multi: 'Multi',
    singleTitle: 'Single track view',
    multiTitle: 'Multi track view',
    loadAudio: 'Load audio',
    loadSample: 'Load sample',
    loop: 'Loop',
    loopTrack: 'Loop track',
    setLoop: 'Set loop',
    loopStart: 'Loop start',
    loopEnd: 'Loop end',
    sourceEnd: 'Source end',
    tracksView: 'Tracks',
    mixerView: 'Mixer',
    direction: 'Direction',
    input: 'Input',
    trackInput: 'Track input',
    dropAudio: 'Drop audio here',
    replaceDrop: 'Replace audio',
    mixMore: 'Mix',
    replaceAudio: 'Replace',
    clearTrack: 'Clear',
    volume: 'Volume',
    pan: 'Pan',
    mid: 'Mid',
    side: 'Side',
    midSide: 'Mid/Side',
    trackMix: 'Track mix',
    muteTrack: (name) => `Mute ${name} track`,
    soloTrack: (name) => `Solo ${name} track`,
    volumeTrack: (name) => `Volume ${name} track`,
    panTrack: (name) => `Pan ${name} track`,
    midTrack: (name) => `Mid level ${name} track`,
    sideTrack: (name) => `Side level ${name} track`,
    midSideTrack: (name) => `Mid/Side ${name} track`,
    mono: 'Mono',
    stereo: 'Stereo',
    expandStereo: 'Expand channels',
    collapseStereo: 'Collapse channels',
    rename: 'Rename',
    color: 'Track color',
    empty: 'Empty track',
    replaceAsk: 'Replace audio?',
    replaceYes: 'Replace',
    replaceNo: 'Cancel',
    left: 'Left',
    right: 'Right',
    reorder: 'Reorder track',
  },
  meters: {
    resetClip: 'Reset clip',
    resetClipTitle: 'Reset clip indicator',
    clip: 'Clip',
    range: 'Meter range',
    rangeLabel: 'Range',
    strip: 'Output meters',
    peak: (channel) => `Peak meter ${channel}`,
    clipState: (state) => `Clip indicator, ${state}. Activate to reset.`,
    clipOn: 'clipping',
    clipOff: 'clear',
    readout: (channel, value) => `${channel} peak ${value}`,
  },
  lfo: {
    center: 'LFO center',
    lead: (slots) => `Running modulators and their targets. Up to ${slots} LFOs on each effect.`,
    storedValue: 'Stored value (LFO zero)',
    typeValue: 'Double-click to type a value',
  },
  modulation: {
    title: (name) => `${name} modulation`,
    rate: 'Rate',
    depth: 'Depth',
    shape: 'Shape',
    lfo: 'LFO',
    more: 'More',
    remove: 'Remove',
    close: 'Close',
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    activeAria: 'LFO active',
    inactiveAria: 'LFO inactive',
    automationOn: 'Automation is also active. Its curve stays separate from the LFO.',
    automationOff: 'No automation on this parameter.',
    addAutomation: 'Add automation',
    affordance: (name, depth, automation) =>
      depth
        ? `Modulate ${name}, LFO ${depth}${automation ? ', automation active' : ''}`
        : `Modulate ${name}`,
  },
  random: {
    chaos: 'Chaos',
    title: (name) => `Random ${name}`,
    onceFor: (name) => `Randomize ${name}`,
    autoFor: (name) => `Auto Random ${name}`,
    now: 'Randomize now',
    auto: 'Auto Random',
    on: 'On',
    off: 'Off',
    free: 'Free',
    sync: 'Sync',
    rate: 'Rate',
    division: 'Division',
    intensity: 'Intensity',
    transition: 'Transition',
    step: 'Step',
    smooth: 'Smooth',
    randomizeEffect: 'Randomize effect',
    randomizeBand: 'Randomize band',
    randomizeEq: 'Randomize EQ',
    parameterTip: 'Randomize parameter',
    effectAria: (name) => `Randomize ${name}`,
    setupTip: 'Random setup',
    setupAria: 'Open randomization settings',
    setupTitle: (name) => `Random setup — ${name}`,
    targets: 'Targets',
    modes: 'Selects / Modes',
    all: 'All',
    none: 'None',
    behavior: 'Behavior',
    timing: 'Timing',
    range: 'Range',
    autoAllowed: 'Allowed',
    showTarget: (name) => `Show ${name} random settings`,
    hideTarget: (name) => `Hide ${name} random settings`,
    mixed: 'Mixed',
    appliesTo: 'Applies to selected targets',
    eqTypeNote: 'A full band also randomizes filter type and slope.',
    noEqBands: 'Turn a band on to choose targets.',
    effectMenu: (name) => `Random ${name}`,
    chaosHint: 'Auto Random needs Chaos. One click still randomizes now.',
    budget: 'Event rate is capped so the instrument stays responsive.',
    warning:
      'Chaos enables automatic and multi-parameter random generation. It can create extreme sound changes, sudden level changes, higher CPU use, and feedback or resonance extremes inside protected limits.',
    cancel: 'Cancel',
    enable: 'Enable Chaos',
    randomize: 'Randomize',
    randomizeNow: 'Randomize now',
    setup: 'Random setup',
    parameters: 'Parameters',
    selects: 'Selects / modes',
    scope: 'Scope',
    scopeWhole: 'Whole EQ',
    scopeBand: 'Selected band',
    filterCount: 'Filter count',
    countRandom: 'Random 1–6',
    frequency: 'Frequency',
    gain: 'Gain',
    q: 'Q',
    filterType: 'Filter type',
    slope: 'Slope',
    wholeEq: 'Generate EQ',
    oneShot: 'Filter type changes on Randomize now.',
    direction: 'Direction',
    delayType: 'Delay type',
    reverbType: 'Reverb type',
    distortionType: 'Distortion type',
    lfoRate: 'Rate',
    lfoDepth: 'Depth',
    lfoShape: 'Shape',
    lfoPhase: 'Phase',
    lfoConnect: 'Randomize connects this LFO if it is not routed yet.',
  },
  a11y: {
    title: 'Accessibility',
    open: 'Accessibility',
    back: 'Back',
    accessTitle: 'FIELD ACCESS',
    accessSubtitle: 'Make FIELD work your way.',
    visualComfort: 'Visual comfort',
    interfaceSize: 'Interface Size',
    interfaceSizeHelp: 'Adjust the size of interface controls and surrounding UI elements.',
    textSize: 'Text Size',
    textSizeHelp: 'Increase text size without enlarging the entire interface.',
    interaction: 'Interaction',
    theme: 'High Contrast / Low Vision Theme',
    themeHelp: 'Switches to a higher-contrast theme for low vision. The sound does not change.',
    reduceMotion: 'Reduced Motion',
    reducedMotionHelp: 'Reduce unnecessary animations.',
    reducedMotionSystem: "Your device's reduced-motion setting is also respected.",
    larger: 'Larger Controls',
    largerHelp: 'Make interactive controls easier to use.',
    focus: 'Enhanced Focus Visibility',
    focusHelp: 'Make keyboard focus easier to see.',
    highVisibility: 'High Visibility Controls',
    highVisibilityHelp: 'Make important controls, selections and editing handles easier to see.',
    cognitive: 'Cognitive & attention',
    attentionFocus: 'Attention Focus',
    attentionFocusHelp: 'Highlight controls related to your current editing activity.',
    attentionStrength: 'Focus Strength',
    attentionStrengthHelp: 'Subtle is a small difference. Clear is easier to see. Neither one hides text or flashes.',
    attentionSubtle: 'Subtle',
    attentionClear: 'Clear',
    attentionHighlight: 'Highlight Related Controls',
    attentionHighlightHelp: 'Mark the controls that belong to this edit.',
    attentionReduce: 'Reduce Unrelated Emphasis',
    attentionReduceHelp: 'Quiet decorative contrast around other areas. Text stays readable.',
    predictableLayout: 'Predictable Layout',
    predictableLayoutHelp: 'Keep tools and panels in consistent locations while you work.',
    stablePanels: 'Stable Panels',
    stablePanelsHelp: 'Keep the inspector, effect chain, and transport in steady places. Their contents scroll inside.',
    rememberLayout: 'Remember Workspace Layout',
    rememberLayoutHelp: 'Remember the workspace and panel arrangement for each mode.',
    reduceLayout: 'Reduce Layout Movement',
    reduceLayoutHelp: 'Reduce panel animation and other layout motion.',
    restoreLayout: 'Restore workspace layout',
    restoreLayoutHelp: 'Puts panels back in their usual places. The sound and the other accessibility switches stay as they are.',
    layoutRestored: 'Workspace layout restored.',
    on: 'On',
    off: 'Off',
    saved: 'These choices last while this page is open. A reload starts from the defaults. They are not kept in the browser yet.',
    restore: 'Restore accessibility defaults',
    restoreHelp: 'Resets these preferences. It does not delete audio, effects, automation, or the project.',
    restored: 'Accessibility defaults restored.',
    more: 'More accessibility options',
    tips: 'Tooltips / parameter descriptions',
    tipsHelp: 'Shows a short description when you point at a control. The control name stays either way.',
    sr: 'Screen reader optimizations',
    srHelp: 'Keeps extra live updates quiet. Names, values, and keyboard access stay on.',
    shortcuts: 'Transport keyboard shortcuts',
    shortcutsHelp:
      'When on, Space plays or pauses. With Keyboard-First, Drag-Free Editing, screen reader optimizations, and Accessible Waveform Navigation off, it does that even while a button, switch, or slider has focus. A text field still takes the character. Open dialogs keep Space for their own controls. Tab is never captured.',
    shortcutsTitle: 'Keyboard shortcuts',
    shortcutTab: 'Tab / Shift+Tab: move between controls',
    shortcutArrows: 'Arrow keys: change the focused knob or slider',
    shortcutShiftArrows: 'Shift+Arrow: fine adjustment',
    shortcutHomeEnd: 'Home / End: minimum / maximum',
    shortcutPage: 'Page Up / Page Down: larger steps',
    shortcutReset: 'Delete or Backspace: reset the focused parameter',
    shortcutSpace:
      'Space: play or pause. With the special accessibility options off, this includes a focused button, switch, or slider. A text field and an open dialog keep Space. While Hold is on, Space clears Hold.',
    shortcutEsc: 'Escape: close menus, dialogs, and tooltips',
    skipToMain: 'Skip to main controls',
    dragFree: 'Drag-Free Editing',
    dragFreeHelp: 'Edit audio using buttons and exact values instead of dragging.',
    keyboardFirst: 'Keyboard-First',
    keyboardFirstHelp: 'Navigate and edit FIELD efficiently without a mouse.',
    keyboardFirstAlways: 'Tab, Enter, Space, and Escape keep working when this is off.',
    waveformNav: 'Accessible Waveform Navigation',
    waveformNavHelp: 'Navigate recordings using time, keyboard controls and audio landmarks.',
    waveformNavAlways: 'Keyboard and screen reader access to the waveform stays available when this is off.',
    sensoryComfort: 'Sensory Comfort',
    sensoryComfortHelp: 'Reduce unnecessary motion, visual intensity and distractions.',
    sensoryComfortSection: 'Sensory Comfort',
    sensoryComfortApplies: 'These choices apply while Sensory Comfort is on. Reduced Motion stays independent.',
    visualActivity: 'Visual Activity',
    visualActivityHelp: 'Low reduces nonessential visual updates. Measurements stay the same.',
    visualActivityStandard: 'Standard',
    visualActivityLow: 'Low',
    reduceDecorativeMotion: 'Reduce Decorative Motion',
    reduceDecorativeMotionHelp: 'Stop decorative animation. Playhead, selection, and focus stay.',
    calmMeters: 'Calm Meters',
    calmMetersHelp: 'Steadier meters. Peaks, clipping, and the measured level stay exact.',
    calmSpectrum: 'Calm Spectrum',
    calmSpectrumHelp: 'Calmer FFT and waterfall drawing. Analysis settings stay the same.',
    reduceVisualEffects: 'Reduce Visual Effects',
    reduceVisualEffectsHelp: 'Less glow, blur, and decorative color movement. Focus stays visible.',
    quietNotifications: 'Quiet Notifications',
    quietNotificationsHelp: 'Fewer informational notices. Errors and clipping stay visible.',
  },
  markers: {
    open: 'Markers',
    close: 'Close markers',
    add: 'Add',
    go: 'Go to',
    edit: 'Rename',
    remove: 'Delete',
    save: 'Save marker',
    cancel: 'Cancel',
    name: 'Name',
    description: 'Description',
    showDescription: 'Show description',
    hideDescription: 'Hide description',
    time: 'Time',
    empty: 'No markers yet.',
    needAudio: 'Load audio before adding a marker.',
    needName: 'Enter a marker name.',
    list: 'Markers',
    openCount: (count) => `Markers, ${count}`,
    addMarker: 'Add marker',
    emptyHint: 'Add a marker at the current playhead.',
    suggestions: 'Suggestions',
    suggestionsCount: (count) => `Suggestions, ${count}`,
    suggestionsHelp: 'These are suggestions from the existing landmark scan. They stay suggestions until you save one as a marker.',
    saveDetected: 'Save as marker',
    noSuggestions: 'No detected places.',
    analysing: 'Looking for places.',
    moreSuggestions: 'More suggestions',
    previousAction: 'Previous marker',
    nextAction: 'Next marker',
    prevShort: 'Prev',
    nextShort: 'Next',
    editTime: 'Edit time',
    editDescription: 'Edit description',
    actions: (name) => `Marker actions: ${name}`,
    defaultName: (index) => `Marker ${index}`,
    pointLabel: (name, time) => `Marker: ${name}, ${time}.`,
    goTo: (name) => `Go to marker: ${name}`,
    editNamed: (name) => `Edit marker: ${name}`,
    deleteNamed: (name) => `Delete marker: ${name}`,
    added: (name, time) => `Added marker: ${name}, ${time}.`,
    renamed: (name) => `Marker name: ${name}.`,
    described: (name) => `Marker description saved for ${name}.`,
    retimed: (name, time) => `Marker time: ${name}, ${time}.`,
    deleted: (name) => `Deleted marker: ${name}.`,
    previous: (name, time) => `Previous marker: ${name}, ${time}.`,
    next: (name, time) => `Next marker: ${name}, ${time}.`,
    none: 'No marker in that direction.',
    savedDetected: (name, time) => `Saved as marker: ${name}, ${time}.`,
    color: 'Color',
    colors: {
      amber: 'Amber',
      cyan: 'Cyan',
      green: 'Green',
      violet: 'Violet',
      orange: 'Orange',
      magenta: 'Magenta',
      blue: 'Blue',
      neutral: 'Neutral',
    },
    recolored: (name, color) => `Marker color: ${name}, ${color}.`,
  },
  keyboard: {
    open: 'Keyboard shortcuts',
    jump: 'Workspace navigation',
    close: 'Close',
    search: 'Filter shortcuts',
    empty: 'No matching shortcuts.',
    destSearch: 'Filter destinations',
    destEmpty: 'No matching destinations.',
    alwaysOn: 'Keyboard access stays available when Keyboard-First is off. These shortcuts come from the live registry.',
    browserChord: 'Ctrl+K and Cmd+K stay with the browser. FIELD uses Ctrl+Shift+K or Cmd+Shift+K.',
    groups: {
      navigation: 'Navigation',
      transport: 'Transport',
      editing: 'Editing',
      effects: 'Effects',
      automation: 'Automation',
      guidedTasks: 'Guided Tasks',
    },
    destinations: {
      waveform: 'Waveform',
      transport: 'Transport',
      effects: 'Effects',
      inspector: 'Inspector',
      eq: 'EQ',
      fft: 'FFT',
      automation: 'Automation',
      hearing: 'Hearing',
      guided: 'Guided Tasks',
      export: 'Export',
      accessibility: 'Accessibility Settings',
      gain: 'Gain',
      parameters: 'Parameters',
    },
    byId: {
      'nav.workspaces': 'Open workspace navigation',
      'nav.help': 'Open keyboard shortcuts',
      'help.explain': 'Explain the focused control',
      'transport.play': 'Play or pause. With special accessibility options off, this includes a focused control',
      'transport.stop': 'Stop playback',
      'transport.loop': 'Toggle loop',
      'transport.back': 'Move the playhead a small step backward',
      'transport.forward': 'Move the playhead a small step forward',
      'transport.backCoarse': 'Move the playhead a larger step backward',
      'transport.forwardCoarse': 'Move the playhead a larger step forward',
      'transport.toStart': 'Move the playhead to the start',
      'transport.toEnd': 'Move the playhead to the end',
      'transport.pageBack': 'Move the playhead back one second',
      'transport.pageForward': 'Move the playhead forward one second',
      'edit.undo': 'Undo',
      'edit.redo': 'Redo',
      'edit.redoY': 'Redo',
      'edit.copy': 'Copy the selection',
      'edit.cut': 'Cut the selection',
      'edit.paste': 'Paste at the playhead',
      'effects.earlier': 'Move the focused effect earlier',
      'effects.later': 'Move the focused effect later',
      'effects.up': 'Move the focused effect earlier',
      'effects.down': 'Move the focused effect later',
      'auto.delete': 'Delete the selected automation point',
      'guide.minimize': 'Minimize guided tasks',
      'modal.close': 'Close the dialog',
      'markers.add': 'Add a marker at the playhead',
      'markers.previous': 'Go to the previous marker',
      'markers.next': 'Go to the next marker',
      'markers.open': 'Open markers',
    },
  },
  dragFree: {
    selection: 'Selection',
    start: 'Start',
    end: 'End',
    setStart: 'Set start',
    setEnd: 'Set end',
    editTimes: 'Edit times',
    clear: 'Clear',
    apply: 'Apply',
    cancel: 'Cancel',
    goToTime: 'Go to time',
    go: 'Go',
    stepBack: 'Move playhead backward 100 milliseconds',
    stepForward: 'Move playhead forward 100 milliseconds',
    toStart: 'Go to selection start',
    toEnd: 'Go to selection end',
    preview: 'Preview',
    trim: 'Trim',
    trimWarn: 'Trim keeps the selection and removes the audio outside it. You can undo this.',
    trimApply: 'Trim selection',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    fadeLess: 'Shorter by 50 milliseconds',
    fadeMore: 'Longer by 50 milliseconds',
    duration: 'Duration',
    loop: 'Loop',
    setLoopStart: 'Set loop start',
    setLoopEnd: 'Set loop end',
    editLoop: 'Edit loop times',
    eqBands: 'EQ bands',
    editBand: 'Edit selected band',
    frequency: 'Frequency',
    gain: 'Gain',
    q: 'Q',
    filterType: 'Filter type',
    chooseType: 'Choose a type',
    bypass: 'Bypass',
    enable: 'Enable',
    noEq: 'Add an EQ to edit bands.',
    noBands: 'No active EQ bands yet.',
    automation: 'Automation',
    editPoint: 'Edit point',
    addPoint: 'Add point at playhead',
    deletePoint: 'Delete point',
    pointTime: 'Time',
    pointValue: 'Value',
    noLane: 'Choose an automated parameter first.',
    noPoints: 'This parameter has no points yet.',
    timeNote: 'Times are minutes, seconds, and milliseconds. Sample edits keep FIELD’s existing rounding.',
    noSample: 'Load a sample to edit times.',
    errFormat: 'Enter a time like 01:23.450.',
    errNegative: 'Time cannot be negative.',
    errPast: 'That time is past the end of the audio.',
    errOrder: 'The start has to be earlier than the end.',
    errShort: 'The range has to be at least 50 milliseconds.',
    errFade: 'The fade cannot be longer than the selection.',
    errRange: 'That value is outside the range for this control.',
    appliedSelection: 'Selection updated.',
    appliedPlayhead: 'Playhead moved.',
    appliedFade: 'Fade updated.',
    appliedTrim: 'Trim applied.',
    appliedLoop: 'Loop updated.',
    appliedBand: 'EQ band updated.',
    appliedPoint: 'Automation point updated.',
    deletedPoint: 'Automation point deleted.',
    nudgedPoint: 'That time was already used, so the point moved to the nearest free time.',
    cleared: 'Selection cleared.',
    selectionStartSr: (time) => `Selection start, ${time}.`,
    selectionEndSr: (time) => `Selection end, ${time}.`,
    playheadSr: (time) => `Playhead, ${time}.`,
    bandSr: (n, type) => `EQ band ${n}, ${type}.`,
    freqSr: (n, value) => `EQ band ${n}, frequency, ${value}.`,
    pointSr: (n, time) => `Automation point ${n}, time, ${time}.`,
    valueSr: (n, value) => `Automation point ${n}, value, ${value}.`,
    sensoryExact: 'Exact value',
  },
  view: {
    group: 'Destination',
    workspace: 'Workspace',
    activity: 'Activity',
    shed: 'SHED',
  },
  shed: {
    scene: 'Architectural scene',
    toolbar: 'Scene',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    addElement: 'Add element',
    library: 'Element library',
    tower: 'Tower',
    elementType: 'Element type',
    height: 'Height',
    width: 'Width',
    roof: 'Roof',
    helmet: 'Helmet',
    primary: 'Primary color',
    secondary: 'Secondary color',
    detail: 'Detail color',
    ornament: 'Ornament',
    ornamentNone: 'None',
    ornamentFinial: 'Finial',
    ornamentRosette: 'Rosette',
    ornamentStar: 'Star',
    position: 'Position',
    positionX: 'Horizontal position',
    positionY: 'Vertical position',
    layer: 'Layer',
    layerForward: 'Bring forward',
    layerBack: 'Send backward',
    reset: 'Reset',
    duplicate: 'Duplicate',
    deleteElement: 'Delete element',
    variant: 'Variant',
    proportion: 'Body proportion',
    windows: 'Windows',
    floors: 'Floors',
    entrance: 'Entrance',
    gable: 'Gable',
    arches: 'Arches',
    archHeight: 'Arch height',
    column: 'Column width',
    pitch: 'Pitch',
    roofline: 'Roofline',
    ridge: 'Ridge',
    parapet: 'Parapet rhythm',
    density: 'Ornament density',
    passage: 'Passage',
    crenellation: 'Crenellation',
    panLeft: 'Pan left',
    panRight: 'Pan right',
    panUp: 'Pan up',
    panDown: 'Pan down',
    panLeftShort: 'Left',
    panRightShort: 'Right',
    panUpShort: 'Up',
    panDownShort: 'Down',
    transparency: 'Transparency',
    saved: 'Saved',
    savedHint: 'Saved in this browser only. It does not sync to other devices.',
    restored: 'Restored the default scene',
    close: 'Close',
    geometry: 'Geometry',
    appearance: 'Appearance',
    elementName: (type, selected) =>
      selected ? `${type} — architectural element, selected` : `${type} — architectural element`,
    moveHint: 'Arrow keys move the selected element. Shift takes a smaller step. The position sliders do the same.',
    categories: {
      tower: 'Tower',
      facade: 'Facade',
      roof: 'Roof',
      arcade: 'Arcade',
      gate: 'Gate',
      attic: 'Attic',
      ornament: 'Ornament',
    },
    descriptions: {
      tower: 'Asymmetrical Gothic tower, a Wawel tower, or a Kraków defensive tower.',
      facade: 'Church wall, narrow townhouse, or Cloth Hall front.',
      roof: 'Historical Kraków roofline with a decorative ridge.',
      arcade: 'Repeating arches from the Cloth Hall or the Wawel courtyard.',
      gate: "St. Florian's Gate, the Barbican, or a townhouse portal.",
      attic: 'Renaissance parapet in the manner of the Cloth Hall.',
      ornament: 'A small finial, rosette, pinnacle, or medallion.',
    },
    variants: {
      tower: ["St. Mary's taller helmet", "St. Mary's lower helmet", 'Wawel tower', 'Defensive tower'],
      facade: ['Gothic facade', 'Townhouse', 'Cloth Hall front'],
      roof: ['Steep roof', 'Renaissance roof', 'Townhouse roof'],
      arcade: ['Cloth Hall arcade', 'Wawel arcade', 'Pointed arcade'],
      gate: ["St. Florian's Gate", 'Barbican', 'Townhouse portal'],
      attic: ['Cloth Hall attic', 'Townhouse attic'],
      ornament: ['Finial', 'Rosette', 'Pinnacle', 'Medallion'],
    },
    swatches: {
      brick: 'Brick red',
      ink: 'Ink black',
      parchment: 'Parchment',
      blue: 'Desaturated blue',
      copper: 'Oxidized copper',
      gold: 'Aged gold',
      limestone: 'Limestone',
      gray: 'Warm gray',
    },
    startBuild: 'Start building your SHED',
    extend: 'Extend',
    addLeft: 'Add to left',
    addRight: 'Add to right',
    addAbove: 'Add above',
    connection: 'Connection',
    deleteBranch: 'Delete branch',
    deleteBranchHint: 'Removes the selected element and everything built on it.',
    deleteRoot: 'Remove the foundation',
    deleteRootHint: 'Removes the whole structure.',
    cancel: 'Cancel',
    freeSheet: 'This sheet is a free composition from an earlier SHED. A connected build does not rearrange it.',
    startConnected: 'Start a connected build',
    restoreFree: 'Return to the free composition',
    relationRoot: 'standing on the ground line',
    relationAbove: (parent) => `connected above ${parent}`,
    relationLeft: (parent) => `connected to the left of ${parent}`,
    relationRight: (parent) => `connected to the right of ${parent}`,
    linksAvailable: (list) => `open connections: ${list}`,
    linksNone: 'no open connections',
    structureLabel: (name, relation, links) => `${name}, ${relation}, ${links}.`,
    tabs: { style: 'Style', geometry: 'Geometry', color: 'Color', details: 'Details', actions: 'Actions' },
    directions: { LEFT: 'left', RIGHT: 'right', TOP: 'above' },
    groups: {
      foundations: 'Foundations',
      floors: 'Floors',
      arcades: 'Arcades',
      attics: 'Attics',
      roofs: 'Roofs',
      towers: 'Towers',
      ornaments: 'Ornaments',
    },
    errors: {
      incompatible: 'That piece cannot connect here.',
      overlap: 'That piece would overlap the structure.',
      anchor: 'That connection is already used.',
      foundation: 'The first piece has to be a ground-floor element.',
      support: 'The pieces already built here would lose their support.',
      limit: 'The structure cannot grow any further in that direction.',
      parent: 'Choose a piece that is already part of the structure.',
    },
    pieces: {
      'townhouse-base': 'Townhouse ground floor',
      'renaissance-base': 'Renaissance arcade base',
      'gothic-base': 'Gothic brick ground floor',
      'gate-base': "St. Florian's gate base",
      'defensive-gate': 'Barbican gate',
      'townhouse-floor': 'Townhouse floor',
      'renaissance-floor': 'Wide Renaissance floor',
      'gothic-windows': 'Gothic window section',
      'balcony-floor': 'Balcony floor',
      'single-arch': 'Single arch',
      'three-arch': 'Three-arch sequence',
      'courtyard-arcade': 'Wawel courtyard arcade',
      'pointed-arcade': 'Gothic pointed arcade',
      'sukiennice-attic': 'Cloth Hall attic',
      'stepped-attic': 'Stepped attic',
      parapet: 'Ornamental parapet',
      'gothic-roof': 'Steep Gothic roof',
      'townhouse-roof': 'Townhouse roof',
      'renaissance-roof': 'Renaissance roofline',
      'small-roof': 'Small decorative roof',
      'mariacki-tall': "St. Mary's taller tower",
      'mariacki-low': "St. Mary's lower tower",
      'wawel-tower': 'Wawel tower',
      'defensive-tower': 'Defensive tower',
      'gothic-helmet': 'Gothic helmet',
      'krakow-crown': 'Kraków tower crown',
      'wawel-helmet': 'Wawel helmet',
      finial: 'Finial',
      star: 'Star',
      rosette: 'Rosette',
      crest: 'Decorative crest',
      relief: 'Architectural relief',
    },
    city: {
      modeGroup: 'SHED scene',
      modeArchitecture: 'Architecture',
      modeCity: 'City',
      scene: 'Kraków sound city',
      plotsNote: 'Virtual plots are game locations, not cadastral parcels.',
      build: 'Build on this plot',
      place: 'Place building',
      removeBuilding: 'Remove building',
      availablePlot: (street) => (street ? `Available virtual plot near ${street}` : 'Available virtual plot'),
      occupiedPlot: (type, author) => `${type} by ${author}`,
      location: (street) => (street ? `Near ${street}` : 'Virtual plot'),
      noRecording: 'No recording linked',
      recording: 'Recording',
      author: 'Author',
      authors: 'Authors',
      authorsNote: 'A local prototype identity. This is not an account.',
      buildings: 'Buildings',
      students: 'Students',
      availablePlots: 'Available plots',
      hideRanking: 'Hide authors',
      showRanking: 'Show authors',
      close: 'Close',
      saved: 'Saved',
      restored: 'Restored the empty city',
      savedHint: 'The city is saved in this browser only. It does not replace the architecture sheet.',
      prototypeAuthor: 'Prototype author',
      buildingType: 'Building',
      stats: 'Contributions',
      zoomToolbar: 'Map',
    },
  },
  activity: {
    region: 'Recording activity',
    demoBadge: 'Demo data',
    demoNote: 'These figures are a sample set. They are not the project recordings, and Google Drive is not connected.',
    recordings: 'Recordings',
    totalSize: 'File size',
    activeStudents: 'Active students',
    last7Days: 'Last 7 days',
    timeline: 'Activity timeline',
    rangeGroup: 'Timeline range',
    range7: '7 days',
    range30: '30 days',
    rangeAll: 'All',
    timelineEmpty: 'No recordings in this range.',
    timelineSummary: (count, peak, day) => {
      const added = countNoun(
        'en',
        count,
        { one: 'recording', other: 'recordings' },
        { one: 'nagranie', few: 'nagrania', many: 'nagrań' },
      )
      return `${added} added. Peak ${peak} on ${day}.`
    },
    timelineTable: 'Values',
    legend: 'Who added recordings',
    who: 'Who',
    day: 'Day',
    count: 'Count',
    students: 'Participants',
    sortGroup: 'Sort',
    sortCount: 'Recordings',
    sortRecent: 'Last activity',
    sortName: 'Name',
    meterLabel: (name, count, size) => {
      const added = countNoun(
        'en',
        count,
        { one: 'recording', other: 'recordings' },
        { one: 'nagranie', few: 'nagrania', many: 'nagrań' },
      )
      return `${name}, ${added}, ${size}`
    },
    stateRecent: 'Recent',
    stateEarlier: 'Earlier',
    stateNone: 'None',
    level: 'Level',
    name: 'Name',
    lastActivity: 'Last activity',
    indicator: 'Status',
    recentRecordings: 'Recent recordings',
    filename: 'Filename',
    student: 'Student',
    uploaded: 'Uploaded',
    fileSize: 'File size',
    format: 'Format',
    noRecordings: 'No recordings yet.',
    noStudents: 'No participants.',
    unknownStudent: 'Unknown participant',
    loadError: 'Activity data could not be read.',
    loading: 'Reading the activity snapshot.',
    missingSnapshot: 'The activity snapshot is not published yet.',
    invalidSnapshot: 'The activity snapshot could not be read. Demonstration data is not shown in its place.',
    snapshotBadge: 'Published snapshot',
    snapshotNote: 'These figures come from a published snapshot. FIELD does not connect to Google Drive. File names are not included.',
    publishedNote: 'These figures come from a published snapshot.',
    synchronized: (when) => `Last synchronization ${when}`,
    windowCounts: (students, last30) => `${students} participants · Last 30 days ${last30}`,
    stale: 'This snapshot is older than the expected refresh. The time above is the last successful synchronization.',
    filenamesOmitted: 'File names are not part of the published snapshot.',
    generated: (when) => `Sample set ${when}`,
  },
}

export const PL: Messages = {
  lang: { group: 'Język', en: 'English', pl: 'Polski' },
  gate: {
    title: 'Jak chcesz kształtować dźwięk?',
    simple: 'Prosty',
    simpleCopy: 'Szybko przygotuj sample: przytnij, zanik, brzmienie i eksport.',
    listen: 'Słuch',
    listenCopy: 'Kształtuj dźwięk odczuciem.',
    control: 'Sterowanie',
    controlCopy: 'Kształtuj dźwięk parametrami.',
  },
  mode: {
    group: 'Tryb interfejsu',
    simple: 'Prosty',
    sensory: 'Sensoryczny',
    technical: 'Techniczny',
    simpleShort: 'Prosty',
    sensoryShort: 'Sens.',
    technicalShort: 'Techn.',
  },
  simple: {
    fileUntitled: 'Brak sampla',
    cut: 'Cięcie',
    trim: 'Przytnij',
    setStart: 'Ustaw początek',
    setEnd: 'Ustaw koniec',
    length: (value) => `Długość: ${value} s`,
    startEnd: 'Początek i koniec',
    fadeIn: 'Narastanie',
    fadeOut: 'Wygaszanie',
    fadeNone: 'Brak',
    fadeShort: 'Krótki',
    fadeMedium: 'Średni',
    fadeLong: 'Długi',
    fadeInNone: 'Brak',
    fadeInShort: 'Krótki',
    fadeInMedium: 'Średni',
    fadeInLong: 'Długi',
    fadeOutNone: 'Brak',
    fadeOutShort: 'Krótkie',
    fadeOutMedium: 'Średnie',
    fadeOutLong: 'Długie',
    fadeInAria: (step) => `Narastanie: ${step}`,
    fadeOutAria: (step) => `Wygaszanie: ${step}`,
    regionStartAria: (value) => `Początek sampla: ${value} sekund`,
    regionEndAria: (value) => `Koniec sampla: ${value} sekund`,
    closeSheet: 'Zamknij',
    levelVolume: 'Wyrównaj',
    levelHint: 'Podnieś zaznaczenie do równego poziomu.',
    levelDone: 'Poziom wyrównany',
    tone: 'Brzmienie',
    moreTones: 'Więcej opcji',
    lessTones: 'Mniej opcji',
    customTone: 'Własne',
    amount: 'Ilość',
    amountLess: 'Mniej',
    amountMore: 'Więcej',
    amountNone: 'Brak',
    amountSubtle: 'Subtelnie',
    amountStrong: 'Mocniej',
    edit: 'Edycja',
    sound: 'Brzmienie',
    effects: 'Efekty',
    selection: 'Zaznaczenie',
    trimToSelection: 'Przytnij do zaznaczenia',
    clearSelection: 'Wyczyść',
    toneGroup: 'Barwa',
    clarity: 'Czytelność',
    level: 'Poziom',
    evenOut: 'Wyrównaj',
    gain: 'Wzmocnienie',
    gainValue: (db) => `${db} dB`,
    gainAria: (db) => `Wzmocnienie ${db} decybeli`,
    tail: 'Wybrzmienie',
    tailOn: 'Z ogonem',
    tailOff: 'Bez ogona',
    reverb: 'Pogłos',
    delay: 'Opóźnienie',
    reverbHint: 'Dodaje przestrzeń.',
    delayHint: 'Dodaje powtarzające się echo.',
    effectOff: 'Wył.',
    effectOn: 'Wł.',
    enable: 'Włącz',
    spaceSmall: 'Mały',
    spaceMedium: 'Średni',
    spaceLarge: 'Duży',
    echoShort: 'Krótkie',
    echoMedium: 'Średnie',
    echoLong: 'Długie',
    advanced: 'Aktywna jest zaawansowana obróbka.',
    openTechnical: 'Otwórz Techniczny',
    resetChanges: 'Resetuj zmiany',
    moreEdit: 'Więcej narzędzi edycji',
    customEffect: 'Własne',
    autoFix: 'Popraw automatycznie',
    autoDone: 'Dźwięk poprawiony',
    compare: 'Porównaj',
    original: 'Oryginał',
    after: 'Po',
    undo: 'Cofnij',
    redo: 'Ponów',
    restore: 'Resetuj zmiany',
    restoreConfirm: 'Czyści zaniki, barwę, pogłos i opóźnienie. Wczytany sample zostaje.',
    restoreYes: 'Resetuj',
    restoreNo: 'Zostaw zmiany',
    save: 'Eksportuj',
    saveTitle: 'Eksport',
    saveName: 'Nazwa',
    saveFormat: 'Format',
    saveFile: 'Eksportuj',
    moreSettings: 'Więcej ustawień',
    hideSettings: 'Mniej ustawień',
    sampleRate: 'Częstotliwość próbkowania',
    bitDepth: 'Głębia bitowa',
    channels: 'Kanały',
    stereo: 'Stereo',
    mono: 'Mono',
    wav: 'WAV',
    mp3: 'MP3',
    loadSample: 'Otwórz sample',
    play: 'Odtwórz',
    pause: 'Wstrzymaj',
    clock: (now, total) => `${now} / ${total}`,
    tones: {
      natural: {
        label: 'Naturalnie',
        hint: 'Bez zmiany barwy.',
        aria: 'Barwa: naturalnie',
      },
      moreBass: {
        label: 'Więcej basu',
        hint: 'Delikatne podbicie dołu.',
        aria: 'Barwa: więcej basu',
      },
      lessBass: {
        label: 'Mniej basu',
        hint: 'Delikatne ściszenie dołu.',
        aria: 'Barwa: mniej basu',
      },
      brighter: {
        label: 'Jaśniej',
        hint: 'Trochę więcej góry.',
        aria: 'Barwa: jaśniej',
      },
      warmer: {
        label: 'Cieplej',
        hint: 'Więcej ciała i łagodniejsza góra.',
        aria: 'Barwa: cieplej',
      },
      lessHarsh: {
        label: 'Mniej ostro',
        hint: 'Łagodniejsze wysokie tony.',
        aria: 'Barwa: mniej ostro',
      },
      clearer: {
        label: 'Czyściej',
        hint: 'Mniej mętnego środka, trochę więcej czytelności.',
        aria: 'Czytelność: czyściej',
      },
      softer: {
        label: 'Miękcej',
        hint: 'Łagodniejsza góra.',
        aria: 'Czytelność: miękcej',
      },
    },
  },
  header: {
    loadSample: 'Wczytaj sample',
    untitled: 'Brak sampla',
    record: 'Nagraj',
    stop: 'Stop',
    rec: 'Rec',
    lfoCenter: 'Centrum LFO',
    settings: 'Ustawienia',
    resetTitle: 'Reset aplikacji',
    resetConfirm: 'Zresetować bieżącą sesję FIELD?',
    resetCancel: 'Anuluj',
    resetAction: 'Reset',
    manual: 'Podręcznik',
    mono: 'Mono',
    stereo: 'Stereo',
    channels: (n) => `${n} kan.`,
  },
  settings: {
    close: 'Zamknij ustawienia',
    closeLfo: 'Zamknij centrum LFO',
    hint:
      'iPhone/iPad: Wczytaj sample otwiera Pliki. Safari dekoduje WAV, AIFF, MP3, M4A/AAC i CAF. OGG i WebM zwykle nie działają na iOS.',
    loadSample: 'Wczytaj sample',
    recordMic: 'Nagraj mikrofon',
    stopRecording: 'Zatrzymaj nagranie',
    savePreset: 'Zapisz preset',
    loadPreset: 'Wczytaj preset',
    loadPresetHint: 'Otwiera plik JSON FIELD zapisany przez Zapisz preset.',
    loadDemo: 'Wygeneruj sample demo',
    editSample: 'Edytuj sample',
    resetAll: 'Reset wszystkiego',
    revertSource: 'Przywróć źródło',
    undo: 'Cofnij',
    redo: 'Ponów',
    saveToLibrary: 'Zapisz w bibliotece',
    saveToLibraryPrompt: 'Nazwij ten preset instrumentu w tej przeglądarce',
    libraryHint: 'Biblioteka zostaje w tej przeglądarce. Wyeksportuj paczkę, aby ją udostępnić albo zachować kopię. Nie ma serwera kont.',
    libraryEmpty: 'Brak zapisanych presetów w bibliotece.',
    exportLibrary: 'Eksportuj bibliotekę',
    deletePreset: (name) => `Usuń ${name}`,
    explainMarks: 'Wyjaśnij',
    explainMarksLabel: 'Pokaż znaki informacji',
    explainMarksHint: 'Pokazuje ⓘ obok nagłówków inspektora. F1 nadal wyjaśnia kontrolkę w fokusie, gdy znaki są ukryte.',
  },
  workspace: {
    interface: 'Interfejs techniczny',
    classic: 'Klasyczny',
    workspace: 'Workspace',
    experimental: 'Eksperymentalny',
    settingHint: 'Workspace jest domyślnym układem Technical. Korzysta z tego samego silnika, projektu i dźwięku. Klasyczny jest dostępny tutaj.',
    workspaces: 'Obszary Technical',
    context: 'Kontekst',
    close: 'Zamknij',
    closeContext: 'Zamknij kontekst',
    more: 'Więcej',
    less: 'Mniej',
    moreEdit: 'Więcej poleceń edycji',
    analyzerLayer: 'Warstwa analizatora',
    analyzerSettings: 'Ustawienia analizatora',
    eqLayout: 'Układ EQ',
    eqStrips: 'Pokaż paski EQ',
    eqInspector: 'Pokaż inspektor',
    hearingNote: 'Pełna analiza Hearing jest tym obszarem roboczym. Zwięzły panel zostaje dostępny.',
    hearingQuick: 'Szybki podgląd',
  },
  runtime: {
    refresh: 'Odśwież aplikację',
    refreshing: 'Odświeżanie',
    refreshTitle: 'Przeładuj zainstalowaną aplikację i wyczyść stare cache',
    uiLoadTitle: 'Obciążenie pętli zdarzeń wątku głównego. To nie jest CPU procesu.',
  },
  banner: {
    audioBlocked: 'Przeglądarka wstrzymała dźwięk. Dotknij Odtwórz, aby wznowić.',
    inspector: 'Inspektor',
  },
  mobile: {
    more: 'Więcej',
    back: 'Wróć',
    view: 'Widok',
    analyzer: 'Analizator',
    expandWorkspace: 'Powiększ przestrzeń',
    collapseWorkspace: 'Zamknij pełny widok',
    enterFocus: 'Wejdź w tryb Focus',
    exitFocus: 'Wyjdź z trybu Focus',
    deleteBand: 'Usuń pasmo',
    expandContext: 'Pokaż parametry',
    collapseContext: 'Ukryj parametry',
    on: 'Wł.',
    off: 'Wył.',
    type: 'Typ',
    addBand: 'Dodaj pasmo',
    addEq: 'Dodaj EQ',
    freq: 'Częst.',
    gain: 'Wzm.',
    q: 'Q',
    slope: 'Nach.',
    context: 'Parametry efektu',
  },
  focus: {
    enter: 'Wejdź w tryb Focus',
    exit: 'Wyjdź z trybu Focus',
    caption: 'Fokus',
    band: (index, type) => `Pasmo ${index} · ${type}`,
    bandName: (index) => `Pasmo ${index}`,
    addNode: 'Dodaj węzeł',
    deleteNode: 'Usuń węzeł',
    addAutomation: 'Dodaj automatyzację',
    lane: 'Ścieżka',
    eq: 'EQ',
    auto: 'Auto',
    wave: 'Fala',
    waveFull: 'Przebieg',
    fft: 'FFT',
    hearing: 'Słuch',
    more: 'Więcej edycji',
    fadeMs: (label, ms) => `${label}  ${ms} ms`,
    filters: 'Filtry',
  },
  waveform: {
    empty: 'Wczytaj sample, aby zacząć',
    editorAria: (fileName) => `Przebieg, ${fileName}.`,
    editorEmpty: 'Edytor przebiegu. Nie wczytano pliku audio.',
    editorSummary: (channels, duration, rate, playhead, selection) =>
      `${channels} Czas ${duration}. ${rate} Głowica ${playhead}. ${selection} Strzałki przesuwają głowicę.`,
    selectionRange: (start, end, duration) => `Zaznaczenie od ${start} do ${end}. Czas ${duration}.`,
    noSelection: 'Brak częściowego zaznaczenia.',
    monoRecording: 'Nagranie mono.',
    stereoRecording: 'Nagranie stereo.',
    channelCount: (count) =>
      `${countNoun('pl', count, { one: 'channel', other: 'channels' }, { one: 'kanał', few: 'kanały', many: 'kanałów' })}.`,
    sampleRate: (khz) => {
      const n = Number(String(khz).replace(',', '.'))
      const unit = Number.isFinite(n)
        ? polishCardinal(Math.round(n), { one: 'kiloherc', few: 'kiloherce', many: 'kiloherców' })
        : 'kHz'
      return `Częstotliwość próbkowania ${khz} ${unit}.`
    },
    loadDemo: 'Wygeneruj sample demo',
    edit: 'Edycja',
    trim: 'Przytnij',
    trimTitle: 'Przytnij do zaznaczenia',
    insertSilence: 'Wstaw ciszę',
    insertSilenceCaption: 'Cisza',
    deleteSelection: 'Usuń zaznaczenie',
    deleteSelectionCaption: 'Usuń',
    muteSelection: 'Wycisz zaznaczenie',
    muteSelectionCaption: 'Wycisz',
    clearSelection: 'Wyczyść zaznaczenie',
    clearSelectionCaption: 'Czyść',
    copySelection: 'Kopiuj zaznaczenie (Ctrl+C)',
    copyCaption: 'Kopiuj',
    cutSelection: 'Wytnij zaznaczenie (Ctrl+X)',
    cutCaption: 'Wytnij',
    pastePlayhead: 'Wklej przy głowicy (Ctrl+V)',
    pasteCaption: 'Wklej',
    moreEdits: 'Więcej edycji',
    moreEditsCaption: 'Więcej',
    setPlayheadStart: 'Ustaw początek zaznaczenia',
    setPlayheadEnd: 'Ustaw koniec zaznaczenia',
    toSampleStart: 'Idź na początek',
    toSampleEnd: 'Idź na koniec',
    displayGroup: 'Podgląd',
    undo: 'Cofnij',
    redo: 'Ponów',
    fitSample: 'Dopasuj sample',
    fit: 'Całość',
    fitSelection: 'Dopasuj zaznaczenie',
    sel: 'Zazn.',
    zoomSelection: 'Zoom do zaznaczenia',
    zoom: 'Zoom',
    normalizeView: 'Normalizuj widok',
    norm: 'Norm',
    resetZoom: 'Reset zoomu',
    reset: 'Reset',
    waveTitle: 'Fala jednego śladu',
    wave: 'Fala',
    multiTitle: 'Fala wielu śladów',
    multi: 'Multi',
    spectrum: 'Widmo',
    splitTitle: 'Widok dzielony',
    split: 'Split',
    eqTitle: 'Konsola EQ',
    eqEnable: 'Włącz EQ',
    eqOn: 'EQ włączone',
    eqAdd: 'Dodaj EQ',
    tracksTitle: 'Ślady i mikser',
    tracks: 'Ślady',
    zoomOut: 'Oddal',
    zoomIn: 'Przybliż',
    scrollZoom: 'Scrolluj, aby zoomować',
    mono: 'Mono',
    fadeIn: 'Narastanie',
    fadeOut: 'Wygaszanie',
    autoFade: 'Auto',
    autoFadeTitle: 'Auto — 10 ms narastania i wygaszania',
    hold: 'Hold',
    holdOn: 'Hold zapętla ten fragment. Wykres FFT i EQ podąża za pętlą. Naciśnij, aby grać dalej.',
    holdOff: 'Zapętla fragment przy głowicy. Wykres FFT i EQ podąża za tą pętlą.',
    resizeWave: 'Zmień wysokość przebiegu',
    resizeSplit: 'Zmień podział przebiegu i FFT',
    regionStart: 'Początek regionu',
    regionEnd: 'Koniec regionu',
    tracksAria: 'Ślady',
    overviewAria: 'Przegląd sampla. Kliknij, aby ustawić głowicę.',
    zoomViewStart: 'Powiększ od początku widoku',
    zoomViewEnd: 'Powiększ od końca widoku',
    viewGroup: 'Widok',
    automationTitle: 'Automatyzacja',
    automationCaption: 'Auto',
    automationEffect: 'Efekt',
    automationParameter: 'Parametr',
    automationHint: 'Dwuklik na fali dodaje węzeł. Przeciągnij, aby go przesunąć. Delete usuwa zaznaczony węzeł. Kliknij odcinek, aby wybrać linię, wygładzenie albo schodek. Odtwarzanie obejmuje każdy zautomatyzowany parametr; lista wybiera tylko edytowaną obwiednię.',
    automationLane: 'Ścieżka automatyzacji',
    automationNode: (label) => `Węzeł automatyzacji, ${label}`,
    automationComb: 'EQ grzebień',
    automationAdd: 'Dodaj parametr',
    automationAddAction: 'Dodaj',
    automationRemove: 'Usuń',
    automationRemoveTitle: 'Usuń automatyzację',
    automationRemoveConfirm: 'Usunąć tę obwiednię? Efekt zostaje.',
    automationConfirm: 'Usuń',
    automationCancel: 'Anuluj',
    automationEmpty: 'Brak zautomatyzowanych parametrów.',
    automationColor: 'Kolor',
    automationColorChoose: 'Wybierz kolor automatyzacji',
    automationColorOption: (index) => `Kolor ${index}`,
    automationCurve: 'Krzywa',
    automationSegmentCurve: 'Krzywa — zaznaczony odcinek',
    automationCurveIdle: 'Wybierz tę automatyzację, potem odcinek.',
    automationLinear: 'Linia',
    automationSmooth: 'Gładka',
    automationStep: 'Schodek',
    automationTension: 'Napięcie',
    automationTensionHandle: 'Napięcie krzywej',
    automationNodes: 'Węzły',
    automationEditing: 'Edycja',
    automationLegend: 'Zautomatyzowane parametry',
    automationAllUsed: 'Każdy parametr tego efektu ma już automatyzację.',
    automationSegmentHint: 'Kliknij odcinek na fali.',
    background: 'Dodaj tło',
    backgroundCaption: 'Dodaj tło',
    backgroundLoad: 'Wczytaj obraz',
    backgroundOpacity: 'Krycie',
    backgroundGrain: 'Ziarno',
    backgroundRemove: 'Usuń',
    backgroundSession: 'Obraz zostaje tylko na tę sesję. Przy otwartym panelu wklej JPG albo PNG.',
    backgroundReject: 'Użyj pliku JPG lub PNG.',
    backgroundPaste: 'Wklej obraz',
    spectral: {
      title: 'Pasma widmowe',
      experimental: 'Eksperymentalne',
      enable: 'Pasma widmowe',
      on: 'Włącz',
      off: 'Wyłącz',
      subBass: 'SUB / BAS',
      lowMid: 'NISKI ŚRODEK',
      highMid: 'WYSOKI ŚRODEK',
      high: 'WYSOKIE',
      gain: 'Wzmocnienie',
      mute: 'Wycisz',
      solo: 'Solo',
      crossoverLow: 'Podział niski',
      crossoverMid: 'Podział środkowy',
      crossoverHigh: 'Podział wysoki',
      analyseSum: 'FFT suma',
      analyseBand: 'Analizuj pasmo',
      computing: 'Dzielenie…',
    },
  },
  transport: {
    play: 'Odtwórz',
    pause: 'Wstrzymaj',
    stop: 'Stop',
    playFromStart: 'Odtwórz od początku sampla',
    playFromStartTitle: 'Odtwórz od początku sampla, nie od zaznaczenia',
    more: 'Więcej',
    killFx: 'Kill FX',
    killFxTitle: 'Utnij ogony delay i pogłosu',
    killNoise: 'Kill noise',
    killNoiseTitle: 'Wycisza tylko generator szumu w Distortion — nie sprzężenie mikrofonu. Tails delay/reverb: Kill FX.',
    loop: 'Pętla',
    scrub: 'Tryb przesuwania',
    scrubRange: 'Zakres',
    scrubSample: 'Sample',
    undo: 'Cofnij',
    redo: 'Ponów',
    playhead: 'Głowica',
    selection: 'Zaznaczenie',
    bpmTitle: 'Tempo sampla używane przez sync delay/pogłosu',
    selStart: 'Pocz. zazn.',
    selStartTitle: 'Skocz głowicą na początek zaznaczenia (loop in)',
    selEnd: 'Kon. zazn.',
    selEndTitle: 'Skocz głowicą na koniec zaznaczenia (loop out)',
    export: 'Eksportuj',
    use: 'Użyj',
    useAsSample: 'Użyj jako sample',
    useTitle: 'Zapisz bieżące zaznaczenie, razem z narastaniem i wygaszaniem, jako roboczy sample.',
    useHint: 'Zapisuje to zaznaczenie, razem z narastaniem i wygaszaniem, jako roboczy sample.',
    selectionSr: (start, end) => `Zaznaczenie ${start} do ${end}`,
  },
  chain: {
    aria: 'Łańcuch sygnału',
    group: 'Tor',
    addEffect: 'Dodaj efekt',
    addAfter: (name) => `Dodaj efekt po ${name}`,
    enable: (name) => `Włącz ${name}`,
    bypass: (name) => `Omijaj ${name}`,
    enableShort: 'Włącz',
    bypassShort: 'Omijaj',
    kill: (name) => `Utnij ${name}`,
    killTitle: (name) => `Utnij ogony ${name}`,
    moveEarlier: 'Przesuń wcześniej w torze',
    moveLater: 'Przesuń później w torze',
    moveBefore: (moved, other) => `Przenieś ${moved} przed ${other}`,
    moveAfter: (moved, other) => `Przenieś ${moved} za ${other}`,
    movedBefore: (moved, other) => `${moved} przeniesiono przed ${other}.`,
    movedAfter: (moved, other) => `${moved} przeniesiono za ${other}.`,
    bypassOn: (name) => `${name}, ominięcie włączone`,
    bypassOff: (name) => `${name}, ominięcie wyłączone`,
    bypassedTag: 'Wyłączony',
    dragHint: 'Przeciągnij, aby zmienić kolejność. Wejście i wyjście zostają na miejscu.',
  },
  modules: {
    gain: 'Wejście',
    grain: 'Ziarno',
    eq: 'EQ',
    distortion: 'Zniekształcenie',
    filter: 'Filtr',
    midside: 'Mid/Side',
    delay: 'Delay',
    reverb: 'Pogłos',
    compressor: 'Kompresor',
    limiter: 'Limiter',
    output: 'Wyjście',
  },
  inspector: {
    edit: 'Edycja',
    start: 'Start',
    end: 'Koniec',
    length: 'Długość',
    zeroCrossing: 'Przejście przez zero',
    snapStart: 'Przyciągnij start',
    snapEnd: 'Przyciągnij koniec',
    grainFadesHelp:
      'Ziarno gra od kursora, więc narastanie i wygaszanie regionu łatwo przegapić. Użyj odtwarzania, aby je usłyszeć na zaznaczeniu.',
    fadeIn: 'Narastanie',
    fadeOut: 'Wygaszanie',
    curve: 'Krzywa',
    linear: 'Lin',
    equalPower: 'EqPow',
    exponential: 'Exp',
    sCurve: 'S',
    fadeHelp:
      'Pokrętło wygina wybrany zanik ku krzywej Lin, EqPow, Exp albo S. Zanik zaczyna się na krawędzi pętli. Wyższe Q przysuwa kolano.',
    fadeHelpOut: 'wygaszanie',
    fadeHelpIn: 'narastanie',
    auto10: 'Auto 10 ms',
    fadesOff: 'Wyłącz fade’y',
    trim: 'Przytnij',
    normalize: 'Normalizuj',
    reverse: 'Odwróć',
    effectSettings: 'Ustawienia efektu',
    main: 'Główne',
    advanced: 'Zaawansowane',
    gain: 'Wzmocnienie',
    panning: 'Panorama',
    bypassed: 'Omijany',
    active: 'Aktywny',
    mute: 'Wycisz',
    sampleTempo: 'Tempo sampla',
    source: 'Źródło',
    taps: 'Odbicia',
    hide: 'Ukryj inspektor',
    show: 'Pokaż inspektor',
    interpolation: 'Interpolacja',
    interpAlgo: 'Jakość przeliczania próbek, gdy wysokość schodzi z 0 półtonów.',
    interpFast: 'Szybka',
    interpSmooth: 'Gładka',
    interpHigh: 'Wysoka jakość',
    interpFastTitle:
      'Interpolacja liniowa. Najmniej CPU. Ostrzejsza i z większym aliasingiem, gdy wysokość mocno odchodzi od 0. Sama prędkość prawie tego nie zmienia, bo ziarno i tak gra w oryginalnym tempie.',
    interpSmoothTitle:
      'Interpolacja kubiczna do zwykłego odtwarzania. Gładsza niż Szybka pomiędzy próbkami, wciąż lekka dla CPU. Jasny materiał transponowany w górę nadal może aliasować.',
    interpHighTitle:
      'Okienkowany sinc. Ogranicza pasmo odczytu, więc wysokie transpozycje zostają czystsze. Więcej CPU. Zapis offline używa dłuższego jądra niż odtwarzanie na żywo.',
    stretchHelp:
      'Prędkość zmienia tempo bez wysokości. Wysokość transponuje bez zmiany tempa. Nakładanie ziaren mówi, jak bardzo kolejne ziarna time-stretchu nachodzą na siebie: wyższe wygładza i zmiękcza ataki, niższe zostawia wyraźniejsze transjenty. Ziarna zawsze się nakładają, więc nie ma dziur. Interpolacja odbudowuje próbki pomiędzy oryginalnymi. Słychać ją głównie, gdy wysokość schodzi z 0 — szczególnie w górę — a przy samej zmianie prędkości różnica jest subtelna.',
    remove: 'Usuń',
  },
  theme: {
    group: 'Motyw',
    named: (name) => `Motyw: ${name}`,
    system: 'System',
    custom: 'Custom',
    myThemes: 'Moje motywy',
    elementColors: 'Kolory elementów',
    help: 'Zaczyna od motywu, który miałeś otwarty. Zapisz, aby trafił do Moich motywów.',
    themeName: 'Nazwa motywu',
    save: 'Zapisz',
    deleteNamed: (name) => `Usuń ${name}`,
    colors: {
      bgApp: 'Tło',
      bgPanel: 'Panel',
      bgElevated: 'Powierzchnia',
      textPrimary: 'Tekst',
      accent: 'Akcent',
      waveform: 'Fala',
      spectrum: 'Widmo',
      playhead: 'Głowica',
      selection: 'Zaznaczenie',
    },
    names: {
      'studio-dark': 'Studio Dark',
      'midnight-blue': 'Midnight Blue',
      oxide: 'Oxide',
      forest: 'Forest',
      'light-studio': 'Light Studio',
      oled: 'OLED',
      dusk: 'Dusk',
      'pop-art': 'Pop Art',
      classic: 'Classic',
      energetic: 'Energetic',
      'chaos-theory': 'Chaos Theory',
      neon: 'Neon',
      manga: 'Manga',
      'black-white': 'Black & White',
      noire: 'Noire',
      oscilloscope: 'Oscilloscope',
      custom: 'Custom',
      'soft-slate': 'Soft Slate',
      'warm-paper': 'Warm Paper',
    },
    categories: {
      monochromatic: 'Monochromatyczne',
      color: 'Kolor',
      light: 'Jasne',
      eyes: 'Przyjazne oczom',
    },
  },
  sensory: {
    strings: 'Struny',
    stringsAria: 'Pokaż struny parametrów',
    stringsHideAria: 'Ukryj struny parametrów',
    menu: 'Menu',
    play: 'Odtwórz',
    pause: 'Wstrzymaj',
    playPause: 'Odtwórz lub wstrzymaj',
    loadDemo: 'Wygeneruj sample demo',
    rest: 'spoczynek',
    restAll: 'Wyzeruj wszystkie efekty sensoryczne',
    restLevel: 'spoczynek',
    doubleClickRest: 'Podwójne kliknięcie zeruje.',
    lfoConnected: 'LFO podłączone.',
    parameterStrings: 'Struny parametrów',
    overview: 'Przegląd sampla',
    feelingsLeft: 'Odczucia efektów, lewa',
    feelingsRight: 'Odczucia efektów, prawa',
    startingPlaces: 'Miejsca startowe',
    surprise: 'zaskocz mnie',
    atmosphere: 'Atmosfera',
    atmosphereNamed: (name) => `Atmosfera: ${name}`,
    themes: 'Motywy',
    color: 'Kolor',
    colorSoundAria: 'Kolor dźwięku. W bok zmienia barwę, w górę i w dół światło i cień. Podwójne kliknięcie wraca do spoczynku.',
    colorSoundRest: 'spoczynek',
    colorSoundRestAria: 'Wróć kolorem dźwięku do spoczynku',
    colorSoundLight: 'jasno',
    colorSoundDark: 'ciemno',
    colorSoundLabel: 'Kolor dźwięku',
    colorSoundShow: 'Pokaż kolor dźwięku',
    colorSoundHide: 'Ukryj kolor dźwięku',
    places: 'Miejsca',
    selectRegion: 'Przeciągnij dźwięk, aby go przesunąć. Krawędzie przycinają. Puste miejsce w przeglądzie wybiera nowy fragment. Podwójne kliknięcie odtwarza.',
    overviewDrag: 'Przeciągnij podświetlony fragment, aby go przesunąć. Przeciągnij puste miejsce, aby wybrać nowy. Krawędzie przycinają.',
    timeShorter: 'krócej',
    timeLonger: 'dłużej',
    timeAria: 'Czas, krócej i szybciej albo dłużej i rozciągnięcie. Podwójne kliknięcie zeruje.',
    pitchLower: 'niżej',
    pitchHigher: 'wyżej',
    pitchAria: 'Wysokość, niżej albo wyżej. Podwójne kliknięcie zeruje.',
    balanced: 'równowaga',
    atmospheres: {
      bloom: 'Rozkwit',
      range: 'Pasmo',
      ember: 'Żar',
      tide: 'Przypływ',
      canopy: 'Korona',
      mirror: 'Lustro',
      canyon: 'Kanion',
      gleam: 'Blask',
    },
    emotions: {
      intimate: 'blisko',
      distant: 'daleko',
      fragile: 'krucho',
      heavy: 'ciężko',
      dreamlike: 'senne',
      raw: 'surowo',
      floating: 'unosi się',
      restless: 'niespokojnie',
      tender: 'czule',
      broken: 'pęknięte',
    },
    feelings: {
      character: { label: 'charakter', from: 'ciasno', to: 'otwarcie', aria: 'Charakter, ciasno do otwarcia. Podwójne kliknięcie zeruje.' },
      space: { label: 'przestrzeń', from: 'blisko', to: 'szeroko', aria: 'Przestrzeń, blisko do szeroko. Podwójne kliknięcie zeruje.' },
      echo: { label: 'echo', from: 'sucho', to: 'echo', aria: 'Echo, sucho do echa. Podwójne kliknięcie zeruje.' },
      grain: { label: 'ziarno', from: 'lite', to: 'ziarno', aria: 'Ziarno, lite do warstw. Podwójne kliknięcie zeruje.' },
      dirt: { label: 'brud', from: 'czysto', to: 'brud', aria: 'Brud, czysto do ziarnistości. Podwójne kliknięcie zeruje.' },
      tight: { label: 'ścisk', from: 'otwarcie', to: 'ścisk', aria: 'Ścisk, otwarcie do kompresji. Podwójne kliknięcie zeruje.' },
      mod: { label: 'mod', from: 'spokój', to: 'mod', aria: 'Mod, spokój do modulacji. Podwójne kliknięcie zeruje.' },
      drift: { label: 'dryf', from: 'środek', to: 'dryf', aria: 'Dryf, środek do panoramy. Podwójne kliknięcie zeruje.' },
      pan: { label: 'pan', from: 'spokój', to: 'pan', aria: 'Panorama, spokój do orbity. Podwójne kliknięcie zeruje.' },
      veil: { label: 'woal', from: 'jasno', to: 'woal', aria: 'Woal, jasno do oddalenia. Podwójne kliknięcie zeruje.' },
      halo: { label: 'halo', from: 'nago', to: 'halo', aria: 'Halo, nago do rozkwitu. Podwójne kliknięcie zeruje.' },
      well: { label: 'studnia', from: 'płasko', to: 'studnia', aria: 'Studnia, płasko do wydrążenia. Podwójne kliknięcie zeruje.' },
      bloom: { label: 'rozkwit', from: 'spokój', to: 'rozkwit', aria: 'Rozkwit, spokój do wznoszącej chmury. Podwójne kliknięcie zeruje.' },
      plate: { label: 'płyta', from: 'sucho', to: 'płyta', aria: 'Płyta, sucho do studyjnej płyty. Podwójne kliknięcie zeruje.' },
      spring: { label: 'sprężyna', from: 'lite', to: 'sprężyna', aria: 'Sprężyna, lite do twang. Podwójne kliknięcie zeruje.' },
      shimmer: { label: 'połysk', from: 'ziemia', to: 'połysk', aria: 'Połysk, ziemia do oktawowego rozkwitu. Podwójne kliknięcie zeruje.' },
      reverse: { label: 'odwrot', from: 'w przód', to: 'odwrot', aria: 'Odwrot, w przód do nabrzmienia. Podwójne kliknięcie zeruje.' },
      gate: { label: 'bramka', from: 'otwarcie', to: 'bramka', aria: 'Bramka, otwarcie do uciętego ogona. Podwójne kliknięcie zeruje.' },
      fuzz: { label: 'fuzz', from: 'czysto', to: 'fuzz', aria: 'Fuzz, czysto do wełny. Podwójne kliknięcie zeruje.' },
      crush: { label: 'krusz', from: 'gładko', to: 'krusz', aria: 'Kruszenie, gładko do bitcrush. Podwójne kliknięcie zeruje.' },
      tape: { label: 'taśma', from: 'czysto', to: 'taśma', aria: 'Taśma, czysto do nasyconej taśmy. Podwójne kliknięcie zeruje.' },
      fold: { label: 'zgięcie', from: 'liniowo', to: 'zgięcie', aria: 'Zgięcie, liniowo do wavefold. Podwójne kliknięcie zeruje.' },
      vinyl: { label: 'winyl', from: 'czysto', to: 'winyl', aria: 'Winyl, czysto do zakurzonej płyty. Podwójne kliknięcie zeruje.' },
      sweep: { label: 'sweep', from: 'otwarcie', to: 'sweep', aria: 'Sweep, otwarcie do ruchomego filtra. Podwójne kliknięcie zeruje.' },
      dark: { label: 'ciemno', from: 'otwarcie', to: 'ciemno', aria: 'Ciemno, otwarcie do ciepłego low-pass. Podwójne kliknięcie zeruje.' },
      thin: { label: 'cienko', from: 'pełnia', to: 'cienko', aria: 'Cienko, pełnia do high-pass. Podwójne kliknięcie zeruje.' },
      phone: { label: 'telefon', from: 'szeroko', to: 'telefon', aria: 'Telefon, szeroko do pasma słuchawki. Podwójne kliknięcie zeruje.' },
      notch: { label: 'wcięcie', from: 'pełnia', to: 'wcięcie', aria: 'Wcięcie, pełnia do wydrążonego cięcia. Podwójne kliknięcie zeruje.' },
      peak: { label: 'szczyt', from: 'płasko', to: 'szczyt', aria: 'Szczyt, płasko do śpiewającego garbu. Podwójne kliknięcie zeruje.' },
      comb: { label: 'grzebień', from: 'gładko', to: 'grzebień', aria: 'Grzebień, gładko do zębów. Podwójne kliknięcie zeruje.' },
      melt: { label: 'topnienie', from: 'stałe', to: 'topnienie', aria: 'Topnienie, stałe do morphującego filtra. Podwójne kliknięcie zeruje.' },
    },
  },
  export: {
    title: 'Eksport sampla',
    original: 'Oryginał',
    hintCodec: 'FLAC i AIFF pojawiają się tylko, gdy ta kompilacja umie je kodować.',
    estimated: (time) => `Szacowany czas ${time}`,
    exportProject: 'Eksportuj',
    exportSelection: 'Eksport zaznaczenia',
    selectionUnavailable: 'Zaznacz fragment krótszy niż cały sampel.',
    preparing: 'Przygotowanie…',
    rendering: 'Renderowanie…',
    encoding: 'Kodowanie…',
    exportFailed: 'Eksport nie powiódł się.',
    tailHint: 'Wybrzmienia efektów są dopisywane, aż sygnał wybrzmi.',
    keepTail: 'Pozostaw ogon ewentualnych efektów',
    tailDropped: 'Plik kończy się z nagraniem. Ogon efektów nie jest zachowany.',
    cancel: 'Anuluj',
    applyFades: 'Zastosuj narastanie i wygaszanie',
    applyGain: 'Zastosuj wzmocnienie',
    applyReverse: 'Zastosuj odwrócenie',
    applyNormalize: (db) => `Normalizuj do ${db} dBFS`,
    depth16: '16-bit PCM',
    depth24: '24-bit PCM',
    depth32: '32-bit float',
    checkTitle: 'Kontrola eksportu',
    checkRange: 'Zakres eksportu',
    fullAudio: 'Całe nagranie',
    selection: 'Zaznaczenie',
    status: 'Status',
    settingsValid: 'Ustawienia poprawne',
    warning: 'Ostrzeżenie',
    error: 'Błąd',
    info: 'Informacja',
    noAudio: 'Nie wczytano pliku audio.',
    noAudioAction: 'Wczytaj plik audio, a potem wróć do eksportu.',
    loadAudio: 'Wczytaj audio',
    invalidRange: 'Zakres eksportu jest niepoprawny.',
    zeroLength: 'Zakres eksportu ma zerową długość.',
    outsideRange: 'Zakres eksportu wykracza poza nagranie.',
    unsupportedFormat: 'Ten format nie jest obsługiwany.',
    unsupportedRate: 'Ta częstotliwość próbkowania nie jest obsługiwana.',
    unsupportedDepth: 'Ta głębia bitowa nie jest obsługiwana.',
    effectsIncluded: (names) => `Aktywne efekty trafią do pliku: ${names}.`,
    effectsLabel: 'Efekty',
    effectsNone: 'Brak',
    clipUnknown: 'Poziom pliku nie jest mierzony przed zapisem. Ta kontrola nie potwierdza braku przesterowania.',
    clipDetected: 'Zmierzony sygnał eksportu przekracza pełną skalę.',
    clipWithin: 'Zmierzony sygnał eksportu mieści się w pełnej skali.',
    resampleNote: 'Częstotliwość pliku jest inna. Eksport używa istniejącego resamplera.',
    swapNeedsStereo: 'Zamiana wymaga dwóch kanałów. Plik zostaje mono.',
    help: 'Sprawdza te ustawienia. Nie zmienia dźwięku.',
    rateHelp: 'Wybrana częstotliwość próbkowania. Przetwarzanie wewnętrzne zostaje zmiennoprzecinkowe.',
    depthHelpPcm: 'PCM całkowite. Bez ditheringu. Przetwarzanie wewnętrzne zostaje zmiennoprzecinkowe.',
    depthHelpDither: 'PCM całkowite. Eksport 16-bit stosuje dithering TPDF.',
    depthHelpFloat: 'Plik zmiennoprzecinkowy, nie PCM całkowite. Bez ditheringu.',
    channelHelp: 'Układ kanałów zapisywany do pliku.',
    rangeHelp: 'Początek, koniec i długość muszą mieścić się w nagraniu.',
    formatHelp: 'WAV to format, który ten eksport potrafi zapisać.',
    swap: 'Zamiana L/P',
    fileRate: 'Częstotliwość pliku.',
    previewTitle: 'Odsłuch eksportu',
    preview: 'Odsłuchaj',
    previewStop: 'Zatrzymaj',
    previewStopAria: 'Zatrzymaj odsłuch',
    previewPreparing: 'Przygotowywanie odsłuchu…',
    previewReady: 'Odsłuch gotowy',
    previewPlaying: 'Odsłuch trwa',
    previewStopped: 'Odsłuch zatrzymany',
    previewFailed: 'Nie udało się przygotować odsłuchu',
    previewUnavailable: 'Odsłuch niedostępny',
    previewStopPlayback: 'Zatrzymaj odtwarzanie przed rozpoczęciem odsłuchu eksportu.',
    previewStopPlaybackAction: 'Zatrzymaj odtwarzanie',
    previewDuration: 'Długość odsłuchu',
    previewScope: 'Zakres odsłuchu',
    previewRange: (start, end) => `Odsłuch ${start}–${end}`,
    previewOutside: 'Głowica jest poza zakresem eksportu. Odsłuch zaczyna się na początku tego zakresu.',
    previewNotEncoded: 'Przetworzone audio, nie zakodowany plik.',
    previewNormalize: 'Normalizacja liczy cały plik. To okno nie jest normalizowane osobno.',
    previewTail: 'Ogon jest jak w eksporcie. Dźwięk sprzed tego okna nie wchodzi do opóźnienia ani pogłosu.',
    previewSpeed: 'Prędkość odtwarzania nie wchodzi do renderu eksportu.',
    previewPitch: 'Wysokość dźwięku nie wchodzi do renderu eksportu.',
    previewMonitor: 'Odsłuch idzie przez wyjście monitora, razem z jego limiterem bezpieczeństwa.',
    previewBusy: 'Eksport już trwa.',
    previewSeconds: (seconds) => `${seconds} s`,
  },
  mix: {
    mixer: 'Mikser',
    tracks: 'Ślady',
    trackName: 'Nazwa śladu',
    mix: 'Mix',
    output: 'Wyjście',
    master: 'Master',
    outputMix: 'Mix wyjścia',
    out: 'Out',
    monitor: 'Monitor',
    monitorHint: 'Poziom mikrofonu w głośnikach podczas nagrania. Bez słuchawek zostaw 0, żeby uniknąć sprzężenia.',
    masterHint: 'Sumuje ślady po ich własnych łańcuchach efektów.',
    track: 'Ślad',
    openFx: 'Edytuj efekty śladu',
    fx: 'FX',
    fxCount: (count) => `FX ${count}`,
    single: 'Jeden',
    multi: 'Wiele',
    singleTitle: 'Widok jednego śladu',
    multiTitle: 'Widok wielu śladów',
    loadAudio: 'Wczytaj audio',
    loadSample: 'Wczytaj sample',
    loop: 'Pętla',
    loopTrack: 'Pętla śladu',
    setLoop: 'Ustaw pętlę',
    loopStart: 'Początek pętli',
    loopEnd: 'Koniec pętli',
    sourceEnd: 'Koniec źródła',
    tracksView: 'Ślady',
    mixerView: 'Mikser',
    direction: 'Kierunek',
    input: 'Wejście',
    trackInput: 'Wejście śladu',
    dropAudio: 'Upuść audio',
    replaceDrop: 'Podmień audio',
    mixMore: 'Mix',
    replaceAudio: 'Podmień',
    clearTrack: 'Wyczyść',
    volume: 'Głośność',
    pan: 'Pan',
    mid: 'Mid',
    side: 'Side',
    midSide: 'Mid/Side',
    trackMix: 'Mix śladu',
    muteTrack: (name) => `Wycisz ślad ${name}`,
    soloTrack: (name) => `Solo śladu ${name}`,
    volumeTrack: (name) => `Głośność śladu ${name}`,
    panTrack: (name) => `Panorama śladu ${name}`,
    midTrack: (name) => `Poziom Mid śladu ${name}`,
    sideTrack: (name) => `Poziom Side śladu ${name}`,
    midSideTrack: (name) => `Mid/Side śladu ${name}`,
    mono: 'Mono',
    stereo: 'Stereo',
    expandStereo: 'Rozwiń kanały',
    collapseStereo: 'Zwiń kanały',
    rename: 'Zmień nazwę',
    color: 'Kolor śladu',
    empty: 'Pusty ślad',
    replaceAsk: 'Podmienić audio?',
    replaceYes: 'Podmień',
    replaceNo: 'Anuluj',
    left: 'Lewy',
    right: 'Prawy',
    reorder: 'Zmień kolejność',
  },
  meters: {
    resetClip: 'Reset clip',
    resetClipTitle: 'Reset wskaźnika clip',
    clip: 'Clip',
    range: 'Zakres miernika',
    rangeLabel: 'Zakres',
    strip: 'Metery wyjścia',
    peak: (channel) => `Metr szczytowy ${channel}`,
    clipState: (state) => `Wskaźnik przesterowania, ${state}. Aktywuj, aby wyzerować.`,
    clipOn: 'przesterowanie',
    clipOff: 'czysty',
    readout: (channel, value) => `${channel} szczyt ${value}`,
  },
  lfo: {
    center: 'Centrum LFO',
    lead: (slots) => `Działające modulacje i ich cele. Do ${slots} LFO na każdy efekt.`,
    storedValue: 'Zapisana wartość (zero LFO)',
    typeValue: 'Kliknij dwukrotnie, aby wpisać wartość',
  },
  modulation: {
    title: (name) => `Modulacja: ${name}`,
    rate: 'Tempo',
    depth: 'Głębokość',
    shape: 'Kształt',
    lfo: 'LFO',
    more: 'Więcej',
    remove: 'Usuń',
    close: 'Zamknij',
    active: 'AKTYWNE',
    inactive: 'NIEAKTYWNE',
    activeAria: 'LFO aktywne',
    inactiveAria: 'LFO nieaktywne',
    automationOn: 'Automatyzacja też jest aktywna. Jej krzywa zostaje osobno od LFO.',
    automationOff: 'Brak automatyzacji tego parametru.',
    addAutomation: 'Dodaj automatyzację',
    affordance: (name, depth, automation) =>
      depth
        ? `Moduluj ${name}, LFO ${depth}${automation ? ', automatyzacja aktywna' : ''}`
        : `Moduluj ${name}`,
  },
  random: {
    chaos: 'Chaos',
    title: (name) => `Random ${name}`,
    onceFor: (name) => `Losuj ${name}`,
    autoFor: (name) => `Auto Random ${name}`,
    now: 'Losuj teraz',
    auto: 'Auto Random',
    on: 'Włączone',
    off: 'Wyłączone',
    free: 'Free',
    sync: 'Sync',
    rate: 'Tempo',
    division: 'Podział',
    intensity: 'Intensywność',
    transition: 'Przejście',
    step: 'Step',
    smooth: 'Smooth',
    randomizeEffect: 'Losuj efekt',
    randomizeBand: 'Losuj pasmo',
    randomizeEq: 'Losuj EQ',
    parameterTip: 'Losuj parametr',
    effectAria: (name) => `Losuj ${name}`,
    setupTip: 'Ustawienia Random',
    setupAria: 'Otwórz ustawienia losowania',
    setupTitle: (name) => `Ustawienia Random — ${name}`,
    targets: 'Cele',
    modes: 'Wybory / tryby',
    all: 'Wszystkie',
    none: 'Żadne',
    behavior: 'Zachowanie',
    timing: 'Rytm',
    range: 'Zakres',
    autoAllowed: 'Dozwolone',
    showTarget: (name) => `Pokaż ustawienia Random: ${name}`,
    hideTarget: (name) => `Ukryj ustawienia Random: ${name}`,
    mixed: 'Różne',
    appliesTo: 'Dotyczy zaznaczonych celów',
    eqTypeNote: 'Pełne pasmo losuje też typ filtra i nachylenie.',
    noEqBands: 'Włącz pasmo, żeby wybrać cele.',
    effectMenu: (name) => `Random ${name}`,
    chaosHint: 'Auto Random wymaga Chaosu. Jedno kliknięcie i tak losuje od razu.',
    budget: 'Częstotliwość zdarzeń jest ograniczona, żeby instrument został responsywny.',
    warning:
      'Chaos włącza automatyczne i wieloparametrowe losowanie. Może powodować skrajne zmiany brzmienia, nagłe zmiany poziomu, wyższe użycie CPU oraz skrajne sprzężenie lub rezonans w granicach ochrony.',
    cancel: 'Anuluj',
    enable: 'Włącz Chaos',
    randomize: 'Losuj',
    randomizeNow: 'Losuj teraz',
    setup: 'Ustawienia losowania',
    parameters: 'Parametry',
    selects: 'Wybory / tryby',
    scope: 'Zakres',
    scopeWhole: 'Cały EQ',
    scopeBand: 'Wybrane pasmo',
    filterCount: 'Liczba filtrów',
    countRandom: 'Losowo 1–6',
    frequency: 'Częstotliwość',
    gain: 'Wzmocnienie',
    q: 'Q',
    filterType: 'Typ filtra',
    slope: 'Nachylenie',
    wholeEq: 'Generuj EQ',
    oneShot: 'Typ filtra zmienia się przy Losuj teraz.',
    direction: 'Kierunek',
    delayType: 'Typ delaya',
    reverbType: 'Typ reverbu',
    distortionType: 'Typ zniekształcenia',
    lfoRate: 'Tempo',
    lfoDepth: 'Głębokość',
    lfoShape: 'Kształt',
    lfoPhase: 'Faza',
    lfoConnect: 'Losowanie podłączy to LFO, jeśli jeszcze nie jest skierowane.',
  },
  a11y: {
    title: 'Dostępność',
    open: 'Dostępność',
    back: 'Wstecz',
    accessTitle: 'FIELD ACCESS',
    accessSubtitle: 'Dostosuj FIELD do swoich potrzeb.',
    visualComfort: 'Komfort widzenia',
    interfaceSize: 'Rozmiar interfejsu',
    interfaceSizeHelp: 'Zmień wielkość kontrolek i elementów interfejsu.',
    textSize: 'Rozmiar tekstu',
    textSizeHelp: 'Powiększ tekst niezależnie od wielkości całego interfejsu.',
    interaction: 'Interakcja',
    theme: 'Wysoki kontrast / słabowidzący',
    themeHelp: 'Przełącza na motyw o wyższym kontraście dla słabego widzenia. Dźwięk się nie zmienia.',
    reduceMotion: 'Ogranicz ruch',
    reducedMotionHelp: 'Ogranicza zbędne animacje.',
    reducedMotionSystem: 'Ustawienie ograniczenia ruchu w urządzeniu też jest respektowane.',
    larger: 'Większe elementy sterujące',
    largerHelp: 'Ułatwia korzystanie z elementów sterujących.',
    focus: 'Wyraźniejszy fokus klawiatury',
    focusHelp: 'Ułatwia zobaczenie fokusu klawiatury.',
    highVisibility: 'Zwiększona widoczność kontrolek',
    highVisibilityHelp: 'Popraw widoczność kontrolek, zaznaczeń i uchwytów edycyjnych.',
    cognitive: 'Poznanie i uwaga',
    attentionFocus: 'Koncentracja uwagi',
    attentionFocusHelp: 'Wyróżniaj elementy związane z aktualnie wykonywaną czynnością.',
    attentionStrength: 'Siła wyróżnienia',
    attentionStrengthHelp: 'Subtelna to mała różnica. Wyraźna jest łatwiejsza do zobaczenia. Żadna nie ukrywa tekstu i nie miga.',
    attentionSubtle: 'Subtelna',
    attentionClear: 'Wyraźna',
    attentionHighlight: 'Wyróżniaj powiązane kontrolki',
    attentionHighlightHelp: 'Oznacz kontrolki, które należą do tej edycji.',
    attentionReduce: 'Ścisz niepowiązane elementy',
    attentionReduceHelp: 'Ścisz dekoracyjny kontrast wokół pozostałych obszarów. Tekst zostaje czytelny.',
    predictableLayout: 'Przewidywalny układ',
    predictableLayoutHelp: 'Zachowuj stałe rozmieszczenie narzędzi i paneli podczas pracy.',
    stablePanels: 'Stabilne panele',
    stablePanelsHelp: 'Inspektor, łańcuch efektów i transport zostają na stałych miejscach. Ich zawartość przewija się w środku.',
    rememberLayout: 'Zapamiętaj układ obszaru roboczego',
    rememberLayoutHelp: 'Zapamiętaj obszar roboczy i układ paneli dla każdego trybu.',
    reduceLayout: 'Ogranicz ruch układu',
    reduceLayoutHelp: 'Ogranicz animację paneli i inny ruch układu.',
    restoreLayout: 'Przywróć układ obszaru roboczego',
    restoreLayoutHelp: 'Przywraca panele na zwykłe miejsca. Dźwięk i pozostałe przełączniki dostępności zostają bez zmian.',
    layoutRestored: 'Przywrócono układ obszaru roboczego.',
    on: 'Wł.',
    off: 'Wył.',
    saved: 'Te wybory zostają, dopóki strona jest otwarta. Odświeżenie wraca do wartości domyślnych. Przeglądarka ich jeszcze nie trzyma.',
    restore: 'Przywróć domyślne ustawienia dostępności',
    restoreHelp: 'Zeruje te preferencje. Nie usuwa audio, efektów, automatyzacji ani projektu.',
    restored: 'Przywrócono domyślne ustawienia dostępności.',
    more: 'Więcej opcji dostępności',
    tips: 'Podpowiedzi / opisy parametrów',
    tipsHelp: 'Pokazuje krótki opis, gdy wskażesz kontrolkę. Nazwa kontrolki zostaje w obu przypadkach.',
    sr: 'Optymalizacje czytnika ekranu',
    srHelp: 'Wycisza dodatkowe komunikaty na żywo. Nazwy, wartości i obsługa klawiaturą pozostają włączone.',
    shortcuts: 'Skróty klawiszowe transportu',
    shortcutsHelp:
      'Gdy włączone, spacja odtwarza albo pauzuje. Przy wyłączonej obsłudze klawiaturą, edytowaniu bez przeciągania, optymalizacjach czytnika i dostępnej nawigacji po nagraniu robi to także, gdy fokus jest na przycisku, przełączniku albo suwaku. Pole tekstowe nadal przyjmuje znak. Otwarte okno zostawia spację swoim kontrolkom. Tab nigdy nie jest przechwytywany.',
    shortcutsTitle: 'Skróty klawiszowe',
    shortcutTab: 'Tab / Shift+Tab: przejście między kontrolkami',
    shortcutArrows: 'Strzałki: zmiana wartości gałki lub suwaka',
    shortcutShiftArrows: 'Shift+strzałka: precyzyjna regulacja',
    shortcutHomeEnd: 'Home / End: minimum / maksimum',
    shortcutPage: 'Page Up / Page Down: większy krok',
    shortcutReset: 'Delete lub Backspace: reset aktualnego parametru',
    shortcutSpace:
      'Spacja: odtwarzanie albo pauza. Przy wyłączonych specjalnych opcjach dostępności dotyczy to też przycisku, przełącznika i suwaka w fokusie. Pole tekstowe i otwarte okno zostawiają spację u siebie. Gdy Hold jest włączony, spacja kasuje Hold.',
    shortcutEsc: 'Escape: zamyka menu, okna i podpowiedzi',
    skipToMain: 'Przejdź do głównych parametrów',
    dragFree: 'Edytowanie bez przeciągania',
    dragFreeHelp: 'Edytuj dźwięk za pomocą przycisków i dokładnych wartości, bez przeciągania.',
    keyboardFirst: 'Obsługa klawiaturą',
    keyboardFirstHelp: 'Nawiguj i edytuj dźwięk bez używania myszy.',
    keyboardFirstAlways: 'Tab, Enter, Spacja i Escape działają także przy wyłączonej preferencji.',
    waveformNav: 'Dostępna nawigacja po nagraniu',
    waveformNavHelp: 'Poruszaj się po nagraniu za pomocą czasu, klawiatury i punktów charakterystycznych.',
    waveformNavAlways: 'Klawiatura i czytnik ekranu nadal opisują falę, gdy ta preferencja jest wyłączona.',
    sensoryComfort: 'Komfort sensoryczny',
    sensoryComfortHelp: 'Ogranicz zbędny ruch, intensywność wizualną i elementy rozpraszające.',
    sensoryComfortSection: 'Komfort sensoryczny',
    sensoryComfortApplies: 'Te wybory działają, gdy Komfort sensoryczny jest włączony. Ograniczenie ruchu zostaje osobne.',
    visualActivity: 'Aktywność wizualna',
    visualActivityHelp: 'Niska ogranicza zbędne odświeżanie obrazu. Pomiary zostają te same.',
    visualActivityStandard: 'Standardowa',
    visualActivityLow: 'Niska',
    reduceDecorativeMotion: 'Ogranicz ruch dekoracyjny',
    reduceDecorativeMotionHelp: 'Zatrzymuje ozdobne animacje. Głowica, zaznaczenie i fokus zostają.',
    calmMeters: 'Spokojne mierniki',
    calmMetersHelp: 'Spokojniejszy rysunek. Szczyty, przesterowanie i pomiar zostają dokładne.',
    calmSpectrum: 'Spokojne widmo',
    calmSpectrumHelp: 'Spokojniejsze FFT i wodospad. Ustawienia analizy zostają te same.',
    reduceVisualEffects: 'Ogranicz efekty wizualne',
    reduceVisualEffectsHelp: 'Mniej poświaty, rozmycia i ozdobnego koloru. Fokus zostaje widoczny.',
    quietNotifications: 'Ciche powiadomienia',
    quietNotificationsHelp: 'Mniej komunikatów informacyjnych. Błędy i przesterowanie zostają widoczne.',
  },
  markers: {
    open: 'Znaczniki',
    close: 'Zamknij znaczniki',
    add: 'Dodaj',
    go: 'Idź',
    edit: 'Zmień nazwę',
    remove: 'Usuń',
    save: 'Zapisz znacznik',
    cancel: 'Anuluj',
    name: 'Nazwa',
    description: 'Opis',
    showDescription: 'Pokaż opis',
    hideDescription: 'Ukryj opis',
    time: 'Czas',
    empty: 'Nie ma jeszcze znaczników.',
    needAudio: 'Wczytaj nagranie, zanim dodasz znacznik.',
    needName: 'Wpisz nazwę znacznika.',
    list: 'Znaczniki',
    openCount: (count) => `Znaczniki, ${count}`,
    addMarker: 'Dodaj znacznik',
    emptyHint: 'Dodaj znacznik w miejscu głowicy.',
    suggestions: 'Propozycje',
    suggestionsCount: (count) => `Propozycje, ${count}`,
    suggestionsHelp: 'To propozycje z istniejącego skanu punktów. Zostają propozycjami, dopóki nie zapiszesz jednej jako znacznik.',
    saveDetected: 'Zapisz jako znacznik',
    noSuggestions: 'Brak wykrytych miejsc.',
    analysing: 'Szukam miejsc.',
    moreSuggestions: 'Więcej propozycji',
    previousAction: 'Poprzedni znacznik',
    nextAction: 'Następny znacznik',
    prevShort: 'Wstecz',
    nextShort: 'Dalej',
    editTime: 'Zmień czas',
    editDescription: 'Zmień opis',
    actions: (name) => `Akcje znacznika: ${name}`,
    defaultName: (index) => `Znacznik ${index}`,
    pointLabel: (name, time) => `Znacznik: ${name}, ${time}.`,
    goTo: (name) => `Idź do znacznika: ${name}`,
    editNamed: (name) => `Zmień znacznik: ${name}`,
    deleteNamed: (name) => `Usuń znacznik: ${name}`,
    added: (name, time) => `Dodano znacznik: ${name}, ${time}.`,
    renamed: (name) => `Nazwa znacznika: ${name}.`,
    described: (name) => `Zapisano opis znacznika ${name}.`,
    retimed: (name, time) => `Czas znacznika: ${name}, ${time}.`,
    deleted: (name) => `Usunięto znacznik: ${name}.`,
    previous: (name, time) => `Poprzedni znacznik: ${name}, ${time}.`,
    next: (name, time) => `Następny znacznik: ${name}, ${time}.`,
    none: 'Nie ma znacznika w tę stronę.',
    savedDetected: (name, time) => `Zapisano jako znacznik: ${name}, ${time}.`,
    color: 'Kolor',
    colors: {
      amber: 'Bursztynowy',
      cyan: 'Cyjan',
      green: 'Zielony',
      violet: 'Fiolet',
      orange: 'Pomarańczowy',
      magenta: 'Magenta',
      blue: 'Niebieski',
      neutral: 'Neutralny',
    },
    recolored: (name, color) => `Kolor znacznika: ${name}, ${color}.`,
  },
  keyboard: {
    open: 'Skróty klawiszowe',
    jump: 'Nawigacja po obszarze',
    close: 'Zamknij',
    search: 'Filtruj skróty',
    empty: 'Brak pasujących skrótów.',
    destSearch: 'Filtruj miejsca',
    destEmpty: 'Brak pasujących miejsc.',
    alwaysOn: 'Obsługa klawiaturą działa także przy wyłączonej preferencji. Skróty pochodzą z aktualnego rejestru.',
    browserChord: 'Ctrl+K i Cmd+K zostają przy przeglądarce. FIELD używa Ctrl+Shift+K albo Cmd+Shift+K.',
    groups: {
      navigation: 'Nawigacja',
      transport: 'Transport',
      editing: 'Edycja',
      effects: 'Efekty',
      automation: 'Automatyzacja',
      guidedTasks: 'Zadania z przewodnikiem',
    },
    destinations: {
      waveform: 'Fala',
      transport: 'Transport',
      effects: 'Efekty',
      inspector: 'Inspektor',
      eq: 'EQ',
      fft: 'FFT',
      automation: 'Automatyzacja',
      hearing: 'Słuch',
      guided: 'Zadania z przewodnikiem',
      export: 'Eksport',
      accessibility: 'Ustawienia dostępności',
      gain: 'Wzmocnienie',
      parameters: 'Parametry',
    },
    byId: {
      'nav.workspaces': 'Otwórz nawigację po obszarze',
      'nav.help': 'Otwórz skróty klawiszowe',
      'help.explain': 'Wyjaśnij kontrolkę w fokusie',
      'transport.play': 'Odtwarzaj albo pauzuj. Przy wyłączonych specjalnych opcjach dostępności dotyczy to też kontrolki w fokusie',
      'transport.stop': 'Zatrzymaj odtwarzanie',
      'transport.loop': 'Przełącz pętlę',
      'transport.back': 'Cofnij głowicę o mały krok',
      'transport.forward': 'Przesuń głowicę o mały krok',
      'transport.backCoarse': 'Cofnij głowicę o większy krok',
      'transport.forwardCoarse': 'Przesuń głowicę o większy krok',
      'transport.toStart': 'Przesuń głowicę na początek',
      'transport.toEnd': 'Przesuń głowicę na koniec',
      'transport.pageBack': 'Cofnij głowicę o jedną sekundę',
      'transport.pageForward': 'Przesuń głowicę o jedną sekundę',
      'edit.undo': 'Cofnij',
      'edit.redo': 'Ponów',
      'edit.redoY': 'Ponów',
      'edit.copy': 'Kopiuj zaznaczenie',
      'edit.cut': 'Wytnij zaznaczenie',
      'edit.paste': 'Wklej przy głowicy',
      'effects.earlier': 'Przenieś efekt w fokusie wcześniej',
      'effects.later': 'Przenieś efekt w fokusie później',
      'effects.up': 'Przenieś efekt w fokusie wcześniej',
      'effects.down': 'Przenieś efekt w fokusie później',
      'auto.delete': 'Usuń wybrany punkt automatyzacji',
      'guide.minimize': 'Zminimalizuj zadania z przewodnikiem',
      'modal.close': 'Zamknij okno',
      'markers.add': 'Dodaj znacznik w miejscu głowicy',
      'markers.previous': 'Idź do poprzedniego znacznika',
      'markers.next': 'Idź do następnego znacznika',
      'markers.open': 'Otwórz znaczniki',
    },
  },
  dragFree: {
    selection: 'Zaznaczenie',
    start: 'Początek',
    end: 'Koniec',
    setStart: 'Ustaw początek',
    setEnd: 'Ustaw koniec',
    editTimes: 'Edytuj czasy',
    clear: 'Wyczyść',
    apply: 'Zastosuj',
    cancel: 'Anuluj',
    goToTime: 'Idź do czasu',
    go: 'Idź',
    stepBack: 'Cofnij głowicę o 100 milisekund',
    stepForward: 'Przesuń głowicę o 100 milisekund',
    toStart: 'Idź na początek zaznaczenia',
    toEnd: 'Idź na koniec zaznaczenia',
    preview: 'Odsłuch',
    trim: 'Przytnij',
    trimWarn: 'Przycięcie zostawia zaznaczenie i usuwa dźwięk poza nim. Można to cofnąć.',
    trimApply: 'Przytnij zaznaczenie',
    fadeIn: 'Narastanie',
    fadeOut: 'Wygaszanie',
    fadeLess: 'Krócej o 50 milisekund',
    fadeMore: 'Dłużej o 50 milisekund',
    duration: 'Czas trwania',
    loop: 'Pętla',
    setLoopStart: 'Ustaw początek pętli',
    setLoopEnd: 'Ustaw koniec pętli',
    editLoop: 'Edytuj czasy pętli',
    eqBands: 'Pasma EQ',
    editBand: 'Edytuj wybrane pasmo',
    frequency: 'Częstotliwość',
    gain: 'Wzmocnienie',
    q: 'Q',
    filterType: 'Typ filtra',
    chooseType: 'Wybierz typ',
    bypass: 'Omijaj',
    enable: 'Włącz',
    noEq: 'Dodaj EQ, aby edytować pasma.',
    noBands: 'Nie ma jeszcze aktywnych pasm EQ.',
    automation: 'Automatyzacja',
    editPoint: 'Edytuj punkt',
    addPoint: 'Dodaj punkt przy głowicy',
    deletePoint: 'Usuń punkt',
    pointTime: 'Czas',
    pointValue: 'Wartość',
    noLane: 'Najpierw wybierz parametr z automatyzacją.',
    noPoints: 'Ten parametr nie ma jeszcze punktów.',
    timeNote: 'Czas to minuty, sekundy i milisekundy. Edycja sampla zostawia dotychczasowe zaokrąglenie FIELD.',
    noSample: 'Wczytaj sample, aby edytować czasy.',
    errFormat: 'Wpisz czas, na przykład 01:23.450.',
    errNegative: 'Czas nie może być ujemny.',
    errPast: 'Ten czas jest za końcem nagrania.',
    errOrder: 'Początek musi być wcześniej niż koniec.',
    errShort: 'Zakres musi mieć co najmniej 50 milisekund.',
    errFade: 'Zanik nie może być dłuższy niż zaznaczenie.',
    errRange: 'Ta wartość jest poza zakresem tej kontrolki.',
    appliedSelection: 'Zaznaczenie zaktualizowane.',
    appliedPlayhead: 'Głowica przesunięta.',
    appliedFade: 'Zanik zaktualizowany.',
    appliedTrim: 'Przycięto.',
    appliedLoop: 'Pętla zaktualizowana.',
    appliedBand: 'Pasmo EQ zaktualizowane.',
    appliedPoint: 'Punkt automatyzacji zaktualizowany.',
    deletedPoint: 'Punkt automatyzacji usunięty.',
    nudgedPoint: 'Ten czas był już zajęty, więc punkt przesunął się na najbliższy wolny czas.',
    cleared: 'Zaznaczenie wyczyszczone.',
    selectionStartSr: (time) => `Początek zaznaczenia, ${time}.`,
    selectionEndSr: (time) => `Koniec zaznaczenia, ${time}.`,
    playheadSr: (time) => `Głowica, ${time}.`,
    bandSr: (n, type) => `Pasmo EQ ${n}, ${type}.`,
    freqSr: (n, value) => `Pasmo EQ ${n}, częstotliwość, ${value}.`,
    pointSr: (n, time) => `Punkt automatyzacji ${n}, czas, ${time}.`,
    valueSr: (n, value) => `Punkt automatyzacji ${n}, wartość, ${value}.`,
    sensoryExact: 'Dokładna wartość',
  },
  view: {
    group: 'Miejsce',
    workspace: 'Warsztat',
    activity: 'Aktywność',
    shed: 'SHED',
  },
  shed: {
    scene: 'Scena architektoniczna',
    toolbar: 'Scena',
    zoomIn: 'Powiększ',
    zoomOut: 'Pomniejsz',
    resetView: 'Resetuj widok',
    addElement: 'Dodaj element',
    library: 'Biblioteka elementów',
    tower: 'Wieża',
    elementType: 'Typ elementu',
    height: 'Wysokość',
    width: 'Szerokość',
    roof: 'Dach',
    helmet: 'Hełm',
    primary: 'Kolor podstawowy',
    secondary: 'Kolor dodatkowy',
    detail: 'Kolor detalu',
    ornament: 'Ornament',
    ornamentNone: 'Brak',
    ornamentFinial: 'Szpic',
    ornamentRosette: 'Rozeta',
    ornamentStar: 'Gwiazda',
    position: 'Położenie',
    positionX: 'Położenie w poziomie',
    positionY: 'Położenie w pionie',
    layer: 'Warstwa',
    layerForward: 'Przesuń na wierzch',
    layerBack: 'Przesuń pod spód',
    reset: 'Przywróć',
    duplicate: 'Duplikuj',
    deleteElement: 'Usuń element',
    variant: 'Wariant',
    proportion: 'Proporcje korpusu',
    windows: 'Układ okien',
    floors: 'Kondygnacje',
    entrance: 'Wejście',
    gable: 'Szczyt',
    arches: 'Liczba arkad',
    archHeight: 'Wysokość łuku',
    column: 'Szerokość kolumny',
    pitch: 'Nachylenie',
    roofline: 'Linia dachu',
    ridge: 'Grzbiet',
    parapet: 'Rytm attyki',
    density: 'Gęstość ornamentu',
    passage: 'Przejazd',
    crenellation: 'Krenelaż',
    panLeft: 'Przesuń widok w lewo',
    panRight: 'Przesuń widok w prawo',
    panUp: 'Przesuń widok w górę',
    panDown: 'Przesuń widok w dół',
    panLeftShort: 'Lewo',
    panRightShort: 'Prawo',
    panUpShort: 'Góra',
    panDownShort: 'Dół',
    transparency: 'Przezroczystość',
    saved: 'Zapisano',
    savedHint: 'Zapisane tylko w tej przeglądarce. Nie synchronizuje się z innymi urządzeniami.',
    restored: 'Przywrócono domyślną scenę',
    close: 'Zamknij',
    geometry: 'Geometria',
    appearance: 'Wygląd',
    elementName: (type, selected) =>
      selected ? `${type} — element architektoniczny, zaznaczony` : `${type} — element architektoniczny`,
    moveHint: 'Strzałki przesuwają zaznaczony element. Shift robi mniejszy krok. Suwaki położenia robią to samo.',
    categories: {
      tower: 'Wieża',
      facade: 'Fasada',
      roof: 'Dach',
      arcade: 'Arkada',
      gate: 'Brama',
      attic: 'Attyka',
      ornament: 'Ornament',
    },
    descriptions: {
      tower: 'Niesymetryczna wieża gotycka, wieża Wawelu albo baszta obronna Krakowa.',
      facade: 'Ściana kościoła, wąska kamienica albo front Sukiennic.',
      roof: 'Historyczna linia dachu Krakowa z ozdobnym grzbietem.',
      arcade: 'Powtarzalne arkady Sukiennic albo krużganków wawelskich.',
      gate: 'Brama Floriańska, Barbakan albo portal kamienicy.',
      attic: 'Renesansowa attyka w rodzaju Sukiennic.',
      ornament: 'Niewielki szpic, rozeta, sterczyna albo medalion.',
    },
    variants: {
      tower: ['Hełm wyższej wieży Mariackiej', 'Hełm niższej wieży Mariackiej', 'Wieża Wawelu', 'Baszta obronna'],
      facade: ['Fasada gotycka', 'Kamienica', 'Front Sukiennic'],
      roof: ['Dach stromy', 'Dach renesansowy', 'Dach kamienicy'],
      arcade: ['Arkady Sukiennic', 'Krużganki wawelskie', 'Arkada ostrołukowa'],
      gate: ['Brama Floriańska', 'Barbakan', 'Portal kamienicy'],
      attic: ['Attyka Sukiennic', 'Attyka kamienicy'],
      ornament: ['Szpic', 'Rozeta', 'Sterczyna', 'Medalion'],
    },
    swatches: {
      brick: 'Czerwień cegły',
      ink: 'Czerń atramentu',
      parchment: 'Pergamin',
      blue: 'Przygaszony błękit',
      copper: 'Utleniona miedź',
      gold: 'Postarzałe złoto',
      limestone: 'Wapień',
      gray: 'Ciepły szary',
    },
    startBuild: 'Rozpocznij budowę szopki',
    extend: 'Rozbuduj',
    addLeft: 'Dodaj z lewej',
    addRight: 'Dodaj z prawej',
    addAbove: 'Dodaj nad',
    connection: 'Połączenie',
    deleteBranch: 'Usuń gałąź',
    deleteBranchHint: 'Usuwa zaznaczony element i wszystko, co na nim stoi.',
    deleteRoot: 'Usuń fundament',
    deleteRootHint: 'Usuwa całą budowę.',
    cancel: 'Anuluj',
    freeSheet: 'Ta scena jest wolną kompozycją z wcześniejszego SHED. Nowa budowa jej nie przestawia.',
    startConnected: 'Zacznij budowę połączoną',
    restoreFree: 'Wróć do wolnej kompozycji',
    relationRoot: 'stoi na linii gruntu',
    relationAbove: (parent) => `połączona nad ${parent}`,
    relationLeft: (parent) => `połączona z lewej strony ${parent}`,
    relationRight: (parent) => `połączona z prawej strony ${parent}`,
    linksAvailable: (list) => `dostępne połączenia: ${list}`,
    linksNone: 'brak wolnych połączeń',
    structureLabel: (name, relation, links) => `${name}, ${relation}, ${links}.`,
    tabs: { style: 'Styl', geometry: 'Geometria', color: 'Kolor', details: 'Detale', actions: 'Działania' },
    directions: { LEFT: 'lewo', RIGHT: 'prawo', TOP: 'góra' },
    groups: {
      foundations: 'Fundamenty',
      floors: 'Piętra',
      arcades: 'Arkady',
      attics: 'Attyki',
      roofs: 'Dachy',
      towers: 'Wieże',
      ornaments: 'Ornamenty',
    },
    errors: {
      incompatible: 'Tego elementu nie da się tu połączyć.',
      overlap: 'Ten element nachodziłby na budowę.',
      anchor: 'To połączenie jest już zajęte.',
      foundation: 'Pierwszy element musi stać na parterze.',
      support: 'To, co już tu stoi, straciłoby podparcie.',
      limit: 'W tym kierunku budowa nie może już urosnąć.',
      parent: 'Wybierz element, który już należy do budowy.',
    },
    pieces: {
      'townhouse-base': 'Parter kamienicy',
      'renaissance-base': 'Renesansowa baza arkadowa',
      'gothic-base': 'Gotycki parter z cegły',
      'gate-base': 'Baza Bramy Floriańskiej',
      'defensive-gate': 'Brama barbakanu',
      'townhouse-floor': 'Piętro kamienicy',
      'renaissance-floor': 'Szeroka fasada renesansowa',
      'gothic-windows': 'Gotycka sekcja okien',
      'balcony-floor': 'Piętro z balkonem',
      'single-arch': 'Pojedyncza arkada',
      'three-arch': 'Ciąg trzech arkad',
      'courtyard-arcade': 'Krużganek wawelski',
      'pointed-arcade': 'Arkada ostrołukowa',
      'sukiennice-attic': 'Attyka Sukiennic',
      'stepped-attic': 'Attyka schodkowa',
      parapet: 'Parapet ozdobny',
      'gothic-roof': 'Stromy dach gotycki',
      'townhouse-roof': 'Dach kamienicy',
      'renaissance-roof': 'Linia dachu renesansowego',
      'small-roof': 'Mały dach ozdobny',
      'mariacki-tall': 'Wyższa wieża Mariacka',
      'mariacki-low': 'Niższa wieża Mariacka',
      'wawel-tower': 'Wieża Wawelu',
      'defensive-tower': 'Baszta obronna',
      'gothic-helmet': 'Hełm gotycki',
      'krakow-crown': 'Korona wieży krakowskiej',
      'wawel-helmet': 'Hełm wawelski',
      finial: 'Szpic',
      star: 'Gwiazda',
      rosette: 'Rozeta',
      crest: 'Grzebień ozdobny',
      relief: 'Relief architektoniczny',
    },
    city: {
      modeGroup: 'Scena SHED',
      modeArchitecture: 'Architektura',
      modeCity: 'Miasto',
      scene: 'Miasto dźwięku — Kraków',
      plotsNote: 'Wirtualne działki to miejsca gry, a nie granice ewidencyjne.',
      build: 'Zbuduj na tej działce',
      place: 'Postaw budynek',
      removeBuilding: 'Usuń budynek',
      availablePlot: (street) => (street ? `Wolna wirtualna działka przy ${street}` : 'Wolna wirtualna działka'),
      occupiedPlot: (type, author) => `${type}, ${author}`,
      location: (street) => (street ? `Przy ${street}` : 'Wirtualna działka'),
      noRecording: 'Brak powiązanego nagrania',
      recording: 'Nagranie',
      author: 'Autor',
      authors: 'Autorzy',
      authorsNote: 'Lokalna tożsamość prototypu. To nie jest konto.',
      buildings: 'Budynki',
      students: 'Studenci',
      availablePlots: 'Wolne działki',
      hideRanking: 'Ukryj autorów',
      showRanking: 'Pokaż autorów',
      close: 'Zamknij',
      saved: 'Zapisano',
      restored: 'Przywrócono puste miasto',
      savedHint: 'Miasto zapisuje się tylko w tej przeglądarce. Nie zastępuje arkusza architektury.',
      prototypeAuthor: 'Autor prototypu',
      buildingType: 'Budynek',
      stats: 'Wkład',
      zoomToolbar: 'Mapa',
    },
  },
  activity: {
    region: 'Aktywność nagrań',
    demoBadge: 'Dane demonstracyjne',
    demoNote: 'To przykładowy zestaw. To nie są nagrania projektu i Dysk Google nie jest podłączony.',
    recordings: 'Nagrania',
    totalSize: 'Rozmiar plików',
    activeStudents: 'Aktywni uczestnicy',
    last7Days: 'Ostatnie 7 dni',
    timeline: 'Oś aktywności',
    rangeGroup: 'Zakres czasu',
    range7: '7 dni',
    range30: '30 dni',
    rangeAll: 'Całość',
    timelineEmpty: 'Brak nagrań w tym zakresie.',
    timelineSummary: (count, peak, day) => {
      const added = countNoun(
        'pl',
        count,
        { one: 'recording', other: 'recordings' },
        { one: 'nagranie', few: 'nagrania', many: 'nagrań' },
      )
      return `Dodano ${added}. Szczyt ${peak}, ${day}.`
    },
    timelineTable: 'Wartości',
    legend: 'Kto dodał nagrania',
    who: 'Kto',
    day: 'Dzień',
    count: 'Liczba',
    students: 'Uczestnicy',
    sortGroup: 'Sortowanie',
    sortCount: 'Nagrania',
    sortRecent: 'Ostatnia aktywność',
    sortName: 'Nazwa',
    meterLabel: (name, count, size) => {
      const added = countNoun(
        'pl',
        count,
        { one: 'recording', other: 'recordings' },
        { one: 'nagranie', few: 'nagrania', many: 'nagrań' },
      )
      return `${name}, ${added}, ${size}`
    },
    stateRecent: 'Ostatnio',
    stateEarlier: 'Wcześniej',
    stateNone: 'Brak',
    level: 'Poziom',
    name: 'Nazwa',
    lastActivity: 'Ostatnia aktywność',
    indicator: 'Stan',
    recentRecordings: 'Ostatnie nagrania',
    filename: 'Nazwa pliku',
    student: 'Uczestnik',
    uploaded: 'Data',
    fileSize: 'Rozmiar pliku',
    format: 'Format',
    noRecordings: 'Brak nagrań.',
    noStudents: 'Brak uczestników.',
    unknownStudent: 'Nieznany uczestnik',
    loadError: 'Nie udało się odczytać danych aktywności.',
    loading: 'Odczyt zestawu aktywności.',
    missingSnapshot: 'Zestaw aktywności nie został jeszcze opublikowany.',
    invalidSnapshot: 'Nie udało się odczytać zestawu aktywności. W jego miejsce nie są pokazywane dane demonstracyjne.',
    snapshotBadge: 'Opublikowany zestaw',
    snapshotNote: 'Te liczby pochodzą z opublikowanego zestawu. FIELD nie łączy się z Dyskiem Google. Nazwy plików nie są w zestawie.',
    publishedNote: 'Te liczby pochodzą z opublikowanego zestawu.',
    synchronized: (when) => `Ostatnia synchronizacja ${when}`,
    windowCounts: (students, last30) => `${students} uczestników · Ostatnie 30 dni ${last30}`,
    stale: 'Ten zestaw jest starszy niż oczekiwane odświeżenie. Czas powyżej to ostatnia udana synchronizacja.',
    filenamesOmitted: 'Nazwy plików nie wchodzą do opublikowanego zestawu.',
    generated: (when) => `Zestaw z ${when}`,
  },
}

export const CATALOG: Record<Locale, Messages> = { en: EN, pl: PL }

export function messagesFor(locale: Locale): Messages {
  return CATALOG[locale]
}

export function paramLabel(locale: Locale, id: ParamId): string {
  if (locale === 'pl') return PL_PARAMS[id] ?? PARAMS[id].label
  return PARAMS[id].label
}
