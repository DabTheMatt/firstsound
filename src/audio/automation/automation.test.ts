import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../../app/history'
import { defaultFxLfos, defaultLfoHold, modulateParam } from '../fx/lfo'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { fromNormalized } from '../parameters/mapping'
import {
  applyAutomation,
  automationEffectGroups,
  automationEqual,
  automatedLanes,
  cloneAutomation,
  colorIndexForParam,
  curveUnit,
  defaultAutomation,
  envelopeToParam,
  ensureAutomationLane,
  insertAutomationNode,
  isAutomatableParam,
  lanePolyline,
  laneSamples,
  normalizedFromLaneY,
  parseAutomation,
  relocateAutomationNode,
  removeAutomationLane,
  removeAutomationNode,
  sampleEnvelope,
  selectAutomationParam,
  setAutomationLaneColor,
  updateAutomationCurve,
  updateAutomationTension,
} from './automation'
import { resolvePerformanceParams } from '../parameters/evaluation'

describe('automation envelope', () => {
  it('holds outside the nodes and interpolates linearly between them', () => {
    const nodes = [
      { id: 'b', time: 1, value: 1 },
      { id: 'a', time: 0, value: 0 },
    ]
    expect(sampleEnvelope(nodes, -1)).toBe(0)
    expect(sampleEnvelope(nodes, 0.25)).toBeCloseTo(0.25)
    expect(sampleEnvelope(nodes, 4)).toBe(1)
    expect(sampleEnvelope([], 0)).toBeNull()
  })

  it('maps the lane Y axis into normalized parameter space', () => {
    expect(normalizedFromLaneY(0, 100)).toBe(1)
    expect(normalizedFromLaneY(100, 100)).toBe(0)
    expect(normalizedFromLaneY(25, 100)).toBeCloseTo(0.75)
  })

  it('draws the visible envelope in the same time window as the waveform', () => {
    const nodes = [
      { id: 'a', time: 0, value: 0 },
      { id: 'm', time: 1, value: 0.5 },
      { id: 'b', time: 2, value: 1 },
    ]
    const line = lanePolyline(nodes, 0, 2)
    expect(line.startsWith('0.000,100.000')).toBe(true)
    expect(line).toContain('50.000,50.000')
    expect(line.endsWith('100.000,0.000')).toBe(true)
  })
})

describe('automation parameter mapping', () => {
  const manual = defaultParamValues()

  function lane(paramId: 'gain' | 'filterCutoff' | 'eq1Gain' | 'delayWet', value: number) {
    const doc = selectAutomationParam(defaultAutomation(), paramId)
    const inserted = insertAutomationNode(doc, 0, value, 4, 'n1')
    return inserted!.doc
  }

  it('maps gain in dB, cutoff logarithmically, EQ gain in dB, and delay wet in percent', () => {
    expect(envelopeToParam('gain', 0.5)).toBeCloseTo(-6)
    expect(envelopeToParam('filterCutoff', 0.5)).toBeCloseTo(fromNormalized(0.5, PARAMS.filterCutoff))
    expect(envelopeToParam('filterCutoff', 0.5)).toBeGreaterThan(100)
    expect(envelopeToParam('filterCutoff', 0.5)).toBeLessThan(2000)
    expect(envelopeToParam('eq1Gain', 0.25)).toBeCloseTo(-9)
    expect(envelopeToParam('delayWet', 0.8)).toBeCloseTo(80)

    const cutoff = applyAutomation(manual, lane('filterCutoff', 0), 0)
    expect(cutoff.filterCutoff).toBeCloseTo(PARAMS.filterCutoff.min)
    expect(manual.filterCutoff).not.toBe(cutoff.filterCutoff)
  })

  it('only lists parameters the modulation registry already accepts', () => {
    const ids = automationEffectGroups().flatMap((group) => group.paramIds)
    expect(ids).toContain('gain')
    expect(ids).toContain('filterCutoff')
    expect(ids).toContain('eq1Gain')
    expect(ids).toContain('eq1Freq')
    expect(ids).toContain('delayWet')
    expect(isAutomatableParam('filterKind')).toBe(false)
    expect(isAutomatableParam('start')).toBe(false)
    expect(isAutomatableParam('makeMono')).toBe(false)
  })
})

