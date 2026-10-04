import { describe, expect, it } from 'vitest'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import {
  applyFxLfos,
  defaultFxLfo,
  defaultFxLfos,
  defaultLfoHold,
  lfoAppliesToScope,
  lfoDrivesInstance,
  eqBandHasLfo,
  eqBandLfoIds,
  liveEqBandsFromParams,
  eqModuleHasLiveCurve,
  fxLfoIsActive,
  fxLfoSlotName,
  inspectorPaneForLfo,
  isFxLfoTarget,
  lfoConnectCopy,
  lfoPhase,
  lfoRangeNormalized,
  lfoWave,
  modulateParam,
  moduleTypeForLfoKind,
  parseFxLfos,
  stepTransportClock,
} from './lfo'

describe('lfoWave', () => {
  it('hits sine peaks at quarter cycle', () => {
    expect(lfoWave(0, 'sine')).toBeCloseTo(0)
    expect(lfoWave(0.25, 'sine')).toBeCloseTo(1)
    expect(lfoWave(0.5, 'sine')).toBeCloseTo(0)
    expect(lfoWave(0.75, 'sine')).toBeCloseTo(-1)
  })

  it('covers triangle, square, and saw extrema', () => {
    expect(lfoWave(0, 'triangle')).toBeCloseTo(-1)
    expect(lfoWave(0.25, 'triangle')).toBeCloseTo(0)
    expect(lfoWave(0.5, 'triangle')).toBeCloseTo(1)
    expect(lfoWave(0, 'square')).toBe(1)
    expect(lfoWave(0.5, 'square')).toBe(-1)
    expect(lfoWave(0, 'saw')).toBeCloseTo(-1)
    expect(lfoWave(0.5, 'saw')).toBeCloseTo(0)
    expect(lfoWave(1, 'saw')).toBeCloseTo(-1)
  })

  it('returns the hold sample for S&H', () => {
    expect(lfoWave(0.3, 'snh', 0.4)).toBeCloseTo(0.4)
  })
})

describe('modulateParam', () => {
  it('leaves the value alone at zero depth', () => {
    expect(modulateParam(40, 'delayWet', 1, 0)).toBe(40)
  })

  it('swings a linear percent param around the stored value', () => {
    const up = modulateParam(50, 'delayWet', 1, 100)
    const down = modulateParam(50, 'delayWet', -1, 100)
    expect(up).toBe(100)
    expect(down).toBe(0)
  })

  it('treats depth as plus/minus percent of the full range', () => {
    expect(modulateParam(50, 'delayWet', 1, 20)).toBe(70)
    expect(modulateParam(50, 'delayWet', -1, 20)).toBe(30)
    expect(modulateParam(45, 'saturation', 1, 20)).toBe(65)
    expect(modulateParam(45, 'saturation', -1, 20)).toBe(25)
  })

  it('clamps past the parameter range', () => {
    expect(modulateParam(90, 'delayWet', 1, 100)).toBe(100)
  })

  it('uses normalized space so log params stay in range', () => {
    const mid = PARAMS.delayTime.defaultValue
    const up = modulateParam(mid, 'delayTime', 1, 100)
    expect(toNormalized(up, PARAMS.delayTime)).toBeGreaterThan(toNormalized(mid, PARAMS.delayTime))
    expect(up).toBeLessThanOrEqual(PARAMS.delayTime.max)
    expect(up).toBeGreaterThanOrEqual(PARAMS.delayTime.min)
  })
})

