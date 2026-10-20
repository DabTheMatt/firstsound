import { DAY_MS, utcDayStart } from './metrics'
import type { ActivitySnapshot, RecordingReference, Student } from './types'

const STUDENTS: Student[] = [
  { id: 'ania', displayName: 'Ania W.' },
  { id: 'bartek', displayName: 'Bartek M.' },
  { id: 'celina', displayName: 'Celina K.' },
  { id: 'dawid', displayName: 'Dawid P.' },
  { id: 'ewa', displayName: 'Ewa S.' },
  { id: 'filip', displayName: 'Filip R.' },
  { id: 'gosia', displayName: 'Gosia L.' },
  { id: 'hania', displayName: 'Hania T.' },
  { id: 'igor', displayName: 'Igor N.' },
  { id: 'julia', displayName: 'Julia B.' },
  { id: 'kasia', displayName: 'Kasia D.' },
]

const WEIGHTS = [5, 4, 4, 3, 3, 2, 2, 2, 1, 1]

const PLACES = [
  'rynek',
  'wisla',
  'planty',
  'wawel',
  'kazimierz',
  'dworzec',
  'sukiennice',
  'podgorze',
  'tramwaj',
  'nowa-huta',
  'brama',
  'salon',
]

const KINDS = [
  ['wav', 'audio/wav'],
  ['flac', 'audio/flac'],
  ['mp3', 'audio/mpeg'],
  ['aiff', 'audio/aiff'],
  ['ogg', 'audio/ogg'],
] as const

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickStudent(rand: () => number): Student {
  const total = WEIGHTS.reduce((sum, weight) => sum + weight, 0)
  let cursor = rand() * total
  for (let index = 0; index < WEIGHTS.length; index += 1) {
    cursor -= WEIGHTS[index] ?? 0
    if (cursor <= 0) return STUDENTS[index] ?? STUDENTS[0]!
  }
  return STUDENTS[0]!
}

function filesForDay(ago: number, rand: () => number): number {
  if (ago === 0) return 2 + Math.floor(rand() * 2)
  if (ago <= 6) return rand() < 0.85 ? 1 + Math.floor(rand() * 4) : 0
  if (ago <= 29) return rand() < 0.62 ? 1 + Math.floor(rand() * 3) : 0
  return rand() < 0.35 ? 1 + Math.floor(rand() * 2) : 0
}

/**
 * Deterministic sample set relative to `now`.
 * Display names only. The last participant has a folder and no uploads yet.
 */
export function createDemoSnapshot(now: Date): ActivitySnapshot {
  const rand = mulberry32(0xa71f01)
  const end = utcDayStart(now.getTime())
  const recordings: RecordingReference[] = []
  let sequence = 1
  for (let ago = 41; ago >= 0; ago -= 1) {
    const count = filesForDay(ago, rand)
    const day = end - ago * DAY_MS
    for (let index = 0; index < count; index += 1) {
      const student = pickStudent(rand)
      const kind = KINDS[Math.floor(rand() * KINDS.length)] ?? KINDS[0]
      const place = PLACES[Math.floor(rand() * PLACES.length)] ?? PLACES[0]
      const hour = 7 + Math.floor(rand() * 13)
      const minute = Math.floor(rand() * 60)
      const created = day + ((hour * 60 + minute) * 60 + Math.floor(rand() * 60)) * 1000
      const modified = created + (2 + Math.floor(rand() * 18)) * 60 * 1000
      const id = `demo-${String(sequence).padStart(3, '0')}`
      sequence += 1
      recordings.push({
        id,
        studentId: student.id,
        filename: `${place}-${String(sequence).padStart(2, '0')}.${kind[0]}`,
        mimeType: kind[1],
        sizeBytes: Math.round(900_000 + rand() * 36_000_000),
        createdTime: new Date(created).toISOString(),
        modifiedTime: new Date(modified).toISOString(),
      })
    }
  }
  return {
    source: 'demo',
    generatedAt: now.toISOString(),
    students: STUDENTS.map((student) => ({ ...student })),
    recordings,
  }
}
