import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import {
  dragLoopRegion,
  formatLoopReadout,
  loopBounds,
  playheadProjectRatio,
  selectionAsLoop,
  sourceEndProjectRatio,
  waveformTiles,
  waveformVisualGain,
  type TrackClock,
} from '../../audio/mix/playback'
import {
  anyTrackSoloed,
  trackColorVar,
  trackLevelGain,
  type MixTrack,
  type TrackColorId,
} from '../../audio/mix/tracks'
import { TrackColorPicker } from './TrackColorPicker'
import { TrackMixer, TrackStrip } from './TrackMixer'
import { MixerView } from './MixerView'
import { AUDIO_FILE_ACCEPT } from '../../features/sample/files'
import { loadAudioFileIntoTrack, releaseFileInput } from '../../features/sample/loadTrack'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { subscribeThemeChange } from '../../theme'
import styles from './MultiTrackView.module.css'

const peakCache = new WeakMap<AudioBuffer, Map<string, { min: Float32Array; max: Float32Array }>>()

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  return /\.(wav|aif|aiff|mp3|m4a|aac|caf|mp4|ogg|flac|webm)$/i.test(file.name)
}

function envelope(
  buffer: AudioBuffer,
  channel: number,
  buckets: number,
  sourceStart = 0,
  sourceEnd = buffer.duration,
): { min: Float32Array; max: Float32Array } {
  const key = `${channel}:${buckets}:${sourceStart.toFixed(4)}:${sourceEnd.toFixed(4)}`
  let store = peakCache.get(buffer)
  if (!store) {
    store = new Map()
    peakCache.set(buffer, store)
  }
  const cached = store.get(key)
  if (cached) return cached
  const sample = (index: number) => {
    const data = buffer.getChannelData(index)
    const start = Math.max(0, Math.floor(sourceStart * buffer.sampleRate))
    const end = Math.max(start + 1, Math.min(data.length, Math.ceil(sourceEnd * buffer.sampleRate)))
    return computeMinMax(data, start, end, buckets)
  }
  const draw = sample
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
  clock: TrackClock,
  gainDb: number,
  level = 1,
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
  const gain = waveformVisualGain(gainDb) * (Number.isFinite(level) ? Math.max(0, level) : 1)
  const mid = height / 2
  const half = height * 0.46
  ctx.fillStyle = color
  const tiles = waveformTiles(clock, projectDuration)
  for (const tile of tiles) {
    const repeat = clock.loop && tile.projectStart > 0.001
    ctx.globalAlpha = repeat ? 0.34 : 1
    const x0 = Math.max(0, Math.round((tile.projectStart / projectDuration) * width))
    const x1 = Math.min(width, Math.round((tile.projectEnd / projectDuration) * width))
    const buckets = Math.max(1, x1 - x0)
    const sourceStart = Math.min(tile.sourceStart, tile.sourceEnd)
    const sourceEnd = Math.max(tile.sourceStart, tile.sourceEnd)
    const { min, max } = envelope(buffer, channel, buckets, sourceStart, sourceEnd)
    for (let x = x0; x < x1; x++) {
      const local = (x - x0) / Math.max(1, x1 - x0)
      const sampleAt = tile.reverse ? 1 - local : local
      const i = Math.min(buckets - 1, Math.floor(sampleAt * buckets))
      const hi = Math.max(-1, Math.min(1, (max[i] ?? 0) * gain))
      const lo = Math.max(-1, Math.min(1, (min[i] ?? 0) * gain))
      ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half))
    }
  }
  ctx.globalAlpha = 1
  if (clock.loop) return
  const endX = Math.round(sourceEndProjectRatio(clock, projectDuration) * width)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fillRect(endX, 0, 1, height)
}

function resolveColor(id: TrackColorId): string {
  const probe = document.createElement('span')
  probe.style.color = trackColorVar(id)
  document.body.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || trackColorVar(id)
}

