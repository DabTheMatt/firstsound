import type { ModuleType } from '../audio/chain/chain'
import type { ParamId } from '../audio/parameters/types'
import type { EmotionalStateId } from '../sensory/emotionalStates'
import type { SensoryAxisId } from '../sensory/sensoryParameters'
import type { ThemeId } from '../theme/tokens'
import { PARAMS } from '../audio/parameters/definitions'
import { PL_PARAMS } from './plParams'
import type { Locale } from './locale'

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
  mode: { group: string; simple: string; sensory: string; technical: string }
  simple: SimpleMessages
  header: {
    loadSample: string
    record: string
    stop: string
    rec: string
    lfoCenter: string
    settings: string
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
    loadDemo: string
    editSample: string
    resetAll: string
    revertSource: string
    undo: string
    redo: string
  }
  runtime: { refresh: string; refreshing: string; refreshTitle: string }
  banner: { audioBlocked: string; inspector: string }
  waveform: {
    empty: string
    loadDemo: string
    edit: string
    trim: string
    trimTitle: string
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
    tracksTitle: string
    tracks: string
    zoomOut: string
    zoomIn: string
    scrollZoom: string
    mono: string
    fadeIn: string
    fadeOut: string
    regionStart: string
    regionEnd: string
    tracksAria: string
    overviewAria: string
    zoomViewStart: string
    zoomViewEnd: string
  }
  transport: {
    play: string
    pause: string
    stop: string
    playFromStart: string
    playFromStartTitle: string
    killFx: string
    killFxTitle: string
    loop: string
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
    addEffect: string
    enable: (name: string) => string
    bypass: (name: string) => string
    enableShort: string
    bypassShort: string
    kill: (name: string) => string
    killTitle: (name: string) => string
    moveEarlier: string
    moveLater: string
    movedBefore: (moved: string, other: string) => string
    movedAfter: (moved: string, other: string) => string
    bypassOn: (name: string) => string
    bypassOff: (name: string) => string
    bypassedTag: string
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
    interpAlgo: string
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
  }
  sensory: {
    strings: string
    stringsAria: string
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
    places: string
    selectRegion: string
    overviewDrag: string
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
    masterHint: string
  }
  meters: {
    resetClip: string
    resetClipTitle: string
    clip: string
    range: string
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
  }
  a11y: {
    title: string
    theme: string
    reduceMotion: string
    larger: string
    focus: string
    tips: string
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
  }
}

