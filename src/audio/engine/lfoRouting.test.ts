import 'node-web-audio-api/polyfill.js'
import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { delayLoopGain } from '../fx/delayLoop'
import { scheduledAudioParamTarget } from './paramSmooth'
import { AudioEngine } from './AudioEngine'

function tone(seconds: number): Float32Array[] {
  const frames = Math.round(44100 * seconds)
  const data = new Float32Array(frames)
  data.fill(0.2)
  return [data]
}

function installTimers(): void {
  const host = window as Window & {
    setInterval?: typeof setInterval
    clearInterval?: typeof clearInterval
    setTimeout?: typeof setTimeout
    clearTimeout?: typeof clearTimeout
  }
  if (typeof host.setInterval !== 'function') {
    host.setInterval = ((fn: TimerHandler, ms?: number) => setInterval(fn, ms)) as typeof setInterval
    host.clearInterval = ((id: number) => clearInterval(id)) as typeof clearInterval
  }
  if (typeof host.setTimeout !== 'function') {
    host.setTimeout = ((fn: TimerHandler, ms?: number) => setTimeout(fn, ms)) as typeof setTimeout
    host.clearTimeout = ((id: number) => clearTimeout(id)) as typeof clearTimeout
  }
}

async function playingEngine(): Promise<AudioEngine> {
  installTimers()
  const engine = new AudioEngine()
  engine.useOfflineGraph(new OfflineAudioContext(2, 44100 * 4, 44100))
  const id = engine.getSnapshot().tracks[0]!.id
  expect(engine.loadTrackPcm(id, tone(2), 44100, 'tone.wav')).toBe(true)
  engine.setLoop(true)
  await engine.play()
  return engine
}