describe('automation versus manual and LFO', () => {
  it('follows the envelope while playing and keeps the manual value when stopped', () => {
    const manual = defaultParamValues()
    manual.delayWet = 15
    const inserted = insertAutomationNode(
      selectAutomationParam(defaultAutomation(), 'delayWet'),
      0,
      0.8,
      4,
      'wet',
    )!
    const playing = resolvePerformanceParams(manual, inserted.doc, 0, true, defaultFxLfos(), 0, defaultLfoHold())
    const stopped = resolvePerformanceParams(manual, inserted.doc, 0, false, defaultFxLfos(), 0, defaultLfoHold())
    expect(playing.delayWet).toBeCloseTo(80)
    expect(stopped.delayWet).toBe(15)
    expect(manual.delayWet).toBe(15)
    expect(playing.delayDry).toBeCloseTo(20)
  })

  it('lets LFO move around the automated value instead of the stored knob', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 1000
    const inserted = insertAutomationNode(
      selectAutomationParam(defaultAutomation(), 'filterCutoff'),
      0,
      0.5,
      4,
      'cut',
    )!
    const lfos = defaultFxLfos()
    lfos.filter[0] = { rateHz: 1, shape: 'sine', depth: 20, target: 'filterCutoff' }
    const live = resolvePerformanceParams(manual, inserted.doc, 0, true, lfos, 0.25, defaultLfoHold())
    const automated = envelopeToParam('filterCutoff', 0.5)
    expect(live.filterCutoff).toBeCloseTo(modulateParam(automated, 'filterCutoff', 1, 20))
    expect(live.filterCutoff).not.toBeCloseTo(modulateParam(1000, 'filterCutoff', 1, 20))
    expect(manual.filterCutoff).toBe(1000)
  })
})

describe('automation curves', () => {
  const ramp = (curve: 'linear' | 'smooth' | 'step', tension = 0) => [
    { id: 'a', time: 0, value: 0.2, curve, tension },
    { id: 'b', time: 1, value: 0.8 },
  ]

  it('keeps linear segments on a straight ramp', () => {
    expect(sampleEnvelope(ramp('linear'), 0.25)).toBeCloseTo(0.35)
    expect(sampleEnvelope(ramp('linear'), 0.5)).toBeCloseTo(0.5)
  })

  it('holds the previous value in step mode until the next node', () => {
    const nodes = ramp('step')
    expect(sampleEnvelope(nodes, 0)).toBeCloseTo(0.2)
    expect(sampleEnvelope(nodes, 0.999)).toBeCloseTo(0.2)
    expect(sampleEnvelope(nodes, 1)).toBeCloseTo(0.8)
    const line = lanePolyline(nodes, 0, 1)
    expect(line).toContain('100.000,80.000')
    expect(line).toContain('100.000,20.000')
  })

  it('keeps smooth curves monotonic and inside the endpoint range', () => {
    for (const tension of [-1, -0.4, 0, 0.4, 1]) {
      const nodes = ramp('smooth', tension)
      let previous = -1
      for (let i = 0; i <= 16; i++) {
        const value = sampleEnvelope(nodes, i / 16)!
        expect(value).toBeGreaterThanOrEqual(0.2 - 1e-9)
        expect(value).toBeLessThanOrEqual(0.8 + 1e-9)
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
        previous = value
      }
      expect(curveUnit(0, 'smooth', tension)).toBe(0)
      expect(curveUnit(1, 'smooth', tension)).toBe(1)
    }
    expect(curveUnit(0.5, 'smooth', 1)).toBeGreaterThan(curveUnit(0.5, 'smooth', 0))
    expect(curveUnit(0.5, 'smooth', -1)).toBeLessThan(curveUnit(0.5, 'smooth', 0))
  })

  it('draws each smooth sample from the same value playback evaluates', () => {
    const nodes = ramp('smooth', 0.65)
    for (const sample of laneSamples(nodes, 0, 1)) {
      expect(sample.value).toBeCloseTo(sampleEnvelope(nodes, sample.time)!)
    }
  })

  it('changes only the selected segment and keeps the drawn line on the playback curve', () => {
    const first = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'gain'), 0, 0.2, 3, 'a')!
    const second = insertAutomationNode(first.doc, 1, 0.8, 3, 'b')!
    const third = insertAutomationNode(second.doc, 2, 0.3, 3, 'c')!
    const stepped = updateAutomationCurve(third.doc, 'a', 'step')
    const nodes = stepped.lanes[0]!.nodes
    expect(nodes.find((node) => node.id === 'a')?.curve).toBe('step')
    expect(nodes.find((node) => node.id === 'b')?.curve).toBeUndefined()
    expect(sampleEnvelope(nodes, 0.5)).toBeCloseTo(0.2)
    expect(sampleEnvelope(nodes, 1.5)).toBeCloseTo(0.55)
    const smoothed = updateAutomationCurve(stepped, 'b', 'smooth')
    const both = smoothed.lanes[0]!.nodes
    expect(both.find((node) => node.id === 'a')?.curve).toBe('step')
    expect(both.find((node) => node.id === 'b')?.curve).toBe('smooth')
    expect(sampleEnvelope(both, 0.5)).toBeCloseTo(0.2)
    const smoothMid = sampleEnvelope(both, 1.5)
    expect(smoothMid).toBeGreaterThan(0.3)
    expect(smoothMid).toBeLessThan(0.8)
    for (const sample of laneSamples(both, 0, 2)) {
      const played = sampleEnvelope(both, sample.time)!
      const stepRiser = Math.abs(sample.time - 1) <= 1e-6 && Math.abs(sample.value - 0.2) < 1e-6
      if (stepRiser) continue
      expect(sample.value).toBeCloseTo(played)
    }
    expect(lanePolyline(both, 0, 2)).toBe(
      laneSamples(both, 0, 2)
        .map((point) => {
          const x = (point.time / 2) * 100
          const y = (1 - point.value) * 100
          return `${x.toFixed(3)},${y.toFixed(3)}`
        })
        .join(' '),
    )
  })

  it('stores curve and tension on the segment and restores them from old linear saves', () => {
    const inserted = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'gain'), 0, 0.2, 2, 'a')!
    const withEnd = insertAutomationNode(inserted.doc, 1, 0.8, 2, 'b')!
    const curved = updateAutomationCurve(withEnd.doc, 'a', 'smooth')
    const shaped = updateAutomationTension(curved, 'a', 0.4)
    expect(sampleEnvelope(shaped.lanes[0]!.nodes, 0.5)).toBeGreaterThan(0.5)
    expect(updateAutomationTension(shaped, 'a', 0.4)).toBe(shaped)
    const legacy = parseAutomation({
      selectedParamId: 'gain',
      lanes: [{ paramId: 'gain', nodes: [{ id: 'a', time: 0, value: 0 }, { id: 'b', time: 1, value: 1 }] }],
    })
    expect(legacy.lanes[0]?.nodes[0]?.curve).toBeUndefined()
    expect(sampleEnvelope(legacy.lanes[0]!.nodes, 0.5)).toBeCloseTo(0.5)
    const round = parseAutomation(JSON.parse(JSON.stringify(cloneAutomation(shaped))))
    expect(automationEqual(round, shaped)).toBe(true)
  })
})

