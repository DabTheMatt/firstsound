import { createDemoActivityProvider, createStaticSnapshotProvider, ActivitySourceError } from './provider'
import type { ActivitySourceErrorCode } from './provider'
import { activitySnapshotUrl, type ActivityDataSource } from './source'
import type { PublicActivitySnapshot } from './snapshot/schema'
import type { ActivitySnapshot } from './types'

export type ActivityLoadError = Exclude<ActivitySourceErrorCode, 'not-implemented'>

export type LoadedActivity =
  | { status: 'ready'; source: 'demo'; snapshot: ActivitySnapshot }
  | { status: 'ready'; source: 'static-snapshot'; snapshot: PublicActivitySnapshot }
  | { status: 'error'; code: ActivityLoadError }

function asLoadError(error: unknown): ActivityLoadError {
  if (error instanceof ActivitySourceError && error.code !== 'not-implemented') return error.code
  return 'unavailable'
}

/** Reads the deployed snapshot. Network and parse failures stay errors. */
export async function readDeployedSnapshot(): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(activitySnapshotUrl(), { cache: 'no-store' })
  } catch {
    throw new ActivitySourceError('unavailable')
  }
  const type = response.headers.get('content-type') ?? ''
  if (response.status === 404 || type.includes('text/html')) throw new ActivitySourceError('missing-snapshot')
  if (!response.ok) throw new ActivitySourceError('unavailable')
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ActivitySourceError('invalid-json')
  }
}

/**
 * Loads the configured source.
 * static-snapshot never falls back to demo, including when readJson throws.
 */
export async function loadActivity(options: {
  source: ActivityDataSource
  now?: Date
  readJson?: () => Promise<unknown>
}): Promise<LoadedActivity> {
  try {
    if (options.source === 'demo') {
      const snapshot = await createDemoActivityProvider(options.now).load()
      return { status: 'ready', source: 'demo', snapshot }
    }
    const snapshot = await createStaticSnapshotProvider(options.readJson ?? readDeployedSnapshot).load()
    return { status: 'ready', source: 'static-snapshot', snapshot }
  } catch (error) {
    return { status: 'error', code: asLoadError(error) }
  }
}
