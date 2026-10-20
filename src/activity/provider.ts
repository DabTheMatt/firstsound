import { createDemoSnapshot } from './demo'
import { parseActivitySnapshot, toPublicActivitySnapshot } from './parse'
import { validatePublicSnapshot } from './snapshot/validate'
import type { PublicActivitySnapshot } from './snapshot/schema'
import type { ActivitySnapshot, ActivitySourceKind } from './types'

/**
 * Data access stays behind this interface.
 * Presentation reads ActivitySnapshot only, never a Drive API payload.
 */
export interface ActivityProvider {
  readonly kind: ActivitySourceKind
  load(): Promise<ActivitySnapshot>
}

export type ActivitySourceErrorCode =
  | 'invalid-snapshot'
  | 'invalid-json'
  | 'missing-snapshot'
  | 'unavailable'
  | 'not-implemented'

export class ActivitySourceError extends Error {
  readonly code: ActivitySourceErrorCode

  constructor(code: ActivitySourceErrorCode) {
    super(code)
    this.name = 'ActivitySourceError'
    this.code = code
  }
}

export function createDemoActivityProvider(now: Date = new Date()): ActivityProvider {
  return {
    kind: 'demo',
    load() {
      return Promise.resolve(createDemoSnapshot(now))
    },
  }
}

/** A published JSON snapshot. Private fields are dropped before the snapshot is returned. */
export function createPublishedJsonProvider(readJson: () => Promise<unknown>): ActivityProvider {
  return {
    kind: 'published',
    async load() {
      const parsed = parseActivitySnapshot(await readJson())
      if (!parsed) throw new ActivitySourceError('invalid-snapshot')
      return toPublicActivitySnapshot(parsed)
    },
  }
}

/**
 * STATIC_SNAPSHOT. Reads a validated public JSON document.
 * A failure rejects. It does not return demonstration data.
 */
export function createStaticSnapshotProvider(readJson: () => Promise<unknown>): {
  readonly kind: 'static-snapshot'
  load(): Promise<PublicActivitySnapshot>
} {
  return {
    kind: 'static-snapshot',
    async load() {
      const payload = await readJson()
      const validated = validatePublicSnapshot(payload)
      if (!validated.ok) throw new ActivitySourceError('invalid-snapshot')
      return validated.snapshot
    },
  }
}

/** Reserved for a later Drive reader. This stage does not authenticate or request files. */
export function createDriveActivityProvider(): ActivityProvider {
  return {
    kind: 'drive',
    load() {
      return Promise.reject(new ActivitySourceError('not-implemented'))
    },
  }
}
