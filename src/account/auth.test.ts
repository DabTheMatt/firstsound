import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { accountIdentityFromSession, getAccountAuth } from './auth'

describe('account auth seam', () => {
  it('returns null when no client is available', () => {
    expect(getAccountAuth(null)).toBeNull()
  })

  it('returns the client auth handle without calling it', () => {
    const auth = { getSession() {} }
    const client = { auth } as unknown as SupabaseClient
    expect(getAccountAuth(client)).toBe(auth)
  })

  it('maps a session to an identity and ignores an empty session', () => {
    expect(accountIdentityFromSession(null)).toBeNull()
    expect(accountIdentityFromSession({ user: { id: '' } })).toBeNull()
    expect(accountIdentityFromSession({ user: { id: 'user-1', email: 'a@example.com' } })).toEqual({
      id: 'user-1',
      email: 'a@example.com',
    })
    expect(accountIdentityFromSession({ user: { id: 'user-2' } })).toEqual({
      id: 'user-2',
      email: null,
    })
  })
})