export function MultiTrackView({
  phone = false,
  onSelectTrack,
  onEditTrack,
  onInspectEffect,
}: {
  phone?: boolean
  onSelectTrack?: (trackId: string) => void
  onEditTrack?: (trackId: string) => void
  onInspectEffect?: (trackId: string, instanceId: string) => void
}) {
  const { t } = useI18n()
  const snap = useEngine()
  const listRef = useRef<HTMLDivElement>(null)
  const [paletteFor, setPaletteFor] = useState<{ id: string; anchor: HTMLElement } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; file: File } | null>(null)
  const [workspace, setWorkspace] = useState<'tracks' | 'mixer'>('tracks')
  const selectTrack = (id: string) => {
    if (onSelectTrack) onSelectTrack(id)
    else engine.selectTrack(id)
  }

  useEffect(() => {
    const node = listRef.current
    if (!node || workspace !== 'tracks') return
    let frame = 0
    const tick = () => {
      const snapNow = engine.getSnapshot()
      const dur = snapNow.projectDuration
      const time = engine.getPlayheadSeconds()
      for (const lane of node.querySelectorAll<HTMLElement>('[data-track-lane]')) {
        const id = lane.dataset.trackId
        const track = id ? snapNow.tracks.find((item) => item.id === id) : undefined
        const timing = id ? snapNow.trackClocks[id] : undefined
        const buffer = id ? engine.getTrackBuffer(id) : null
        if (!track || !timing || !buffer || !(dur > 0)) {
          lane.style.setProperty('--track-playhead', '0%')
          continue
        }
        const ratio = playheadProjectRatio(
          {
            sourceDuration: buffer.duration,
            speed: timing.speed,
            direction: track.direction,
            loop: track.loop,
            loopStart: track.loopStart,
            loopEnd: track.loopEnd,
          },
          time,
          dur,
        )
        lane.style.setProperty('--track-playhead', `${ratio * 100}%`)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [workspace])

  const seekAt = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    const dur = engine.getProjectDuration()
    if (!(dur > 0) || rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    engine.seekSeconds(ratio * dur, 'sample')
  }

  const loadFile = (id: string, file: File) => loadAudioFileIntoTrack(id, file)

  return (
    <div className={`${styles.desk} ${phone ? styles.phone : ''}`} data-arrangement="multi">
      <div className={styles.workspace} role="tablist" aria-label={t.mix.tracks}>
        <button
          type="button"
          role="tab"
          data-workspace="tracks"
          aria-selected={workspace === 'tracks'}
          className={workspace === 'tracks' ? styles.workspaceOn : styles.workspaceBtn}
          onClick={() => setWorkspace('tracks')}
        >
          {t.mix.tracksView}
        </button>
        <button
          type="button"
          role="tab"
          data-workspace="mixer"
          aria-selected={workspace === 'mixer'}
          className={workspace === 'mixer' ? styles.workspaceOn : styles.workspaceBtn}
          onClick={() => setWorkspace('mixer')}
        >
          {t.mix.mixerView}
        </button>
      </div>
      {workspace === 'mixer' ? (
        <MixerView
          tracks={snap.tracks}
          selectedId={snap.selectedTrackId}
          onSelectTrack={selectTrack}
          onInspectEffect={onInspectEffect ?? ((trackId) => selectTrack(trackId))}
        />
      ) : (
      <div ref={listRef} className={styles.list} role="list">
        {snap.tracks.map((track, index) => (
          <TrackLane
            key={track.id}
            track={track}
            index={index}
            selected={track.id === snap.selectedTrackId}
            projectDuration={snap.projectDuration}
            contentRev={snap.bufferRev}
            speed={snap.trackClocks[track.id]?.speed ?? 1}
            gainDb={snap.trackClocks[track.id]?.gainDb ?? 0}
            paletteOpen={paletteFor?.id === track.id}
            renaming={renameId === track.id}
            pending={pending?.id === track.id ? pending.file : null}
            onSelect={() => selectTrack(track.id)}
            onSeek={seekAt}
            onPalette={(anchor) => setPaletteFor((cur) => (cur?.id === track.id ? null : { id: track.id, anchor }))}
            onRenameStart={() => setRenameId(track.id)}
            onRename={(name) => {
              engine.setTrack(track.id, { name })
              setRenameId(null)
            }}
            onLoad={(file) => {
              selectTrack(track.id)
              void loadFile(track.id, file)
            }}
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
            onEdit={() => onEditTrack?.(track.id)}
            dimmed={anyTrackSoloed(snap.tracks) && !track.solo}
            tracks={snap.tracks}
            phone={phone}
            copy={t.mix}
          />
        ))}
      </div>
      )}
      {paletteFor ? (
        <TrackColorPicker
          anchor={paletteFor.anchor}
          value={snap.tracks.find((track) => track.id === paletteFor.id)?.color ?? 'amber'}
          label={t.mix.color}
          onPick={(color) => {
            engine.setTrack(paletteFor.id, { color })
            setPaletteFor(null)
          }}
          onClose={() => setPaletteFor(null)}
        />
      ) : null}
    </div>
  )
}

function TrackLane({
  track,
  index,
  selected,
  projectDuration,
  contentRev,
  speed,
  gainDb,
  paletteOpen,
  renaming,
  pending,
  onSelect,
  onSeek,
  onPalette,
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
  onEdit,
  dimmed,
  tracks,
  phone,
  copy,
}: {
  track: MixTrack
  index: number
  selected: boolean
  projectDuration: number
  contentRev: number
  speed: number
  gainDb: number
  paletteOpen: boolean
  renaming: boolean
  pending: File | null
  onSelect: () => void
  onSeek: (clientX: number, target: HTMLElement) => void
  onPalette: (anchor: HTMLElement) => void
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
  onEdit: () => void
  dimmed: boolean
  tracks: readonly MixTrack[]
  phone: boolean
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
    loadSample: string
    loop: string
    loopTrack: string
    dropAudio: string
    replaceDrop: string
    mixMore: string
    left: string
    right: string
    reorder: string
    trackName: string
  }
}) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [mixOpen, setMixOpen] = useState(false)
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
      className={`${styles.lane} ${selected ? styles.laneOn : ''} ${dimmed ? styles.laneDim : ''} ${dragOver ? styles.laneDrop : ''}`}
      style={{ ['--lane' as string]: color }}
      data-track-lane=""
      data-track-id={track.id}
      data-track-index={index}
      data-selected={selected ? 'true' : 'false'}
      aria-current={selected ? 'true' : undefined}
      role="listitem"
      onClick={(event) => {
        const target = event.target
        if (target instanceof Element && target.closest('button, input, label, a')) return
        onSelect()
      }}
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes('Files')) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragOver(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setDragOver(false)
        takeFile(event.dataTransfer.files[0], loaded)
      }}
    >
      <div className={styles.main}>
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
          aria-expanded={paletteOpen}
          onClick={(event) => {
            event.stopPropagation()
            onPalette(event.currentTarget)
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
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
            onDoubleClick={(event) => {
              event.stopPropagation()
              onRenameStart()
            }}
          >
            {track.name}
          </button>
        )}
        <button
          type="button"
          className={styles.load}
          aria-label={loaded ? copy.replaceAudio : copy.loadSample}
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
            inputRef.current?.click()
          }}
        >
          {loaded ? copy.loadSample : `+ ${copy.loadSample}`}
        </button>
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
        {loaded && selectionAsLoop(track.start, track.end, buffer?.duration ?? 0) ? (
          <button
            type="button"
            className={styles.icon}
            onClick={(event) => {
              event.stopPropagation()
              const region = selectionAsLoop(track.start, track.end, buffer?.duration ?? 0)
              if (!region) return
              engine.setTrack(track.id, { loop: true, loopStart: region.loopStart, loopEnd: region.loopEnd })
            }}
          >
            {t.mix.setLoop}
          </button>
        ) : null}
        {loaded ? (
          <button
            type="button"
            className={`${styles.icon} ${track.loop ? styles.fxOn : ''}`}
            aria-pressed={track.loop}
            aria-label={copy.loopTrack}
            title={copy.loopTrack}
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
              engine.setTrack(track.id, { loop: !track.loop })
            }}
          >
            {copy.loop}
          </button>
        ) : null}
        {loaded ? (
          <button
            type="button"
            className={styles.icon}
            data-track-edit=""
            aria-label={`${t.waveform.edit} ${track.name}`}
            title={`${t.waveform.edit} ${track.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
          >
            {t.waveform.edit}
          </button>
        ) : null}
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
        {phone && loaded ? (
          <button
            type="button"
            className={`${styles.icon} ${mixOpen ? styles.fxOn : ''}`}
            aria-expanded={mixOpen}
            aria-label={copy.mixMore}
            onClick={(event) => {
              event.stopPropagation()
              setMixOpen((open) => !open)
            }}
          >
            {copy.mixMore}
          </button>
        ) : null}
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept={AUDIO_FILE_ACCEPT}
          data-load-track={track.id}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            const trackId = input.dataset.loadTrack || track.id
            if (!file || !trackId) return
            // Copy the file before clearing the input. The target id is the
            // one stamped on this input when it was rendered, not the track
            // that happens to be selected after the picker closes.
            void loadAudioFileIntoTrack(trackId, file).finally(() => releaseFileInput(input))
          }}
        />
      </header>
      {phone && loaded && mixOpen ? (
        <TrackMixer track={track} tracks={tracks} phone={phone} variant="bar" selected={selected} />
      ) : null}
      {loaded && track.stereoDisplay === 'split' && stereo ? (
        <div className={styles.channels}>
          <span className={styles.channelLabel}>{track.name} · {copy.left}</span>
          <LaneCanvas
            track={track}
            channel={0}
            projectDuration={projectDuration}
            contentRev={contentRev}
            speed={speed}
            gainDb={gainDb}
            onSeek={onSeek}
          />
          <span className={styles.channelLabel}>{track.name} · {copy.right}</span>
          <LaneCanvas
            track={track}
            channel={1}
            projectDuration={projectDuration}
            contentRev={contentRev}
            speed={speed}
            gainDb={gainDb}
            onSeek={onSeek}
          />
        </div>
      ) : loaded ? (
        <LaneCanvas
          track={track}
          channel={-1}
          projectDuration={projectDuration}
          contentRev={contentRev}
          speed={speed}
          gainDb={gainDb}
          onSeek={onSeek}
        />
      ) : (
        <button
          type="button"
          className={styles.empty}
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
            inputRef.current?.click()
          }}
        >
          {dragOver ? copy.dropAudio : `+ ${copy.loadSample}`}
        </button>
      )}
      {dragOver && loaded ? <div className={styles.dropHint}>{copy.replaceDrop}</div> : null}
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
      </div>
      {loaded && !phone ? <TrackStrip track={track} tracks={tracks} selected={selected} /> : null}
    </article>
  )
}

function LaneCanvas({
  track,
  channel,
  projectDuration,
  contentRev,
  speed,
  gainDb,
  onSeek,
}: {
  track: MixTrack
  channel: number
  projectDuration: number
  contentRev: number
  speed: number
  gainDb: number
  onSeek: (clientX: number, target: HTMLElement) => void
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<{ mode: 'start' | 'end' | 'body'; start: number; end: number } | null>(null)
  const buffer = engine.getTrackBuffer(track.id)
  const duration = buffer?.duration ?? 0
  const clock: TrackClock = {
    sourceDuration: duration,
    speed,
    direction: track.direction,
    loop: track.loop,
    loopStart: track.loopStart,
    loopEnd: track.loopEnd,
  }
  const region = loopBounds(duration, track.loopStart, track.loopEnd)
  const tiles = track.loop ? waveformTiles(clock, projectDuration) : []
  const first = tiles[0]
  const loopLeft = first && projectDuration > 0 ? (first.projectStart / projectDuration) * 100 : 0
  const loopWidth = first && projectDuration > 0 ? ((first.projectEnd - first.projectStart) / projectDuration) * 100 : 0

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const source = engine.getTrackBuffer(track.id)
      paintWave(
        canvas,
        source,
        channel,
        projectDuration,
        resolveColor(track.color),
        {
          sourceDuration: source?.duration ?? 0,
          speed,
          direction: track.direction,
          loop: track.loop,
          loopStart: track.loopStart,
          loopEnd: track.loopEnd,
        },
        gainDb,
        trackLevelGain(track.mix),
      )
    }
    draw()
    const unsub = subscribeThemeChange(draw)
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => {
      unsub()
      ro.disconnect()
    }
  }, [track.id, track.color, track.loop, track.loopStart, track.loopEnd, track.direction, track.mix, channel, projectDuration, contentRev, speed, gainDb])

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, mode: 'start' | 'end' | 'body') => {
    if (!track.loop || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const host = event.currentTarget.closest(`.${styles.wave}`) as HTMLElement | null
    const pointer = event.currentTarget
    pointer.setPointerCapture(event.pointerId)
    const originX = event.clientX
    const origin = loopBounds(duration, track.loopStart, track.loopEnd)
    setDrag({ mode, start: origin.start, end: origin.end })
    const move = (ev: PointerEvent) => {
      const width = host?.getBoundingClientRect().width ?? 1
      const deltaSource = ((ev.clientX - originX) / Math.max(1, width)) * projectDuration * Math.max(0.05, speed)
      const next = dragLoopRegion({
        mode,
        originStart: origin.start,
        originEnd: origin.end,
        deltaSource: track.direction === 'reverse' ? -deltaSource : deltaSource,
        sourceDuration: duration,
      })
      engine.setTrackLoop(track.id, next.loopStart, next.loopEnd, false)
      setDrag({ mode, start: next.loopStart, end: next.loopEnd })
    }
    const up = () => {
      pointer.removeEventListener('pointermove', move)
      pointer.removeEventListener('pointerup', up)
      const latest = engine.getSnapshot().tracks.find((item) => item.id === track.id)
      engine.setTrackLoop(track.id, latest?.loopStart ?? origin.start, latest?.loopEnd ?? origin.end, true)
      setDrag(null)
    }
    pointer.addEventListener('pointermove', move)
    pointer.addEventListener('pointerup', up)
  }

  return (
    <div
      className={styles.wave}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const target = event.target
        if (target instanceof Element && target.closest('[data-loop-handle]')) return
        onSeek(event.clientX, event.currentTarget)
      }}
    >
      <canvas ref={ref} aria-hidden />
      <div className={styles.playhead} />
      {track.loop
        ? tiles.map((tile, index) => {
            const left = projectDuration > 0 ? (tile.projectStart / projectDuration) * 100 : 0
            const width = projectDuration > 0 ? ((tile.projectEnd - tile.projectStart) / projectDuration) * 100 : 0
            return (
              <div
                key={`${tile.projectStart}:${tile.projectEnd}:${index}`}
                className={styles.loopPass}
                style={{ left: `${left}%`, width: `${Math.max(0, width)}%` }}
                data-loop-pass={index}
              >
                {index > 0 ? (
                  <span className={styles.loopMark} aria-hidden>
                    <svg viewBox="0 0 16 16" width="12" height="12">
                      <path
                        d="M3.2 8.2a4.6 4.6 0 0 1 7.8-3.3L12.6 6.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <path d="M12.7 3.4v3.2H9.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M12.8 7.8a4.6 4.6 0 0 1-7.8 3.3L3.4 9.6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <path d="M3.3 12.6V9.4H6.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : null}
              </div>
            )
          })
        : null}
      {track.loop && first ? (
        <>
          <div
            className={styles.loopRegion}
            style={{ left: `${loopLeft}%`, width: `${loopWidth}%` }}
            data-loop-handle=""
            onPointerDown={(event) => beginDrag(event, 'body')}
          />
          <button
            type="button"
            className={`${styles.loopHandle} ${styles.loopStart}`}
            style={{ left: `${loopLeft}%` }}
            aria-label={t.mix.loopStart}
            data-loop-handle=""
            onPointerDown={(event) => beginDrag(event, 'start')}
          />
          <button
            type="button"
            className={`${styles.loopHandle} ${styles.loopEnd}`}
            style={{ left: `${loopLeft + loopWidth}%` }}
            aria-label={t.mix.loopEnd}
            data-loop-handle=""
            onPointerDown={(event) => beginDrag(event, 'end')}
          />
          <div className={styles.loopReadout}>
            <span>{t.mix.loopStart}</span>
            <strong>{formatLoopReadout(drag?.start ?? region.start)}</strong>
            <span>{t.mix.loopEnd}</span>
            <strong>{formatLoopReadout(drag?.end ?? region.end)}</strong>
          </div>
        </>
      ) : null}
      <span className="sr-only">{region.start.toFixed(3)}</span>
    </div>
  )
}
