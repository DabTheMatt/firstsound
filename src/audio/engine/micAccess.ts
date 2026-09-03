/**
 * Pure helpers for microphone permission / capture errors.
 * Kept free of Web Audio so unit tests stay node-friendly.
 */

export function micAccessMessage(err: unknown): string {
  const name =
    err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Microphone permission denied. On iPhone: Settings → Safari → Microphone, or delete the Home Screen app and add it again after allowing access.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Microphone is busy or unavailable. Close other apps using the mic and try again.'
  }
  if (name === 'SecurityError') {
    return 'Microphone blocked by the browser. Open FIELD over HTTPS and try Rec again.'
  }
  return 'Microphone access was denied or is unavailable.'
}
