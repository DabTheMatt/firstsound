import { describe, expect, it } from 'vitest'
import {
  formatLoopReadout,
  loopBounds,
  playheadProjectRatio,
  resolveTrackPlayback,
  dragLoopRegion,
  selectionAsLoop,
  waveformTiles,
  waveformVisualGain,
  type TrackClock,
} from './playback'
import { patchTrack, defaultTracks } from './tracks'

function clock(patch: Partial<TrackClock> = {}): TrackClock {
  return {
    sourceDuration: 10,
    speed: 1,
    direction: 'forward',
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    ...patch,
  }
}

describe('track playback resolver', () => {
  it('maps project time through speed 0.5, 1, and 2', () => {
    expect(resolveTrackPlayback(clock({ speed: 1 }), 2).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(clock({ speed: 2 }), 2).sourceTime).toBeCloseTo(4)
    expect(resolveTrackPlayback(clock({ speed: 0.5 }), 2).sourceTime).toBeCloseTo(1)
    expect(resolveTrackPlayback(clock({ speed: 2 }), 0).passProjectDuration).toBeCloseTo(5)
    expect(resolveTrackPlayback(clock({ speed: 0.5 }), 0).contentProjectDuration).toBeCloseTo(20)
    expect(resolveTrackPlayback(clock({ speed: 1 }), 0).contentProjectDuration).toBeCloseTo(10)
  })

  it('ends an unlooped track when the source is consumed', () => {
    expect(resolveTrackPlayback(clock({ speed: 2 }), 6).ended).toBe(true)
    expect(resolveTrackPlayback(clock({ speed: 2 }), 4).ended).toBe(false)
    expect(resolveTrackPlayback(clock({ speed: 2 }), 4).sourceTime).toBeCloseTo(8)
  })

  it('repeats a custom loop region and counts iterations', () => {
    const looped = clock({ loop: true, loopStart: 2, loopEnd: 5, speed: 1 })
    expect(loopBounds(10, 2, 5)).toEqual({ start: 2, end: 5 })
    expect(resolveTrackPlayback(looped, 0).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(looped, 3).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(looped, 3).iteration).toBe(1)
    expect(resolveTrackPlayback(looped, 1.5).sourceTime).toBeCloseTo(3.5)
    expect(resolveTrackPlayback(looped, 4).ended).toBe(false)
  })

  it('uses the whole source when the stored loop span is empty', () => {
    const looped = clock({ loop: true, loopStart: 0, loopEnd: 0 })
    expect(resolveTrackPlayback(looped, 12).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(looped, 12).iteration).toBe(1)
  })

  it('walks reverse and ping-pong', () => {
    const reverse = clock({ direction: 'reverse', speed: 1 })
    expect(resolveTrackPlayback(reverse, 0).sourceTime).toBeCloseTo(10)
    expect(resolveTrackPlayback(reverse, 0).playDirection).toBe(-1)
    expect(resolveTrackPlayback(reverse, 4).sourceTime).toBeCloseTo(6)
    const pong = clock({ direction: 'pingpong', speed: 2 })
    expect(resolveTrackPlayback(pong, 0).sourceTime).toBeCloseTo(0)
    expect(resolveTrackPlayback(pong, 2.5).playDirection).toBe(1)
    expect(resolveTrackPlayback(pong, 2.5).sourceTime).toBeCloseTo(5)
    expect(resolveTrackPlayback(pong, 6).playDirection).toBe(-1)
    expect(resolveTrackPlayback(pong, 6).sourceTime).toBeCloseTo(8)
    expect(resolveTrackPlayback(pong, 11).ended).toBe(true)
  })

  it('loops ping-pong inside the custom region', () => {
    const pong = clock({ direction: 'pingpong', loop: true, loopStart: 2, loopEnd: 6, speed: 1 })
    expect(resolveTrackPlayback(pong, 0).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(pong, 5).playDirection).toBe(-1)
    expect(resolveTrackPlayback(pong, 5).sourceTime).toBeCloseTo(5)
    expect(resolveTrackPlayback(pong, 8).sourceTime).toBeCloseTo(2)
    expect(resolveTrackPlayback(pong, 8).iteration).toBe(1)
  })

  it('draws speed and loop into project-time tiles', () => {
    const half = waveformTiles(clock({ speed: 2 }), 10)
    expect(half).toHaveLength(1)
    expect(half[0]?.projectEnd).toBeCloseTo(5)
    expect(half[0]?.sourceEnd).toBeCloseTo(10)
    const slow = waveformTiles(clock({ speed: 0.5 }), 10)
    expect(slow[0]?.projectEnd).toBeCloseTo(10)
    expect(slow[0]?.sourceEnd).toBeCloseTo(5)
    const looped = waveformTiles(clock({ loop: true, loopStart: 2, loopEnd: 5, speed: 1 }), 10)
    expect(looped.length).toBeGreaterThan(2)
    expect(looped[0]).toMatchObject({ projectStart: 0, projectEnd: 3, sourceStart: 2, sourceEnd: 5 })
    expect(looped[1]?.sourceStart).toBeCloseTo(2)
    expect(looped.at(-1)!.projectEnd).toBeCloseTo(10)
  })

  it('parks a finished playhead and keeps a looping one on the transport', () => {
    expect(playheadProjectRatio(clock({ speed: 2 }), 8, 10)).toBeCloseTo(0.5)
    expect(playheadProjectRatio(clock({ speed: 1, loop: true }), 8, 10)).toBeCloseTo(0.8)
  })

  it('converts input gain in decibels to linear visual gain', () => {
    expect(waveformVisualGain(-12)).toBeCloseTo(10 ** (-12 / 20))
    expect(waveformVisualGain(0)).toBeCloseTo(1)
    expect(waveformVisualGain(12)).toBeCloseTo(10 ** (12 / 20))
  })

  it('drags a loop region without letting the handles cross', () => {
    expect(
      dragLoopRegion({ mode: 'start', originStart: 2, originEnd: 5, deltaSource: 1, sourceDuration: 10 }),
    ).toEqual({ loopStart: 3, loopEnd: 5 })
    expect(
      dragLoopRegion({ mode: 'end', originStart: 2, originEnd: 5, deltaSource: -4, sourceDuration: 10 }).loopEnd,
    ).toBeGreaterThan(2)
    const slid = dragLoopRegion({ mode: 'body', originStart: 2, originEnd: 5, deltaSource: 4, sourceDuration: 10 })
    expect(slid.loopEnd - slid.loopStart).toBeCloseTo(3)
    expect(slid.loopStart).toBeCloseTo(6)
  })

  it('copies a selection into a loop once', () => {
    expect(selectionAsLoop(2, 5, 10)).toEqual({ loopStart: 2, loopEnd: 5 })
    expect(selectionAsLoop(0, 10, 10)).toBeNull()
    expect(formatLoopReadout(2.4)).toBe('02.400')
    expect(formatLoopReadout(5.8)).toBe('05.800')
  })

  it('patches one track without writing its neighbours', () => {
    const tracks = defaultTracks()
    const next = patchTrack(tracks, tracks[0]!.id, { loop: true, loopStart: 2, loopEnd: 5, mix: 40, color: 'cyan' })
    expect(next[0]?.loopStart).toBe(2)
    expect(next[0]?.mix).toBe(40)
    expect(next[1]).toEqual(tracks[1])
    expect(next[2]?.id).toBe(tracks[2]?.id)
    expect(next.map((track) => track.id)).toEqual(tracks.map((track) => track.id))
  })
})
