import { useMemo } from 'react'
import { engine, useEngine } from '../hooks/useEngine'
import type { BufferAnalysis, SpaceBucket } from './analyze'
import { paramRecord } from './effectViz'
import { heardDelay, heardSpaceTimeline } from './heardSpace'

/** Space buckets for the signal after pan, mid/side, and delay. */
export function useHeardSpace(analysis: BufferAnalysis | null): SpaceBucket[] {
  const snap = useEngine()
  const chainKey = snap.chain.map((mod) => `${mod.type}:${mod.bypassed ? 1 : 0}`).join('|')
  const pictureKey = [
    snap.bufferRev,
    snap.delayType,
    snap.params.bpm,
    snap.params.pan,
    snap.params.channelGainL,
    snap.params.channelGainR,
    snap.params.msWidth,
    snap.params.msMidGain,
    snap.params.msSideGain,
    snap.params.msBalance,
    snap.params.msRotate,
    snap.params.msCrossfeed,
    snap.params.msHaasTime,
    snap.params.msHaasAmount,
    snap.params.msHaasDir,
    snap.params.msMono,
    snap.params.msSoloMid,
    snap.params.msSoloSide,
    snap.params.msFlipMid,
    snap.params.msFlipSide,
    snap.params.delayTime,
    snap.params.delayTimeR,
    snap.params.delayWet,
    snap.params.delayWetR,
    snap.params.delayFeedback,
    snap.params.delayFeedbackR,
    snap.params.delayStereo,
    snap.params.delayWidth,
    snap.params.delayPan,
    snap.params.delayDry,
    snap.params.delayDryR,
    snap.params.delayCorrelate,
    snap.params.delayOffset,
    snap.params.delaySync,
    snap.params.delaySyncR,
  ].join('|')
  return useMemo(() => {
    if (!analysis) return []
    const fallback =
      analysis.spaceTimeline.length > 0
        ? analysis.spaceTimeline
        : [
            {
              time: analysis.originSec,
              balance: analysis.stereo?.balance ?? 0,
              width: analysis.stereo?.width ?? 0,
              correlation: analysis.stereo?.correlation ?? 1,
            },
          ]
    const left = engine.audibleChannel(0)
    const right = engine.audibleChannel(1)
    if (!left || !right) return fallback
    const engaged = (type: string) => snap.chain.some((mod) => mod.type === type && !mod.bypassed)
    const params = paramRecord(snap.params)
    const startFrame = Math.max(0, Math.round(analysis.originSec * analysis.sampleRate))
    const frames = Math.min(
      Math.max(1, Math.round(analysis.durationSec * analysis.sampleRate)),
      Math.max(0, left.length - startFrame),
    )
    const heard = heardSpaceTimeline({
      left,
      right,
      sampleRate: analysis.sampleRate,
      originSec: analysis.originSec,
      startFrame,
      frames,
      panPct: snap.params.pan,
      leftDb: snap.params.channelGainL,
      rightDb: snap.params.channelGainR,
      midSide: engaged('midside')
        ? {
            widthPct: snap.params.msWidth,
            midDb: snap.params.msMidGain,
            sideDb: snap.params.msSideGain,
            balance: snap.params.msBalance,
            rotate: snap.params.msRotate,
            crossfeed: snap.params.msCrossfeed,
            haasTime: snap.params.msHaasTime,
            haasAmount: snap.params.msHaasAmount,
            haasDir: snap.params.msHaasDir,
            mono: snap.params.msMono,
            soloMid: snap.params.msSoloMid,
            soloSide: snap.params.msSoloSide,
            flipMid: snap.params.msFlipMid,
            flipSide: snap.params.msFlipSide,
          }
        : null,
      delay: engaged('delay') ? heardDelay(params, snap.delayType, snap.params.bpm || 120) : null,
    })
    return heard.length > 0 ? heard : fallback
    // pictureKey and chainKey stand in for the live parameter record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, pictureKey, chainKey])
}
