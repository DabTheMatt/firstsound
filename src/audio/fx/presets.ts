import { complementaryPct, isCorrelated } from './dryWet'
import type { ParamId } from '../parameters/types'
import type { DelayType, ReverbType } from './types'

export type FxPresetCategory =
  | 'Vocals'
  | 'Guitar'
  | 'Drums'
  | 'Synth'
  | 'Rhythmic'
  | 'Stereo'
  | 'Analog/Tape'
  | 'Ambient'
  | 'Experimental'
  | 'Lo-Fi'
  | 'Room'
  | 'Plate'
  | 'Hall'
  | 'Spring'
  | 'Cinematic'

export type SpacePreset = {
  id: string
  name: string
  kind: 'delay' | 'reverb'
  category: FxPresetCategory
  delayType?: DelayType
  reverbType?: ReverbType
  params: Partial<Record<ParamId, number>>
}

export const PRESET_HINTS: Record<string, string> = {
  'dly-drums': '70 ms slap, almost no repeats — snare/hat space',
  'dly-vocal-slap': 'Short digital slapback behind a vocal',
  'dly-rockabilly': 'Tape slap ~128 ms with wow — guitar/amp vibe',
  'dly-1-4': 'Quarter-note tempo delay',
  'dly-1-8': 'Eighth-note tempo delay',
  'dly-dot-8': 'Dotted 1/8 bounce (U2 / The Edge feel)',
  'dly-ping': 'Left-right ping-pong eighths',
  'dly-haas': '18 ms offset, no feedback — stereo width only',
  'dly-analog': 'Dark BBD-style repeats',
  'dly-tape': 'Wow, flutter and rolled-off tape echo',
  'dly-dub': 'Long dark analog repeats that fade, not run away',
  'dly-throw': 'One-shot quarter throw with ducking',
  'dly-lead': 'Dotted 1/8 lead delay, open top end',
  'dly-ambient': 'Long diffuse wash',
  'dly-multitap': 'Rhythmic extra taps',
  'dly-rev': 'Reverse repeats',
  'dly-lofi': 'Broken, band-limited delay',
  'dly-mod': 'Chorus-y modulation on repeats',
  'dly-chorus': 'Very short stereo chorus delay',
  'dly-osc': 'Very long analog tail — still decays (use Kill to mute)',
  'dly-pitch': 'Pitched repeats',
  'dly-diffused': 'Delay into a smear',
  'rv-guitar-room': 'Small room around a cab',
  'rv-small': 'Tight practice-room air',
  'rv-big': 'Live-room body without a long tail',
  'rv-drum-room': 'Close drum booth, strong earlies',
  'rv-vocal-room': 'Intimate vocal booth',
  'rv-vocal-plate': 'Studio plate with an open top',
  'rv-drum-plate': 'Snare/kit plate, short-ish',
  'rv-snare-plate': 'Classic snare plate',
  'rv-amb': 'Barely-there ambience',
  'rv-vocal-hall': 'Medium vocal hall',
  'rv-large-hall': 'Wide hall you can hear left/right',
  'rv-cathedral': 'Long stone space, high-passed so it stays clean',
  'rv-dark-hall': 'Dark damped hall',
  'rv-bright-plate': 'Airy plate with a gentle high cut',
  'rv-spring': 'Twangy guitar spring',
  'rv-gated': '80s gated snare',
  'rv-reverse': 'Swell into the hit',
  'rv-shimmer': 'Octave-up bloom, kept below clip',
  'rv-dreamy': 'Long cloud pad',
  'rv-bloom': 'Slow-rising ambient bloom',
  'rv-cinema': 'Large cinematic tail',
  'rv-abyss': 'Deep dark space',
  'rv-infinite': 'Freeze / infinite pad — low mix so it does not scream',
  'rv-lofi': 'Dark cheap room',
  'rv-mod': 'Wobbly chamber',
  'rv-wash': 'Distant washed-out hall',
  'rv-mono': 'Collapse the tail to mono glue',
  'rv-stereo-spread': 'Mono-friendly send, wide stereo tail',
  'rv-haas': 'Haas L/R offset — width without a long tail',
  'rv-fifth': 'Shimmer a fifth up',
  'rv-sub-shimmer': 'Octave-down halo',
  'rv-nonlinear': 'Non-linear burst space',
}

