import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { plannedExportTarget } from './exportTail'
import { AudioEngine } from './AudioEngine'

function tone(channels: number, sampleRate: number, seconds: number, value: number): Float32Array[] {
  const frames = Math.round(seconds * sampleRate)
  return Array.from({ length: channels }, () => {
    const data = new Float32Array(frames)
    data.fill(value)
    return data
  })
}

describe('multi-track foundation', () => {
  it('keeps independent buffers, order, and display state on stable ids', () => {
    const engine = new AudioEngine()
    const ids = engine.getSnapshot().tracks.map((track) => track.id)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)

    expect(engine.loadTrackPcm(ids[0]!, tone(2, 44100, 0.4, 0.2), 44100, 'stereo.wav')).toBe(true)
    expect(engine.loadTrackPcm(ids[1]!, tone(1, 48000, 0.2, 0.3), 48000, 'mono.wav')).toBe(true)
    expect(engine.loadTrackPcm(ids[2]!, tone(2, 22050, 0.8, 0.1), 22050, 'wide.wav')).toBe(true)
    expect(engine.loadTrackPcm(ids[3]!, tone(1, 44100, 0.15, 0.4), 44100, 'click.wav')).toBe(true)

    expect(engine.getTrackBuffer(ids[0]!)?.numberOfChannels).toBe(2)
    expect(engine.getTrackBuffer(ids[1]!)?.numberOfChannels).toBe(1)
    expect(engine.getTrackBuffer(ids[1]!)?.sampleRate).toBe(48000)
    expect(engine.getTrackBuffer(ids[2]!)?.sampleRate).toBe(22050)
    expect(engine.getProjectDuration()).toBeCloseTo(0.8)

    engine.setTrack(ids[1]!, { mix: 40 })
    expect(engine.getSnapshot().tracks[1]?.mix).toBe(40)
    expect(engine.getSnapshot().tracks[0]?.mix).toBe(100)

    engine.setTrack(ids[2]!, { name: 'birds', color: 'warm' })
    const beforeMove = engine.getTrackBuffer(ids[2]!)
    engine.reorderTracks(2, 0)
    const moved = engine.getSnapshot().tracks[0]
    expect(moved?.id).toBe(ids[2])
    expect(moved?.name).toBe('birds')
    expect(moved?.color).toBe('warm')
    expect(engine.getTrackBuffer(ids[2]!)).toBe(beforeMove)
    expect(engine.getSnapshot().tracks.map((track) => track.id)).toEqual([ids[2], ids[0], ids[1], ids[3]])

    const stereo = engine.getTrackBuffer(ids[0]!)
    engine.setTrack(ids[0]!, { stereoDisplay: 'split' })
    expect(engine.getTrackBuffer(ids[0]!)).toBe(stereo)
    expect(engine.getSnapshot().tracks.find((track) => track.id === ids[0])?.stereoDisplay).toBe('split')

    engine.clearTrack(ids[1]!)
    expect(engine.getTrackBuffer(ids[1]!)).toBeNull()
    expect(engine.getSnapshot().tracks.map((track) => track.id)).toEqual([ids[2], ids[0], ids[1], ids[3]])
    expect(engine.getTrackBuffer(ids[0]!)?.numberOfChannels).toBe(2)
    expect(engine.getTrackBuffer(ids[2]!)?.sampleRate).toBe(22050)
  })

  it('keeps a user name when the file is replaced', () => {
    const engine = new AudioEngine()
    const id = engine.getSnapshot().tracks[2]!.id
    engine.setTrack(id, { name: 'room' })
    expect(engine.loadTrackPcm(id, tone(1, 44100, 0.1, 0.2), 44100, 'street.wav')).toBe(true)
    const track = engine.getSnapshot().tracks.find((item) => item.id === id)
    expect(track?.name).toBe('room')
    expect(track?.nameLocked).toBe(true)
    expect(track?.fileName).toBe('street.wav')
    expect(track?.channelCount).toBe(1)
  })

  it('changes the editing target without dropping the other buffer', () => {
    const engine = new AudioEngine()
    const [first, second] = engine.getSnapshot().tracks
    engine.loadTrackPcm(first!.id, tone(1, 44100, 0.3, 0.2), 44100, 'a.wav')
    engine.loadTrackPcm(second!.id, tone(2, 44100, 0.5, 0.2), 44100, 'b.wav')
    engine.selectTrack(second!.id)
    expect(engine.getSnapshot().selectedTrackId).toBe(second!.id)
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getTrackBuffer(first!.id)?.numberOfChannels).toBe(1)
    expect(engine.getBuffer()?.numberOfChannels).toBe(2)
    expect(plannedExportTarget('selection', second!.id)).toEqual({ kind: 'selection', trackId: second!.id })
    expect(plannedExportTarget('project', second!.id)).toEqual({ kind: 'track', trackId: second!.id })
  })
})
