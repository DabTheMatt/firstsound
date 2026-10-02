import { useEffect, useRef, useState } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import {
  mixToDbLabel,
  TRACK_COLOR_IDS,
  trackColorVar,
  type MixTrack,
  type TrackColorId,
} from '../../audio/mix/tracks'
import { AUDIO_FILE_ACCEPT, readAudioFile } from '../../features/sample/files'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { subscribeThemeChange } from '../../theme'
import styles from './MultiTrackView.module.css'

const peakCache = new WeakMap<AudioBuffer, Map<string, { min: Float32Array; max: Float32Array }>>()

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  return /\.(wav|aif|aiff|mp3|m4a|aac|caf|mp4|ogg|flac|webm)$/i.test(file.name)
}

function envelope(buffer: AudioBuffer, channel: number, buckets: number): { min: Float32Array; max: Float32Array } {
  const key = `${channel}:${buckets}`
  let store = peakCache.get(buffer)
  if (!store) {
    store = new Map()
    peakCache.set(buffer, store)
  }
  const cached = store.get(key)
  if (cached) return cached
  const draw = (index: number) => computeMinMax(buffer.getChannelData(index), 0, buffer.length, buckets)
  if (channel >= 0) {
    const one = draw(Math.min(channel, buffer.numberOfChannels - 1))
    const next = { min: one.min, max: one.max }
    store.set(key, next)
    return next
  }
  const left = draw(0)
  if (buffer.numberOfChannels < 2) {
    const next = { min: left.min, max: left.max }
    store.set(key, next)
    return next
  }
  const right = draw(1)
  const min = new Float32Array(buckets)
  const max = new Float32Array(buckets)
  for (let i = 0; i < buckets; i++) {
    min[i] = Math.min(left.min[i] ?? 0, right.min[i] ?? 0)
    max[i] = Math.max(left.max[i] ?? 0, right.max[i] ?? 0)
  }
  const next = { min, max }
  store.set(key, next)
  return next
}

function paintWave(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer | null,
  channel: number,
  projectDuration: number,
  color: string,
) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  if (!buffer || !(projectDuration > 0)) return
  const span = Math.min(1, buffer.duration / projectDuration)
  const buckets = Math.max(1, Math.round(width * span))
  const { min, max } = envelope(buffer, channel, buckets)
  const mid = height / 2
  const half = height * 0.42
  ctx.fillStyle = color
  const drawWidth = Math.max(1, Math.round(width * span))
  for (let x = 0; x < drawWidth; x++) {
    const i = Math.min(buckets - 1, Math.floor((x / drawWidth) * buckets))
    const hi = Math.max(-1, Math.min(1, max[i] ?? 0))
    const lo = Math.max(-1, Math.min(1, min[i] ?? 0))
    ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half))
  }
}

function resolveColor(id: TrackColorId): string {
  const probe = document.createElement('span')
  probe.style.color = trackColorVar(id)
  document.body.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || trackColorVar(id)
}

export function MultiTrackView({ phone = false }: { phone?: boolean }) {
  const { t } = useI18n()
  const snap = useEngine()
  const listRef = useRef<HTMLDivElement>(null)
  const [paletteFor, setPaletteFor] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; file: File } | null>(null)

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    let frame = 0
    const tick = () => {
      const dur = engine.getProjectDuration()
      const time = engine.getPlayheadSeconds()
      const pct = dur > 0 ? Math.min(100, Math.max(0, (time / dur) * 100)) : 0
      node.style.setProperty('--project-playhead', `${pct}%`)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const seekAt = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    const dur = engine.getProjectDuration()
    if (!(dur > 0) || rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    engine.seekSeconds(ratio * dur, 'sample')
  }

  const loadFile = (id: string, file: File) => {
    void readAudioFile(file).then((data) => engine.loadTrackArrayBuffer(id, data, file.name))
  }

  return (
    <div className={`${styles.desk} ${phone ? styles.phone : ''}`} data-arrangement="multi">
      <div ref={listRef} className={styles.list} role="list">
        {snap.tracks.map((track, index) => (
          <TrackLane
            key={track.id}
            track={track}
            index={index}
            selected={track.id === snap.selectedTrackId}
            projectDuration={snap.projectDuration}
            contentRev={snap.bufferRev}
            paletteOpen={paletteFor === track.id}
            renaming={renameId === track.id}
            pending={pending?.id === track.id ? pending.file : null}
            onSelect={() => engine.selectTrack(track.id)}
            onSeek={seekAt}
            onPalette={() => setPaletteFor((cur) => (cur === track.id ? null : track.id))}
            onColor={(color) => {
              engine.setTrack(track.id, { color })
              setPaletteFor(null)
            }}
            onRenameStart={() => setRenameId(track.id)}
            onRename={(name) => {
              engine.setTrack(track.id, { name })
              setRenameId(null)
            }}
            onLoad={(file) => loadFile(track.id, file)}
            onAskReplace={(file) => setPending({ id: track.id, file })}
            onConfirmReplace={() => {
              if (pending?.id === track.id) loadFile(track.id, pending.file)
              setPending(null)
            }}
            onCancelReplace={() => setPending(null)}
            onClear={() => engine.clearTrack(track.id)}
            onToggleStereo={() =>
              engine.setTrack(track.id, {
                stereoDisplay: track.stereoDisplay === 'split' ? 'combined' : 'split',
              })
            }
            onReorder={(to) => engine.reorderTracks(index, to)}
            laneCount={snap.tracks.length}
            copy={t.mix}
          />
        ))}
      </div>
    </div>
  )
}