describe('applyFxLfos', () => {
  it('modulates only the connected effect parameter', () => {
    const params = defaultParamValues()
    params.delayWet = 50
    params.reverbWet = 20
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    const hold = defaultLfoHold()
    const t = 0.25
    expect(lfoPhase(t, 1)).toBeCloseTo(0.25)
    const next = applyFxLfos(params, lfos, t, hold)
    expect(next.delayWet).toBe(100)
    expect(next.reverbWet).toBe(20)
  })

  it('starts at oscillator zero when a phase origin is set', () => {
    const params = defaultParamValues()
    params.eq1Freq = 1000
    const lfos = defaultFxLfos()
    lfos.eq1[0]!.target = 'eq1Freq'
    lfos.eq1[0]!.depth = 40
    lfos.eq1[0]!.rateHz = 1
    lfos.eq1[0]!.phaseOriginSec = 2.25
    const next = applyFxLfos(params, lfos, 2.25, defaultLfoHold())
    expect(next.eq1Freq).toBeCloseTo(1000, 5)
  })

  it('modulates input gain from the input LFO bank', () => {
    const params = defaultParamValues()
    params.gain = -3
    const lfos = defaultFxLfos()
    lfos.input[0]!.target = 'gain'
    lfos.input[0]!.depth = 20
    lfos.input[0]!.rateHz = 1
    const next = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(next.gain).not.toBe(-3)
  })
  it('lets a second slot modulate another parameter on the same effect', () => {
    const params = defaultParamValues()
    params.delayWet = 50
    params.delayDry = 50
    params.delayCorrelate = 0
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.depth = 20
    lfos.delay[1]!.target = 'delayDry'
    lfos.delay[1]!.depth = 20
    lfos.delay[0]!.rateHz = 1
    lfos.delay[1]!.rateHz = 1
    const next = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(next.delayWet).toBe(70)
    expect(next.delayDry).toBe(70)
  })

  it('advances sample-and-hold when the hold index changes', () => {
    const params = defaultParamValues()
    params.delayWet = 50
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.shape = 'snh'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    const hold = defaultLfoHold()
    let n = 0
    const rand = () => {
      n += 1
      return n === 1 ? 1 : 0
    }
    const a = applyFxLfos(params, lfos, 0.1, hold, rand)
    const b = applyFxLfos(params, lfos, 0.2, hold, rand)
    const c = applyFxLfos(params, lfos, 1.1, hold, rand)
    expect(a.delayWet).toBe(b.delayWet)
    expect(c.delayWet).not.toBe(a.delayWet)
  })
})

describe('stepTransportClock', () => {
  it('freezes on pause and resumes from the same phase', () => {
    let clock = stepTransportClock({ sec: 0, wallMs: 0 }, 1000, true)
    clock = stepTransportClock(clock, 1600, true)
    expect(clock.sec).toBeCloseTo(0.6)
    const paused = stepTransportClock(clock, 9000, false)
    expect(paused.sec).toBeCloseTo(0.6)
    expect(paused.wallMs).toBe(0)
    const resumed = stepTransportClock({ sec: paused.sec, wallMs: 10000 }, 11250, true)
    expect(resumed.sec).toBeCloseTo(1.85)
  })

  it('does not restart from zero when playback continues', () => {
    const parked = stepTransportClock({ sec: 2.4, wallMs: 50 }, 5000, false)
    const next = stepTransportClock({ sec: parked.sec, wallMs: 5000 }, 5000, true)
    expect(next.sec).toBeCloseTo(2.4)
  })
})

describe('fx LFO bypass', () => {
  it('keeps the route and drops the offset while inactive', () => {
    const params = defaultParamValues()
    const lfos = defaultFxLfos()
    lfos.eq1[0] = { rateHz: 1, shape: 'sine', depth: 80, target: 'eq1Freq', enabled: false, phaseOriginSec: 0 }
    lfos.eq2[0] = { rateHz: 1, shape: 'sine', depth: 80, target: 'eq2Gain', enabled: false, phaseOriginSec: 0 }
    expect(fxLfoIsActive(lfos.eq1[0]!)).toBe(false)
    const held = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(held.eq1Freq).toBe(params.eq1Freq)
    expect(held.eq2Gain).toBe(params.eq2Gain)
    lfos.eq1[0]!.enabled = true
    lfos.eq2[0]!.enabled = true
    const moving = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(moving.eq1Freq).not.toBe(params.eq1Freq)
    expect(moving.eq2Gain).not.toBe(params.eq2Gain)
    const again = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(again.eq1Freq).toBe(moving.eq1Freq)
    expect(again.eq2Gain).toBe(moving.eq2Gain)
  })

  it('remembers an inactive flag from a saved bank', () => {
    const parsed = parseFxLfos({ eq1: { target: 'eq1Freq', depth: 40, rateHz: 0.5, enabled: false, shape: 'triangle' } })
    expect(parsed.eq1[0]!.enabled).toBe(false)
    expect(parsed.eq1[0]!.target).toBe('eq1Freq')
    expect(parsed.eq1[0]!.depth).toBe(40)
    expect(parsed.eq1[0]!.shape).toBe('triangle')
  })
})

