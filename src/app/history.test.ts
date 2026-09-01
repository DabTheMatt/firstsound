import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from './history'

const eq = (a: number, b: number) => a === b

describe('history', () => {
  it('undoes and redoes committed snapshots, ignoring no-ops', () => {
    let h = createHistory(1)
    h = commitHistory(h, 1, eq)
    expect(h.past).toHaveLength(0)
    h = commitHistory(h, 2, eq)
    h = commitHistory(h, 3, eq)
    h = undoHistory(h)
    expect(h.present).toBe(2)
    h = undoHistory(h)
    expect(h.present).toBe(1)
    h = redoHistory(h)
    expect(h.present).toBe(2)
  })
})
