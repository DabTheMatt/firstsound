import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './worker.js'

function post(body: unknown) {
  return new Request('https://feedback.example/post', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://field.example' },
    body: JSON.stringify(body),
  })
}

describe('feedback worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('drops a honeypot fill without calling the mailbox', async () => {
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const response = await worker.fetch(post({ company: 'spam ltd', text: 'hello' }), {})
    expect(response.status).toBe(200)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects an empty note', async () => {
    const response = await worker.fetch(post({ text: '   ', company: '' }), {})
    expect(response.status).toBe(400)
  })

  it('forwards the fixed subject and does not put the secret in the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: 'true' }),
    })
    vi.stubGlobal('fetch', fetchImpl)
    const response = await worker.fetch(
      post({ text: 'Raczej pozytywnie', replyEmail: 'person@example.com', company: '', subject: 'ignore me' }),
      {},
    )
    expect(response.status).toBe(200)
    const target = String(fetchImpl.mock.calls[0]?.[0])
    expect(target).toContain('formsubmit.co')
    const forwarded = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))
    expect(forwarded._subject).toBe('FIELD — opinia użytkownika')
    expect(forwarded.message).toContain('Raczej pozytywnie')
    expect(forwarded._replyto).toBe('person@example.com')
    const payload = await response.json()
    expect(payload).toEqual({ ok: true })
    expect(JSON.stringify(payload)).not.toContain('RESEND')
  })
})
