import { describe, expect, it } from 'vitest'
import { validatePublicSnapshot } from '../../src/activity/snapshot/validate'
import { decideActivityPublish } from './publishSnapshot.mjs'

const SYNC = '2026-10-21T07:43:03.831Z'

function snapshot(sync = SYNC) {
  return {
    schemaVersion: 1,
    generatedAt: sync,
    timezone: 'Europe/Warsaw',
    activityBasis: 'createdTime',
    synchronization: { status: 'complete', lastSynchronizationAt: sync },
    project: {
      totalStudents: 1,
      activeStudents: 1,
      totalRecordings: 2,
      totalBytes: 10,
      recordingsLast7Days: 2,
      recordingsLast30Days: 2,
      lastSynchronizationAt: sync,
    },
    students: [
      {
        studentId: 'stu_365f3cc304b26f7c',
        displayName: 'Student 365f',
        recordingCount: 2,
        totalBytes: 10,
        lastActivityAt: '2026-10-18T20:02:08.400Z',
      },
    ],
    dailyActivity: [{ date: '2026-10-18', count: 2 }],
  }
}

describe('activity publication gate', () => {
  it('keeps the published file when the export is not valid JSON', () => {
    const current = `${JSON.stringify(snapshot())}\n`
    expect(decideActivityPublish(current, '{', validatePublicSnapshot)).toEqual({
      action: 'keep',
      reason: 'invalid-json',
    })
  })

  it('keeps the published file when the export fails the activity schema', () => {
    const current = snapshot()
    const incoming = snapshot()
    incoming.project.totalRecordings = 9
    incoming.synchronization.status = 'partial'
    const decision = decideActivityPublish(JSON.stringify(current), JSON.stringify(incoming), validatePublicSnapshot)
    expect(decision.action).toBe('keep')
    expect(decision.reason).toBe('invalid')
  })

  it('does not rewrite an export that matches the published snapshot', () => {
    const text = `${JSON.stringify(snapshot())}\n`
    expect(decideActivityPublish(text, text.trim(), validatePublicSnapshot)).toEqual({
      action: 'keep',
      reason: 'unchanged',
    })
  })

  it('replaces the published file only with a newer valid snapshot', () => {
    const nextSync = '2026-10-21T08:43:03.831Z'
    const decision = decideActivityPublish(
      JSON.stringify(snapshot()),
      JSON.stringify(snapshot(nextSync)),
      validatePublicSnapshot,
    )
    expect(decision.action).toBe('replace')
    expect(decision.json).toContain(nextSync)
    expect(validatePublicSnapshot(JSON.parse(decision.json)).ok).toBe(true)
  })
})
