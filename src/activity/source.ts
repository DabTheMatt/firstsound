/**
 * Explicit activity source. STATIC_SNAPSHOT is the publication path.
 * DEMO is available only when this constant is changed on purpose.
 * A failed snapshot load must not switch this value.
 */
export const ACTIVITY_DATA_SOURCE = 'static-snapshot' as const

export type ActivityDataSource = 'demo' | 'static-snapshot'

export const ACTIVITY_SNAPSHOT_FILE = 'activity/snapshot.json'

/** Three missed 60-minute synchronizations. */
export const SNAPSHOT_STALE_AFTER_MS = 3 * 60 * 60 * 1000

export function activitySnapshotUrl(): string {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${ACTIVITY_SNAPSHOT_FILE}`
}
