import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'

/**
 * The signed-in person a later account screen can render.
 * This stage does not collect credentials or open a sign-in form.
 */
export type AccountIdentity = {
  id: string
  email: string | null
}

export function accountIdentityFromSession(
  session: { user?: { id?: string; email?: string | null } | null } | null | undefined,
): AccountIdentity | null {
  const id = session?.user?.id
  if (!id) return null
  const email = session.user?.email
  return { id, email: typeof email === 'string' && email.length > 0 ? email : null }
}

/**
 * Supabase Auth handle for a later sign-in screen.
 * Null when the project is not configured. Does not sign anyone in.
 */
export function getAccountAuth(
  client: SupabaseClient | null = getSupabaseClient(),
): SupabaseClient['auth'] | null {
  return client?.auth ?? null
}
