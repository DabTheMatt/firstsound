import { cloneAutomation, type AutomationDocument, type AutomationNode } from '../automation/automation'

/** One second of digital silence, measured in samples of the buffer's rate. */
export const SILENCE_INSERT_SEC = 1

export type SamplePcmSnapshot = {
  id: number
  sampleRate: number
  channels: Float32Array[]
  playhead: number
  transients: number[]
}

export type SampleEditCapture = {
  sampleRate: number
  channels: Float32Array[]
  playhead: number
  transients: number[]
  start: number
  end: number
  automation: AutomationDocument
}

export type TimelineEdit =
  | { kind: 'insert'; atSec: number; deltaSec: number }
  | { kind: 'delete'; startSec: number; endSec: number }

let samplePcmSeq = 0

export function nextSamplePcmId(): number {
  samplePcmSeq += 1
  return samplePcmSeq
}

export function copyChannel(channel: Float32Array): Float32Array {
  const copy = new Float32Array(channel.length)
  copy.set(channel)
  return copy
}

/** Frames of silence for `seconds` at `sampleRate`. 48 kHz → 48000 frames. */
export function silenceFrameCount(sampleRate: number, seconds = SILENCE_INSERT_SEC): number {
  if (!(sampleRate > 0) || !(seconds > 0)) return 0
  return Math.max(0, Math.round(sampleRate * seconds))
}

/** Sample index of a timeline time, clamped to `0…length` so the end appends. */
export function insertFrameForTime(timeSec: number, sampleRate: number, length: number): number {
  if (!(sampleRate > 0) || length < 0) return 0
  const frame = Math.round(Math.max(0, timeSec) * sampleRate)
  return Math.max(0, Math.min(length, frame))
}

export function insertSilence(
  channels: readonly Float32Array[],
  atFrame: number,
  silenceFrames: number,
): Float32Array[] {
  const length = channels[0]?.length ?? 0
  const at = Math.max(0, Math.min(length, Math.round(atFrame)))
  const gap = Math.max(0, Math.round(silenceFrames))
  return channels.map((channel) => {
    const src = channel.length === length ? channel : fitLength(channel, length)
    const out = new Float32Array(length + gap)
    if (at > 0) out.set(src.subarray(0, at), 0)
    if (at < length) out.set(src.subarray(at), at + gap)
    return out
  })
}

export type FrameSpan = { start: number; end: number }

/**
 * Inclusive-exclusive frame range for a selection.
 * Null when the range is empty or would remove every frame.
 */
export function deleteFrameSpan(
  startSec: number,
  endSec: number,
  sampleRate: number,
  length: number,
): FrameSpan | null {
  if (!(sampleRate > 0) || length < 2) return null
  const lo = Math.min(startSec, endSec)
  const hi = Math.max(startSec, endSec)
  const start = Math.max(0, Math.min(length, Math.round(lo * sampleRate)))
  const end = Math.max(0, Math.min(length, Math.round(hi * sampleRate)))
  if (end - start < 1) return null
  if (start <= 0 && end >= length) return null
  if (length - (end - start) < 1) return null
  return { start, end }
}

export function deleteFrameRange(
  channels: readonly Float32Array[],
  startFrame: number,
  endFrame: number,
): Float32Array[] | null {
  const length = channels[0]?.length ?? 0
  const start = Math.max(0, Math.min(length, Math.round(startFrame)))
  const end = Math.max(start, Math.min(length, Math.round(endFrame)))
  if (end - start < 1) return null
  if (start <= 0 && end >= length) return null
  const keep = length - (end - start)
  if (keep < 1) return null
  return channels.map((channel) => {
    const src = channel.length === length ? channel : fitLength(channel, length)
    const out = new Float32Array(keep)
    if (start > 0) out.set(src.subarray(0, start), 0)
    if (end < length) out.set(src.subarray(end), start)
    return out
  })
}

