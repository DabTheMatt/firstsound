import { createSign } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

const SNAPSHOT_PATH = 'public/activity/snapshot.json'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

/**
 * Decides whether a downloaded Drive export may replace the published file.
 * An invalid or identical snapshot keeps the last good file.
 */
export function decideActivityPublish(currentText, incomingText, validate) {
  let incoming
  try {
    incoming = JSON.parse(incomingText)
  } catch {
    return { action: 'keep', reason: 'invalid-json' }
  }
  const next = validate(incoming)
  if (!next.ok) return { action: 'keep', reason: 'invalid', errors: next.errors }
  const nextJson = `${JSON.stringify(next.snapshot)}\n`
  if (currentText) {
    try {
      const current = validate(JSON.parse(currentText))
      if (current.ok && `${JSON.stringify(current.snapshot)}\n` === nextJson) {
        return { action: 'keep', reason: 'unchanged' }
      }
    } catch {
      /* The published file is unreadable. A valid export may replace it. */
    }
  }
  return { action: 'replace', json: nextJson }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

async function accessToken(credentials) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  const assertion = `${unsigned}.${signer.sign(credentials.private_key).toString('base64url')}`
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!response.ok) throw new Error(`activity-publish-auth-failed ${response.status}`)
  const body = await response.json()
  if (!body.access_token) throw new Error('activity-publish-auth-failed')
  return body.access_token
}

async function downloadSnapshot(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`activity-publish-download-failed ${response.status}`)
  return response.text()
}

async function publishFromDrive() {
  const rawCredentials = process.env.ACTIVITY_DRIVE_CREDENTIALS
  const fileId = process.env.ACTIVITY_SNAPSHOT_FILE_ID?.trim()
  if (!rawCredentials || !fileId) throw new Error('activity-publish-missing-secret')
  let credentials
  try {
    credentials = JSON.parse(rawCredentials)
  } catch {
    throw new Error('activity-publish-bad-credentials')
  }
  if (!credentials.client_email || !credentials.private_key) throw new Error('activity-publish-bad-credentials')
  const incoming = await downloadSnapshot(await accessToken(credentials), fileId)
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  })
  try {
    const { validatePublicSnapshot } = await server.ssrLoadModule('/src/activity/snapshot/validate.ts')
    const currentText = existsSync(SNAPSHOT_PATH) ? readFileSync(SNAPSHOT_PATH, 'utf8') : null
    const decision = decideActivityPublish(currentText, incoming, validatePublicSnapshot)
    if (decision.action === 'keep') {
      const detail = decision.errors?.length ? ` ${decision.errors.join(',')}` : ''
      console.log(`activity-publish-keep ${decision.reason}${detail}`)
      return
    }
    writeFileSync(SNAPSHOT_PATH, decision.json)
    console.log('activity-publish-replace')
  } finally {
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishFromDrive().catch((error) => {
    console.error(error instanceof Error ? error.message : 'activity-publish-failed')
    process.exit(1)
  })
}
