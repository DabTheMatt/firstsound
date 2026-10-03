import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { trackMixerParamId, trackMixerParamValue } from '../mix/mixerParams'
import { AudioEngine } from './AudioEngine'

function tone(channels: number, sampleRate: number, seconds: number, value: number): Float32Array[] {
  const frames = Math.max(1, Math.round(seconds * sampleRate))
  return Array.from({ length: channels }, () => new Float32Array(frames).fill(value))
}

describe('per-track mixer engine', () => {
  it('keeps one strip per track id across mix edits, reorder, replace, and clear', async () => {
    const engine = new AudioEngine()
    await engine.unlock()
    const ids = engine.getSnapshot().tracks.map((track) => track.id)
    expect(engine.loadTrackPcm(ids[0]!, tone(2, 44100, 0.2, 0.2), 44100, 'a.wav')).toBe(true)
    expect(engine.loadTrackPcm(ids[1]!, tone(1, 44100, 0.2, 0.3), 44100, 'b.wav')).toBe(true)
    expect(engine.loadTrackPcm(ids[2]!, tone(2, 44100, 0.2, 0.1), 44100, 'c.wav')).toBe(true)
    engine.setTrack(ids[2]!, { mix: 70, pan: -30, midDb: -6, sideDb: 3, muted: true, solo: true })
    const before = engine.mixerStructureGeneration()
    const meter = engine.getTrackAnalyser(ids[2]!)
    expect(meter).toBeTruthy()

    engine.setTrack(ids[2]!, { mix: 40, pan: 55, midDb: 2, sideDb: -12, muted: false, solo: false })
    engine.setTrack(ids[0]!, { solo: true })
    engine.setTrack(ids[1]!, { solo: true, muted: true })
    expect(engine.mixerStructureGeneration()).toBe(before)
    expect(engine.getTrackAnalyser(ids[2]!)).toBe(meter)

    engine.reorderTracks(2, 0)
    const moved = engine.getSnapshot().tracks[0]!
    expect(moved.id).toBe(ids[2])
    expect(moved.mix).toBe(40)
    expect(moved.pan).toBe(55)
    expect(moved.midDb).toBe(2)
    expect(moved.sideDb).toBe(-12)
    expect(trackMixerParamId(moved.id, 'pan')).toBe('track:track-3:pan')
    expect(trackMixerParamValue(moved, 'volume')).toBe(40)
    expect(engine.getTrackAnalyser(ids[2]!)).toBe(meter)
    expect(engine.mixerStructureGeneration()).toBe(before)

    expect(engine.loadTrackPcm(ids[2]!, tone(1, 44100, 0.15, 0.2), 44100, 'c2.wav')).toBe(true)
    const replaced = engine.getSnapshot().tracks.find((track) => track.id === ids[2])!
    expect(replaced.channelCount).toBe(1)
    expect(replaced.mix).toBe(40)
    expect(replaced.pan).toBe(55)
    expect(replaced.midDb).toBe(2)
    expect(replaced.sideDb).toBe(-12)
    expect(engine.getTrackAnalyser(ids[2]!)).toBe(meter)

    const playing = engine.getSnapshot().playing
    engine.setTrack(ids[0]!, { pan: 10 })
    expect(engine.getSnapshot().playing).toBe(playing)

    engine.clearTrack(ids[2]!)
    const cleared = engine.getSnapshot().tracks.find((track) => track.id === ids[2])!
    expect(engine.getTrackBuffer(ids[2]!)).toBeNull()
    expect(cleared.mix).toBe(100)
    expect(cleared.pan).toBe(0)
    expect(cleared.midDb).toBe(0)
    expect(cleared.sideDb).toBe(0)
    expect(cleared.muted).toBe(false)
    expect(cleared.solo).toBe(false)
    expect(engine.getTrackAnalyser(ids[0]!)).toBeTruthy()
    const snap = engine.processingSnapshot()
    expect(snap.trackMix?.find((track) => track.id === ids[0])?.pan).toBe(10)
    expect(snap.masterGain).toBe(1)
  })
})
