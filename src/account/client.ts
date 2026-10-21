import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseConfig, readViteSupabaseEnv, type SupabaseEnv } from './config'

/**
 * Browser storage key for a future FIELD sign-in session.
 * The editor does not read or write this key.
 */
export const FIELD_ACCOUNT_STORAGE_KEY = 'field-account'

/**
 * Auth settings a later sign-in screen can rely on.
 * No screen calls them in this stage.
 */
export const FIELD_ACCOUNT_AUTH = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: FIELD_ACCOUNT_STORAGE_KEY,
} as const

let cached: { signature: string; client: SupabaseClient } | null = null

/**
 * Returns the shared browser client, or null when Supabase is not configured.
 * Construction is lazy: importing this module does not open a connection.
 * Callers must keep working when the result is null.
 */
export function getSupabaseClient(env: SupabaseEnv = readViteSupabaseEnv()): SupabaseClient | null {
  const config = readSupabaseConfig(env)
  if (config.status !== 'ready') return null

  const signature = `${config.url}\0${config.publishableKey}`
  if (cached?.signature === signature) return cached.client

  try {
    const client = createClient(config.url, config.publishableKey, {
      auth: { ...FIELD_ACCOUNT_AUTH },
    })
    cached = { signature, client }
    return client
  } catch {
    return null
  }
}