export const EN: Messages = {
  lang: { group: 'Language', en: 'EN', pl: 'PL' },
  gate: {
    title: 'How do you want to shape sound?',
    simple: 'Simple',
    simpleCopy: 'Fix a sample in a few clear steps.',
    listen: 'Listen',
    listenCopy: 'Shape sound by feeling.',
    control: 'Control',
    controlCopy: 'Shape sound by parameters.',
  },
  mode: { group: 'Interface mode', simple: 'Simple', sensory: 'Sensory', technical: 'Technical' },
  simple: {
    fileUntitled: 'No sample',
    trim: 'Trim',
    setStart: 'Set start',
    setEnd: 'Set end',
    length: (value) => `Length: ${value} s`,
    startEnd: 'Start and end',
    fadeIn: 'Gentle start',
    fadeOut: 'Gentle ending',
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
    fadeInAria: (step) => `Gentle start: ${step}`,
    fadeOutAria: (step) => `Gentle ending: ${step}`,
    regionStartAria: (value) => `Sample start: ${value} seconds`,
    regionEndAria: (value) => `Sample end: ${value} seconds`,
    closeSheet: 'Close',
    levelVolume: 'Even out loudness',
    levelHint: 'Set a safe, even loudness.',
    levelDone: 'Loudness evened out',
    tone: 'Improve the sound',
    moreTones: 'More options',
    lessTones: 'Fewer options',
    customTone: 'Custom setting',
    amount: 'Effect strength',
    amountLess: 'Less',
    amountMore: 'More',
    autoFix: 'Improve automatically',
    autoDone: 'Sound improved',
    compare: 'Compare',
    original: 'Original',
    after: 'After changes',
    undo: 'Undo',
    redo: 'Redo',
    restore: 'Restore original',
    restoreConfirm: 'This removes several changes. Restore the original sample?',
    restoreYes: 'Restore',
    restoreNo: 'Keep edits',
    save: 'Save',
    saveTitle: 'Save file',
    saveName: 'Name',
    saveFormat: 'Format',
    saveFile: 'Save file',
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
        hint: 'A light touch. Almost no change.',
        aria: 'Sound preset: natural',
      },
      voice: {
        label: 'Clearer voice',
        hint: 'More speech detail, less rumble.',
        aria: 'Sound preset: clearer voice',
      },
      bass: {
        label: 'More bass',
        hint: 'A controlled lift in the low end.',
        aria: 'Sound preset: more bass',
      },
      rumble: {
        label: 'Less rumble',
        hint: 'Tame a boomy low middle.',
        aria: 'Sound preset: less rumble',
      },
      bright: {
        label: 'Brighter',
        hint: 'A little more air up top.',
        aria: 'Sound preset: brighter',
      },
      warm: {
        label: 'Warmer',
        hint: 'More body, a softer top.',
        aria: 'Sound preset: warmer',
      },
      harsh: {
        label: 'Less harsh',
        hint: 'Soften sharp highs.',
        aria: 'Sound preset: less harsh',
      },
      clean: {
        label: 'Cleaner',
        hint: 'Trim extra low end and mud.',
        aria: 'Sound preset: cleaner',
      },
    },
  },
  header: {
    loadSample: 'Load sample',
    record: 'Record',
    stop: 'Stop',
    rec: 'Rec',
    lfoCenter: 'LFO control center',
    settings: 'Settings',
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
    loadPreset: 'Load preset',
    loadDemo: 'Load demo tone',
    editSample: 'Edit sample',
    resetAll: 'Reset all',
    revertSource: 'Revert to source',
    undo: 'Undo',
    redo: 'Redo',
  },
  runtime: {
    refresh: 'Refresh app',
    refreshing: 'Refreshing',
    refreshTitle: 'Reload the installed app and drop stale caches',
  },
  banner: {
    audioBlocked: 'Audio is paused by the browser. Tap Play to resume.',
    inspector: 'Inspector',
  },
  waveform: {
    empty: 'Load a sample to begin',
    loadDemo: 'Load demo tone',
    edit: 'Edit',
    trim: 'Trim',
    trimTitle: 'Trim to selection',
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
    tracksTitle: 'Tracks and mixer',
    tracks: 'Tracks',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    scrollZoom: 'Scroll to zoom',
    mono: 'Mono',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    regionStart: 'Region start',
    regionEnd: 'Region end',
    tracksAria: 'Tracks',
    overviewAria: 'Sample overview. Click to set the playhead.',
    zoomViewStart: 'Zoom view start',
    zoomViewEnd: 'Zoom view end',
  },
  transport: {
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    playFromStart: 'Play from start of sample',
    playFromStartTitle: 'Play from the start of the sample, not the selection',
    killFx: 'Kill FX',
    killFxTitle: 'Kill delay and reverb tails',
    loop: 'Loop',
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
    addEffect: 'Add effect',
    enable: (name) => `Enable ${name}`,
    bypass: (name) => `Bypass ${name}`,
    enableShort: 'Enable',
    bypassShort: 'Bypass',
    kill: (name) => `Kill ${name}`,
    killTitle: (name) => `Kill ${name} tails`,
    moveEarlier: 'Move earlier in the signal chain',
    moveLater: 'Move later in the signal chain',
    movedBefore: (moved, other) => `${moved} moved before ${other}.`,
    movedAfter: (moved, other) => `${moved} moved after ${other}.`,
    bypassOn: (name) => `${name} bypass, on`,
    bypassOff: (name) => `${name} bypass, off`,
    bypassedTag: 'Bypassed',
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
    interpAlgo: 'Pitch and speed interpolation algorithm',
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
      custom: 'Custom',
    },
  },
  sensory: {
    strings: 'Strings',
    stringsAria: 'Show parameter strings',
    menu: 'Menu',
    play: 'Play',
    pause: 'Pause',
    playPause: 'Play or pause',
    loadDemo: 'Load demo tone',
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
    places: 'Places',
    selectRegion: 'Click to set the playhead, drag to select a region, or double-click to play',
    overviewDrag: 'Sample overview. Click to set the playhead. Drag to select a fragment.',
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
    masterHint: 'Sums every audible track into the effect chain.',
  },
  meters: {
    resetClip: 'Reset clip',
    resetClipTitle: 'Reset clip indicator',
    clip: 'Clip',
    range: 'Meter range',
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
  },
  a11y: {
    title: 'Accessibility',
    theme: 'High Contrast / Low Vision Theme',
    reduceMotion: 'Reduce motion',
    larger: 'Larger interface',
    focus: 'Enhanced focus',
    tips: 'Tooltips / parameter descriptions',
    sr: 'Screen reader optimizations',
    srHelp: 'Keeps extra live updates quiet. Names, values, and keyboard access stay on.',
    shortcuts: 'Transport keyboard shortcuts',
    shortcutsHelp: 'When on, Space plays or pauses if focus is not on a control. Tab is never captured.',
    shortcutsTitle: 'Keyboard shortcuts',
    shortcutTab: 'Tab / Shift+Tab: move between controls',
    shortcutArrows: 'Arrow keys: change the focused knob or slider',
    shortcutShiftArrows: 'Shift+Arrow: fine adjustment',
    shortcutHomeEnd: 'Home / End: minimum / maximum',
    shortcutPage: 'Page Up / Page Down: larger steps',
    shortcutReset: 'Delete or Backspace: reset the focused parameter',
    shortcutSpace: 'Space: play or pause when focus is not on a control',
    shortcutEsc: 'Escape: close menus, dialogs, and tooltips',
    skipToMain: 'Skip to main controls',
  },
}

