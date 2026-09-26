import { describe, expect, it } from 'vitest'
import { delayChannelSendLevels } from '../fx/dryWet'
import { findSpacePreset } from '../fx/presets'
import { applyFxLfos, defaultFxLfos, defaultLfoHold } from '../fx/lfo'
import { syncedDelayMs } from '../fx/sync'
import { defaultParamValues } from './definitions'
import { commitParamEdit, commitParamPatch } from './links'
import type { ParamId } from './types'

function edit(params: ReturnType<typeof defaultParamValues>, id: ParamId, value: number) {
  const previous = params[id]
  params[id] = value
  commitParamEdit(params, id, previous)
}

describe('linked delay modulation', () => {
  it('follows Dry when an LFO moves Wet while Dry/Wet are linked', () => {
    const params = defaultParamValues()
    params.delayCorrelate = 1
    params.delayDry = 50
    params.delayWet = 50
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    lfos.delay[0]!.shape = 'sine'
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayWet).toBe(100)
    expect(live.delayDry).toBe(0)
    const send = delayChannelSendLevels(live, 'L', true)
    expect(send.wet).toBeCloseTo(1)
    expect(send.dry).toBeCloseTo(0)
    expect(send.dry + send.wet).toBeCloseTo(1)
  })

  it('follows Wet when an LFO moves Dry while Dry/Wet are linked', () => {
    const params = defaultParamValues()
    params.delayCorrelate = 1
    params.delayDry = 40
    params.delayWet = 60
    params.delayDryR = 40
    params.delayWetR = 60
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayDry'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    lfos.delay[0]!.shape = 'square'
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayDry).toBe(80)
    expect(live.delayWet).toBe(20)
    const send = delayChannelSendLevels(live, 'L', false)
    expect(send.dry).toBeCloseTo(0.8)
    expect(send.wet).toBeCloseTo(0.2)
    expect(live.delayDryR).toBe(40)
    expect(live.delayWetR).toBe(60)
  })

  it('lets an LFO move only its target when Dry/Wet are unlinked', () => {
    const params = defaultParamValues()
    params.delayCorrelate = 0
    params.delayDry = 100
    params.delayWet = 40
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayWet).toBe(80)
    expect(live.delayDry).toBe(100)
    const send = delayChannelSendLevels(live, 'L', false)
    expect(send.dry).toBeCloseTo(1)
    expect(send.wet).toBeCloseTo(0.8)
  })

  it('mirrors a Wet LFO onto the linked right channel and its Dry', () => {
    const params = defaultParamValues()
    params.delayCorrelate = 1
    params.delayLinkLR = 1
    params.delayDry = 70
    params.delayWet = 30
    params.delayDryR = 70
    params.delayWetR = 30
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayWet'
    lfos.delay[0]!.depth = 100
    lfos.delay[0]!.rateHz = 1
    lfos.delay[0]!.shape = 'square'
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayWet).toBe(60)
    expect(live.delayDry).toBe(40)
    expect(live.delayWetR).toBe(live.delayWet)
    expect(live.delayDryR).toBe(live.delayDry)
    const right = delayChannelSendLevels(live, 'R', true)
    expect(right.dry + right.wet).toBeCloseTo(1)
    expect(right.wet).toBeCloseTo(live.delayWet / 100)
  })
})

