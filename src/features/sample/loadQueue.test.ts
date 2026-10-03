import { describe, expect, it } from 'vitest'
import { beginTrackLoad, isLatestTrackLoad, resetTrackLoadQueue } from './loadQueue'

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
})