describe('automation lanes, colors, and undo', () => {
  function withNode(doc: ReturnType<typeof defaultAutomation>, paramId: 'gain' | 'filterCutoff' | 'eq1Gain' | 'delayWet', id: string, value: number) {
    const selected = selectAutomationParam(doc, paramId)
    return insertAutomationNode(selected, 0, value, 4, id)!.doc
  }

  it('evaluates every lane while selection only chooses the edited envelope', () => {
    let doc = withNode(defaultAutomation(), 'gain', 'g', 1)
    doc = withNode(doc, 'filterCutoff', 'c', 0)
    doc = withNode(doc, 'eq1Gain', 'e', 0.75)
    doc = withNode(doc, 'delayWet', 'w', 0.8)
    doc = selectAutomationParam(doc, 'delayWet')
    const manual = defaultParamValues()
    const live = resolvePerformanceParams(manual, doc, 0, true, defaultFxLfos(), 0, defaultLfoHold())
    expect(automatedLanes(doc).map((lane) => lane.paramId)).toEqual(['delayWet', 'filterCutoff', 'eq1Gain', 'gain'])
    expect(live.gain).toBeCloseTo(envelopeToParam('gain', 1))
    expect(live.filterCutoff).toBeCloseTo(PARAMS.filterCutoff.min)
    expect(live.eq1Gain).toBeCloseTo(envelopeToParam('eq1Gain', 0.75))
    expect(live.delayWet).toBeCloseTo(80)
    expect(live.delayDry).toBeCloseTo(20)
    expect(doc.selectedParamId).toBe('delayWet')
    const colors = new Set(doc.lanes.map((lane) => lane.colorIndex))
    expect(colors.size).toBe(4)
    expect(colorIndexForParam(doc, 'gain')).toBe(doc.lanes.find((lane) => lane.paramId === 'gain')?.colorIndex)
  })

  it('adds one flat lane and refuses a second lane for the same parameter', () => {
    const armed = ensureAutomationLane(defaultAutomation(), 'filterCutoff', 0.35, 3)
    expect(armed.selectedParamId).toBe('filterCutoff')
    expect(armed.lanes).toHaveLength(1)
    expect(armed.lanes[0]?.nodes).toHaveLength(2)
    expect(sampleEnvelope(armed.lanes[0]!.nodes, 1.2)).toBeCloseTo(0.35)
    const again = ensureAutomationLane(armed, 'filterCutoff', 0.9, 3)
    expect(again.lanes[0]?.nodes).toHaveLength(2)
    expect(sampleEnvelope(again.lanes[0]!.nodes, 1.2)).toBeCloseTo(0.35)
    const extra = ensureAutomationLane(again, 'delayWet', 0.1, 3)
    expect(extra.lanes).toHaveLength(2)
    expect(extra.selectedParamId).toBe('delayWet')
    let history = createHistory(cloneAutomation(defaultAutomation()))
    history = commitHistory(history, armed, automationEqual)
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    expect(history.present.lanes).toEqual([])
    history = redoHistory(history)
    expect(history.present.lanes).toHaveLength(1)
  })

  it('recolors a lane without changing playback, and the color survives reload and undo', () => {
    const inserted = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'filterCutoff'), 0, 0.2, 2, 'a')!
    const ended = insertAutomationNode(inserted.doc, 1, 0.8, 2, 'b')!
    const doc = updateAutomationCurve(ended.doc, 'a', 'smooth')
    const before = sampleEnvelope(doc.lanes[0]!.nodes, 0.4)
    if (before == null) throw new Error('expected an envelope sample')
    const manual = defaultParamValues()
    const liveBefore = resolvePerformanceParams(manual, doc, 0.4, true, defaultFxLfos(), 0, defaultLfoHold())
    const current = doc.lanes[0]?.colorIndex ?? 0
    const next = current === 5 ? 6 : 5
    const colored = setAutomationLaneColor(doc, 'filterCutoff', next)
    expect(colored.lanes[0]?.colorIndex).toBe(next)
    expect(colored.lanes[0]?.nodes).toBe(doc.lanes[0]?.nodes)
    expect(colored.selectedParamId).toBe(doc.selectedParamId)
    expect(sampleEnvelope(colored.lanes[0]!.nodes, 0.4)).toBeCloseTo(before)
    const liveAfter = resolvePerformanceParams(manual, colored, 0.4, true, defaultFxLfos(), 0, defaultLfoHold())
    expect(liveAfter.filterCutoff).toBeCloseTo(liveBefore.filterCutoff)
    const stepped = updateAutomationCurve(colored, 'a', 'step')
    expect(stepped.lanes[0]?.colorIndex).toBe(next)
    expect(sampleEnvelope(stepped.lanes[0]!.nodes, 0.4)).toBeCloseTo(0.2)
    const loaded = parseAutomation(JSON.parse(JSON.stringify(cloneAutomation(colored))))
    expect(loaded.lanes.find((lane) => lane.paramId === 'filterCutoff')?.colorIndex).toBe(next)
    expect(setAutomationLaneColor(colored, 'filterCutoff', next)).toBe(colored)
    expect(setAutomationLaneColor(colored, 'filterCutoff', -1)).toBe(colored)
    expect(setAutomationLaneColor(colored, 'gain', 2)).toBe(colored)
    let history = createHistory(cloneAutomation(doc))
    history = commitHistory(history, cloneAutomation(colored), automationEqual)
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    expect(history.present.lanes[0]?.colorIndex).toBe(doc.lanes[0]?.colorIndex)
    history = redoHistory(history)
    expect(history.present.lanes[0]?.colorIndex).toBe(next)
  })

  it('keeps a parameter color stable when another lane is added and after reload', () => {
    const first = withNode(defaultAutomation(), 'filterCutoff', 'c', 0.5)
    const color = first.lanes[0]?.colorIndex
    const both = withNode(first, 'delayWet', 'w', 0.2)
    expect(both.lanes.find((lane) => lane.paramId === 'filterCutoff')?.colorIndex).toBe(color)
    const again = withNode(defaultAutomation(), 'filterCutoff', 'c2', 0.5)
    expect(again.lanes[0]?.colorIndex).toBe(color)
    const loaded = parseAutomation(cloneAutomation(both))
    expect(loaded.lanes.find((lane) => lane.paramId === 'filterCutoff')?.colorIndex).toBe(color)
  })

  it('removes only the envelope and records one undo step for a curve edit', () => {
    let doc = withNode(defaultAutomation(), 'gain', 'g', 0.25)
    doc = withNode(doc, 'delayWet', 'w', 0.5)
    const removed = removeAutomationLane(doc, 'gain')
    expect(removed.lanes.map((lane) => lane.paramId)).toEqual(['delayWet'])
    expect(removeAutomationLane(removed, 'gain')).toBe(removed)

    const inserted = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'eq1Gain'), 0, 0.2, 2, 'a')!
    const ended = insertAutomationNode(inserted.doc, 1, 0.9, 2, 'b')!
    let history = createHistory(cloneAutomation(ended.doc))
    const curved = updateAutomationCurve(ended.doc, 'a', 'step')
    history = commitHistory(history, curved, automationEqual)
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    expect(sampleEnvelope(history.present.lanes[0]!.nodes, 0.5)).toBeCloseTo(0.55)
    history = redoHistory(history)
    expect(sampleEnvelope(history.present.lanes[0]!.nodes, 0.5)).toBeCloseTo(0.2)

    let drag = createHistory(cloneAutomation(curved))
    let working = curved
    working = updateAutomationCurve(working, 'a', 'smooth')
    working = updateAutomationTension(working, 'a', 0.2)
    working = updateAutomationTension(working, 'a', 0.8)
    drag = commitHistory(drag, working, automationEqual)
    expect(drag.past).toHaveLength(1)
    drag = undoHistory(drag)
    expect(sampleEnvelope(drag.present.lanes[0]!.nodes, 0.5)).toBeCloseTo(0.2)
  })

  it('still lets an LFO move around the automated value when other lanes exist', () => {
    let doc = withNode(defaultAutomation(), 'gain', 'g', 0.4)
    doc = withNode(doc, 'filterCutoff', 'c', 0.5)
    const manual = defaultParamValues()
    manual.filterCutoff = 1000
    const lfos = defaultFxLfos()
    lfos.filter[0] = { rateHz: 1, shape: 'sine', depth: 20, target: 'filterCutoff' }
    const live = resolvePerformanceParams(manual, doc, 0, true, lfos, 0.25, defaultLfoHold())
    const automated = envelopeToParam('filterCutoff', 0.5)
    expect(live.filterCutoff).toBeCloseTo(modulateParam(automated, 'filterCutoff', 1, 20))
    expect(live.gain).toBeCloseTo(envelopeToParam('gain', 0.4))
    expect(manual.filterCutoff).toBe(1000)
  })
})

