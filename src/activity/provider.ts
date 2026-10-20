import { createDemoSnapshot } from './demo'
import { parseActivitySnapshot, toPublicActivitySnapshot } from './parse'
import type { ActivitySnapshot, ActivitySourceKind } from './types'

/**
 * Data access stays behind this interface.
 * Presentation reads ActivitySnapshot only, never a Drive API payload.
 */
export interface ActivityProvider {
  readonly kind: ActivitySourceKind
  load(): Promise<ActivitySnapshot>
}

export class ActivitySourceError extends Error {
  readonly code: 'invalid-snapshot' | 'not-implemented'

  constructor(code: 'invalid-snapshot' | 'not-implemented') {
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

/** Reserved for a later Drive reader. This stage does not authenticate or request files. */
export function createDriveActivityProvider(): ActivityProvider {
  return {
    kind: 'drive',
    load() {
      return Promise.reject(new ActivitySourceError('not-implemented'))
    },
  }
}
