import { useEffect, useState } from 'react'
import { dbToMeterPct } from '../app/editorState'
import { engine } from '../hooks/useEngine'
import {
  LOUDNESS_FLOOR_DB,
  LOUDNESS_TICKS,
  LOUDNESS_ZONE_LABEL,
  formatLoudnessDb,
  levelsFromTimeDomain,
  loudnessZone,
  type LoudnessZone,
} from './loudness'
import styles from './HearingAccessLayer.module.css'

type Props = {
  samplePeakDb: number | null
  sampleRmsDb: number | null
  clipped: boolean
}

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

/** Live output level with a word scale. Falls back to the measured sample when playback is stopped. */
export function LoudnessMeter({ samplePeakDb, sampleRmsDb, clipped }: Props) {
  const [live, setLive] = useState<LiveLevels | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let frame = 0
    let last = 0
    const leftScratch = { data: null as Float32Array | null }
    const rightScratch = { data: null as Float32Array | null }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const on = engine.getSnapshot().playing
      setPlaying(on)
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
  const usingLive = playing && Number.isFinite(livePeak)
  const shownDb = usingLive ? livePeak : samplePeakDb
  const zone: LoudnessZone = loudnessZone(shownDb, clipped || (usingLive && livePeak >= -0.1))
  const word = LOUDNESS_ZONE_LABEL[zone]
  const nowText = formatLoudnessDb(shownDb)
  const meterNow = shownDb !== null && Number.isFinite(shownDb) ? Math.round(shownDb) : LOUDNESS_FLOOR_DB
  const sampleLine = `Sample peak ${formatLoudnessDb(samplePeakDb)} · RMS ${formatLoudnessDb(sampleRmsDb)}`
  const liveLine =
    usingLive && live
      ? live.stereo
        ? `Now L ${formatLoudnessDb(live.left)} · R ${formatLoudnessDb(live.right)} · RMS ${formatLoudnessDb(live.rms)}`
        : `Now peak ${formatLoudnessDb(livePeak)} · RMS ${formatLoudnessDb(live.rms)}`
      : 'Playback is stopped. The bar shows the sample peak.'

  const bars = usingLive && live?.stereo
    ? [
        { id: 'L', db: live.left },
        { id: 'R', db: live.right },
      ]
    : [{ id: usingLive ? 'NOW' : 'PEAK', db: shownDb ?? Number.NEGATIVE_INFINITY }]

  return (
    <div
      className={styles.loudness}
      data-zone={zone}
      role="meter"
      aria-valuemin={LOUDNESS_FLOOR_DB}
      aria-valuemax={0}
      aria-valuenow={meterNow}
      aria-valuetext={`${word}. ${usingLive ? 'Now' : 'Sample'} ${nowText}. ${sampleLine}`}
      aria-label="Loudness"
    >
      <div className={styles.loudnessHead}>
        <span>Loudness</span>
        <strong>{word}</strong>
        <span>{usingLive ? 'now' : 'sample'} {nowText}</span>
      </div>
      {bars.map((bar) => (
        <div key={bar.id} className={styles.loudnessRow}>
          <span>{bar.id}</span>
          <div className={styles.loudnessTrack}>
            <div className={styles.loudnessFill} style={{ width: `${dbToMeterPct(bar.db, LOUDNESS_FLOOR_DB)}%` }} />
          </div>
        </div>
      ))}
      <div className={styles.loudnessTicks} aria-hidden="true">
        {LOUDNESS_TICKS.map((db) => (
          <span key={db} style={{ left: `${dbToMeterPct(db, LOUDNESS_FLOOR_DB)}%` }}>
            {db === 0 ? '0 clip' : db}
          </span>
        ))}
      </div>
      <p className={styles.loudnessNote}>{liveLine}</p>
      <p className={styles.loudnessNote}>{sampleLine}</p>
    </div>
  )
}
