import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { PARAMS } from '../parameters/definitions'
import { resolveTrackParamKey } from '../mix/trackRack'
import { AudioEngine } from './AudioEngine'

function tone(channels: number, sampleRate: number, seconds: number, value: number): Float32Array[] {
  const frames = Math.round(seconds * sampleRate)
  return Array.from({ length: channels }, () => {
    const data = new Float32Array(frames)
    data.fill(value)
    return data
  })
}

describe('independent per-track effect chains', () => {
  it('keeps inserts, parameters, bypass, and presets on the edited track', () => {
    const engine = new AudioEngine()
    const [a, b, c] = engine.getSnapshot().tracks
    engine.selectTrack(a!.id)
    expect(engine.insertModule('eq', 0)).toBeTruthy()
    engine.setParam('eq1Freq', 200)
    engine.setParam('eq1Gain', 12)
    engine.selectTrack(b!.id)
    expect(engine.getSnapshot().chain.filter((mod) => mod.type === 'eq')).toHaveLength(0)
    expect(engine.getSnapshot().params.eq1Gain).toBe(PARAMS.eq1Gain.defaultValue)
    expect(engine.insertModule('delay', 0)).toBeTruthy()
    expect(engine.insertModule('reverb', 1)).toBeTruthy()
    engine.setParam('delayWet', 40)
    engine.setParam('reverbWet', 55)
    engine.selectTrack(c!.id)
    expect(engine.getSnapshot().trackFxCounts[a!.id]).toBe(1)
    expect(engine.getSnapshot().trackFxCounts[b!.id]).toBe(2)
    expect(engine.getSnapshot().trackFxCounts[c!.id]).toBe(0)

    engine.selectTrack(a!.id)
    const eq = engine.getSnapshot().chain.find((mod) => mod.type === 'eq')
    expect(eq).toBeTruthy()
    expect(engine.getSnapshot().params.eq1Freq).toBe(200)
    expect(engine.getSnapshot().params.eq1Gain).toBe(12)
    expect(engine.getSnapshot().params.delayWet).toBe(PARAMS.delayWet.defaultValue)
    engine.setModuleBypass(eq!.instanceId, true)
    expect(engine.getSnapshot().chain.find((mod) => mod.instanceId === eq!.instanceId)?.bypassed).toBe(true)

    engine.selectTrack(b!.id)
    expect(engine.getSnapshot().params.delayWet).toBe(40)
    expect(engine.getSnapshot().params.reverbWet).toBe(55)
    const beforeA = resolveTrackParamKey(a!.id, engine.getSnapshot().chain, 'delayWet')
    engine.selectTrack(a!.id)
    const keyA = resolveTrackParamKey(
      a!.id,
      engine.getSnapshot().chain,
      'eq1Freq',
      engine.getSnapshot().eqBands,
    )
    engine.selectTrack(b!.id)
    const keyB = resolveTrackParamKey(b!.id, engine.getSnapshot().chain, 'delayWet')
    expect(keyA).not.toBe(keyB)
    expect(beforeA).not.toBe(keyA)

    engine.reorderModules(1, 2)
    engine.selectTrack(a!.id)
    expect(engine.getSnapshot().chain.findIndex((mod) => mod.type === 'eq')).toBe(1)
    expect(engine.getSnapshot().params.eq1Gain).toBe(12)
  })

  it('preserves a track chain when audio is replaced and clears it with the slot', () => {
    const engine = new AudioEngine()
    const track = engine.getSnapshot().tracks[1]!
    engine.selectTrack(track.id)
    engine.insertModule('eq', 0)
    engine.insertModule('reverb', 1)
    engine.setParam('reverbWet', 22)
    expect(engine.loadTrackPcm(track.id, tone(1, 44100, 0.2, 0.2), 44100, 'first.wav')).toBe(true)
    expect(engine.loadTrackPcm(track.id, tone(1, 44100, 0.3, 0.1), 44100, 'second.wav')).toBe(true)
    const loaded = engine.getSnapshot()
    expect(loaded.tracks.find((item) => item.id === track.id)?.fileName).toBe('second.wav')
    expect(loaded.chain.filter((mod) => mod.type === 'eq' || mod.type === 'reverb')).toHaveLength(2)
    expect(loaded.params.reverbWet).toBe(22)

    engine.clearTrack(track.id)
    const cleared = engine.getSnapshot()
    expect(cleared.tracks.find((item) => item.id === track.id)?.fileName).toBeNull()
    expect(cleared.trackFxCounts[track.id]).toBe(0)
    expect(cleared.chain.some((mod) => mod.type === 'reverb')).toBe(false)
  })

  it('follows the track when the lane order changes and restores every rack', () => {
    const engine = new AudioEngine()
    const tracks = engine.getSnapshot().tracks
    engine.selectTrack(tracks[3]!.id)
    engine.insertModule('filter', 0)
    engine.setParam('filterCutoff', 900)
    engine.reorderTracks(3, 0)
    const moved = engine.getSnapshot().tracks[0]
    expect(moved?.id).toBe(tracks[3]!.id)
    engine.selectTrack(moved!.id)
    expect(engine.getSnapshot().chain.some((mod) => mod.type === 'filter')).toBe(true)
    expect(engine.getSnapshot().params.filterCutoff).toBe(900)

    engine.selectTrack(tracks[0]!.id)
    engine.insertModule('distortion', 0)
    engine.setParam('saturation', 40)
    engine.setParam('outputGain', -6)
    const preset = engine.toPreset()
    engine.selectTrack(tracks[1]!.id)
    engine.setParam('outputGain', 0)
    engine.resetAll()
    engine.applyPreset(preset)
    engine.selectTrack(tracks[3]!.id)
    expect(engine.getSnapshot().chain.some((mod) => mod.type === 'filter')).toBe(true)
    expect(engine.getSnapshot().params.filterCutoff).toBe(900)
    engine.selectTrack(tracks[0]!.id)
    expect(engine.getSnapshot().chain.some((mod) => mod.type === 'distortion')).toBe(true)
    expect(engine.getSnapshot().params.saturation).toBe(40)
    expect(engine.getSnapshot().params.outputGain).toBe(-6)
    engine.selectTrack(tracks[1]!.id)
    expect(engine.getSnapshot().params.outputGain).toBe(-6)
    expect(engine.getSnapshot().chain.some((mod) => mod.type === 'distortion')).toBe(false)
  })

  it('builds a DSP slot map per track and leaves the others in place', async () => {
    const engine = new AudioEngine()
    const [a, b] = engine.getSnapshot().tracks
    await engine.unlock()
    const initial = engine.getSnapshot().trackSlotCounts
    expect(initial[a!.id]).toBeGreaterThan(0)
    expect(initial[b!.id]).toBe(initial[a!.id])
    engine.selectTrack(b!.id)
    engine.insertModule('eq', 0)
    const next = engine.getSnapshot().trackSlotCounts
    expect(next[b!.id]).toBe((initial[b!.id] ?? 0) + 1)
    expect(next[a!.id]).toBe(initial[a!.id])
    engine.selectTrack(a!.id)
    expect(engine.getSnapshot().trackSlotCounts[a!.id]).toBe(initial[a!.id])
    expect(engine.getSnapshot().chain.some((mod) => mod.type === 'eq')).toBe(false)
  })
})