/** Map one time through an insert or delete. Null means the time was deleted. */
export function mapTime(time: number, edit: TimelineEdit): number | null {
  if (!Number.isFinite(time)) return time
  if (edit.kind === 'insert') {
    return time >= edit.atSec ? time + edit.deltaSec : time
  }
  const span = edit.endSec - edit.startSec
  if (!(span > 0)) return time
  if (time >= edit.startSec && time < edit.endSec) return null
  if (time >= edit.endSec) return time - span
  return time
}

export function mapPlayhead(time: number, edit: TimelineEdit, duration: number): number {
  let next = time
  if (edit.kind === 'insert') {
    next = edit.atSec
  } else if (time >= edit.endSec) {
    next = time - (edit.endSec - edit.startSec)
  } else if (time > edit.startSec) {
    next = edit.startSec
  }
  if (!(duration > 0)) return 0
  return Math.min(duration, Math.max(0, next))
}

/** Shift a range so it stays attached to the same audio. */
export function mapRange(start: number, end: number, edit: TimelineEdit): { start: number; end: number } {
  if (edit.kind === 'insert') {
    const at = edit.atSec
    const delta = edit.deltaSec
    const s = start >= at ? start + delta : start
    const e = end >= at ? end + delta : end
    return { start: s, end: Math.max(s, e) }
  }
  const span = Math.max(0, edit.endSec - edit.startSec)
  const mapEdge = (time: number): number => {
    if (time >= edit.endSec) return time - span
    if (time > edit.startSec) return edit.startSec
    return time
  }
  const s = mapEdge(Math.min(start, end))
  const e = mapEdge(Math.max(start, end))
  return { start: s, end: Math.max(s, e) }
}

export function mapMarkerTimes(times: readonly number[], edit: TimelineEdit): number[] {
  const out: number[] = []
  for (const time of times) {
    const next = mapTime(time, edit)
    if (next != null && Number.isFinite(next)) out.push(next)
  }
  return out
}

export function mapAutomation(doc: AutomationDocument, edit: TimelineEdit): AutomationDocument {
  const lanes = doc.lanes
    .map((lane) => {
      const nodes: AutomationNode[] = []
      for (const node of lane.nodes) {
        const time = mapTime(node.time, edit)
        if (time == null || !Number.isFinite(time)) continue
        nodes.push({ ...node, time })
      }
      return { ...lane, nodes }
    })
    .filter((lane) => lane.nodes.length > 0)
  return { selectedParamId: doc.selectedParamId, lanes }
}

export function canInsertSilence(sampleRate: number, frameCount: number): boolean {
  return sampleRate > 0 && frameCount > 0 && silenceFrameCount(sampleRate) > 0
}

export function canDeleteSampleSelection(
  start: number,
  end: number,
  sampleRate: number,
  frameCount: number,
): boolean {
  return deleteFrameSpan(start, end, sampleRate, frameCount) != null
}

/** A partial highlight can be deselected. The whole file is not a selection. */
export function canClearSampleSelection(start: number, end: number, duration: number): boolean {
  if (!(duration > 0)) return false
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  if (!(hi - lo > 0.001)) return false
  return !(lo <= 0.001 && hi >= duration - 0.001)
}

export function snapshotFromCapture(capture: SampleEditCapture, id = nextSamplePcmId()): SamplePcmSnapshot {
  return {
    id,
    sampleRate: capture.sampleRate,
    channels: capture.channels.map(copyChannel),
    playhead: capture.playhead,
    transients: capture.transients.slice(),
  }
}

export function cloneCapture(capture: SampleEditCapture): SampleEditCapture {
  return {
    sampleRate: capture.sampleRate,
    channels: capture.channels.map(copyChannel),
    playhead: capture.playhead,
    transients: capture.transients.slice(),
    start: capture.start,
    end: capture.end,
    automation: cloneAutomation(capture.automation),
  }
}

function fitLength(channel: Float32Array, length: number): Float32Array {
  const out = new Float32Array(length)
  out.set(channel.subarray(0, Math.min(length, channel.length)))
  return out
}
