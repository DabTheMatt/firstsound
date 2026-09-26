import type { FadeCurve } from '../audio/engine/fades'
import { renderProcessedPcm } from '../audio/engine/offlineRender'
import { encodeWav, resampleChannels, type Pcm, type WavBitDepth } from '../audio/samplePrep'
import type { AudioEngine } from '../audio/engine/AudioEngine'

export function formatSimpleSeconds(seconds: number, locale: 'en' | 'pl'): string {
  const n = Math.max(0, seconds)
  const text = n.toFixed(1)
  return locale === 'pl' ? text.replace('.', ',') : text
}

export function mixPcmToMono(pcm: Pcm): Pcm {
  if (pcm.channels.length < 2) return pcm
  const left = pcm.channels[0]!
  const right = pcm.channels[1]!
  const out = new Float32Array(left.length)
  for (let i = 0; i < out.length; i++) out[i] = ((left[i] ?? 0) + (right[i] ?? 0)) * 0.5
  return { sampleRate: pcm.sampleRate, channels: [out] }
}

export async function bounceSimplePcm(
  engine: AudioEngine,
  edit: { fadeIn: number; fadeOut: number; fadeCurve: FadeCurve; fadeInBend: number; fadeOutBend: number },
): Promise<Pcm | null> {
  const rendered = engine.renderEdit({
    fadeIn: edit.fadeIn,
    fadeOut: edit.fadeOut,
    fadeCurve: edit.fadeCurve,
    fadeInBend: edit.fadeInBend,
    fadeOutBend: edit.fadeOutBend,
    reverse: false,
    normalize: false,
  })
  if (!rendered) return null
  const channels: Float32Array[] = []
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    channels.push(new Float32Array(rendered.getChannelData(c)))
  }
  return renderProcessedPcm(
    { sampleRate: rendered.sampleRate, channels },
    engine.processingSnapshot(),
    { timelineStart: engine.getSnapshot().params.start },
  )
}

export type SimpleExportRequest = {
  name: string
  format: 'wav' | 'mp3'
  sampleRate: number | 'original'
  bitDepth: WavBitDepth
  mono: boolean
}

export function encodeSimpleWav(pcm: Pcm, bitDepth: WavBitDepth): Blob {
  const bytes = encodeWav(pcm, bitDepth === 32 ? 24 : bitDepth)
  return new Blob([bytes], { type: 'audio/wav' })
}

export function prepareSimpleExportPcm(pcm: Pcm, request: SimpleExportRequest): Pcm {
  let next = request.mono ? mixPcmToMono(pcm) : pcm
  if (request.sampleRate !== 'original' && request.sampleRate > 0) {
    next = {
      sampleRate: request.sampleRate,
      channels: resampleChannels(next.channels, next.sampleRate, request.sampleRate),
    }
  }
  return next
}

export function simpleExportFilename(name: string, format: 'wav' | 'mp3'): string {
  const stem = name.replace(/\.[^.]+$/, '').trim() || 'sample-edited'
  return format === 'mp3' ? `${stem}.mp3` : `${stem}.wav`
}
