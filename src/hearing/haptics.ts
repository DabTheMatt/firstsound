/**
 * Optional haptic channel. Patterns fire on events, never as a continuous buzz.
 * Unsupported browsers report availability honestly.
 */

import type { HearingBandId } from './bands'
import type { HapticIntensity } from './settings'

export type HapticKind = 'transient' | 'beat' | 'clip' | 'loop' | 'selection' | 'frequency'

export type VibrationApi = (pattern: number | number[]) => boolean

/** Milliseconds that must elapse between pulses. Dense audio cannot retrigger. */
export const HAPTIC_MIN_GAP_MS: Record<HapticIntensity, number> = {
  off: Infinity,
  low: 420,
  medium: 240,
  high: 140,
}

const PULSE_MS: Record<HapticIntensity, number> = {
  off: 0,
  low: 8,
  medium: 14,
  high: 22,
}

/**
 * The Vibration API is present when `vibrate` is a function.
 * Calling it here would cancel a pulse and, before a user gesture, can report false.
 * A later `fireHaptic` call is what checks whether this device accepts a pattern.
 */
export function vibrationSupported(
  nav?: { vibrate?: VibrationApi } | null,
): boolean {
  const target = nav === undefined ? (typeof navigator === 'undefined' ? null : navigator) : nav
  return typeof target?.vibrate === 'function'
}

export function hapticPattern(kind: HapticKind, intensity: HapticIntensity, band?: HearingBandId): number[] {
  if (intensity === 'off') return []
  const pulse = PULSE_MS[intensity]
  if (kind === 'clip') return [pulse, 36, pulse]
  if (kind === 'loop' || kind === 'selection') return [Math.max(6, pulse - 4)]
  if (kind === 'beat') return [pulse + 6]
  if (kind === 'frequency') {
    if (band === 'sub' || band === 'bass') return [pulse + 18, 28, pulse + 10]
    if (band === 'high' || band === 'air') return [6, 18, 6, 18, 6]
    return [pulse]
  }
  return [pulse]
}

export function hapticGapMs(intensity: HapticIntensity, experimentalFrequency: boolean): number {
  const base = HAPTIC_MIN_GAP_MS[intensity]
  if (!Number.isFinite(base)) return base
  return experimentalFrequency ? Math.max(base, 280) : base
}

export function shouldPulse(nowMs: number, lastPulseMs: number, intensity: HapticIntensity, experimentalFrequency = false): boolean {
  if (intensity === 'off') return false
  const gap = hapticGapMs(intensity, experimentalFrequency)
  return nowMs - lastPulseMs >= gap
}

export type HapticFireResult = {
  fired: boolean
  reason: 'ok' | 'off' | 'unsupported' | 'rate-limited' | 'empty'
}

export function fireHaptic(
  kind: HapticKind,
  intensity: HapticIntensity,
  nowMs: number,
  lastPulseMs: number,
  vibrate: VibrationApi | null,
  band?: HearingBandId,
): { result: HapticFireResult; lastPulseMs: number } {
  if (intensity === 'off') return { result: { fired: false, reason: 'off' }, lastPulseMs }
  if (!vibrate) return { result: { fired: false, reason: 'unsupported' }, lastPulseMs }
  if (!shouldPulse(nowMs, lastPulseMs, intensity, kind === 'frequency')) {
    return { result: { fired: false, reason: 'rate-limited' }, lastPulseMs }
  }
  const pattern = hapticPattern(kind, intensity, band)
  if (pattern.length === 0) return { result: { fired: false, reason: 'empty' }, lastPulseMs }
  const ok = vibrate(pattern)
  if (!ok) return { result: { fired: false, reason: 'unsupported' }, lastPulseMs }
  return { result: { fired: true, reason: 'ok' }, lastPulseMs: nowMs }
}
