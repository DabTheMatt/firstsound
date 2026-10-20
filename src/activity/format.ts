import type { Locale } from '../i18n/locale'

const MIME_LABELS: Record<string, string> = {
  'audio/wav': 'WAV',
  'audio/wave': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/vnd.wave': 'WAV',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/aiff': 'AIFF',
  'audio/x-aiff': 'AIFF',
  'audio/ogg': 'OGG',
  'audio/vorbis': 'OGG',
  'audio/mp4': 'M4A',
  'audio/aac': 'AAC',
  'audio/webm': 'WEBM',
}

const EXTENSION_LABELS: Record<string, string> = {
  wav: 'WAV',
  wave: 'WAV',
  flac: 'FLAC',
  mp3: 'MP3',
  aiff: 'AIFF',
  aif: 'AIFF',
  ogg: 'OGG',
  m4a: 'M4A',
  aac: 'AAC',
  webm: 'WEBM',
}

/** A format name from the MIME type, then a known extension. Never a duration. */
export function audioFormatLabel(mimeType: string, filename: string): string {
  const mime = mimeType.toLowerCase().split(';')[0]?.trim() ?? ''
  if (MIME_LABELS[mime]) return MIME_LABELS[mime]
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_LABELS[extension] ?? '—'
}

function localeTag(locale: Locale): string {
  return locale === 'pl' ? 'pl-PL' : 'en-GB'
}

export function formatCount(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(localeTag(locale)).format(value)
}

export function formatActivityWhen(iso: string, locale: Locale): string {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return '—'
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(time)
}

export function formatActivityDay(iso: string, locale: Locale): string {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return '—'
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(time)
}