function delayP(patch: Partial<Record<ParamId, number>>): Partial<Record<ParamId, number>> {
  const next: Partial<Record<ParamId, number>> = {
    delaySync: 0,
    delaySyncR: 0,
    delayNoteR: 4,
    delayNoteKindR: 0,
    delayStereo: 1,
    delayFreeze: 0,
    delayReverse: 0,
    delayPitch: 0,
    delayDuck: 0,
    delayDrift: 0,
    delayWow: 0,
    delayFlutter: 0,
    delayModDepth: 0,
    delayDrive: 0,
    delayDiffusion: 0,
    delayHp: 40,
    delayLp: 10000,
    delayWidth: 100,
    delayPan: 0,
    delayOffset: 0,
    delayDry: 100,
    delayDryR: 100,
    delayWet: 28,
    delayWetR: 28,
    delayCorrelate: 1,
    delayOutput: 100,
    delayFeedback: 28,
    delayFeedbackR: 28,
    delayTimeR: 300,
    ...patch,
  }
  if (patch.delayTime != null && patch.delayTimeR == null) next.delayTimeR = patch.delayTime
  if (patch.delaySync != null && patch.delaySyncR == null) next.delaySyncR = patch.delaySync
  if (patch.delayNote != null && patch.delayNoteR == null) next.delayNoteR = patch.delayNote
  if (patch.delayNoteKind != null && patch.delayNoteKindR == null) next.delayNoteKindR = patch.delayNoteKind
  if (patch.delayWet != null && patch.delayWetR == null) next.delayWetR = patch.delayWet
  if (patch.delayDry != null && patch.delayDryR == null) next.delayDryR = patch.delayDry
  if (patch.delayFeedback != null && patch.delayFeedbackR == null) next.delayFeedbackR = patch.delayFeedback
  if (isCorrelated(next.delayCorrelate ?? 1) && patch.delayDry == null && typeof next.delayWet === 'number') {
    next.delayDry = complementaryPct(next.delayWet)
  }
  if (isCorrelated(next.delayCorrelate ?? 1) && patch.delayDryR == null && typeof next.delayWetR === 'number') {
    next.delayDryR = complementaryPct(next.delayWetR)
  }
  return next
}

function reverbP(patch: Partial<Record<ParamId, number>>): Partial<Record<ParamId, number>> {
  const next: Partial<Record<ParamId, number>> = {
    reverbFreeze: 0,
    reverbReverse: 0,
    reverbShimmer: 0,
    reverbDuck: 0,
    reverbGate: 0,
    reverbDrive: 0,
    reverbModDepth: 14,
    reverbColor: 0,
    reverbDistance: 35,
    reverbWidth: 125,
    reverbOffset: 18,
    reverbInput: 100,
    reverbStereo: 1,
    reverbPan: 0,
    reverbEarly: 40,
    reverbDiffusion: 55,
    reverbDensity: 70,
    reverbLowCut: 80,
    reverbHighCut: 12000,
    reverbDamping: 7500,
    reverbCorrelate: 1,
    reverbDry: 100,
    reverbWet: 28,
    reverbOutput: 100,
    ...patch,
  }
  if (isCorrelated(next.reverbCorrelate ?? 1) && patch.reverbDry == null && typeof next.reverbWet === 'number') {
    next.reverbDry = complementaryPct(next.reverbWet)
  }
  return next
}

