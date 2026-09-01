import { NOTE_DIVISIONS, NOTE_KINDS, type NoteDivision, type NoteKind } from './types'

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
