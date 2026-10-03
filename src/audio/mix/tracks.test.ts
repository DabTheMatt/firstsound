import { describe, expect, it } from 'vitest'
import { trackMixerParamId } from './mixerParams'
import {
  addTrack,
  clearTrackAudio,
  companionTrackIds,
  defaultTracks,
  duplicateTrack,
  ensureTrackSlots,
  leadVoiceMixGain,
  MAX_TRACKS,
  mixToDbLabel,
  moveTrack,
  outputMixGain,
  parseTracks,
  patchTrack,
  removeTrack,
  sourceTrackName,
  trackAudible,
  trackMixGain,
  trackNameAfterLoad,
} from './tracks'

describe('mix tracks', () => {
  it('opens four empty slots with distinct ids and theme colors', () => {
    const tracks = defaultTracks(0.1, 1.2)
    expect(tracks).toHaveLength(MAX_TRACKS)
    expect(new Set(tracks.map((track) => track.id)).size).toBe(MAX_TRACKS)
    expect(new Set(tracks.map((track) => track.color)).size).toBe(MAX_TRACKS)
    expect(tracks.map((track) => track.color).slice(0, 4)).toEqual(['amber', 'cyan', 'green', 'violet'])
    expect(tracks[0]?.name).toBe('Track 1')
    expect(tracks[0]?.mix).toBe(100)
    expect(tracks[0]?.nameLocked).toBe(false)
    expect(tracks[0]?.channelCount).toBe(0)
    expect(trackMixGain(tracks[0]!, tracks)).toBe(1)
    expect(mixToDbLabel(100)).toBe('0 dB')
  })

  it('does not grow past the slot cap', () => {
    let tracks = defaultTracks()
    for (let i = 0; i < 10; i++) tracks = addTrack(tracks, 0, 1)
    expect(tracks).toHaveLength(MAX_TRACKS)
  })

  it('pads a legacy single strip up to the slot count', () => {
    const parsed = parseTracks([
      { id: 'layer-1', name: 'Original', mix: 100, muted: false, solo: false, insert: 'delay' },
    ])
    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.id).toBe('layer-1')
    const slots = ensureTrackSlots(parsed ?? [])
    expect(slots).toHaveLength(MAX_TRACKS)
    expect(slots[0]?.id).toBe('layer-1')
    expect(slots[0]?.name).toBe('Original')
    expect(new Set(slots.map((track) => track.id)).size).toBe(MAX_TRACKS)
  })

  it('keeps soloed tracks and mutes the rest', () => {
    let tracks = addTrack(defaultTracks().slice(0, 1), 0, 1)
    tracks = patchTrack(tracks, tracks[1]!.id, { solo: true, mix: 40 })
    expect(trackMixGain(tracks[0]!, tracks)).toBe(0)
    expect(trackMixGain(tracks[1]!, tracks)).toBeCloseTo(0.4)
  })

  it('keeps a loud soloed track audible when another soloed strip is at mix 0', () => {
    let tracks = addTrack(defaultTracks().slice(0, 1), 0, 1)
    tracks = patchTrack(tracks, tracks[0]!.id, { solo: true, mix: 0 })
    tracks = patchTrack(tracks, tracks[1]!.id, { solo: true, mix: 150 })
    expect(trackMixGain(tracks[0]!, tracks)).toBe(0)
    expect(trackMixGain(tracks[1]!, tracks)).toBeCloseTo(1.5)
    expect(companionTrackIds(tracks, tracks[1]!.id)).toEqual([])
    expect(companionTrackIds(tracks, tracks[0]!.id)).toEqual([tracks[1]!.id])
    expect(leadVoiceMixGain(tracks, tracks[1]!.id)).toBeCloseTo(1.5)
    expect(leadVoiceMixGain(tracks, tracks[0]!.id)).toBe(0)
  })

  it('clears a slot without shifting the others', () => {
    let tracks = defaultTracks()
    const third = tracks[2]!
    tracks = patchTrack(tracks, tracks[0]!.id, { fileName: 'rain.wav', channelCount: 2, name: 'rain', nameLocked: false })
    tracks = patchTrack(tracks, tracks[1]!.id, { fileName: 'wind.wav', channelCount: 1 })
    tracks = clearTrackAudio(tracks, tracks[0]!.id)
    expect(tracks).toHaveLength(MAX_TRACKS)
    expect(tracks[0]?.id).toBe('track-1')
    expect(tracks[0]?.fileName).toBeNull()
    expect(tracks[0]?.channelCount).toBe(0)
    expect(tracks[1]?.fileName).toBe('wind.wav')
    expect(tracks[2]?.id).toBe(third.id)
    expect(removeTrack(tracks, tracks[1]!.id)[2]?.id).toBe(third.id)
  })

  it('moves a track without swapping its identity', () => {
    let tracks = defaultTracks()
    tracks = patchTrack(tracks, 'track-3', {
      name: 'birds',
      nameLocked: true,
      color: 'magenta',
      mix: 80,
      fileName: 'birds.wav',
      channelCount: 1,
    })
    const moved = moveTrack(tracks, 2, 0)
    expect(moved[0]?.id).toBe('track-3')
    expect(moved[0]?.name).toBe('birds')
    expect(moved[0]?.color).toBe('magenta')
    expect(moved[0]?.mix).toBe(80)
    expect(moved[0]?.fileName).toBe('birds.wav')
    expect(moved[1]?.id).toBe('track-1')
    expect(moved[2]?.id).toBe('track-2')
  })

  it('keeps a user name when the file changes', () => {
    const tracks = patchTrack(defaultTracks(), 'track-1', { name: 'room', nameLocked: true })
    expect(trackNameAfterLoad(tracks[0]!, 'street.wav')).toEqual({ name: 'room', nameLocked: true })
    expect(sourceTrackName('street.wav')).toBe('street')
    const fresh = defaultTracks()[0]!
    expect(trackNameAfterLoad(fresh, 'street.wav').name).toBe('street')
  })

  it('duplicates a shorter desk with its region and mix', () => {
    let tracks = patchTrack(defaultTracks(0.2, 0.8).slice(0, 1), 'track-1', { mix: 70 })
    const next = duplicateTrack(tracks, 'track-1')
    expect(next).toHaveLength(2)
    expect(next[1]?.mix).toBe(70)
    expect(next[1]?.start).toBe(0.2)
    expect(next[1]?.end).toBe(0.8)
    expect(next[1]?.id).not.toBe(next[0]?.id)
  })

  it('round-trips color, display, and a locked name', () => {
    let tracks = defaultTracks(0, 3)
    tracks = patchTrack(tracks, 'track-2', {
      name: 'wind',
      nameLocked: true,
      color: 'cyan',
      stereoDisplay: 'split',
      channelCount: 2,
      fileName: 'wind.wav',
      mix: 90,
    })
    const parsed = parseTracks(JSON.parse(JSON.stringify(tracks)))
    expect(parsed).toEqual(tracks)
  })

  it('rejects a malformed desk', () => {
    expect(parseTracks([{ name: 'x' }])).toBeNull()
    expect(parseTracks([])).toBeNull()
  })

  it('maps the output strip to a linear gain', () => {
    expect(outputMixGain(100)).toBe(1)
    expect(outputMixGain(50)).toBe(0.5)
    expect(outputMixGain(150)).toBe(1.5)
    expect(outputMixGain(Number.NaN)).toBe(1)
  })

  it('lets a muted solo still hide the other tracks', () => {
    let tracks = defaultTracks()
    tracks = patchTrack(tracks, 'track-1', { solo: true, muted: true, mix: 100 })
    tracks = patchTrack(tracks, 'track-2', { mix: 80 })
    expect(trackAudible(tracks[0]!, tracks)).toBe(false)
    expect(trackAudible(tracks[1]!, tracks)).toBe(false)
    expect(trackMixGain(tracks[1]!, tracks)).toBe(0)
    tracks = patchTrack(tracks, 'track-1', { solo: false })
    expect(trackAudible(tracks[1]!, tracks)).toBe(true)
    expect(trackMixGain(tracks[1]!, tracks)).toBeCloseTo(0.8)
  })

  it('keeps mixer values on the track id when the lane moves', () => {
    let tracks = defaultTracks()
    tracks = patchTrack(tracks, 'track-3', {
      name: 'birds',
      mix: 50,
      pan: -40,
      midDb: -6,
      sideDb: 3,
      muted: true,
      solo: true,
      channelCount: 2,
    })
    const moved = moveTrack(tracks, 2, 0)
    const track = moved[0]!
    expect(track.id).toBe('track-3')
    expect(track.mix).toBe(50)
    expect(track.pan).toBe(-40)
    expect(track.midDb).toBe(-6)
    expect(track.sideDb).toBe(3)
    expect(track.muted).toBe(true)
    expect(track.solo).toBe(true)
    expect(trackMixerParamId(track.id, 'pan')).toBe('track:track-3:pan')
    expect(trackMixerParamId(moved[2]!.id, 'pan')).not.toBe(trackMixerParamId(track.id, 'pan'))
  })

  it('resets mixer state when the slot is cleared and keeps it across a file replace', () => {
    let tracks = patchTrack(defaultTracks(), 'track-2', {
      mix: 40,
      pan: 25,
      midDb: -3,
      sideDb: 6,
      muted: true,
      solo: true,
      fileName: 'wind.wav',
      channelCount: 2,
      name: 'wind',
      nameLocked: true,
    })
    const replaced = patchTrack(tracks, 'track-2', { fileName: 'room.wav', channelCount: 1 })
    expect(replaced[1]?.mix).toBe(40)
    expect(replaced[1]?.pan).toBe(25)
    expect(replaced[1]?.midDb).toBe(-3)
    expect(replaced[1]?.sideDb).toBe(6)
    expect(replaced[1]?.muted).toBe(true)
    expect(replaced[1]?.solo).toBe(true)
    expect(replaced[1]?.name).toBe('wind')
    const cleared = clearTrackAudio(tracks, 'track-2')
    expect(cleared[1]?.fileName).toBeNull()
    expect(cleared[1]?.mix).toBe(100)
    expect(cleared[1]?.pan).toBe(0)
    expect(cleared[1]?.midDb).toBe(0)
    expect(cleared[1]?.sideDb).toBe(0)
    expect(cleared[1]?.muted).toBe(false)
    expect(cleared[1]?.solo).toBe(false)
    expect(cleared[1]?.name).toBe('wind')
  })

  it('lists audible companions besides the selected track', () => {
    let tracks = addTrack(defaultTracks().slice(0, 1), 0, 1)
    expect(companionTrackIds(tracks, tracks[0]!.id)).toEqual([tracks[1]!.id])
    tracks = patchTrack(tracks, tracks[0]!.id, { muted: true })
    expect(companionTrackIds(tracks, tracks[1]!.id)).toEqual([])
    tracks = patchTrack(tracks, tracks[0]!.id, { muted: false, solo: true })
    expect(companionTrackIds(tracks, tracks[0]!.id)).toEqual([])
  })

  it('keeps a sample name on a saved desk', () => {
    const tracks = patchTrack(defaultTracks(), 'track-1', { fileName: 'kick.wav' })
    const parsed = parseTracks(JSON.parse(JSON.stringify(tracks)))
    expect(parsed?.[0]?.fileName).toBe('kick.wav')
  })
})
