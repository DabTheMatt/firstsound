import { applyTempoSync, isTempoSyncTrigger } from '../fx/sync'
import { complementaryPct, isCorrelated } from '../fx/dryWet'
import { PARAMS } from './definitions'
import { applyParamValue } from './mapping'
import type { ParamId } from './types'

type LinkKind = 'mirror' | 'complement'

type ParamLink = {
  a: ParamId
  b: ParamId
  kind: LinkKind
  when: ParamId
  /** Side that wins when both ends of a complement pair are written together. */
  prefer: 'a' | 'b'
}

/**
 * Active while `when` is on.
 * Complement pairs sum to 100%. Mirror pairs copy the same value.
 * Mirror links stay put when both sides are written in one patch, so a preset
 * or a full snapshot can still carry an independent stereo image.
 * A rising link flag forces the leader (left, or wet) onto the other side.
 */
const PARAM_LINKS: readonly ParamLink[] = [
  { a: 'delayDry', b: 'delayWet', kind: 'complement', when: 'delayCorrelate', prefer: 'b' },
  { a: 'delayDryR', b: 'delayWetR', kind: 'complement', when: 'delayCorrelate', prefer: 'b' },
  { a: 'reverbDry', b: 'reverbWet', kind: 'complement', when: 'reverbCorrelate', prefer: 'b' },
  { a: 'delayTime', b: 'delayTimeR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delayFeedback', b: 'delayFeedbackR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delayDry', b: 'delayDryR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delayWet', b: 'delayWetR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delaySync', b: 'delaySyncR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delayNote', b: 'delayNoteR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
  { a: 'delayNoteKind', b: 'delayNoteKindR', kind: 'mirror', when: 'delayLinkLR', prefer: 'a' },
]

export type LinkFlagSnapshot = {
  delayLinkLR: number
  delayCorrelate: number
  reverbCorrelate: number
}

function followerValue(link: ParamLink, sourceValue: number): number {
  return link.kind === 'mirror' ? sourceValue : complementaryPct(sourceValue)
}

/**
 * Keep linked parameters consistent after a write.
 * `changed` lists the values that were explicitly edited (knob, automation, LFO, preset).
 * `force` lists link flags that should push their leader onto the follower
 * (correlate re-derive, or L/R link just enabled).
 */
export function applyParamLinks(
  params: Record<ParamId, number>,
  changed: Iterable<ParamId>,
  force: Iterable<ParamId> = [],
): ParamId[] {
  const origins = new Set(changed)
  const forced = new Set(force)
  const dirty = new Set(origins)
  for (const link of PARAM_LINKS) {
    if (!forced.has(link.when) || !isCorrelated(params[link.when])) continue
    dirty.add(link.kind === 'complement' ? link.b : link.a)
  }
  const written: ParamId[] = []
  for (let pass = 0; pass < 8; pass++) {
    let moved = false
    for (const link of PARAM_LINKS) {
      if (!isCorrelated(params[link.when])) continue
      const aDirty = dirty.has(link.a)
      const bDirty = dirty.has(link.b)
      if (!aDirty && !bDirty) continue
      let source: 'a' | 'b' | null = null
      if (forced.has(link.when)) source = link.kind === 'complement' ? link.prefer : 'a'
      else if (aDirty && bDirty) source = link.kind === 'complement' ? link.prefer : null
      else source = aDirty ? 'a' : 'b'
      if (!source) continue
      const sourceId = source === 'a' ? link.a : link.b
      const destId = source === 'a' ? link.b : link.a
      const next = applyParamValue(followerValue(link, params[sourceId]), PARAMS[destId])
      if (params[destId] !== next) {
        params[destId] = next
        written.push(destId)
        dirty.add(destId)
        moved = true
      } else if (!dirty.has(destId)) dirty.add(destId)
    }
    if (!moved) break
  }
  return written
}

function correlateForce(params: Record<ParamId, number>, changed: ReadonlySet<ParamId>): ParamId[] {
  const force: ParamId[] = []
  if (changed.has('delayCorrelate') && isCorrelated(params.delayCorrelate)) force.push('delayCorrelate')
  if (changed.has('reverbCorrelate') && isCorrelated(params.reverbCorrelate)) force.push('reverbCorrelate')
  return force
}

/** One knob, automation write, or similar single-parameter edit. */
export function commitParamEdit(params: Record<ParamId, number>, id: ParamId, previous: number): void {
  const origins = new Set<ParamId>([id])
  const force = correlateForce(params, origins)
  if (id === 'delayLinkLR' && isCorrelated(params.delayLinkLR) && previous < 0.5) force.push('delayLinkLR')
  for (const extra of applyTempoSync(params, id)) origins.add(extra)
  const written = applyParamLinks(params, origins, force)
  const clocked: ParamId[] = []
  for (const wid of written) {
    if (!isTempoSyncTrigger(wid)) continue
    for (const extra of applyTempoSync(params, wid, origins)) clocked.push(extra)
  }
  if (clocked.length) applyParamLinks(params, clocked)
}

/** A patch from a preset, automation bundle, or snapshot. Always refreshes tempo-synced times. */
export function commitParamPatch(
  params: Record<ParamId, number>,
  keys: readonly ParamId[],
  previous: LinkFlagSnapshot,
): void {
  const origins = new Set<ParamId>(keys)
  const force = correlateForce(params, origins)
  if (origins.has('delayLinkLR') && isCorrelated(params.delayLinkLR) && previous.delayLinkLR < 0.5) {
    force.push('delayLinkLR')
  }
  applyParamLinks(params, origins, force)
  const clocked = applyTempoSync(params, 'bpm', origins)
  if (clocked.length) applyParamLinks(params, clocked)
}
