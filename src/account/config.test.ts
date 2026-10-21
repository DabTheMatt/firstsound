import { describe, expect, it } from 'vitest'
import { readSupabaseConfig, readViteSupabaseEnv, type SupabaseEnv } from './config'

const PUBLISHABLE = 'sb_publishable_test_key'
const URL = 'https://example.supabase.co'

function jwt(role: string): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ role })}.signature`
}

function env(partial: Partial<SupabaseEnv> = {}): SupabaseEnv {
  return { url: undefined, publishableKey: undefined, ...partial }
}

describe('readSupabaseConfig', () => {
  it('stays disabled when both variables are missing', () => {
    expect(readSupabaseConfig(env())).toEqual({ status: 'disabled' })
    expect(readSupabaseConfig(env({ url: '   ', publishableKey: '' }))).toEqual({ status: 'disabled' })
  })

  it('rejects a half-filled configuration', () => {
    expect(readSupabaseConfig(env({ url: URL }))).toEqual({ status: 'invalid', reason: 'incomplete' })
    expect(readSupabaseConfig(env({ publishableKey: PUBLISHABLE }))).toEqual({
      status: 'invalid',
      reason: 'incomplete',
    })
  })

  it('accepts a publishable key and a legacy anon JWT', () => {
    expect(readSupabaseConfig(env({ url: `  ${URL}  `, publishableKey: `  ${PUBLISHABLE}  ` }))).toEqual({
      status: 'ready',
      url: URL,
      publishableKey: PUBLISHABLE,
    })
    expect(readSupabaseConfig(env({ url: 'http://127.0.0.1:54321', publishableKey: jwt('anon') }))).toMatchObject({
      status: 'ready',
      url: 'http://127.0.0.1:54321',
    })
  })

  it('rejects a URL the Supabase client would reject', () => {
    expect(readSupabaseConfig(env({ url: 'ftp://example.com', publishableKey: PUBLISHABLE })).status).toBe('invalid')
    expect(readSupabaseConfig(env({ url: 'example.supabase.co', publishableKey: PUBLISHABLE }))).toEqual({
      status: 'invalid',
      reason: 'invalid-url',
    })
  })

  it('refuses a secret or service-role key', () => {
    expect(readSupabaseConfig(env({ publishableKey: 'sb_secret_test' }))).toEqual({
      status: 'invalid',
      reason: 'secret-key',
    })
    expect(readSupabaseConfig(env({ url: URL, publishableKey: 'sb_secret_test' }))).toEqual({
      status: 'invalid',
      reason: 'secret-key',
    })
    expect(readSupabaseConfig(env({ url: URL, publishableKey: jwt('service_role') }))).toEqual({
      status: 'invalid',
      reason: 'secret-key',
    })
  })

  it('rejects a key that is neither publishable nor an anon JWT', () => {
    expect(readSupabaseConfig(env({ url: URL, publishableKey: 'not-a-key' }))).toEqual({
      status: 'invalid',
      reason: 'invalid-key',
    })
  })

  it('reads the Vite variable names without throwing', () => {
    const current = readViteSupabaseEnv()
    expect(current).toHaveProperty('url')
    expect(current).toHaveProperty('publishableKey')
    expect(['disabled', 'invalid', 'ready']).toContain(readSupabaseConfig(current).status)
  })
})
