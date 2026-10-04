/**
 * One analysis pass shared by the panel, the waveform strip, and haptics.
 * Hidden features do not schedule work. No AnalyserNode is created.
 */

import { useEffect, useState } from 'react'
import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { engine } from '../hooks/useEngine'
import { analyzePcm, resolveScope, type AnalysisScope, type BufferAnalysis } from './analyze'
import { mixingFindings, type MixingFinding } from './assistant'
import { analysisCacheKey } from './cache'
import { detectEvents, filterEvents, type HearingEvent } from './events'
import type { HearingAccessSettings } from './settings'
import { hearingMapDemand, subscribeHearingMapDemand } from './reveal'
import { hearingRuntimeStats, setHearingClockDemand, subscribeHearingClock } from './scheduler'

export type HearingView = {
  analysis: BufferAnalysis | null
  events: HearingEvent[]
  findings: MixingFinding[]
  scope: AnalysisScope
  playhead: number | null
}

const empty: HearingView = {
  analysis: null,
  events: [],
  findings: [],
  scope: 'full',
  playhead: null,
}

let view: HearingView = empty
const listeners = new Set<() => void>()
let job = 0

function publish(next: HearingView): void {
  view = next
  for (const listener of listeners) listener()
}

export function getHearingView(): HearingView {
  return view
}

export function subscribeHearingView(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function sliceOf(data: Float32Array, start: number, end: number): Float32Array {
  const from = Math.max(0, Math.min(data.length, start))
  const to = Math.max(from, Math.min(data.length, end))
  return data.subarray(from, to)
}

export function useHearingAnalysis(settings: HearingAccessSettings, snap: EngineSnapshot): void {
  const [mapDemand, setMapDemand] = useState(hearingMapDemand)
  useEffect(() => subscribeHearingMapDemand(() => setMapDemand(hearingMapDemand())), [])
  const active =
    settings.enabled &&
    (settings.panelOpen ||
      settings.layers.dynamicsMap ||
      settings.layers.events ||
      settings.layers.fingerprint ||
      settings.layers.soundMap ||
      settings.layers.assistant ||
      settings.layers.space ||
      settings.layers.compare ||
      settings.layers.descriptors)

  useEffect(() => {
    if (!active || !snap.sampleLoaded) {
      publish(empty)
      return
    }
    const token = ++job
    const pending: { worker: Worker | null; idle: number } = { worker: null, idle: 0 }
    const timer = window.setTimeout(() => {
      const left = engine.audibleChannel(0)
      if (!left || token !== job) return
      const right = engine.audibleChannel(1)
      const rate = snap.sampleRate > 0 ? snap.sampleRate : left.length > 0 ? 44100 : 44100
      const duration = snap.duration
      const regionStart = snap.params.start
      const regionEnd = snap.params.end
      const scope = resolveScope(duration, regionStart, regionEnd, false)
      const startFrame = scope === 'full' ? 0 : Math.floor(regionStart * rate)
      const endFrame = scope === 'full' ? left.length : Math.max(startFrame + 1, Math.floor(regionEnd * rate))
      const soundMap = settings.layers.soundMap && (mapDemand || (settings.panelOpen && settings.section === 'sound'))
      const key = analysisCacheKey({
        bufferRev: snap.bufferRev,
        sampleRate: rate,
        startFrame,
        endFrame,
        scope,
        soundMap,
        channels: right ? 2 : 1,
      })
      const run = () => {
        if (token !== job) return
        const analysis = analyzePcm(
          {
            left,
            right,
            sampleRate: rate,
            startFrame,
            endFrame,
            originSec: startFrame / rate,
            scope,
          },
          { soundMap, maxMapColumns: 96 },
        )
        const events = filterEvents(detectEvents(left, right, rate, startFrame, endFrame, startFrame / rate), settings.eventFilters)
        publish({
          analysis,
          events,
          findings: settings.layers.assistant ? mixingFindings(analysis, events) : [],
          scope,
          playhead: view.playhead,
        })
        void key
      }
      const frames = Math.max(0, endFrame - startFrame)
      if (frames > 350_000 && typeof Worker !== 'undefined') {
        try {
          const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })
          pending.worker = worker
          const leftCopy = new Float32Array(sliceOf(left, startFrame, endFrame))
          const rightCopy = right ? new Float32Array(sliceOf(right, startFrame, endFrame)) : null
          worker.onmessage = (event: MessageEvent<{ analysis: BufferAnalysis }>) => {
            if (token !== job) return
            const analysis = event.data.analysis
            const events = filterEvents(
              detectEvents(leftCopy, rightCopy, rate, 0, leftCopy.length, startFrame / rate),
              settings.eventFilters,
            )
            publish({
              analysis,
              events,
              findings: settings.layers.assistant ? mixingFindings(analysis, events) : [],
              scope,
              playhead: view.playhead,
            })
            worker.terminate()
          }
          worker.onerror = () => {
            worker.terminate()
            run()
          }
          worker.postMessage({
            left: leftCopy,
            right: rightCopy,
            sampleRate: rate,
            startFrame: 0,
            endFrame: leftCopy.length,
            originSec: startFrame / rate,
            scope,
            soundMap,
          })
          return
        } catch {
          /* fall through to the main thread */
        }
      }
      const idle = window.requestIdleCallback
      if (typeof idle === 'function') pending.idle = idle(() => run(), { timeout: 280 })
      else run()
    }, 90)
    return () => {
      window.clearTimeout(timer)
      if (pending.idle) window.cancelIdleCallback?.(pending.idle)
      pending.worker?.terminate()
      job += 1
    }
  }, [
    active,
    snap.sampleLoaded,
    snap.bufferRev,
    snap.sampleRate,
    snap.duration,
    snap.params.start,
    snap.params.end,
    settings.panelOpen,
    settings.section,
    settings.layers.soundMap,
    settings.layers.assistant,
    settings.eventFilters,
    mapDemand,
  ])

  useEffect(() => {
    setHearingClockDemand({
      enabled: settings.enabled,
      playing: snap.playing,
      soundMapVisible: settings.panelOpen && settings.layers.soundMap && settings.section === 'sound',
      haptics: settings.hapticIntensity !== 'off',
    })
    return () =>
      setHearingClockDemand({
        enabled: false,
        playing: false,
        soundMapVisible: false,
        haptics: false,
      })
  }, [settings.enabled, settings.panelOpen, settings.layers.soundMap, settings.section, settings.hapticIntensity, snap.playing])

  useEffect(() => {
    let last = 0
    return subscribeHearingClock(() => {
      const now = performance.now()
      if (now - last < 100) return
      last = now
      const playhead = engine.getPlayheadSeconds()
      if (view.playhead === playhead) return
      publish({ ...view, playhead })
    })
  }, [])
}

export function useHearingPlayhead(): number | null {
  const [playhead, setPlayhead] = useState<number | null>(null)
  useEffect(() => subscribeHearingView(() => setPlayhead(view.playhead)), [])
  return playhead
}

export function hearingIdleStats(): { rafActive: boolean; analyserNodesCreated: number } {
  const stats = hearingRuntimeStats()
  return { rafActive: stats.rafActive, analyserNodesCreated: stats.analyserNodesCreated }
}