function TrackLane({
  track,
  index,
  selected,
  projectDuration,
  contentRev,
  paletteOpen,
  renaming,
  pending,
  onSelect,
  onSeek,
  onPalette,
  onColor,
  onRenameStart,
  onRename,
  onLoad,
  onAskReplace,
  onConfirmReplace,
  onCancelReplace,
  onClear,
  onToggleStereo,
  onReorder,
  laneCount,
  copy,
}: {
  track: MixTrack
  index: number
  selected: boolean
  projectDuration: number
  contentRev: number
  paletteOpen: boolean
  renaming: boolean
  pending: File | null
  onSelect: () => void
  onSeek: (clientX: number, target: HTMLElement) => void
  onPalette: () => void
  onColor: (color: TrackColorId) => void
  onRenameStart: () => void
  onRename: (name: string) => void
  onLoad: (file: File) => void
  onAskReplace: (file: File) => void
  onConfirmReplace: () => void
  onCancelReplace: () => void
  onClear: () => void
  onToggleStereo: () => void
  onReorder: (to: number) => void
  laneCount: number
  copy: {
    loadAudio: string
    replaceAudio: string
    clearTrack: string
    volume: string
    mono: string
    stereo: string
    expandStereo: string
    collapseStereo: string
    rename: string
    color: string
    empty: string
    replaceAsk: string
    replaceYes: string
    replaceNo: string
    left: string
    right: string
    reorder: string
    trackName: string
  }
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const buffer = engine.getTrackBuffer(track.id)
  const channels = buffer?.numberOfChannels ?? track.channelCount
  const stereo = channels > 1
  const loaded = Boolean(buffer)
  const color = trackColorVar(track.color)

  useEffect(() => {
    if (renaming) nameRef.current?.focus()
  }, [renaming])

  const takeFile = (file: File | undefined, replace: boolean) => {
    if (!file || !isAudioFile(file)) return
    if (replace && loaded) onAskReplace(file)
    else onLoad(file)
  }

  return (
    <article
      className={`${styles.lane} ${selected ? styles.laneOn : ''}`}
      style={{ ['--lane' as string]: color }}
      data-track-lane=""
      data-track-id={track.id}
      data-track-index={index}
      role="listitem"
      onClick={onSelect}
      onDragOver={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        takeFile(event.dataTransfer.files[0], true)
      }}
    >
      <header className={styles.head}>
        <button
          type="button"
          className={styles.grip}
          aria-label={copy.reorder}
          onPointerDown={(event) => {
            event.stopPropagation()
            const handle = event.currentTarget
            handle.setPointerCapture(event.pointerId)
            const startY = event.clientY
            const move = (ev: PointerEvent) => {
              if (Math.abs(ev.clientY - startY) < 8) return
            }
            const up = (ev: PointerEvent) => {
              handle.removeEventListener('pointermove', move)
              handle.removeEventListener('pointerup', up)
              const list = handle.closest('[role="list"]')
              const lanes = list ? [...list.querySelectorAll<HTMLElement>('[data-track-lane]')] : []
              let to = index
              for (let i = 0; i < lanes.length; i++) {
                const rect = lanes[i]!.getBoundingClientRect()
                if (ev.clientY < rect.top + rect.height / 2) {
                  to = i
                  break
                }
                to = i
              }
              to = Math.max(0, Math.min(laneCount - 1, to))
              if (Math.abs(ev.clientY - startY) >= 8 && to !== index) onReorder(to)
            }
            handle.addEventListener('pointermove', move)
            handle.addEventListener('pointerup', up)
          }}
          onClick={(event) => event.stopPropagation()}
        />
        <button
          type="button"
          className={styles.swatch}
          aria-label={copy.color}
          onClick={(event) => {
            event.stopPropagation()
            onPalette()
          }}
        />
        {renaming ? (
          <input
            ref={nameRef}
            className={styles.nameInput}
            aria-label={copy.trackName}
            defaultValue={track.name}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => onRename(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                event.currentTarget.value = track.name
                event.currentTarget.blur()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={styles.name}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation()
              onRenameStart()
            }}
          >
            {track.name}
          </button>
        )}
        <button type="button" className={styles.icon} aria-label={copy.rename} onClick={(event) => {
          event.stopPropagation()
          onRenameStart()
        }}>
          Aa
        </button>
        {loaded ? <span className={styles.meta}>{stereo ? copy.stereo : copy.mono}</span> : <span className={styles.meta}>{copy.empty}</span>}
        {stereo ? (
          <button
            type="button"
            className={styles.icon}
            aria-pressed={track.stereoDisplay === 'split'}
            aria-label={track.stereoDisplay === 'split' ? copy.collapseStereo : copy.expandStereo}
            onClick={(event) => {
              event.stopPropagation()
              onToggleStereo()
            }}
          >
            {track.stereoDisplay === 'split' ? '1' : 'L/R'}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.icon}
          aria-label={loaded ? copy.replaceAudio : copy.loadAudio}
          onClick={(event) => {
            event.stopPropagation()
            inputRef.current?.click()
          }}
        >
          {loaded ? '↻' : '+'}
        </button>
        {loaded ? (
          <button
            type="button"
            className={styles.icon}
            aria-label={copy.clearTrack}
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
          >
            ×
          </button>
        ) : null}
        <label className={styles.fader} onClick={(event) => event.stopPropagation()}>
          <span className={styles.db}>{mixToDbLabel(track.mix)}</span>
          <input
            type="range"
            min={0}
            max={150}
            step={1}
            value={track.mix}
            aria-label={`${track.name} ${copy.volume}`}
            onChange={(event) => engine.setTrack(track.id, { mix: Number(event.target.value) })}
          />
        </label>
        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_FILE_ACCEPT}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            onLoad(file)
          }}
        />
      </header>
      {paletteOpen ? (
        <div className={styles.palette} onClick={(event) => event.stopPropagation()}>
          {TRACK_COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.chip}
              style={{ background: trackColorVar(id) }}
              aria-label={id}
              aria-pressed={track.color === id}
              onClick={() => onColor(id)}
            />
          ))}
        </div>
      ) : null}
      {loaded && track.stereoDisplay === 'split' && stereo ? (
        <div className={styles.channels}>
          <span className={styles.channelLabel}>{track.name} · {copy.left}</span>
          <LaneCanvas
            trackId={track.id}
            channel={0}
            projectDuration={projectDuration}
            contentRev={contentRev}
            colorId={track.color}
            onSeek={onSeek}
          />
          <span className={styles.channelLabel}>{track.name} · {copy.right}</span>
          <LaneCanvas
            trackId={track.id}
            channel={1}
            projectDuration={projectDuration}
            contentRev={contentRev}
            colorId={track.color}
            onSeek={onSeek}
          />
        </div>
      ) : loaded ? (
        <LaneCanvas
          trackId={track.id}
          channel={-1}
          projectDuration={projectDuration}
          contentRev={contentRev}
          colorId={track.color}
          onSeek={onSeek}
        />
      ) : (
        <button
          type="button"
          className={styles.empty}
          onClick={(event) => {
            event.stopPropagation()
            inputRef.current?.click()
          }}
        >
          + {copy.loadAudio}
        </button>
      )}
      {pending ? (
        <div className={styles.confirm}>
          <span>{copy.replaceAsk}</span>
          <button type="button" className={styles.icon} onClick={(event) => { event.stopPropagation(); onConfirmReplace() }}>
            {copy.replaceYes}
          </button>
          <button type="button" className={styles.icon} onClick={(event) => { event.stopPropagation(); onCancelReplace() }}>
            {copy.replaceNo}
          </button>
        </div>
      ) : null}
    </article>
  )
}

function LaneCanvas({
  trackId,
  channel,
  projectDuration,
  contentRev,
  colorId,
  onSeek,
}: {
  trackId: string
  channel: number
  projectDuration: number
  contentRev: number
  colorId: TrackColorId
  onSeek: (clientX: number, target: HTMLElement) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => paintWave(canvas, engine.getTrackBuffer(trackId), channel, projectDuration, resolveColor(colorId))
    draw()
    const unsub = subscribeThemeChange(draw)
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => {
      unsub()
      ro.disconnect()
    }
  }, [trackId, channel, projectDuration, contentRev, colorId])
  return (
    <div
      className={styles.wave}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        onSeek(event.clientX, event.currentTarget)
      }}
    >
      <canvas ref={ref} aria-hidden />
    </div>
  )
}
