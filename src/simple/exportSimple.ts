import type { FadeCurve } from '../audio/engine/fades'
import type { ExportPreviewPlan } from '../audio/engine/exportPreview'
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
  options?: { includeEffectTail?: boolean },
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
  return engine.renderAudiblePcm(
    { sampleRate: rendered.sampleRate, channels },
    engine.getSnapshot().params.start,
    { includeEffectTail: options?.includeEffectTail },
  )
}

export type SimpleExportRequest = {
  name: string
  format: 'wav' | 'mp3'
  sampleRate: number | 'original'
  bitDepth: WavBitDepth
  mono: boolean
}

/** Same bounce as a simple save, limited to one window and without WAV encoding. */
export async function previewSimpleExportPcm(
  engine: AudioEngine,
  edit: { fadeIn: number; fadeOut: number; fadeCurve: FadeCurve; fadeInBend: number; fadeOutBend: number },
  request: SimpleExportRequest,
  plan: ExportPreviewPlan,
  options?: { includeEffectTail?: boolean; signal?: AbortSignal },
): Promise<Pcm | null> {
  await engine.unlock()
  if (options?.signal?.aborted) {
    const error = new Error('Preview cancelled')
    error.name = 'AbortError'
    throw error
  }
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
  const rate = rendered.sampleRate
  const frames = rendered.length
  const start = Math.max(0, Math.min(frames - 1, Math.floor(plan.localStartSec * rate)))
  const end = Math.max(start + 1, Math.min(frames, Math.ceil((plan.localStartSec + plan.localDurSec) * rate)))
  if (end - start < 1) return null
  const channels: Float32Array[] = []
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    channels.push(rendered.getChannelData(c).slice(start, end))
  }
  const processed = await engine.renderAudiblePcm(
    { sampleRate: rate, channels },
    plan.exportStart + plan.localStartSec,
    {
      includeEffectTail: options?.includeEffectTail,
      clockOriginSec: plan.localStartSec,
      signal: options?.signal,
    },
  )
  if ((processed.channels[0]?.length ?? 0) < 1) return null
  return prepareSimpleExportPcm(processed, request)
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
