import { useEffect, useState, type CSSProperties } from 'react'
import { useEngine } from '../hooks/useEngine'
import { scopeLabel } from './events'
import { shiftSoundMap } from './eqAssist'
import { SoundMap } from './SoundMap'
import { SpaceField } from './SpaceField'
import { requestWaveZoom, setHearingMapDemand } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { useHearingSettings } from './useHearingSettings'

const zoomButton: CSSProperties = {
  minHeight: 32,
  padding: '0 10px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--bg-control)',
  color: 'var(--text-primary)',
}

function useHearingView() {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

/** Graph-first Hearing Access surface. EQ stays in the floating panel so this view is the picture of the sound. */
export function HearingFocusStage() {
  const { settings } = useHearingSettings()
  const snap = useEngine()
  const hearing = useHearingView()
  useEffect(() => {
    setHearingMapDemand(true)
    return () => setHearingMapDemand(false)
  }, [])
  const analysis = hearing.analysis
  const pitch = snap.params.pitch
  const pitched = Math.abs(pitch) >= 0.05
  const columns = shiftSoundMap(analysis?.soundMap ?? null, pitch)
  const mono = analysis ? !analysis.stereo : false
  const buckets =
    analysis && analysis.spaceTimeline.length > 0
      ? analysis.spaceTimeline
      : analysis
        ? [{ time: analysis.originSec, balance: 0, width: 0, correlation: 1 }]
        : []
  return (
    <section
      aria-label="Hearing Access focus"
      style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto', padding: '8px 10px 12px', overflow: 'auto' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'}
          {pitched ? ` · heard at ${pitch > 0 ? '+' : ''}${pitch.toFixed(1)} st` : ' · original pitch'}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('out')}>
            Zoom out
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('in')}>
            Zoom in
          </button>
          <button type="button" style={zoomButton} onClick={() => requestWaveZoom('fit')}>
            Fit
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>
        The map is the sound after pitch. The field below places left on the left and right on the right. Pan moves it. Double-click the waveform to zoom into a selection, and double-click again to fit the sample.
      </p>
      <SoundMap columns={columns} playhead={hearing.playhead} origin={analysis?.originSec ?? 0} duration={analysis?.durationSec ?? 0} />
      {analysis ? (
        <>
          {mono ? <p style={{ margin: 0, fontSize: 12 }}>This sample is mono. Pan still places that one image left or right.</p> : null}
          <SpaceField
            buckets={buckets}
            playhead={hearing.playhead}
            origin={analysis.originSec}
            duration={analysis.durationSec}
            panPct={snap.params.pan}
            leftDb={snap.params.channelGainL}
            rightDb={snap.params.channelGainR}
          />
        </>
      ) : (
        <p style={{ margin: 0 }}>Load a sample to see the map and the stereo field.</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>Turn Hearing Access on to measure this sample.</p> : null}
    </section>
  )
}
