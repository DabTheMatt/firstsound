import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIELD_ACCOUNT_AUTH, FIELD_ACCOUNT_STORAGE_KEY, getSupabaseClient } from './client'
import type { SupabaseEnv } from './config'

const READY: SupabaseEnv = {
  url: 'https://example.supabase.co',
  publishableKey: 'sb_publishable_test_key',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getSupabaseClient', () => {
  it('returns null and does not call the network when Supabase is disabled', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(getSupabaseClient({ url: undefined, publishableKey: undefined })).toBeNull()
    expect(getSupabaseClient({ url: 'not a url', publishableKey: 'sb_secret_nope' })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('builds one lazy client with a session store ready for a later sign-in', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const first = getSupabaseClient(READY)
    const second = getSupabaseClient(READY)

    expect(first).not.toBeNull()
    expect(second).toBe(first)
    expect(typeof first?.auth.getSession).toBe('function')
    expect(typeof first?.auth.onAuthStateChange).toBe('function')
    expect(typeof first?.auth.signInWithPassword).toBe('function')
    expect(typeof first?.auth.signOut).toBe('function')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the auth options that a later sign-in screen will use', () => {
    expect(FIELD_ACCOUNT_AUTH).toEqual({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: FIELD_ACCOUNT_STORAGE_KEY,
    })
    expect(FIELD_ACCOUNT_STORAGE_KEY).toBe('field-account')
  })
})
