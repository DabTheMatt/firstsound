import { describe, expect, it } from 'vitest'
import { projectDurationOf } from './schedule'
import { bufferCues } from './trackVoice'

describe('per-track loop plan', () => {
  it('repeats a short loop across the longer track without extending the project', () => {
    const project = projectDurationOf([
      { id: 'a', duration: 3, loop: true },
      { id: 'b', duration: 11 },
    ])
    expect(project).toBe(11)
    const cues = bufferCues({
      sourceDuration: 3,
      origin: 0,
      projectDuration: project,
      loop: true,
      direction: 'forward',
    })
    expect(cues).toEqual([{ buffer: 'forward', offset: 0, duration: 11, at: 0, loop: true, loopStart: 0, loopEnd: 3 }])
  })

  it('seeks into the current loop cycle and stops at the project end', () => {
    const cues = bufferCues({
      sourceDuration: 3,
      origin: 10,
      projectDuration: 11,
      loop: true,
      direction: 'forward',
    })
    expect(cues).toEqual([{ buffer: 'forward', offset: 1, duration: 1, at: 0, loop: true, loopStart: 0, loopEnd: 3 }])
  })

  it('lets an unlooped track fall silent after its own source', () => {
    expect(
      bufferCues({
        sourceDuration: 3,
        origin: 0,
        projectDuration: 12,
        loop: false,
        direction: 'forward',
      }),
    ).toEqual([{ buffer: 'forward', offset: 0, duration: 3, at: 0, loop: false, loopStart: 0, loopEnd: 3 }])
    expect(
      bufferCues({
        sourceDuration: 3,
        origin: 4,
        projectDuration: 12,
        loop: false,
        direction: 'forward',
      }),
    ).toEqual([])
  })

  it('keeps a finite duration when every loaded track loops', () => {
    const project = projectDurationOf([
      { id: 'a', duration: 3, loop: true },
      { id: 'b', duration: 8, loop: true },
    ])
    expect(project).toBe(8)
    const cues = bufferCues({
      sourceDuration: 3,
      origin: 0,
      projectDuration: project,
      loop: true,
      direction: 'forward',
    })
    expect(cues[0]?.duration).toBe(8)
    expect(cues[0]?.loop).toBe(true)
  })

  it('plays reverse and ping-pong inside the same project end', () => {
    expect(
      bufferCues({
        sourceDuration: 3,
        origin: 1,
        projectDuration: 11,
        loop: false,
        direction: 'reverse',
      }),
    ).toEqual([{ buffer: 'reverse', offset: 1, duration: 2, at: 0, loop: false, loopStart: 0, loopEnd: 3 }])
    expect(
      bufferCues({
        sourceDuration: 3,
        origin: 0,
        projectDuration: 11,
        loop: false,
        direction: 'pingpong',
      }),
    ).toEqual([{ buffer: 'pingpong', offset: 0, duration: 6, at: 0, loop: false, loopStart: 0, loopEnd: 6 }])
    expect(
      bufferCues({
        sourceDuration: 3,
        origin: 0,
        projectDuration: 11,
        loop: true,
        direction: 'pingpong',
      })[0],
    ).toMatchObject({ buffer: 'pingpong', offset: 0, duration: 11, loop: true })
  })
})
