import { describe, expect, it } from 'vitest'
import {
  cpuPercentFromLagMs,
  cpuPercentFromPressure,
  ema,
  formatBytes,
  formatCpu,
  formatMemory,
} from './runtimeStats'

describe('formatBytes', () => {
  it('uses compact units', () => {
    expect(formatBytes(800)).toBe('800 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(4.5 * 1024 * 1024)).toBe('4.5 MB')
    expect(formatBytes(12 * 1024 * 1024)).toBe('12 MB')
  })
})

describe('formatMemory', () => {
  it('shows used heap when the sample is present', () => {
    expect(formatMemory({ usedBytes: 24 * 1024 * 1024, limitBytes: null })).toBe('Mem 24 MB')
  })

  it('hides the figure when the browser does not expose heap use', () => {
    expect(formatMemory({ usedBytes: null, limitBytes: null })).toBe('Mem —')
  })
})

describe('formatCpu', () => {
  it('rounds a measured event-loop load', () => {
    expect(formatCpu({ percent: 18.4, source: 'lag' })).toBe('UI 18%')
  })

  it('does not present Compute Pressure nominal as a CPU percentage', () => {
    expect(formatCpu({ percent: cpuPercentFromPressure('nominal'), source: 'pressure' })).toBe('UI —')
    expect(formatCpu({ percent: null, source: 'none' })).toBe('UI —')
  })
})

describe('cpuPercentFromPressure', () => {
  it('records the old nominal mapping that stuck the meter at 12%', () => {
    expect(cpuPercentFromPressure('nominal')).toBe(12)
    expect(cpuPercentFromPressure('critical')).toBe(94)
  })
})

describe('cpuPercentFromLagMs', () => {
  it('treats a near-immediate ping as idle', () => {
    expect(cpuPercentFromLagMs(1)).toBe(0)
  })

  it('climbs toward 100% as the event loop stalls', () => {
    expect(cpuPercentFromLagMs(42)).toBeGreaterThan(40)
    expect(cpuPercentFromLagMs(200)).toBe(100)
  })
})

describe('ema', () => {
  it('starts at the first sample', () => {
    expect(ema(null, 20)).toBe(20)
  })
})