describe('left/right delay link', () => {
  it('copies a left edit onto the right while linked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    params.delayTimeR = 300
    edit(params, 'delayTime', 450)
    expect(params.delayTime).toBe(450)
    expect(params.delayTimeR).toBe(450)
  })

  it('copies a right edit onto the left while linked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    edit(params, 'delayFeedbackR', 55)
    expect(params.delayFeedback).toBe(55)
    expect(params.delayFeedbackR).toBe(55)
  })

  it('keeps left and right independent while unlinked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 0
    params.delayTimeR = 800
    edit(params, 'delayTime', 450)
    expect(params.delayTime).toBe(450)
    expect(params.delayTimeR).toBe(800)
  })

  it('copies left onto right when the link is enabled', () => {
    const params = defaultParamValues()
    params.delayTime = 180
    params.delayTimeR = 900
    params.delayFeedback = 12
    params.delayFeedbackR = 60
    params.delayNoteKind = 2
    params.delayNoteKindR = 0
    edit(params, 'delayLinkLR', 1)
    expect(params.delayTimeR).toBe(180)
    expect(params.delayFeedbackR).toBe(12)
    expect(params.delayNoteKindR).toBe(2)
  })

  it('follows tempo sync on both sides while linked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    params.bpm = 120
    params.delaySync = 1
    params.delaySyncR = 1
    params.delayNote = 4
    params.delayNoteR = 4
    params.delayNoteKind = 0
    params.delayNoteKindR = 0
    edit(params, 'delayNoteKind', 1)
    const dotted = syncedDelayMs(120, '1/4', 'dotted')
    expect(params.delayNoteKindR).toBe(1)
    expect(params.delayTime).toBeCloseTo(dotted)
    expect(params.delayTimeR).toBeCloseTo(dotted)
  })

  it('modulates both delay times from one LFO while linked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    params.delayTime = 300
    params.delayTimeR = 900
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayTime'
    lfos.delay[0]!.depth = 40
    lfos.delay[0]!.rateHz = 1
    lfos.delay[0]!.shape = 'square'
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayTime).not.toBe(300)
    expect(live.delayTimeR).toBe(live.delayTime)
  })

  it('leaves the other side alone when an LFO hits an unlinked time', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 0
    params.delayTime = 300
    params.delayTimeR = 900
    const lfos = defaultFxLfos()
    lfos.delay[0]!.target = 'delayTime'
    lfos.delay[0]!.depth = 40
    lfos.delay[0]!.rateHz = 1
    lfos.delay[0]!.shape = 'square'
    const live = applyFxLfos(params, lfos, 0.25, defaultLfoHold())
    expect(live.delayTime).not.toBe(300)
    expect(live.delayTimeR).toBe(900)
  })
})

describe('delay link patches', () => {
  it('keeps the Haas preset stereo times when the link is off', () => {
    const preset = findSpacePreset('dly-haas')
    expect(preset).toBeTruthy()
    const params = defaultParamValues()
    const previous = {
      delayLinkLR: params.delayLinkLR,
      delayCorrelate: params.delayCorrelate,
      reverbCorrelate: params.reverbCorrelate,
    }
    for (const key of Object.keys(preset!.params) as ParamId[]) {
      const value = preset!.params[key]
      if (typeof value === 'number') params[key] = value
    }
    commitParamPatch(params, Object.keys(preset!.params) as ParamId[], previous)
    expect(params.delayTime).toBe(18)
    expect(params.delayTimeR).toBe(32)
    expect(params.delayLinkLR).toBe(0)
    expect(params.delayFeedbackR).toBe(params.delayFeedback)
  })

  it('keeps an explicit stereo preset image when the link is off', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    params.delayTime = 200
    params.delayTimeR = 200
    const previous = {
      delayLinkLR: params.delayLinkLR,
      delayCorrelate: params.delayCorrelate,
      reverbCorrelate: params.reverbCorrelate,
    }
    params.delayTime = 18
    params.delayTimeR = 32
    params.delayLinkLR = 0
    commitParamPatch(params, ['delayTime', 'delayTimeR', 'delayLinkLR'], previous)
    expect(params.delayTime).toBe(18)
    expect(params.delayTimeR).toBe(32)
    expect(params.delayLinkLR).toBe(0)
  })

  it('drives feedback on both channels from one write while linked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 1
    params.delayFeedbackR = 10
    edit(params, 'delayFeedback', 44)
    expect(params.delayFeedback).toBe(44)
    expect(params.delayFeedbackR).toBe(44)
  })

  it('keeps stored right feedback when the single control moves while unlinked', () => {
    const params = defaultParamValues()
    params.delayLinkLR = 0
    params.delayFeedbackR = 10
    edit(params, 'delayFeedback', 44)
    expect(params.delayFeedback).toBe(44)
    expect(params.delayFeedbackR).toBe(10)
  })

  it('still complements reverb Dry and Wet from a wet edit', () => {
    const params = defaultParamValues()
    params.reverbCorrelate = 1
    edit(params, 'reverbWet', 25)
    expect(params.reverbWet).toBe(25)
    expect(params.reverbDry).toBe(75)
  })
})
