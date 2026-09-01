/**
 * Render pipeline — order is fixed so preview and export cannot diverge.
 *
 * SOURCE
 *   → SELECTION / TRIM
 *   → CHANNEL OPERATIONS
 *   → REVERSE
 *   → DC OFFSET
 *   → GAIN
 *   → NORMALIZE (peak)
 *   → FADE IN / OUT
 *   → RESAMPLE
 */

import { reverseChannel } from '../engine/buffers'
import { dbToGain } from '../parameters/mapping'
import { applyFadeIn, applyFadeOut } from './fade'
import {
  applyGain,
  invertChannel,
  mixToMonoChannels,
  peakAmplitude,
  removeDc,
} from './prepare'
import { resampleChannels } from './resample'
import type { Pcm, RenderOptions, SamplePrepState } from './types'

export const RENDER_PIPELINE = [
  'source',
  'selection',
  'channels',
  'reverse',
  'dc',
  'gain',
  'normalize',
  'fades',
  'resample',
] as const

function sliceChannel(ch: Float32Array, start: number, end: number): Float32Array {
  const s = Math.max(0, Math.min(ch.length, start))
  const e = Math.max(s, Math.min(ch.length, end))
  return ch.subarray(s, e).slice()
}

function copyChannels(channels: Float32Array[]): Float32Array[] {
  return channels.map((ch) => new Float32Array(ch))
}

function applyChannelOps(channels: Float32Array[], state: SamplePrepState): Float32Array[] {
  let next = copyChannels(channels)
  switch (state.channelMode) {
    case 'mono':
      next = mixToMonoChannels(next)
      break
    case 'left':
      next = [new Float32Array(next[0] ?? new Float32Array())]
      break
    case 'right':
      next = [new Float32Array(next[1] ?? next[0] ?? new Float32Array())]
      break
    case 'swap':
      if (next.length >= 2) next = [next[1], next[0], ...next.slice(2)]
      break
    default:
      break
  }
  if (state.invertL && next[0]) next[0] = invertChannel(next[0])
  if (state.invertR && next[1]) next[1] = invertChannel(next[1])
  return next
}

export function renderPrep(
  source: Pcm,
  state: SamplePrepState,
  options: RenderOptions,
): Pcm {
  const sr = source.sampleRate
  const start = Math.floor(state.selectionStart * sr)
  const end = Math.floor(state.selectionEnd * sr)
  let channels = source.channels.map((ch) => sliceChannel(ch, start, end))

  if (options.applyChannels) {
    channels = applyChannelOps(channels, state)
  }

  if (options.applyReverse && state.reverse) {
    channels = channels.map((ch) => reverseChannel(ch))
  }

  if (options.applyDc && state.removeDc) {
    channels = removeDc(channels)
  }

  if (options.applyGain && state.gainDb !== 0) {
    channels = applyGain(channels, dbToGain(state.gainDb))
  }

  if (options.applyNormalize && state.normalize) {
    const peak = peakAmplitude(channels)
    const target = dbToGain(state.normalizeTargetDbfs)
    if (peak > 1e-8) channels = applyGain(channels, target / peak)
  }

  if (options.applyFades) {
    if (state.fadeInEnabled && state.fadeInSec > 0) {
      applyFadeIn(channels, sr, state.fadeInSec, state.fadeInCurve, state.fadeInBend)
    }
    if (state.fadeOutEnabled && state.fadeOutSec > 0) {
      applyFadeOut(channels, sr, state.fadeOutSec, state.fadeOutCurve, state.fadeOutBend)
    }
  }

  const outRate = options.sampleRate === 'original' ? sr : options.sampleRate
  if (outRate !== sr) {
    channels = resampleChannels(channels, sr, outRate)
    return { sampleRate: outRate, channels }
  }
  return { sampleRate: sr, channels }
}

export function pcmDuration(pcm: Pcm): number {
  const len = pcm.channels[0]?.length ?? 0
  return pcm.sampleRate > 0 ? len / pcm.sampleRate : 0
}

export function clonePcmFromBuffer(buffer: {
  sampleRate: number
  numberOfChannels: number
  getChannelData: (channel: number) => Float32Array
}): Pcm {
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(new Float32Array(buffer.getChannelData(c)))
  }
  return { sampleRate: buffer.sampleRate, channels }
}