describe('parseFxLfos', () => {
  it('keeps defaults for missing or invalid payload', () => {
    const parsed = parseFxLfos({ delay: { rateHz: 4, shape: 'square', depth: 80, target: 'delayTime' } })
    expect(parsed.delay[0]!.rateHz).toBe(4)
    expect(parsed.delay[0]!.shape).toBe('square')
    expect(parsed.delay[0]!.target).toBe('delayTime')
    expect(parsed.reverb[0]!.target).toBeNull()
    expect(parseFxLfos({ delay: { target: 'gain' } }).delay[0]!.target).toBeNull()
    expect(parseFxLfos({ input: { target: 'gain' } }).input[0]!.target).toBe('gain')
  })

  it('routes a legacy Feedback R target onto the single Feedback control', () => {
    const parsed = parseFxLfos({ delay: { target: 'delayFeedbackR', depth: 40, rateHz: 0.5 } })
    expect(parsed.delay[0]!.target).toBe('delayFeedback')
    expect(parsed.delay[0]!.depth).toBe(40)
  })

  it('migrates a legacy saturation LFO bank onto distortion', () => {
    const parsed = parseFxLfos({
      saturation: { rateHz: 1.2, shape: 'triangle', depth: 22, target: 'saturation' },
    })
    expect(parsed.distortion[0]!.target).toBe('saturation')
    expect(parsed.distortion[0]!.shape).toBe('triangle')
    expect(parsed.distortion[0]!.depth).toBe(22)
  })
})

describe('lfoRangeNormalized', () => {
  it('spans plus/minus depth around the stored zero', () => {
    expect(lfoRangeNormalized(0.45, 20)).toEqual({ min: 0.25, max: 0.65 })
  })

  it('fits depth so a sine never dwells on the rails', () => {
    expect(lfoRangeNormalized(0.05, 20)).toEqual({ min: 0, max: 0.1 })
  })
})

describe('fitted sine', () => {
  it('touches the floor only at the trough', () => {
    const lo = modulateParam(10, 'delayWet', -1, 40)
    const mid = modulateParam(10, 'delayWet', 0, 40)
    const hi = modulateParam(10, 'delayWet', 1, 40)
    expect(lo).toBe(0)
    expect(mid).toBe(10)
    expect(hi).toBe(20)
  })
})

describe('targets', () => {
  it('does not allow assigning a delay LFO to a reverb knob', () => {
    expect(isFxLfoTarget('delay', 'reverbWet')).toBe(false)
    expect(isFxLfoTarget('delay', 'delayWet')).toBe(true)
    expect(isFxLfoTarget('delay', 'delayTimeR')).toBe(true)
    expect(isFxLfoTarget('reverb', 'reverbOffset')).toBe(true)
    expect(isFxLfoTarget('reverb', 'reverbInput')).toBe(true)
    expect(isFxLfoTarget('distortion', 'saturation')).toBe(true)
    expect(isFxLfoTarget('filter', 'filterCutoff')).toBe(true)
    expect(isFxLfoTarget('filter', 'filterDrive')).toBe(true)
    expect(isFxLfoTarget('filter', 'delayWet')).toBe(false)
    expect(isFxLfoTarget('midside', 'msWidth')).toBe(true)
    expect(isFxLfoTarget('midside', 'msBalance')).toBe(true)
    expect(isFxLfoTarget('midside', 'msMidLowGain')).toBe(true)
    expect(isFxLfoTarget('midside', 'filterCutoff')).toBe(false)
    expect(isFxLfoTarget('distortion', 'saturationMix')).toBe(true)
    expect(isFxLfoTarget('distortion', 'distortionBits')).toBe(true)
    expect(isFxLfoTarget('eq8', 'eq8Freq')).toBe(true)
    expect(isFxLfoTarget('grain', 'density')).toBe(true)
    expect(isFxLfoTarget('eq1', 'eq1Freq')).toBe(true)
    expect(isFxLfoTarget('eq2', 'eq2Freq')).toBe(true)
    expect(isFxLfoTarget('eq2', 'eq1Freq')).toBe(false)
    expect(isFxLfoTarget('eqcf', 'eqcfGain')).toBe(true)
    expect(isFxLfoTarget('input', 'gain')).toBe(true)
    expect(isFxLfoTarget('input', 'stretchInterp')).toBe(true)
    expect(isFxLfoTarget('input', 'pan')).toBe(true)
    expect(isFxLfoTarget('input', 'delayWet')).toBe(false)
  })
})

