import { useEffect, useState } from 'react'
import { dbToMeterPct } from '../app/editorState'
import { engine } from '../hooks/useEngine'
import { getHearingView, subscribeHearingView } from './session'
import {
  LOUDNESS_FLOOR_DB,
  LOUDNESS_ZONE_LABEL,
  formatLoudnessDb,
  levelsFromTimeDomain,
  loudnessZone,
  type LoudnessZone,
} from './loudness'
import styles from './HearingAccessLayer.module.css'

const SCALE_WORDS: { db: number; label: string }[] = [
  { db: -0.5, label: 'CLIP' },
  { db: -4, label: 'VERY LOUD' },
  { db: -12, label: 'LOUD' },
  { db: -28, label: 'MEDIUM' },
  { db: -50, label: 'QUIET' },
]

type LiveLevels = {
  left: number
  right: number
  rms: number
  stereo: boolean
}

function readNode(node: AnalyserNode | null, scratch: { data: Float32Array | null }) {
  if (!node) return { peakDb: Number.NEGATIVE_INFINITY, rmsDb: Number.NEGATIVE_INFINITY }
  if (!scratch.data || scratch.data.length !== node.fftSize) scratch.data = new Float32Array(node.fftSize)
  node.getFloatTimeDomainData(scratch.data as Float32Array<ArrayBuffer>)
  return levelsFromTimeDomain(scratch.data)
}

function louder(a: number, b: number): number {
  if (!Number.isFinite(a)) return b
  if (!Number.isFinite(b)) return a
  return a > b ? a : b
}

function Lane({ db, label }: { db: number; label: string }) {
  const pct = dbToMeterPct(db, LOUDNESS_FLOOR_DB)
  return (
    <div className={styles.loudnessLane}>
      <div className={styles.loudnessFill} style={{ height: `${pct}%` }} />
      <span>{label}</span>
    </div>
  )
}

/** Vertical loudness rail. Same peak reading as the main meter, with a word scale. */
export function LoudnessMeter() {
  const [live, setLive] = useState<LiveLevels | null>(null)
  const [playing, setPlaying] = useState(false)
  const [samplePeak, setSamplePeak] = useState<number | null>(null)
  const [sampleRms, setSampleRms] = useState<number | null>(null)
  const [sampleClip, setSampleClip] = useState(false)

  useEffect(() => subscribeHearingView(() => {
    const analysis = getHearingView().analysis
    setSamplePeak(analysis?.peakDbfs ?? null)
    setSampleRms(analysis?.rmsDbfs ?? null)
    setSampleClip(analysis?.clipped === true)
  }), [])

  useEffect(() => {
    let frame = 0
    let last = 0
    const leftScratch = { data: null as Float32Array | null }
    const rightScratch = { data: null as Float32Array | null }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const on = engine.getSnapshot().playing
      setPlaying((prev) => (prev === on ? prev : on))
      if (!on || now - last < 90) return
      last = now
      const { left, right } = engine.getChannelAnalysers()
      const l = readNode(left, leftScratch)
      const r = readNode(right, rightScratch)
      setLive({
        left: l.peakDb,
        right: right ? r.peakDb : Number.NEGATIVE_INFINITY,
        rms: louder(l.rmsDb, right ? r.rmsDb : Number.NEGATIVE_INFINITY),
        stereo: Boolean(right),
      })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const livePeak = live ? louder(live.left, live.right) : Number.NEGATIVE_INFINITY
  const usingLive = playing && live !== null && Number.isFinite(livePeak)
  const shownDb = usingLive ? livePeak : samplePeak
  const zone: LoudnessZone = loudnessZone(shownDb, sampleClip || (usingLive && livePeak >= -0.1))
  const word = LOUDNESS_ZONE_LABEL[zone]
  const nowText = formatLoudnessDb(shownDb)
  const meterNow = shownDb !== null && Number.isFinite(shownDb) ? Math.round(shownDb) : LOUDNESS_FLOOR_DB
  const lanes = usingLive && live?.stereo
    ? [
        { id: 'L', db: live.left },
        { id: 'R', db: live.right },
      ]
    : [{ id: usingLive ? 'OUT' : 'PEAK', db: shownDb ?? Number.NEGATIVE_INFINITY }]

  return (
    <aside
      className={styles.loudnessRail}
      data-zone={zone}
      role="meter"
      aria-valuemin={LOUDNESS_FLOOR_DB}
      aria-valuemax={0}
      aria-valuenow={meterNow}
      aria-valuetext={`${word}. ${usingLive ? 'Now' : 'Sample'} ${nowText}. Sample peak ${formatLoudnessDb(samplePeak)}. RMS ${formatLoudnessDb(sampleRms)}.`}
      aria-label="Loudness"
    >
      <strong>{word}</strong>
      <div className={styles.loudnessBody}>
        <div className={styles.loudnessWords} aria-hidden="true">
          {SCALE_WORDS.map((mark) => (
            <span key={mark.label} style={{ bottom: `${dbToMeterPct(mark.db, LOUDNESS_FLOOR_DB)}%` }}>
              {mark.label}
            </span>
          ))}
        </div>
        <div className={styles.loudnessLanes}>
          {lanes.map((lane) => (
            <Lane key={lane.id} db={lane.db} label={lane.id} />
          ))}
        </div>
      </div>
      <p>{usingLive ? 'now' : 'sample'} {nowText}</p>
      <p>RMS {formatLoudnessDb(usingLive && live ? live.rms : sampleRms)}</p>
    </aside>
  )
}
