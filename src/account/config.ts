/**
 * Reads the optional FIELD account configuration.
 * Missing values leave the account disabled. They are not an error.
 */

export type SupabaseEnv = {
  url: string | undefined
  publishableKey: string | undefined
}

export type SupabaseConfig =
  | { status: 'disabled' }
  | { status: 'invalid'; reason: SupabaseConfigProblem }
  | { status: 'ready'; url: string; publishableKey: string }

export type SupabaseConfigProblem = 'incomplete' | 'invalid-url' | 'invalid-key' | 'secret-key'

export function readViteSupabaseEnv(): SupabaseEnv {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function readSupabaseConfig(env: SupabaseEnv): SupabaseConfig {
  const url = present(env.url)
  const publishableKey = present(env.publishableKey)

  if (!url && !publishableKey) return { status: 'disabled' }
  if (publishableKey && isSecretKey(publishableKey)) return { status: 'invalid', reason: 'secret-key' }
  if (!url || !publishableKey) return { status: 'invalid', reason: 'incomplete' }
  if (!isHttpUrl(url)) return { status: 'invalid', reason: 'invalid-url' }
  if (!isPublishableKey(publishableKey)) return { status: 'invalid', reason: 'invalid-key' }

  return { status: 'ready', url, publishableKey }
}

function present(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** A browser client may hold a publishable key or a legacy anon JWT, never a server secret. */
function isSecretKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true
  return jwtRole(value) === 'service_role'
}

function isPublishableKey(value: string): boolean {
  if (/\s/.test(value)) return false
  return value.startsWith('sb_publishable_') || jwtRole(value) === 'anon'
}

function jwtRole(value: string): string | undefined {
  const parts = value.split('.')
  if (parts.length !== 3) return undefined
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : undefined
  } catch {
    return undefined
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return atob(padded)
}
