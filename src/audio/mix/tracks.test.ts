import { describe, expect, it } from 'vitest'
import {
  addTrack,
  defaultTracks,
  duplicateTrack,
  MAX_TRACKS,
  parseTracks,
  patchTrack,
  removeTrack,
  trackMixGain,
} from './tracks'

describe('mix tracks', () => {
  it('starts with one track at unity mix', () => {
    const tracks = defaultTracks(0.1, 1.2)
    expect(tracks).toHaveLength(1)
    expect(tracks[0]?.name).toBe('Track 1')
    expect(tracks[0]?.mix).toBe(100)
    expect(tracks[0]?.start).toBe(0.1)
    expect(tracks[0]?.end).toBe(1.2)
    expect(trackMixGain(tracks[0]!, tracks)).toBe(1)
  })

  it('adds a track that copies the current region', () => {
    const next = addTrack(defaultTracks(0, 2), 0.4, 1.1)
    expect(next).toHaveLength(2)
    expect(next[1]?.start).toBe(0.4)
    expect(next[1]?.end).toBe(1.1)
    expect(next[1]?.mix).toBe(100)
  })

  it('keeps soloed tracks and mutes the rest', () => {
    let tracks = addTrack(defaultTracks(), 0, 1)
    tracks = patchTrack(tracks, tracks[1]!.id, { solo: true, mix: 40 })
    expect(trackMixGain(tracks[0]!, tracks)).toBe(0)
    expect(trackMixGain(tracks[1]!, tracks)).toBeCloseTo(0.4)
  })

  it('refuses to drop the last track', () => {
    const tracks = defaultTracks()
    expect(removeTrack(tracks, tracks[0]!.id)).toHaveLength(1)
  })

  it('caps the desk size', () => {
    let tracks = defaultTracks()
    for (let i = 0; i < 10; i++) tracks = addTrack(tracks, 0, 1)
    expect(tracks.length).toBe(MAX_TRACKS)
  })

  it('duplicates a track with its region and mix', () => {
    let tracks = patchTrack(defaultTracks(0.2, 0.8), 'track-1', { mix: 70 })
    const next = duplicateTrack(tracks, 'track-1')
    expect(next).toHaveLength(2)
    expect(next[1]?.mix).toBe(70)
    expect(next[1]?.start).toBe(0.2)
    expect(next[1]?.end).toBe(0.8)
    expect(next[1]?.id).not.toBe(next[0]?.id)
  })

  it('round-trips a saved desk', () => {
    const tracks = addTrack(defaultTracks(0, 3), 1, 2)
    const parsed = parseTracks(JSON.parse(JSON.stringify(tracks)))
    expect(parsed).toEqual(tracks)
  })

  it('reads a legacy mix-layer snapshot as tracks', () => {
    const parsed = parseTracks([
      { id: 'layer-1', name: 'Original', mix: 100, muted: false, solo: false, insert: 'delay' },
    ])
    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.id).toBe('layer-1')
    expect(parsed?.[0]?.name).toBe('Original')
    expect(parsed?.[0]?.start).toBe(0)
    expect(parsed?.[0]?.end).toBe(0)
  })

  it('rejects a malformed desk', () => {
    expect(parseTracks([{ name: 'x' }])).toBeNull()
    expect(parseTracks([])).toBeNull()
  })
})
