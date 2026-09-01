import type { Pcm, WavBitDepth } from './types'

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

function tpdf(): number {
  return Math.random() + Math.random() - 1
}

function encodeSample(value: number, bitDepth: WavBitDepth): number {
  const x = Math.min(1, Math.max(-1, value))
  if (bitDepth === 32) return x
  if (bitDepth === 24) {
    const v = Math.round(x * 8388607)
    return Math.min(8388607, Math.max(-8388608, v))
  }
  const dithered = x + tpdf() / 32768
  const v = Math.round(Math.min(1, Math.max(-1, dithered)) * 32767)
  return Math.min(32767, Math.max(-32768, v))
}

/**
 * Encode PCM as WAV. 16-bit uses TPDF dither; 24-bit and 32-bit float do not.
 * Only WAV is advertised as available — we actually encode this format.
 */
export function encodeWav(pcm: Pcm, bitDepth: WavBitDepth = 24): ArrayBuffer {
  const channels = Math.max(1, pcm.channels.length)
  const frames = pcm.channels[0]?.length ?? 0
  const sampleRate = Math.round(pcm.sampleRate)
  const bytesPerSample = bitDepth === 32 ? 4 : bitDepth === 24 ? 3 : 2
  const blockAlign = channels * bytesPerSample
  const dataSize = frames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const float = bitDepth === 32
  const audioFormat = float ? 3 : 1

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, audioFormat, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth === 32 ? 32 : bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const encoded = encodeSample(pcm.channels[c]?.[i] ?? 0, bitDepth)
      if (bitDepth === 32) {
        view.setFloat32(offset, encoded, true)
        offset += 4
      } else if (bitDepth === 24) {
        const v = encoded | 0
        view.setUint8(offset, v & 0xff)
        view.setUint8(offset + 1, (v >> 8) & 0xff)
        view.setUint8(offset + 2, (v >> 16) & 0xff)
        offset += 3
      } else {
        view.setInt16(offset, encoded, true)
        offset += 2
      }
    }
  }
  return buffer
}

export function exportBaseName(fileName: string): string {
  const trimmed = fileName.replace(/\.[^.]+$/, '')
  return trimmed || 'sample'
}

export function exportFileName(fileName: string, selectionIsPartial: boolean): string {
  const base = exportBaseName(fileName)
  const suffix = selectionIsPartial ? '_trim' : '_prep'
  return `${base}${suffix}.wav`
}
