import { describe, expect, it } from 'vitest'
import { graphSnapshotFrozen, setGraphSnapshot, subscribeGraphSnapshot } from './graphSnapshot'

describe('graph snapshot', () => {
  it('holds and releases without writing storage', () => {
    setGraphSnapshot(false)
    const seen: boolean[] = []
    const stop = subscribeGraphSnapshot((frozen) => seen.push(frozen))
    setGraphSnapshot(true)
    expect(graphSnapshotFrozen()).toBe(true)
    setGraphSnapshot(true)
    setGraphSnapshot(false)
    expect(graphSnapshotFrozen()).toBe(false)
    expect(seen).toEqual([true, false])
    stop()
  })
})
