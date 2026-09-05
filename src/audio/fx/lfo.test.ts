import { describe, expect, it } from 'vitest'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import {
  applyFxLfos,
  defaultFxLfos,
  defaultLfoHold,
  eqBandHasLfo,
  eqModuleHasLiveCurve,
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
    expect(isFxLfoTarget('reverb', 'reverbOffset')).toBe(true)
    expect(isFxLfoTarget('reverb', 'reverbInput')).toBe(true)
    expect(isFxLfoTarget('saturation', 'saturation')).toBe(true)
    expect(isFxLfoTarget('grain', 'density')).toBe(true)
    expect(isFxLfoTarget('eq1', 'eq1Freq')).toBe(true)
    expect(isFxLfoTarget('eq2', 'eq2Freq')).toBe(true)
    expect(isFxLfoTarget('eq2', 'eq1Freq')).toBe(false)
    expect(isFxLfoTarget('eqcf', 'eqcfGain')).toBe(true)
    expect(isFxLfoTarget('input', 'gain')).toBe(true)
    expect(isFxLfoTarget('input', 'pan')).toBe(true)
    expect(isFxLfoTarget('input', 'delayWet')).toBe(false)
  })
})

describe('lfoConnectCopy', () => {
  it('shows Connected plus the target label', () => {
    expect(lfoConnectCopy(false, null)).toEqual({ label: 'Connect', detail: null })
    expect(lfoConnectCopy(true, 'Gain')).toEqual({ label: 'Click a parameter', detail: null })
    expect(lfoConnectCopy(false, 'EQ 1 Freq')).toEqual({ label: 'Connected', detail: 'EQ 1 Freq' })
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
    expect(inspectorPaneForLfo('compressor', 'compressorKnee')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorRelease')).toBe('main')
    expect(inspectorPaneForLfo('compressor', 'compressorAttack')).toBe('advanced')
    expect(inspectorPaneForLfo('compressor', 'compressorInput')).toBe('advanced')
    expect(inspectorPaneForLfo('compressor', 'compressorMakeup')).toBe('advanced')
  })

  it('keeps brickwall knobs on the limiter main pane', () => {
    expect(inspectorPaneForLfo('limiter', 'limiterCeiling')).toBe('main')
    expect(inspectorPaneForLfo('limiter', 'limiterRelease')).toBe('main')
    expect(inspectorPaneForLfo('limiter', 'limiterAttack')).toBe('advanced')
    expect(inspectorPaneForLfo('limiter', 'limiterInput')).toBe('advanced')
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
  })
})

describe('moduleTypeForLfoKind', () => {
  it('maps compressor and limiter kinds to chain modules', () => {
    expect(moduleTypeForLfoKind('compressor')).toBe('compressor')
    expect(moduleTypeForLfoKind('limiter')).toBe('limiter')
    expect(moduleTypeForLfoKind('input')).toBe('gain')
  })
})
