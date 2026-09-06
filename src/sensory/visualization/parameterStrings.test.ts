import { describe, expect, it } from 'vitest'
import { SENSORY_AXIS_IDS } from '../sensoryParameters'
import {
  amountToT,
  distToString,
  layoutParameterStrings,
  nearestString,
  pointAlong,
  projectT,
  stringIntersections,
  stringLabelPose,
  tToAmount,
} from './parameterStrings'

describe('parameterStrings', () => {
  const geoms = layoutParameterStrings(1200, 800)

  it('lays out one labeled string per sensory axis', () => {
    expect(geoms.map((g) => g.id)).toEqual([...SENSORY_AXIS_IDS])
    expect(new Set(geoms.map((g) => g.id)).size).toBe(SENSORY_AXIS_IDS.length)
  })

  it('keeps endpoints inside the padded frame', () => {
    for (const g of geoms) {
      expect(g.x1).toBeGreaterThanOrEqual(35)
      expect(g.x2).toBeGreaterThanOrEqual(35)
      expect(g.x1).toBeLessThanOrEqual(1200 - 215)
      expect(g.x2).toBeLessThanOrEqual(1200 - 215)
      expect(g.y1).toBeGreaterThanOrEqual(87)
      expect(g.y2).toBeGreaterThanOrEqual(87)
      expect(g.y1).toBeLessThanOrEqual(800 - 103)
      expect(g.y2).toBeLessThanOrEqual(800 - 103)
    }
  })

  it('spreads crossings instead of collapsing every string through the center', () => {
    const cx = (36 + (1200 - 216)) / 2
    const cy = (88 + (800 - 104)) / 2
    const throughCenter = geoms.filter((g) => distToString(g, cx, cy) < 10)
    expect(throughCenter.length).toBeLessThan(3)
  })

  it('crosses strings so the field reads as a web', () => {
    const hits = stringIntersections(geoms)
    expect(hits.length).toBeGreaterThan(8)
    for (const hit of hits) {
      expect(hit.x).toBeGreaterThan(40)
      expect(hit.x).toBeLessThan(1200)
      expect(hit.y).toBeGreaterThan(80)
      expect(hit.y).toBeLessThan(800)
      expect(hit.a).not.toBe(hit.b)
    }
  })

  it('maps bipolar rest to the string midpoint', () => {
    expect(amountToT(0, 'bipolar')).toBeCloseTo(0.5)
    expect(tToAmount(0.5, 'bipolar')).toBeCloseTo(0)
    expect(tToAmount(1, 'bipolar')).toBeCloseTo(1)
    expect(tToAmount(0, 'bipolar')).toBeCloseTo(-1)
  })

  it('maps unipolar amount along the string from start to end', () => {
    expect(amountToT(0, 'unipolar')).toBeCloseTo(0)
    expect(amountToT(1, 'unipolar')).toBeCloseTo(1)
    expect(tToAmount(0.4, 'unipolar')).toBeCloseTo(0.4)
  })

  it('projects a pointer onto the closest string', () => {
    const space = geoms.find((g) => g.id === 'space')!
    const nearStart = pointAlong(space, 0.06)
    expect(projectT(space, nearStart.x, nearStart.y)).toBeCloseTo(0.06)
    expect(distToString(space, nearStart.x, nearStart.y)).toBeLessThan(0.5)
    const hit = nearestString(geoms, nearStart.x, nearStart.y, 24)
    expect(hit?.id).toBe('space')
    expect(nearestString(geoms, 0, 0, 8)).toBeNull()
  })

  it('places a label nearer the start than the end of each string', () => {
    const character = geoms.find((g) => g.id === 'character')!
    const pose = stringLabelPose(character)
    const start = pointAlong(character, 0)
    const end = pointAlong(character, 1)
    expect(Math.hypot(pose.x - start.x, pose.y - start.y)).toBeLessThan(
      Math.hypot(pose.x - end.x, pose.y - end.y),
    )
    expect(Math.abs(pose.angle)).toBeLessThanOrEqual(90)
  })
})