describe('lfoConnectCopy', () => {
  it('derives the control from the real target, not the arming gesture', () => {
    expect(lfoConnectCopy(false, null)).toEqual({ label: 'Connect', detail: null, mode: 'connect' })
    expect(lfoConnectCopy(true, null)).toEqual({ label: 'Connect', detail: null, mode: 'armed' })
    expect(lfoConnectCopy(true, 'Gain')).toEqual({ label: 'Disconnect', detail: 'Gain', mode: 'disconnect' })
    expect(lfoConnectCopy(false, 'EQ 1 Freq')).toEqual({
      label: 'Disconnect',
      detail: 'EQ 1 Freq',
      mode: 'disconnect',
    })
  })
})

describe('inspectorPaneForLfo', () => {
  it('opens panning for input pan targets', () => {
    expect(inspectorPaneForLfo('input', 'gain')).toBe('main')
    expect(inspectorPaneForLfo('input', 'pan')).toBe('advanced')
  })

  it('keeps compressor main knobs on the main pane', () => {
    expect(inspectorPaneForLfo('compressor', 'compressorThreshold')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorRatio')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorAttack')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorRelease')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorKnee')).toBe('advanced')
    expect(inspectorPaneForLfo('compressor', 'compressorInput')).toBe('advanced')
    expect(inspectorPaneForLfo('compressor', 'compressorMakeup')).toBe('advanced')
  })

  it('keeps brickwall knobs on the limiter main pane', () => {
    expect(inspectorPaneForLfo('limiter', 'limiterCeiling')).toBe('main')
    expect(inspectorPaneForLfo('limiter', 'limiterRelease')).toBe('main')
    expect(inspectorPaneForLfo('limiter', 'limiterAttack')).toBe('advanced')
    expect(inspectorPaneForLfo('limiter', 'limiterInput')).toBe('advanced')
    expect(inspectorPaneForLfo('distortion', 'saturation')).toBe('main')
    expect(inspectorPaneForLfo('distortion', 'distortionBits')).toBe('advanced')
  })
})

describe('liveEqBandsFromParams', () => {
  it('leaves stored values when overlay is off', () => {
    const bands = [{ frequency: 400, gain: -2, q: 1.2 }]
    const live = { ...defaultParamValues() }
    live.eq1Freq = 1200
    live.eq1Gain = 6
    live.eq1Q = 4
    expect(liveEqBandsFromParams(bands, live, false)[0]?.frequency).toBe(400)
    expect(liveEqBandsFromParams(bands, live)[0]?.frequency).toBe(1200)
  })
})

describe('eqModuleHasLiveCurve', () => {
  it('is true when a band LFO is patched', () => {
    const lfos = defaultFxLfos()
    expect(eqModuleHasLiveCurve(lfos, false)).toBe(false)
    expect(eqBandHasLfo(lfos, 0)).toBe(false)
    lfos.eq1[0]!.target = 'eq1Freq'
    expect(eqBandHasLfo(lfos, 0)).toBe(true)
    expect(eqModuleHasLiveCurve(lfos, false)).toBe(true)
  })

  it('includes comb LFOs only when comb is enabled', () => {
    const lfos = defaultFxLfos()
    lfos.eqcf[0]!.target = 'eqcfGain'
    expect(eqModuleHasLiveCurve(lfos, false)).toBe(false)
    expect(eqModuleHasLiveCurve(lfos, true)).toBe(true)
  })
})

describe('fxLfoSlotName', () => {
  it('uses unique prefixes per effect', () => {
    expect(fxLfoSlotName('eq1', 0)).toBe('eq1b1')
    expect(fxLfoSlotName('eq2', 2)).toBe('eq2b3')
    expect(fxLfoSlotName('eq4', 1)).toBe('eq4b2')
    expect(fxLfoSlotName('eqcf', 0)).toBe('eqcf1')
    expect(fxLfoSlotName('grain', 0)).toBe('g1')
    expect(fxLfoSlotName('compressor', 0)).toBe('c1')
    expect(fxLfoSlotName('limiter', 0)).toBe('l1')
    expect(fxLfoSlotName('delay', 1)).toBe('d2')
    expect(fxLfoSlotName('input', 0)).toBe('i1')
    expect(fxLfoSlotName('filter', 0)).toBe('f1')
    expect(fxLfoSlotName('midside', 0)).toBe('ms1')
  })
})

