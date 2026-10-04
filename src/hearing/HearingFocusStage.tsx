import { useEffect, useState } from 'react'
import { useEngine } from '../hooks/useEngine'
import { AfterEqChart } from './AfterEqChart'
import { scopeLabel } from './events'
import { SoundMap } from './SoundMap'
import { SpaceField } from './SpaceField'
import { getHearingReveal, setHearingMapDemand, subscribeHearingReveal } from './reveal'
import { getHearingView, subscribeHearingView } from './session'
import { useHearingSettings } from './useHearingSettings'

function useHearingView() {
  const [value, setValue] = useState(getHearingView)
  useEffect(() => subscribeHearingView(() => setValue(getHearingView())), [])
  return value
}

/** Graph-first Hearing Access surface. The floating panel stays out of the way. */
export function HearingFocusStage() {
  const { settings } = useHearingSettings()
  const snap = useEngine()
  const hearing = useHearingView()
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set(getHearingReveal()?.bands ?? []))
  useEffect(() => {
    setHearingMapDemand(true)
    return () => setHearingMapDemand(false)
  }, [])
  useEffect(() => subscribeHearingReveal(() => setLit(new Set(getHearingReveal()?.bands ?? []))), [])
  const analysis = hearing.analysis
  return (
    <section
      aria-label="Hearing Access focus"
      style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto', padding: '8px 10px 12px', overflow: 'auto' }}
    >
      <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {analysis ? scopeLabel(analysis.scope) : 'NO SAMPLE'} · original, then after EQ
      </p>
      <SoundMap
        columns={analysis?.soundMap ?? null}
        playhead={hearing.playhead}
        origin={analysis?.originSec ?? 0}
        duration={analysis?.durationSec ?? 0}
      />
      <AfterEqChart
        analysis={analysis}
        bands={snap.eqBands}
        sampleRate={snap.sampleRate}
        engaged={snap.chain.some((mod) => mod.type === 'eq' && !mod.bypassed)}
        lit={lit}
      />
      {analysis?.stereo ? (
        <SpaceField buckets={analysis.spaceTimeline} playhead={hearing.playhead} origin={analysis.originSec} duration={analysis.durationSec} />
      ) : (
        <p style={{ margin: 0 }}>Space needs a stereo sample.</p>
      )}
      {!settings.enabled ? <p style={{ margin: 0 }}>Turn Hearing Access on to measure this sample.</p> : null}
    </section>
  )
}