export const SPACE_PRESETS: SpacePreset[] = [
  { id: 'dly-drums', name: 'Drum Slap', kind: 'delay', category: 'Drums', delayType: 'digital', params: delayP({ delayTime: 70, delayFeedback: 8, delayWet: 16, delayLp: 8000, delayDuck: 25 }) },
  { id: 'dly-vocal-slap', name: 'Vocal Slapback', kind: 'delay', category: 'Vocals', delayType: 'digital', params: delayP({ delayTime: 95, delayFeedback: 12, delayWet: 22, delayLp: 9000 }) },
  { id: 'dly-rockabilly', name: 'Rockabilly Slapback', kind: 'delay', category: 'Guitar', delayType: 'tape', params: delayP({ delayTime: 128, delayFeedback: 18, delayWet: 28, delayDrive: 12, delayWow: 12, delayLp: 5500 }) },
  { id: 'dly-1-4', name: '1/4 Note Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 4, delayNoteKind: 0, delayFeedback: 32, delayWet: 28 }) },
  { id: 'dly-1-8', name: '1/8 Note Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 0, delayFeedback: 30, delayWet: 26 }) },
  { id: 'dly-dot-8', name: 'Dotted 1/8 Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 1, delayFeedback: 32, delayWet: 28 }) },
  { id: 'dly-ping', name: 'Ping-Pong Delay', kind: 'delay', category: 'Stereo', delayType: 'pingPong', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 0, delaySyncR: 1, delayNoteR: 3, delayNoteKindR: 1, delayFeedback: 36, delayWidth: 150, delayWet: 30 }) },
  { id: 'dly-haas', name: 'Stereo Widening / Haas', kind: 'delay', category: 'Stereo', delayType: 'stereo', params: delayP({ delayTime: 18, delayTimeR: 32, delayFeedback: 0, delayWidth: 180, delayWet: 40 }) },
  { id: 'dly-analog', name: 'Dark Analog Delay', kind: 'delay', category: 'Analog/Tape', delayType: 'analog', params: delayP({ delayTime: 380, delayFeedback: 36, delayHp: 160, delayLp: 4000, delayDrive: 8, delayWet: 28 }) },
  { id: 'dly-tape', name: 'Tape Echo', kind: 'delay', category: 'Analog/Tape', delayType: 'tape', params: delayP({ delayTime: 310, delayFeedback: 34, delayDrive: 10, delayWow: 14, delayFlutter: 8, delayLp: 5200, delayWet: 30 }) },
  { id: 'dly-dub', name: 'Dub Delay', kind: 'delay', category: 'Experimental', delayType: 'analog', params: delayP({ delayTime: 520, delayFeedback: 52, delayHp: 180, delayLp: 3600, delayDrive: 10, delayWet: 32 }) },
  { id: 'dly-throw', name: 'Vocal Throw', kind: 'delay', category: 'Vocals', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 4, delayFeedback: 8, delayWet: 55, delayDuck: 40 }) },
  { id: 'dly-lead', name: 'Guitar Lead Delay', kind: 'delay', category: 'Guitar', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 1, delayFeedback: 42, delayWet: 36, delayLp: 10000 }) },
  { id: 'dly-ambient', name: 'Ambient Delay', kind: 'delay', category: 'Ambient', delayType: 'diffuse', params: delayP({ delayTime: 680, delayFeedback: 44, delayDiffusion: 42, delayModDepth: 12, delayWet: 32, delayWidth: 140 }) },
  { id: 'dly-multitap', name: 'Rhythmic Multi-Tap', kind: 'delay', category: 'Rhythmic', delayType: 'multiTap', params: delayP({ delaySync: 1, delayNote: 3, delayFeedback: 28, delayDiffusion: 22, delayWet: 38 }) },
  { id: 'dly-rev', name: 'Reverse Delay', kind: 'delay', category: 'Experimental', delayType: 'reverse', params: delayP({ delayTime: 420, delayFeedback: 30, delayReverse: 100, delayWet: 48 }) },
  { id: 'dly-lofi', name: 'Lo-Fi Delay', kind: 'delay', category: 'Lo-Fi', delayType: 'lofi', params: delayP({ delayTime: 260, delayFeedback: 34, delayHp: 240, delayLp: 2600, delayDrive: 16, delayDrift: 12, delayWet: 28 }) },
  { id: 'dly-mod', name: 'Modulated Delay', kind: 'delay', category: 'Synth', delayType: 'digital', params: delayP({ delayTime: 240, delayFeedback: 32, delayModDepth: 22, delayModRate: 0.6, delayWet: 26 }) },
  { id: 'dly-chorus', name: 'Chorus-like Short Delay', kind: 'delay', category: 'Synth', delayType: 'stereo', params: delayP({ delayTime: 18, delayFeedback: 8, delayModDepth: 40, delayModRate: 1.8, delayWidth: 140, delayWet: 32, delayOffset: 12 }) },
  { id: 'dly-osc', name: 'Self-Oscillating Delay', kind: 'delay', category: 'Experimental', delayType: 'analog', params: delayP({ delayTime: 220, delayFeedback: 62, delayDrive: 8, delayLp: 4000, delayWet: 30 }) },
  { id: 'dly-pitch', name: 'Pitch-Shifting Delay', kind: 'delay', category: 'Experimental', delayType: 'pitch', params: delayP({ delayTime: 360, delayFeedback: 32, delayPitch: 7, delayWet: 28 }) },
  { id: 'dly-diffused', name: 'Diffused Delay', kind: 'delay', category: 'Ambient', delayType: 'diffuse', params: delayP({ delayTime: 190, delayFeedback: 40, delayDiffusion: 42, delayWet: 28, delayWidth: 120 }) },

  { id: 'rv-small', name: 'Small Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 22, reverbDecay: 0.35, reverbPredelay: 8, reverbWet: 22, reverbDistance: 20, reverbWidth: 80, reverbOffset: 6, reverbHighCut: 10000 }) },
  { id: 'rv-big', name: 'Big Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 58, reverbDecay: 1.35, reverbPredelay: 22, reverbWet: 26, reverbDistance: 40, reverbWidth: 118, reverbOffset: 14, reverbEarly: 48 }) },
  { id: 'rv-drum-room', name: 'Drum Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 28, reverbDecay: 0.55, reverbPredelay: 12, reverbEarly: 58, reverbWet: 24, reverbHighCut: 9000, reverbWidth: 110 }) },
  { id: 'rv-vocal-room', name: 'Vocal Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 32, reverbDecay: 0.8, reverbPredelay: 22, reverbWet: 26, reverbWidth: 100, reverbHighCut: 13000, reverbDamping: 9000 }) },
  { id: 'rv-guitar-room', name: 'Guitar Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 36, reverbDecay: 0.9, reverbPredelay: 14, reverbWet: 24, reverbWidth: 90, reverbOffset: 8, reverbHighCut: 11000, reverbDamping: 8500 }) },
  { id: 'rv-amb', name: 'Short Ambience', kind: 'reverb', category: 'Room', reverbType: 'ambience', params: reverbP({ reverbSize: 18, reverbDecay: 0.22, reverbPredelay: 4, reverbWet: 18, reverbDistance: 10, reverbWidth: 70, reverbOffset: 4 }) },
  { id: 'rv-vocal-hall', name: 'Vocal Hall', kind: 'reverb', category: 'Hall', reverbType: 'hall', params: reverbP({ reverbSize: 62, reverbDecay: 2.4, reverbPredelay: 28, reverbWet: 28, reverbDistance: 45, reverbWidth: 150, reverbOffset: 24, reverbLowCut: 90 }) },
  { id: 'rv-large-hall', name: 'Large Hall', kind: 'reverb', category: 'Hall', reverbType: 'largeHall', params: reverbP({ reverbSize: 74, reverbDecay: 3.2, reverbPredelay: 32, reverbWet: 28, reverbWidth: 155, reverbOffset: 26, reverbDiffusion: 72, reverbLowCut: 110 }) },
  { id: 'rv-cathedral', name: 'Cathedral', kind: 'reverb', category: 'Hall', reverbType: 'cathedral', params: reverbP({ reverbSize: 86, reverbDecay: 4.4, reverbPredelay: 48, reverbWet: 26, reverbDistance: 64, reverbWidth: 165, reverbOffset: 28, reverbInput: 0, reverbLowCut: 160, reverbHighCut: 9000, reverbDamping: 4200 }) },
  { id: 'rv-dark-hall', name: 'Dark Hall', kind: 'reverb', category: 'Hall', reverbType: 'hall', params: reverbP({ reverbSize: 74, reverbDecay: 3.8, reverbDamping: 2800, reverbHighCut: 4500, reverbLowCut: 140, reverbWet: 28, reverbWidth: 150 }) },
  { id: 'rv-vocal-plate', name: 'Vocal Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 48, reverbDecay: 1.6, reverbPredelay: 18, reverbWet: 30, reverbDamping: 10000, reverbHighCut: 14000, reverbWidth: 140, reverbOffset: 22 }) },
  { id: 'rv-drum-plate', name: 'Drum Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 42, reverbDecay: 1.1, reverbPredelay: 10, reverbWet: 28, reverbHighCut: 11000, reverbWidth: 130 }) },
  { id: 'rv-snare-plate', name: 'Snare Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 38, reverbDecay: 0.9, reverbPredelay: 8, reverbWet: 30, reverbEarly: 50, reverbWidth: 140, reverbHighCut: 13000 }) },
  { id: 'rv-bright-plate', name: 'Bright Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 50, reverbDecay: 1.8, reverbDamping: 12000, reverbHighCut: 15000, reverbLowCut: 70, reverbWet: 28, reverbWidth: 148, reverbOffset: 24 }) },
  { id: 'rv-spring', name: 'Guitar Spring', kind: 'reverb', category: 'Spring', reverbType: 'spring', params: reverbP({ reverbSize: 40, reverbDecay: 1.3, reverbPredelay: 6, reverbWet: 24, reverbDrive: 8, reverbWidth: 85, reverbOffset: 10, reverbHighCut: 9000, reverbDamping: 8000 }) },
  { id: 'rv-dreamy', name: 'Dreamy Cloud', kind: 'reverb', category: 'Ambient', reverbType: 'cloud', params: reverbP({ reverbSize: 76, reverbDecay: 4.2, reverbDiffusion: 82, reverbModDepth: 22, reverbWet: 24, reverbWidth: 158, reverbOffset: 24, reverbInput: 0, reverbLowCut: 140, reverbHighCut: 10000 }) },
  { id: 'rv-bloom', name: 'Bloom', kind: 'reverb', category: 'Ambient', reverbType: 'bloom', params: reverbP({ reverbSize: 74, reverbDecay: 3.8, reverbPredelay: 36, reverbDiffusion: 78, reverbWet: 24, reverbWidth: 155, reverbOffset: 22, reverbModDepth: 18, reverbInput: 0, reverbLowCut: 120 }) },
  { id: 'rv-shimmer', name: 'Shimmer', kind: 'reverb', category: 'Ambient', reverbType: 'shimmer', params: reverbP({ reverbSize: 68, reverbDecay: 3.6, reverbShimmer: 30, reverbShimmerPitch: 12, reverbWet: 22, reverbModDepth: 14, reverbWidth: 152, reverbOffset: 20, reverbInput: 0, reverbLowCut: 160, reverbHighCut: 11000 }) },
  { id: 'rv-cinema', name: 'Cinematic Tail', kind: 'reverb', category: 'Ambient', reverbType: 'largeHall', params: reverbP({ reverbSize: 82, reverbDecay: 4.2, reverbPredelay: 52, reverbDistance: 64, reverbWet: 24, reverbWidth: 162, reverbOffset: 28, reverbDiffusion: 72, reverbInput: 0, reverbLowCut: 150, reverbHighCut: 9500 }) },
  { id: 'rv-abyss', name: 'Abyss', kind: 'reverb', category: 'Ambient', reverbType: 'cathedral', params: reverbP({ reverbSize: 88, reverbDecay: 4.6, reverbPredelay: 64, reverbDistance: 70, reverbWet: 22, reverbWidth: 165, reverbOffset: 30, reverbDamping: 3200, reverbLowCut: 220, reverbHighCut: 6000, reverbInput: 0 }) },
  { id: 'rv-wash', name: 'Distant Wash', kind: 'reverb', category: 'Ambient', reverbType: 'hall', params: reverbP({ reverbSize: 76, reverbDecay: 3.8, reverbDistance: 72, reverbWet: 24, reverbLowCut: 280, reverbHighCut: 6000, reverbDamping: 4000, reverbWidth: 158, reverbOffset: 26, reverbInput: 0 }) },
  { id: 'rv-infinite', name: 'Infinite Pad', kind: 'reverb', category: 'Ambient', reverbType: 'infinite', params: reverbP({ reverbSize: 78, reverbDecay: 6, reverbFreeze: 1, reverbWet: 16, reverbShimmer: 8, reverbWidth: 148, reverbOffset: 14, reverbInput: 0, reverbLowCut: 180, reverbHighCut: 9000 }) },
  { id: 'rv-gated', name: 'Gated Snare', kind: 'reverb', category: 'Experimental', reverbType: 'gated', params: reverbP({ reverbSize: 52, reverbDecay: 0.65, reverbPredelay: 2, reverbGate: 80, reverbGateThres: -18, reverbGateHold: 80, reverbGateRelease: 40, reverbWet: 32, reverbWidth: 120, reverbOffset: 0, reverbHighCut: 10000 }) },
  { id: 'rv-reverse', name: 'Reverse', kind: 'reverb', category: 'Experimental', reverbType: 'reverse', params: reverbP({ reverbSize: 58, reverbDecay: 1.5, reverbPredelay: 80, reverbReverse: 100, reverbWet: 28, reverbWidth: 145, reverbOffset: 24, reverbLowCut: 120 }) },
  { id: 'rv-lofi', name: 'Lo-Fi', kind: 'reverb', category: 'Experimental', reverbType: 'room', params: reverbP({ reverbSize: 40, reverbDecay: 1.1, reverbHighCut: 2800, reverbLowCut: 280, reverbDrive: 12, reverbWet: 24, reverbWidth: 70, reverbOffset: 5, reverbDamping: 2400 }) },
  { id: 'rv-mod', name: 'Modulated Chamber', kind: 'reverb', category: 'Experimental', reverbType: 'chamber', params: reverbP({ reverbSize: 54, reverbDecay: 2.6, reverbModDepth: 48, reverbModRate: 0.4, reverbWet: 26, reverbWidth: 145, reverbOffset: 28 }) },
  { id: 'rv-fifth', name: 'Fifth Shimmer', kind: 'reverb', category: 'Experimental', reverbType: 'shimmer', params: reverbP({ reverbSize: 66, reverbDecay: 3.4, reverbShimmer: 32, reverbShimmerPitch: 7, reverbWet: 22, reverbWidth: 148, reverbOffset: 18, reverbInput: 0, reverbLowCut: 150 }) },
  { id: 'rv-sub-shimmer', name: 'Sub Halo', kind: 'reverb', category: 'Experimental', reverbType: 'shimmer', params: reverbP({ reverbSize: 68, reverbDecay: 3.6, reverbShimmer: 24, reverbShimmerPitch: -12, reverbWet: 22, reverbWidth: 136, reverbInput: 0, reverbLowCut: 80, reverbHighCut: 7000, reverbDamping: 3500 }) },
  { id: 'rv-nonlinear', name: 'Nonlinear Burst', kind: 'reverb', category: 'Experimental', reverbType: 'nonlinear', params: reverbP({ reverbSize: 52, reverbDecay: 0.95, reverbPredelay: 6, reverbWet: 28, reverbWidth: 140, reverbOffset: 16, reverbEarly: 28 }) },
  { id: 'rv-mono', name: 'Mono Glue', kind: 'reverb', category: 'Stereo', reverbType: 'room', params: reverbP({ reverbSize: 30, reverbDecay: 0.7, reverbPredelay: 10, reverbWet: 24, reverbWidth: 0, reverbOffset: 0, reverbInput: 0, reverbStereo: 0, reverbModDepth: 0 }) },
  { id: 'rv-stereo-spread', name: 'Stereo Spread', kind: 'reverb', category: 'Stereo', reverbType: 'hall', params: reverbP({ reverbSize: 64, reverbDecay: 2.8, reverbPredelay: 20, reverbWet: 26, reverbWidth: 170, reverbOffset: 36, reverbInput: 0, reverbDiffusion: 72, reverbLowCut: 120 }) },
  { id: 'rv-haas', name: 'Haas Width', kind: 'reverb', category: 'Stereo', reverbType: 'ambience', params: reverbP({ reverbSize: 24, reverbDecay: 0.26, reverbPredelay: 14, reverbWet: 20, reverbWidth: 160, reverbOffset: 48, reverbInput: 100, reverbEarly: 52, reverbModDepth: 0 }) },
]

export const DELAY_PRESET_CATEGORIES: FxPresetCategory[] = [
  'Vocals',
  'Guitar',
  'Drums',
  'Synth',
  'Rhythmic',
  'Stereo',
  'Analog/Tape',
  'Ambient',
  'Experimental',
  'Lo-Fi',
]

export const REVERB_PRESET_CATEGORIES: FxPresetCategory[] = [
  'Room',
  'Hall',
  'Plate',
  'Spring',
  'Ambient',
  'Experimental',
  'Stereo',
]

export function presetsFor(kind: 'delay' | 'reverb', category?: FxPresetCategory): SpacePreset[] {
  return SPACE_PRESETS.filter((p) => p.kind === kind && (!category || p.category === category))
}

export function defaultPresetFor(kind: 'delay' | 'reverb', category: FxPresetCategory): SpacePreset | undefined {
  return presetsFor(kind, category)[0]
}

export function findSpacePreset(id: string): SpacePreset | undefined {
  return SPACE_PRESETS.find((p) => p.id === id)
}

export function presetHint(preset: SpacePreset): string {
  return PRESET_HINTS[preset.id] ?? preset.name
}