export const PL: Messages = {
  lang: { group: 'Język', en: 'EN', pl: 'PL' },
  gate: {
    title: 'Jak chcesz kształtować dźwięk?',
    simple: 'Prosty',
    simpleCopy: 'Szybko popraw sample w kilku czytelnych krokach.',
    listen: 'Słuch',
    listenCopy: 'Kształtuj dźwięk odczuciem.',
    control: 'Sterowanie',
    controlCopy: 'Kształtuj dźwięk parametrami.',
  },
  mode: { group: 'Tryb interfejsu', simple: 'Prosty', sensory: 'Sensoryczny', technical: 'Techniczny' },
  simple: {
    fileUntitled: 'Brak sampla',
    trim: 'Przytnij',
    setStart: 'Ustaw początek',
    setEnd: 'Ustaw koniec',
    length: (value) => `Długość: ${value} s`,
    startEnd: 'Początek i koniec',
    fadeIn: 'Łagodny początek',
    fadeOut: 'Łagodne zakończenie',
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
    fadeInAria: (step) => `Łagodny początek: ${step}`,
    fadeOutAria: (step) => `Łagodne zakończenie: ${step}`,
    regionStartAria: (value) => `Początek sampla: ${value} sekund`,
    regionEndAria: (value) => `Koniec sampla: ${value} sekund`,
    closeSheet: 'Zamknij',
    levelVolume: 'Wyrównaj głośność',
    levelHint: 'Ustaw bezpieczny, równy poziom głośności.',
    levelDone: 'Głośność wyrównana',
    tone: 'Popraw brzmienie',
    moreTones: 'Więcej opcji',
    lessTones: 'Mniej opcji',
    customTone: 'Własne ustawienie',
    amount: 'Siła efektu',
    amountLess: 'Mniej',
    amountMore: 'Więcej',
    autoFix: 'Popraw automatycznie',
    autoDone: 'Dźwięk poprawiony',
    compare: 'Porównaj',
    original: 'Oryginał',
    after: 'Po zmianach',
    undo: 'Cofnij',
    redo: 'Ponów',
    restore: 'Przywróć oryginał',
    restoreConfirm: 'To usunie kilka zmian. Przywrócić oryginalny sample?',
    restoreYes: 'Przywróć',
    restoreNo: 'Zostaw zmiany',
    save: 'Zapisz',
    saveTitle: 'Zapisz plik',
    saveName: 'Nazwa',
    saveFormat: 'Format',
    saveFile: 'Zapisz plik',
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
    pause: 'Zatrzymaj',
    clock: (now, total) => `${now} / ${total}`,
    tones: {
      natural: {
        label: 'Naturalnie',
        hint: 'Minimalna ingerencja, lekka korekcja.',
        aria: 'Preset brzmienia: naturalnie',
      },
      voice: {
        label: 'Wyraźniejszy głos',
        hint: 'Czytelniejszy środek i góra, mniej zbędnego dołu.',
        aria: 'Preset brzmienia: wyraźniejszy głos',
      },
      bass: {
        label: 'Więcej basu',
        hint: 'Kontrolowane zwiększenie niskich częstotliwości.',
        aria: 'Preset brzmienia: więcej basu',
      },
      rumble: {
        label: 'Mniej dudnienia',
        hint: 'Mniej problematycznego niskiego środka.',
        aria: 'Preset brzmienia: mniej dudnienia',
      },
      bright: {
        label: 'Jaśniej',
        hint: 'Delikatnie więcej wysokich częstotliwości.',
        aria: 'Preset brzmienia: jaśniej',
      },
      warm: {
        label: 'Cieplej',
        hint: 'Więcej niskiego środka i łagodniejsza góra.',
        aria: 'Preset brzmienia: cieplej',
      },
      harsh: {
        label: 'Mniej ostro',
        hint: 'Mniej agresywnych wysokich częstotliwości.',
        aria: 'Preset brzmienia: mniej ostro',
      },
      clean: {
        label: 'Czyściej',
        hint: 'Lekka korekcja zbędnego dołu i mętnych częstotliwości.',
        aria: 'Preset brzmienia: czyściej',
      },
    },
  },
  header: {
    loadSample: 'Wczytaj sample',
    record: 'Nagraj',
    stop: 'Stop',
    rec: 'Rec',
    lfoCenter: 'Centrum LFO',
    settings: 'Ustawienia',
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
    loadDemo: 'Wczytaj ton demo',
    editSample: 'Edytuj sample',
    resetAll: 'Reset wszystkiego',
    revertSource: 'Przywróć źródło',
    undo: 'Cofnij',
    redo: 'Ponów',
  },
  runtime: {
    refresh: 'Odśwież aplikację',
    refreshing: 'Odświeżanie',
    refreshTitle: 'Przeładuj zainstalowaną aplikację i wyczyść stare cache',
  },
  banner: {
    audioBlocked: 'Przeglądarka wstrzymała dźwięk. Dotknij Odtwórz, aby wznowić.',
    inspector: 'Inspektor',
  },
  waveform: {
    empty: 'Wczytaj sample, aby zacząć',
    loadDemo: 'Wczytaj ton demo',
    edit: 'Edycja',
    trim: 'Przytnij',
    trimTitle: 'Przytnij do zaznaczenia',
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
    tracksTitle: 'Ślady i mikser',
    tracks: 'Ślady',
    zoomOut: 'Oddal',
    zoomIn: 'Przybliż',
    scrollZoom: 'Scrolluj, aby zoomować',
    mono: 'Mono',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    regionStart: 'Początek regionu',
    regionEnd: 'Koniec regionu',
    tracksAria: 'Ślady',
    overviewAria: 'Przegląd sampla. Kliknij, aby ustawić głowicę.',
    zoomViewStart: 'Powiększ od początku widoku',
    zoomViewEnd: 'Powiększ od końca widoku',
  },
  transport: {
    play: 'Odtwórz',
    pause: 'Pauza',
    stop: 'Stop',
    playFromStart: 'Odtwórz od początku sampla',
    playFromStartTitle: 'Odtwórz od początku sampla, nie od zaznaczenia',
    killFx: 'Kill FX',
    killFxTitle: 'Utnij ogony delay i pogłosu',
    loop: 'Pętla',
    undo: 'Cofnij',
    redo: 'Ponów',
    playhead: 'Głowica',
    selection: 'Zaznaczenie',
    bpmTitle: 'Tempo sampla używane przez sync delay/pogłosu',
    selStart: 'Pocz. zazn.',
    selStartTitle: 'Skocz głowicą na początek zaznaczenia (loop in)',
    selEnd: 'Kon. zazn.',
    selEndTitle: 'Skocz głowicą na koniec zaznaczenia (loop out)',
    export: 'Eksport',
    use: 'Użyj',
    useAsSample: 'Użyj jako sample',
    useTitle: 'Wypiecz bieżące zaznaczenie (z fade’ami) i wczytaj jako roboczy klip.',
    useHint: 'Wypieka to zaznaczenie (z fade’ami) do roboczego sampla.',
    selectionSr: (start, end) => `Zaznaczenie ${start} do ${end}`,
  },
  chain: {
    aria: 'Łańcuch sygnału',
    addEffect: 'Dodaj efekt',
    enable: (name) => `Włącz ${name}`,
    bypass: (name) => `Omijaj ${name}`,
    enableShort: 'Włącz',
    bypassShort: 'Omijaj',
    kill: (name) => `Utnij ${name}`,
    killTitle: (name) => `Utnij ogony ${name}`,
    moveEarlier: 'Przesuń wcześniej w torze',
    moveLater: 'Przesuń później w torze',
    movedBefore: (moved, other) => `${moved} przeniesiono przed ${other}.`,
    movedAfter: (moved, other) => `${moved} przeniesiono za ${other}.`,
    bypassOn: (name) => `${name} bypass, włączony`,
    bypassOff: (name) => `${name} bypass, wyłączony`,
    bypassedTag: 'Wyłączony',
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
      'Ziarno gra od kursora, więc fade’y regionu łatwo przegapić. Użyj Playback, aby usłyszeć fade-in i fade-out zaznaczenia.',
    fadeIn: 'Fade in',
    fadeOut: 'Fade out',
    curve: 'Krzywa',
    linear: 'Lin',
    equalPower: 'EqPow',
    exponential: 'Exp',
    sCurve: 'S',
    fadeHelp:
      'Koło wygina wybrany fade w prawie Lin / EqPow / Exp / S. Fade zaczyna się na krawędzi pętli. Wyższe Q przysuwa kolano.',
    fadeHelpOut: 'fade-out',
    fadeHelpIn: 'fade-in',
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
    interpAlgo: 'Algorytm interpolacji wysokości i prędkości',
    remove: 'Usuń',
  },
  theme: {
    group: 'Motyw',
    named: (name) => `Motyw: ${name}`,
    system: 'System',
    custom: 'Własny',
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
      custom: 'Własny',
    },
  },
  sensory: {
    strings: 'Struny',
    stringsAria: 'Pokaż struny parametrów',
    menu: 'Menu',
    play: 'Odtwórz',
    pause: 'Pauza',
    playPause: 'Odtwórz lub pauza',
    loadDemo: 'Wczytaj ton demo',
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
    places: 'Miejsca',
    selectRegion: 'Kliknij, aby ustawić głowicę, przeciągnij, aby zaznaczyć region, albo kliknij dwukrotnie, aby odtworzyć',
    overviewDrag: 'Przegląd sampla. Kliknij, aby ustawić głowicę. Przeciągnij, aby zaznaczyć fragment.',
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
    masterHint: 'Sumuje każdy słyszalny ślad do łańcucha efektów.',
  },
  meters: {
    resetClip: 'Reset clip',
    resetClipTitle: 'Reset wskaźnika clip',
    clip: 'Clip',
    range: 'Zakres miernika',
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
  },
  a11y: {
    title: 'Dostępność',
    theme: 'Wysoki kontrast / słabowidzący',
    reduceMotion: 'Ogranicz animacje',
    larger: 'Większy interfejs',
    focus: 'Wzmocniony fokus',
    tips: 'Podpowiedzi / opisy parametrów',
    sr: 'Optymalizacje czytnika ekranu',
    srHelp: 'Wycisza dodatkowe komunikaty na żywo. Nazwy, wartości i obsługa klawiaturą pozostają włączone.',
    shortcuts: 'Skróty klawiszowe transportu',
    shortcutsHelp: 'Gdy włączone, spacja odtwarza lub pauzuje, jeśli fokus nie jest na kontrolce. Tab nigdy nie jest przechwytywany.',
    shortcutsTitle: 'Skróty klawiszowe',
    shortcutTab: 'Tab / Shift+Tab: przejście między kontrolkami',
    shortcutArrows: 'Strzałki: zmiana wartości gałki lub suwaka',
    shortcutShiftArrows: 'Shift+strzałka: precyzyjna regulacja',
    shortcutHomeEnd: 'Home / End: minimum / maksimum',
    shortcutPage: 'Page Up / Page Down: większy krok',
    shortcutReset: 'Delete lub Backspace: reset aktualnego parametru',
    shortcutSpace: 'Spacja: odtwarzanie lub pauza, gdy fokus nie jest na kontrolce',
    shortcutEsc: 'Escape: zamyka menu, okna i podpowiedzi',
    skipToMain: 'Przejdź do głównych parametrów',
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
