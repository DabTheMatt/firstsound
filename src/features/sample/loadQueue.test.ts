import { describe, expect, it } from 'vitest'
import { beginTrackLoad, isLatestTrackLoad, resetTrackLoadQueue } from './loadQueue'
import { releaseFileInput } from './loadTrack'

describe('track load queue', () => {
  it('keeps only the latest selection for a track', () => {
    resetTrackLoadQueue()
    const first = beginTrackLoad('track-2')
    const second = beginTrackLoad('track-2')
    expect(isLatestTrackLoad('track-2', first)).toBe(false)
    expect(isLatestTrackLoad('track-2', second)).toBe(true)
  })

  it('does not let one track cancel another', () => {
    resetTrackLoadQueue()
    const a = beginTrackLoad('track-1')
    const b = beginTrackLoad('track-3')
    expect(isLatestTrackLoad('track-1', a)).toBe(true)
    expect(isLatestTrackLoad('track-3', b)).toBe(true)
  })

  it('clears the file input after a read so the same file can load again', () => {
    const input = { value: 'C:\\samples\\rain.wav' } as HTMLInputElement
    releaseFileInput(input)
    expect(input.value).toBe('')
    releaseFileInput(null)
  })
})
