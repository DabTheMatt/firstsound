import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../../app/history'
import { timeToFrac } from '../../components/waveform/viewport'
import { markerLabelVisibility, markerLeftPercent } from '../../components/markers/placement'
import {
  appendMarker,
  editMarker,
  markersEqual,
  markerSourcesCompatible,
  neighborMarker,
  nextMarkerName,
  parseMarkerDocument,
  remapUserMarkers,
  removeMarker,
  sortMarkers,
  type AudioMarker,
} from './markers'

const label = (index: number) => `Marker ${index}`

describe('user markers', () => {
  it('adds, renames, describes, retimes, and deletes without reusing array position as identity', () => {
    const added = appendMarker([], { id: 'a', timeSeconds: 1.25, name: '  Voice  ' }, 4)
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(added.id).toBe('a')
    expect(added.markers[0]).toEqual({ id: 'a', timeSeconds: 1.25, name: 'Voice' })

    const named = editMarker(added.markers, 'a', { name: 'Beginning of voice' }, 4)
    expect(named.ok).toBe(true)
    if (!named.ok) return
    expect(named.markers[0]?.id).toBe('a')
    expect(named.markers[0]?.name).toBe('Beginning of voice')

    const described = editMarker(named.markers, 'a', { description: '  entrance  ' }, 4)
    expect(described.ok).toBe(true)
    if (!described.ok) return
    expect(described.markers[0]?.id).toBe('a')
    expect(described.markers[0]?.description).toBe('entrance')

    const moved = editMarker(described.markers, 'a', { timeSeconds: 2 }, 4)
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    expect(moved.markers[0]?.id).toBe('a')
    expect(moved.markers[0]?.timeSeconds).toBe(2)

    const cleared = editMarker(moved.markers, 'a', { description: '   ' }, 4)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect(cleared.markers[0]?.description).toBeUndefined()
    expect(removeMarker(cleared.markers, 'a')).toEqual([])
    expect(removeMarker(cleared.markers, 'missing')).toBeNull()
  })

  it('rejects invalid times and does not move the marker', () => {
    const start = appendMarker([], { id: 'edge', timeSeconds: 0, name: 'Start' }, 2)
    expect(start.ok).toBe(true)
    const end = appendMarker([], { id: 'end', timeSeconds: 2, name: 'End' }, 2)
    expect(end.ok).toBe(true)
    expect(appendMarker([], { timeSeconds: -0.2, name: 'No' }, 2).ok).toBe(false)
    expect(appendMarker([], { timeSeconds: 2.5, name: 'No' }, 2).ok).toBe(false)
    expect(appendMarker([], { timeSeconds: Number.NaN, name: 'No' }, 2).ok).toBe(false)
    expect(appendMarker([], { timeSeconds: 1, name: '   ' }, 2).ok).toBe(false)
    expect(appendMarker([], { timeSeconds: 1, name: 'No' }, 0).ok).toBe(false)
    if (!start.ok) return
    const rejected = editMarker(start.markers, 'edge', { timeSeconds: 9, name: 'Elsewhere' }, 2)
    expect(rejected.ok).toBe(false)
    expect(start.markers[0]).toEqual({ id: 'edge', timeSeconds: 0, name: 'Start' })
  })

  it('sorts by time and keeps equal times in their previous order', () => {
    const markers: AudioMarker[] = [
      { id: 'b', timeSeconds: 1, name: 'Second' },
      { id: 'a', timeSeconds: 1, name: 'First' },
      { id: 'c', timeSeconds: 0.2, name: 'Early' },
    ]
    expect(sortMarkers(markers).map((marker) => marker.id)).toEqual(['c', 'b', 'a'])
    const again = appendMarker(markers, { id: 'd', timeSeconds: 1, name: 'Third' }, 3)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.markers.map((marker) => marker.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('names the next free marker and does not wrap navigation', () => {
    expect(nextMarkerName([], label)).toBe('Marker 1')
    expect(nextMarkerName([{ id: '1', timeSeconds: 0, name: 'Marker 1' }], label)).toBe('Marker 2')
    const markers: AudioMarker[] = [
      { id: '1', timeSeconds: 0.5, name: 'One' },
      { id: '2', timeSeconds: 0.5, name: 'Two' },
      { id: '3', timeSeconds: 2, name: 'Three' },
    ]
    expect(neighborMarker(markers, 0, -1)).toBeNull()
    expect(neighborMarker(markers, 0, 1)?.id).toBe('1')
    expect(neighborMarker(markers, 0.5, 1, '1')?.id).toBe('2')
    expect(neighborMarker(markers, 0.5, 1, '2')?.id).toBe('3')
    expect(neighborMarker(markers, 2, 1, '3')).toBeNull()
    expect(neighborMarker(markers, 2, -1)?.id).toBe('2')
  })

  it('follows a timeline edit and drops a marker that lived in deleted audio', () => {
    const markers: AudioMarker[] = [
      { id: 'keep', timeSeconds: 0.2, name: 'Keep' },
      { id: 'gone', timeSeconds: 1.2, name: 'Gone' },
      { id: 'after', timeSeconds: 2.2, name: 'After' },
    ]
    const inserted = remapUserMarkers(markers, { kind: 'insert', atSec: 1, deltaSec: 1 })
    expect(inserted.map((marker) => [marker.id, marker.timeSeconds])).toEqual([
      ['keep', 0.2],
      ['gone', 2.2],
      ['after', 3.2],
    ])
    const cut = remapUserMarkers(markers, { kind: 'delete', startSec: 1, endSec: 2 })
    expect(cut.map((marker) => marker.id)).toEqual(['keep', 'after'])
    expect(cut[1]?.timeSeconds).toBeCloseTo(1.2)
  })

  it('round-trips a preset and skips malformed entries without relocating them', () => {
    const parsed = parseMarkerDocument({
      source: { id: 'src-1', fileName: 'take.wav', sampleRate: 48000, duration: 4 },
      markers: [
        { id: 'ok', timeSeconds: 1, name: 'Bass', description: 'entrance' },
        { id: 'ok', timeSeconds: 1.2, name: 'Duplicate id' },
        { id: 'bad', timeSeconds: 9, name: 'Too late' },
        { timeSeconds: 1, name: 'No id' },
        { id: 'blank', timeSeconds: 1, name: '   ' },
        { id: 'end', timeSeconds: 4, name: 'End' },
      ],
    })
    expect(parsed?.markers.map((marker) => marker.id)).toEqual(['ok', 'end'])
    expect(parsed?.markers[0]?.description).toBe('entrance')
    expect(parseMarkerDocument(null)).toBeNull()
    expect(parseMarkerDocument({ markers: [] })).toBeNull()
    expect(parseMarkerDocument({ source: { id: '', fileName: 'a', sampleRate: 1, duration: 1 }, markers: [] })).toBeNull()
  })

  it('does not treat a different file as the same marker source', () => {
    const saved = { id: 'src-a', fileName: 'a.wav', sampleRate: 48000, duration: 2 }
    expect(markerSourcesCompatible(saved, { ...saved })).toBe(true)
    expect(markerSourcesCompatible(saved, { id: 'src-b', fileName: 'a.wav', sampleRate: 48000, duration: 2 })).toBe(true)
    expect(markerSourcesCompatible(saved, { id: 'src-b', fileName: 'b.wav', sampleRate: 48000, duration: 2 })).toBe(false)
    expect(markerSourcesCompatible(saved, { id: 'src-b', fileName: 'a.wav', sampleRate: 44100, duration: 2 })).toBe(false)
    expect(markerSourcesCompatible(saved, { id: 'src-b', fileName: 'a.wav', sampleRate: 48000, duration: 3 })).toBe(false)
    expect(markerSourcesCompatible(saved, { id: 'src-a', fileName: 'other.wav', sampleRate: 8000, duration: 9 })).toBe(true)
    expect(markerSourcesCompatible({ ...saved, fileName: '' }, { id: 'src-b', fileName: '', sampleRate: 48000, duration: 2 })).toBe(false)
  })

  it('undo and redo a marker list on the shared history stack', () => {
    const eq = markersEqual
    let history = createHistory<AudioMarker[]>([])
    const added = appendMarker([], { id: 'a', timeSeconds: 1, name: 'Marker 1' }, 4)
    expect(added.ok).toBe(true)
    if (!added.ok) return
    history = commitHistory(history, added.markers, eq)
    const renamed = editMarker(added.markers, 'a', { name: 'Bass entrance' }, 4)
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return
    history = commitHistory(history, renamed.markers, eq)
    history = undoHistory(history)
    expect(history.present[0]?.name).toBe('Marker 1')
    expect(history.present[0]?.id).toBe('a')
    history = undoHistory(history)
    expect(history.present).toEqual([])
    history = redoHistory(history)
    expect(history.present[0]?.name).toBe('Marker 1')
    history = redoHistory(history)
    expect(history.present[0]?.name).toBe('Bass entrance')
  })
})

describe('marker alignment', () => {
  it('uses the waveform time fraction while zooming and scrolling', () => {
    const wide = { start: 0, end: 8 }
    const zoomed = { start: 2, end: 4 }
    const scrolled = { start: 3, end: 7 }
    for (const view of [wide, zoomed, scrolled]) {
      expect(markerLeftPercent(3, view)).toBe(timeToFrac(3, view) * 100)
    }
    expect(markerLeftPercent(3, zoomed)).toBe(50)
    expect(markerLeftPercent(5, scrolled)).toBe(50)
    const labels = markerLabelVisibility(
      [
        { id: 'a', fraction: 0.1 },
        { id: 'b', fraction: 0.12 },
        { id: 'c', fraction: 0.4 },
        { id: 'd', fraction: 1.4 },
      ],
      0.1,
    )
    expect(labels).toEqual(['a', 'c'])
  })
})