describe('moduleTypeForLfoKind', () => {
  it('maps compressor and limiter kinds to chain modules', () => {
    expect(moduleTypeForLfoKind('compressor')).toBe('compressor')
    expect(moduleTypeForLfoKind('limiter')).toBe('limiter')
    expect(moduleTypeForLfoKind('distortion')).toBe('distortion')
    expect(moduleTypeForLfoKind('input')).toBe('gain')
    expect(moduleTypeForLfoKind('filter')).toBe('filter')
    expect(moduleTypeForLfoKind('midside')).toBe('midside')
  })
})

describe('lfo instance scope', () => {
  it('keeps a scoped route on one effect instance', () => {
    const params = defaultParamValues()
    params.delayFeedback = 40
    const lfos = defaultFxLfos()
    lfos.delay[0] = {
      ...defaultFxLfo(),
      target: 'delayFeedback',
      depth: 80,
      rateHz: 1,
      shape: 'square',
      instanceId: 'delay-b',
    }
    const hold = defaultLfoHold()
    const a = applyFxLfos(params, lfos, 0.25, hold, () => 0, { instanceId: 'delay-a' })
    const b = applyFxLfos(params, lfos, 0.25, hold, () => 0, { instanceId: 'delay-b' })
    expect(a.delayFeedback).toBe(params.delayFeedback)
    expect(b.delayFeedback).not.toBe(params.delayFeedback)
    expect(lfoDrivesInstance(lfos.delay[0]!, 'delay-b', true)).toBe(true)
    expect(lfoDrivesInstance(lfos.delay[0]!, 'delay-a', true)).toBe(false)
  })

  it('still modulates speed from the unscoped track resolve when the gain module id is stored', () => {
    const params = defaultParamValues()
    const lfos = defaultFxLfos()
    lfos.input[0] = {
      ...defaultFxLfo(),
      target: 'speed',
      depth: 80,
      rateHz: 1,
      shape: 'square',
      instanceId: 'gain-1',
    }
    const heard = applyFxLfos(params, lfos, 0, defaultLfoHold())
    expect(heard.speed).not.toBeCloseTo(params.speed)
    expect(heard.speed).toBeGreaterThan(0)
    const foreign = applyFxLfos(params, lfos, 0, defaultLfoHold(), () => 0, { instanceId: 'delay-b' })
    expect(foreign.speed).toBeCloseTo(params.speed)
  })

  it('skips an EQ route whose band id is no longer at that index', () => {
    const params = defaultParamValues()
    params.eq1Freq = 400
    const lfos = defaultFxLfos()
    lfos.eq1[0] = {
      ...defaultFxLfo(),
      target: 'eq1Freq',
      depth: 80,
      rateHz: 1,
      shape: 'square',
      bandId: 'band-a',
    }
    const hold = defaultLfoHold()
    const skipped = applyFxLfos(params, lfos, 0.25, hold, () => 0, {
      instanceId: 'eq-1',
      bands: [{ id: 'band-b' }],
    })
    expect(skipped.eq1Freq).toBe(400)
    expect(lfoAppliesToScope(lfos.eq1[0]!, { instanceId: 'eq-1', bands: [{ id: 'band-a' }] })).toBe(true)
  })

  it('clamps speed modulation inside the supported playback range', () => {
    const low = modulateParam(PARAMS.speed.min, 'speed', -1, 100)
    const high = modulateParam(PARAMS.speed.max, 'speed', 1, 100)
    const mid = modulateParam(1, 'speed', 1, 40)
    expect(low).toBeGreaterThan(0)
    expect(low).toBeGreaterThanOrEqual(PARAMS.speed.min)
    expect(high).toBeLessThanOrEqual(PARAMS.speed.max)
    expect(Number.isFinite(mid)).toBe(true)
    expect(mid).toBeGreaterThan(0)
  })
})

describe('eqBandLfoIds', () => {
  it('covers the first eight bands and leaves extra bands free of shared LFO params', () => {
    expect(eqBandLfoIds(0)?.freq).toBe('eq1Freq')
    expect(eqBandLfoIds(7)?.freq).toBe('eq8Freq')
    expect(eqBandLfoIds(8)).toBeNull()
    expect(eqBandLfoIds(31)).toBeNull()
  })
})
