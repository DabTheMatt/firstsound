import type { PresetV1 } from '../../audio/parameters/types'

export async function readAudioFile(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(filename: string, data: unknown): void {
  downloadBlob(
    filename,
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
}

export function parsePreset(raw: unknown): PresetV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<PresetV1>
  if (obj.instrument !== 'field' || obj.version !== 1) return null
  if (!obj.params || typeof obj.params !== 'object') return null
  return obj as PresetV1
}
