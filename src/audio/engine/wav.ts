/** Encode an AudioBuffer as a PCM WAV (16- or 24-bit). Float 32 is not used. */

export type WavBitDepth = 16 | 24

export function encodeWav(buffer: AudioBuffer, bitDepth: WavBitDepth = 24): Blob {
  const channels = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const length = buffer.length
  const bytesPerSample = bitDepth / 8
  const blockAlign = channels * bytesPerSample
  const dataSize = length * blockAlign
  const header = 44
  const bytes = new ArrayBuffer(header + dataSize)
  const view = new DataView(bytes)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const chans: Float32Array[] = []
  for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c))

  let offset = header
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.min(1, Math.max(-1, chans[c]?.[i] ?? 0))
      if (bitDepth === 16) {
        view.setInt16(offset, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true)
        offset += 2
      } else {
        const v = s < 0 ? Math.round(s * 0x800000) : Math.round(s * 0x7fffff)
        view.setUint8(offset, v & 0xff)
        view.setUint8(offset + 1, (v >> 8) & 0xff)
        view.setUint8(offset + 2, (v >> 16) & 0xff)
        offset += 3
      }
    }
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
