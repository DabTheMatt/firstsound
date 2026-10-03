import { describe, expect, it } from 'vitest'
import { TRACK_MIX_MAX, TRACK_MIX_MIN } from './tracks'
import {
  TRACK_MIXER_PARAMS,
  formatMixerDb,
  formatPan,
  parseTrackMixerParamId,
  trackMixerParamId,
  trackMixerParamValue,
} from './mixerParams'

describe('track mixer parameter ids', () => {
  it('uses the track id, not the lane index', () => {
    expect(trackMixerParamId('track-3', 'pan')).toBe('track:track-3:pan')
    expect(trackMixerParamId('track-3', 'volume')).toBe('track:track-3:volume')
    expect(trackMixerParamId('track-3', 'midGain')).toBe('track:track-3:midGain')
    expect(trackMixerParamId('track-3', 'sideGain')).toBe('track:track-3:sideGain')
    const parsed = parseTrackMixerParamId('track:track-3:sideGain')
    expect(parsed).toEqual({ trackId: 'track-3', key: 'sideGain' })
    expect(parseTrackMixerParamId('track:2:pan')).toEqual({ trackId: '2', key: 'pan' })
    expect(parseTrackMixerParamId('pan')).toBeNull()
  })

  it('keeps volume on the existing mix range and mid/side on the effect range', () => {
    expect(TRACK_MIXER_PARAMS.volume.min).toBe(TRACK_MIX_MIN)
    expect(TRACK_MIXER_PARAMS.volume.max).toBe(TRACK_MIX_MAX)
    expect(TRACK_MIXER_PARAMS.volume.defaultValue).toBe(100)
    expect(TRACK_MIXER_PARAMS.midGain).toMatchObject({ min: -60, max: 12, defaultValue: 0 })
    expect(TRACK_MIXER_PARAMS.sideGain.defaultValue).toBe(0)
    expect(TRACK_MIXER_PARAMS.pan).toMatchObject({ min: -100, max: 100, defaultValue: 0 })
  })

  it('reads mixer numbers from the track fields', () => {
    const track = { mix: 80, pan: -20, midDb: 3, sideDb: -6, muted: true, solo: false }
    expect(trackMixerParamValue(track, 'volume')).toBe(80)
    expect(trackMixerParamValue(track, 'pan')).toBe(-20)
    expect(trackMixerParamValue(track, 'midGain')).toBe(3)
    expect(trackMixerParamValue(track, 'sideGain')).toBe(-6)
    expect(trackMixerParamValue(track, 'mute')).toBe(1)
    expect(trackMixerParamValue(track, 'solo')).toBe(0)
  })

  it('labels unity and center without a second scale', () => {
    expect(formatMixerDb(0)).toBe('0 dB')
    expect(formatMixerDb(-6)).toBe('-6.0 dB')
    expect(formatMixerDb(3)).toBe('+3.0 dB')
    expect(formatMixerDb(-60)).toBe('-inf')
    expect(formatPan(0)).toBe('0')
    expect(formatPan(-50)).toBe('L 50')
    expect(formatPan(30)).toBe('R 30')
  })
})