describe('automation editing and persistence', () => {
  it('adds, moves, and deletes a node on the selected parameter', () => {
    const selected = selectAutomationParam(defaultAutomation(), 'eq1Freq')
    const added = insertAutomationNode(selected, 1.2, 1.4, 3, 'a')!
    expect(added.doc.lanes[0]?.nodes[0]).toMatchObject({ id: 'a', time: 1.2, value: 1 })
    const moved = relocateAutomationNode(added.doc, 'a', 2, 0.2, 3)
    expect(moved.lanes[0]?.nodes[0]).toMatchObject({ time: 2, value: 0.2 })
    expect(relocateAutomationNode(moved, 'a', 2, 0.2, 3)).toBe(moved)
    const removed = removeAutomationNode(moved, 'a')
    expect(removed.lanes).toEqual([])
  })

  it('records one undo step for a whole drag', () => {
    const start = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'gain'), 0.2, 0.4, 2, 'g')!.doc
    let history = createHistory(cloneAutomation(start))
    let working = start
    working = relocateAutomationNode(working, 'g', 0.4, 0.5, 2)
    working = relocateAutomationNode(working, 'g', 0.8, 0.9, 2)
    history = commitHistory(history, working, automationEqual)
    expect(history.past).toHaveLength(1)
    history = undoHistory(history)
    expect(history.present.lanes[0]?.nodes[0]?.time).toBeCloseTo(0.2)
    history = redoHistory(history)
    expect(history.present.lanes[0]?.nodes[0]?.time).toBeCloseTo(0.8)
  })

  it('loads projects that have no automation and ignores unsafe parameters', () => {
    expect(automationEqual(parseAutomation(undefined), defaultAutomation())).toBe(true)
    const parsed = parseAutomation({
      selectedParamId: 'start',
      lanes: [
        { paramId: 'makeMono', nodes: [{ id: 'x', time: 0, value: 1 }] },
        { paramId: 'delayWet', nodes: [{ id: 'w', time: 0.5, value: 2 }, { time: Number.NaN, value: 0.2 }] },
      ],
    })
    expect(parsed.selectedParamId).toBe('gain')
    expect(parsed.lanes).toHaveLength(1)
    expect(parsed.lanes[0]?.paramId).toBe('delayWet')
    expect(parsed.lanes[0]?.nodes[0]?.value).toBe(1)
    const again = parseAutomation(cloneAutomation(parsed))
    expect(automationEqual(again, parsed)).toBe(true)
  })
})
