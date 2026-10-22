/**
 * Cloudflare Worker for FIELD feedback.
 *
 * The browser posts JSON. This worker forwards the text to the mailbox.
 * RESEND_API_KEY stays here, never in the Vite bundle.
 * Without that secret the worker uses FormSubmit, which emails
 * inspiromaciek@gmail.com after that address confirms the first message.
 *
 * Delivery is not active until the worker URL is set as FIELD_FEEDBACK_URL.
 */

const DESTINATION = 'inspiromaciek@gmail.com'
const SUBJECT = 'FIELD — opinia użytkownika'
const MAX_BODY = 16_000
const RATE_LIMIT = 8
const RATE_WINDOW_MS = 60 * 60 * 1000

const hits = new Map()

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, accept',
      'cache-control': 'no-store',
    },
  })
}

function clientKey(request) {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

function limited(key, now) {
  const recent = (hits.get(key) || []).filter((stamp) => now - stamp < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.split('\u0000').join('').trim().slice(0, 12_000)
}

function cleanEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim()
  if (!email || email.length > 200) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

async function forward(env, text, replyEmail) {
  if (env.RESEND_API_KEY && env.FEEDBACK_FROM) {
    const payload = {
      from: env.FEEDBACK_FROM,
      to: [DESTINATION],
      subject: SUBJECT,
      text,
    }
    if (replyEmail) payload.reply_to = replyEmail
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return response.ok
  }

  const form = {
    _subject: SUBJECT,
    _template: 'box',
    _captcha: 'false',
    message: text,
  }
  if (replyEmail) {
    form._replyto = replyEmail
    form.email = replyEmail
  }
  const response = await fetch(`https://formsubmit.co/ajax/${DESTINATION}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(form),
  })
  if (!response.ok) return false
  const payload = await response.json().catch(() => null)
  return payload?.success === 'true' || payload?.success === true
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '*'
    if (request.method === 'OPTIONS') return json({ ok: true }, 204, origin)
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, origin)
    const length = Number(request.headers.get('content-length') || 0)
    if (length > MAX_BODY) return json({ ok: false, error: 'size' }, 413, origin)
    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'json' }, 400, origin)
    }
    if (body && typeof body.company === 'string' && body.company.trim()) {
      return json({ ok: true }, 200, origin)
    }
    const text = cleanText(body?.text)
    if (!text || text.length > 12_000) return json({ ok: false, error: 'text' }, 400, origin)
    if (limited(clientKey(request), Date.now())) return json({ ok: false, error: 'rate' }, 429, origin)
    const sent = await forward(env, text, cleanEmail(body?.replyEmail))
    if (!sent) return json({ ok: false, error: 'delivery' }, 502, origin)
    return json({ ok: true }, 200, origin)
  },
}
