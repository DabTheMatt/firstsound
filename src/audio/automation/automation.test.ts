import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../../app/history'
import { defaultFxLfos, defaultLfoHold, modulateParam } from '../fx/lfo'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { fromNormalized } from '../parameters/mapping'
import {
  applyAutomation,
  automationEffectGroups,
  automationEqual,
  cloneAutomation,
  defaultAutomation,
  envelopeToParam,
  insertAutomationNode,
  isAutomatableParam,
  lanePolyline,
  normalizedFromLaneY,
  parseAutomation,
  relocateAutomationNode,
  removeAutomationNode,
  resolvePerformanceParams,
  sampleEnvelope,
  selectAutomationParam,
} from './automation'

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
