import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { NOTE_DIVISIONS, NOTE_KINDS, noteDivisionAt, noteKindAt, type NoteDivision, type NoteKind } from './types'

/** Convert BPM + note value to delay time in milliseconds. */
export function syncedDelayMs(
  bpm: number,
  division: NoteDivision,
  kind: NoteKind,
): number {
  const tempo = Math.min(240, Math.max(40, bpm))
  const beats = NOTE_DIVISIONS.find((d) => d.value === division)?.beats ?? 1
  const mul = NOTE_KINDS.find((k) => k.value === kind)?.mul ?? 1
  return (60_000 / tempo) * beats * mul
}

export function nearestNote(
  delayMs: number,
  bpm: number,
): { division: NoteDivision; kind: NoteKind } {
  let best: { division: NoteDivision; kind: NoteKind; err: number } = {
    division: '1/4',
    kind: 'straight',
    err: Infinity,
  }
  for (const div of NOTE_DIVISIONS) {
    for (const kind of NOTE_KINDS) {
      const ms = syncedDelayMs(bpm, div.value, kind.value)
      const err = Math.abs(Math.log(ms + 1) - Math.log(delayMs + 1))
      if (err < best.err) best = { division: div.value, kind: kind.value, err }
    }
  }
  return best
}

const TEMPO_SYNC_IDS = new Set<ParamId>([
  'bpm',
  'delayNote',
  'delayNoteKind',
  'delaySync',
  'delayNoteR',
  'delayNoteKindR',
  'delaySyncR',
  'reverbNote',
  'reverbNoteKind',
  'reverbSync',
])

export function isTempoSyncTrigger(id: ParamId): boolean {
  return TEMPO_SYNC_IDS.has(id)
}

/**
 * Apply tempo-sync side effects for one edited id.
 * Explicit `protect` values are left untouched so a patch can set time and sync together.
 */
export function applyTempoSync(
  params: Record<ParamId, number>,
  id: ParamId,
  protect?: ReadonlySet<ParamId>,
): ParamId[] {
  const touched: ParamId[] = []
  const write = (key: ParamId, value: number) => {
    if (protect?.has(key)) return
    const next = applyParamValue(value, PARAMS[key])
    if (params[key] === next) return
    params[key] = next
    touched.push(key)
  }
  const clear = (key: ParamId) => {
    if (protect?.has(key) || params[key] <= 0.5) return
    params[key] = 0
    touched.push(key)
  }
  if (id === 'delayTime') clear('delaySync')
  if (id === 'delayTimeR') clear('delaySyncR')
  if (id === 'reverbPredelay') clear('reverbSync')
  if (
    params.delaySync > 0.5 &&
    (id === 'bpm' || id === 'delayNote' || id === 'delayNoteKind' || id === 'delaySync')
  ) {
    write(
      'delayTime',
      syncedDelayMs(params.bpm, noteDivisionAt(params.delayNote), noteKindAt(params.delayNoteKind)),
    )
  }
  if (
    params.delaySyncR > 0.5 &&
    (id === 'bpm' || id === 'delayNoteR' || id === 'delayNoteKindR' || id === 'delaySyncR')
  ) {
    write(
      'delayTimeR',
      syncedDelayMs(params.bpm, noteDivisionAt(params.delayNoteR), noteKindAt(params.delayNoteKindR)),
    )
  }
  if (
    params.reverbSync > 0.5 &&
    (id === 'bpm' || id === 'reverbNote' || id === 'reverbNoteKind' || id === 'reverbSync')
  ) {
    write(
      'reverbPredelay',
      syncedDelayMs(params.bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)),
    )
  }
  return touched
}