describe('LFO reaches the resolved performance value', () => {
  it('moves speed off the stored base, freezes on pause, and keeps one stretch scheduler', async () => {
    const engine = await playingEngine()
    engine.setFxLfo('input', 0, {
      target: 'speed',
      depth: 80,
      rateHz: 4,
      shape: 'square',
      enabled: true,
      instanceId: 'gain-1',
    })
    const base = engine.getSnapshot().params.speed
    const first = engine.getSnapshot().liveParams.speed
    expect(base).toBeCloseTo(1)
    expect(first).not.toBeCloseTo(base)
    expect(first).toBeGreaterThan(PARAMS_MIN)
    expect(Number.isFinite(first)).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 150))
    const later = engine.getSnapshot().liveParams.speed
    expect(later).not.toBeCloseTo(first, 2)
    expect(engine.getSnapshot().playing).toBe(true)

    engine.pause()
    const frozen = engine.getSnapshot().liveParams.speed
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(engine.getSnapshot().liveParams.speed).toBeCloseTo(frozen)
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getSnapshot().params.speed).toBeCloseTo(base)

    await engine.play()
    const resumed = engine.getSnapshot()
    expect(resumed.playing).toBe(true)
    expect(resumed.liveParams.speed).toBeCloseTo(frozen)
    let moved = false
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const continued = engine.getSnapshot()
      expect(continued.playing).toBe(true)
      if (Math.abs(continued.liveParams.speed - frozen) > 0.05) {
        moved = true
        break
      }
    }
    expect(moved).toBe(true)
  })

  it('modulates gain and pan through the same resolver', async () => {
    const engine = await playingEngine()
    engine.setFxLfo('input', 0, { target: 'gain', depth: 70, rateHz: 1, shape: 'square', enabled: true })
    engine.setFxLfo('input', 1, { target: 'pan', depth: 60, rateHz: 1, shape: 'square', enabled: true })
    const snap = engine.getSnapshot()
    expect(snap.liveParams.gain).not.toBeCloseTo(snap.params.gain)
    expect(snap.liveParams.pan).not.toBeCloseTo(snap.params.pan)
    expect(Math.abs(snap.liveParams.pan)).toBeLessThanOrEqual(100)
  })

  it('keeps a second delay instance out of the first delay feedback route', async () => {
    const engine = await playingEngine()
    const delayA = engine.insertModule('delay', 0)
    const delayB = engine.insertModule('delay', 1)
    expect(delayA).toBeTruthy()
    expect(delayB).toBeTruthy()
    engine.setParam('delayFeedback', 25)
    engine.setFxLfo('delay', 0, {
      target: 'delayFeedback',
      depth: 80,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: delayB!,
    })
    const snap = engine.getSnapshot()
    expect(snap.liveByInstance[delayA!]?.delayFeedback).toBeCloseTo(25)
    expect(snap.liveByInstance[delayB!]?.delayFeedback).not.toBeCloseTo(25)

    const slots = (
      engine as unknown as {
        slots: Map<string, { delayFx?: { fbL: { gain: AudioParam } } }>
      }
    ).slots
    const gainA = slots.get(delayA!)?.delayFx?.fbL.gain
    const gainB = slots.get(delayB!)?.delayFx?.fbL.gain
    expect(gainA && gainB).toBeTruthy()
    // Delay A owns the edit buffer at 25% and must stay there.
    // Delay B keeps its own default and must hear the stamped LFO in the feedback gain.
    expect(scheduledAudioParamTarget(gainA!)).toBeCloseTo(delayLoopGain(25))
    expect(scheduledAudioParamTarget(gainB!)).not.toBeCloseTo(delayLoopGain(28))
  })

  it('moves eq frequency, gain, and Q for the addressed band', async () => {
    const engine = await playingEngine()
    const eq = engine.insertModule('eq', 0)
    expect(eq).toBeTruthy()
    engine.setEqBand(0, { type: 'peaking', frequency: 1000, gain: 6, q: 1.2, bypassed: false }, eq!)
    const bandId = engine.getSnapshot().eqById[eq!]?.bands[0]?.id
    engine.setFxLfo('eq1', 0, {
      target: 'eq1Freq',
      depth: 50,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: eq!,
      bandId,
    })
    engine.setFxLfo('eq1', 1, {
      target: 'eq1Gain',
      depth: 40,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: eq!,
      bandId,
    })
    engine.setFxLfo('eq1', 2, {
      target: 'eq1Q',
      depth: 40,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: eq!,
      bandId,
    })
    const live = engine.getSnapshot().liveByInstance[eq!]
    expect(live?.eq1Freq).toBeGreaterThan(1000)
    expect(live?.eq1Gain).not.toBeCloseTo(6)
    expect(live?.eq1Q).not.toBeCloseTo(1.2)
    expect(live?.eq1Freq).toBeGreaterThan(20)
  })

  it('modulates filter frequency, delay time, and reverb wet', async () => {
    const engine = await playingEngine()
    const filter = engine.insertModule('filter', 0)
    const delay = engine.insertModule('delay', 1)
    const reverb = engine.insertModule('reverb', 2)
    expect(filter && delay && reverb).toBeTruthy()
    engine.setFxLfo('filter', 0, {
      target: 'filterCutoff',
      depth: 60,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: filter!,
    })
    engine.setFxLfo('delay', 0, {
      target: 'delayTime',
      depth: 50,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: delay!,
    })
    engine.setParam('reverbWet', 40)
    engine.setFxLfo('reverb', 0, {
      target: 'reverbWet',
      depth: 50,
      rateHz: 1,
      shape: 'square',
      enabled: true,
      instanceId: reverb!,
    })
    const snap = engine.getSnapshot()
    expect(snap.liveByInstance[filter!]?.filterCutoff).not.toBeCloseTo(snap.params.filterCutoff)
    expect(snap.liveByInstance[delay!]?.delayTime).not.toBeCloseTo(snap.params.delayTime)
    expect(snap.liveByInstance[reverb!]?.reverbWet).not.toBeCloseTo(snap.params.reverbWet)
    expect(snap.liveByInstance[reverb!]?.reverbWet).toBeGreaterThanOrEqual(0)
    expect(snap.liveByInstance[reverb!]?.reverbWet).toBeLessThanOrEqual(100)
  })
})

const PARAMS_MIN = 0.05
