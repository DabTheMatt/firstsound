import { forwardRef, useEffect, useImperativeHandle, useId, useRef, useState } from 'react'
import { announce } from '../../a11y/liveRegion'
import {
  DEFAULT_EXPORT_PREVIEW_SEC,
  EXPORT_PREVIEW_SECONDS,
  planExportPreview,
  previewCoversExport,
  previewWasCancelled,
} from '../../audio/engine/exportPreview'
import { formatTimecode } from '../../audio/engine/formatTime'
import type { Pcm } from '../../audio/samplePrep'
import type { ExportCheckMode } from '../../audio/samplePrep/exportCheck'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './ExportPreview.module.css'

export type ExportPreviewPhase = 'idle' | 'preparing' | 'ready' | 'playing' | 'stopping' | 'error'

export type ExportPreviewHandle = {
  cancel: () => void
}

type Props = {
  mode: ExportCheckMode
  mainPlaying: boolean
  blocked: boolean
  signature: string
  selectionAvailable: boolean
  scope: 'project' | 'selection'
  onScope: (scope: 'project' | 'selection') => void
  exportStart: number
  exportEnd: number
  playhead: number
  reversed: boolean
  normalizeOn: boolean
  keepTail: boolean
  speedExcluded: boolean
  pitchExcluded: boolean
  onPauseMain: () => void
  onPhase?: (phase: ExportPreviewPhase) => void
  onRender: (durationSec: number, signal: AbortSignal) => Promise<Pcm | null>
}

export const ExportPreview = forwardRef<ExportPreviewHandle, Props>(function ExportPreview(
  {
    mode,
    mainPlaying,
    blocked,
    signature,
    selectionAvailable,
    scope,
    onScope,
    exportStart,
    exportEnd,
    playhead,
    reversed,
    normalizeOn,
    keepTail,
    speedExcluded,
    pitchExcluded,
    onPauseMain,
    onPhase,
    onRender,
  },
  ref,
) {
  const { t } = useI18n()
  const titleId = useId()
  const statusId = useId()
  const [durationSec, setDurationSec] = useState<number>(DEFAULT_EXPORT_PREVIEW_SEC)
  const [phase, setPhase] = useState<ExportPreviewPhase>('idle')
  const [message, setMessage] = useState('')
  const generation = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const cache = useRef<{ signature: string; pcm: Pcm } | null>(null)
  const signatureRef = useRef(signature)
  const phaseRef = useRef(phase)
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const stopButtonRef = useRef<HTMLButtonElement>(null)
  const mounted = useRef(true)
  const durationRef = useRef(durationSec)
  const plan = planExportPreview({
    exportStart,
    exportEnd,
    playhead,
    durationSec,
    reversed,
  })
  const planKey = `${plan?.exportStart ?? 0}|${plan?.exportEnd ?? 0}|${plan?.localStartSec ?? 0}|${plan?.localDurSec ?? 0}`
  const planKeyRef = useRef(planKey)
  const cacheKey = `${signature}\u001f${planKey}\u001f${durationSec}`

  useEffect(() => {
    phaseRef.current = phase
    onPhase?.(phase)
  }, [onPhase, phase])

  const quiet = (next: ExportPreviewPhase, text = '') => {
    if (!mounted.current) return
    setPhase(next)
    setMessage(text)
  }

  const dropPlayback = () => {
    generation.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    engine.stopExportPreview()
  }

  const parkFocus = () => {
    if (typeof document === 'undefined') return
    if (document.activeElement === stopButtonRef.current) playButtonRef.current?.focus()
  }

  useImperativeHandle(ref, () => ({
    cancel: () => {
      const wasAudible = phaseRef.current === 'playing' || phaseRef.current === 'preparing'
      dropPlayback()
      cache.current = null
      quiet('idle')
      if (wasAudible) announce(t.export.previewStopped)
    },
  }))

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
      abortRef.current?.abort()
      abortRef.current = null
      cache.current = null
      engine.stopExportPreview()
    }
  }, [])

  useEffect(() => {
    if (planKeyRef.current === planKey) return
    planKeyRef.current = planKey
    cache.current = null
    if (phaseRef.current !== 'playing' && phaseRef.current !== 'preparing') return
    parkFocus()
    dropPlayback()
    quiet('idle')
    announce(t.export.previewStopped)
  }, [planKey, t.export.previewStopped])

  useEffect(() => {
    if (durationRef.current === durationSec) return
    durationRef.current = durationSec
    const wasAudible = phaseRef.current === 'playing' || phaseRef.current === 'preparing'
    if (wasAudible) parkFocus()
    dropPlayback()
    cache.current = null
    quiet('idle')
    if (wasAudible) announce(t.export.previewStopped)
  }, [durationSec, t.export.previewStopped])

  useEffect(() => {
    if (signatureRef.current === signature) return
    signatureRef.current = signature
    const wasAudible = phaseRef.current === 'playing' || phaseRef.current === 'preparing'
    if (wasAudible) parkFocus()
    dropPlayback()
    cache.current = null
    quiet('idle')
    if (wasAudible) announce(t.export.previewStopped)
  }, [signature, t.export.previewStopped])

  useEffect(() => {
    if (!mainPlaying || phaseRef.current !== 'playing') return
    parkFocus()
    dropPlayback()
    quiet('ready', t.export.previewStopPlayback)
    announce(t.export.previewStopped)
  }, [mainPlaying, t.export.previewStopPlayback, t.export.previewStopped])

  const start = () => {
    if (phaseRef.current === 'preparing' || phaseRef.current === 'stopping') return
    if (blocked || !plan) {
      quiet('error', t.export.previewUnavailable)
      announce(t.export.previewUnavailable)
      return
    }
    if (mainPlaying) {
      quiet(phaseRef.current === 'playing' ? 'ready' : phaseRef.current, t.export.previewStopPlayback)
      announce(t.export.previewStopPlayback)
      return
    }
    const token = generation.current + 1
    generation.current = token
    const cached = cache.current
    if (cached && cached.signature === cacheKey) {
      void playCached(cached.pcm, token)
      return
    }
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    quiet('preparing', t.export.previewPreparing)
    announce(t.export.previewPreparing)
    void (async () => {
      try {
        const pcm = await onRender(durationSec, controller.signal)
        if (!mounted.current || token !== generation.current) return
        if (!pcm || (pcm.channels[0]?.length ?? 0) < 1) {
          quiet('error', t.export.previewFailed)
          announce(t.export.previewFailed)
          return
        }
        cache.current = { signature: cacheKey, pcm }
        if (engine.getSnapshot().playing) {
          quiet('ready', t.export.previewStopPlayback)
          announce(t.export.previewReady)
          return
        }
        await playCached(pcm, token)
      } catch (error) {
        if (!mounted.current || token !== generation.current) return
        if (previewWasCancelled(error)) {
          quiet('idle')
          return
        }
        const text = error instanceof Error && error.message === 'Export is already running'
          ? t.export.previewBusy
          : t.export.previewFailed
        quiet('error', text)
        announce(text)
      }
    })()
  }

  const playCached = async (pcm: Pcm, token: number) => {
    quiet('playing', t.export.previewPlaying)
    const result = await engine.playExportPreview(pcm, {
      onEnded: () => {
        if (!mounted.current || token !== generation.current) return
        quiet('ready', t.export.previewStopped)
        announce(t.export.previewStopped)
      },
    })
    if (!mounted.current || token !== generation.current) {
      if (result === 'playing') engine.stopExportPreview()
      return
    }
    if (result === 'playing') {
      announce(t.export.previewPlaying)
      return
    }
    if (result === 'main-playback') {
      quiet('ready', t.export.previewStopPlayback)
      announce(t.export.previewStopPlayback)
      return
    }
    quiet('error', result === 'empty' ? t.export.previewFailed : t.export.previewUnavailable)
    announce(result === 'empty' ? t.export.previewFailed : t.export.previewUnavailable)
  }

  const stop = () => {
    const active = phaseRef.current
    if (active !== 'playing' && active !== 'preparing' && active !== 'stopping') return
    parkFocus()
    dropPlayback()
    if (active === 'preparing') {
      cache.current = null
      quiet('idle', t.export.previewStopped)
    } else {
      quiet('ready', t.export.previewStopped)
    }
    announce(t.export.previewStopped)
  }

  const pauseMain = () => {
    onPauseMain()
    playButtonRef.current?.focus()
  }

  const rangeText = plan
    ? t.export.previewRange(
        formatTimecode(plan.exportStart + plan.localStartSec),
        formatTimecode(plan.exportStart + plan.localStartSec + plan.localDurSec),
      )
    : ''
  const technical = mode === 'technical'
  const playLabel = phase === 'preparing' ? t.export.previewPreparing : t.export.preview
  const playDisabled = blocked || !plan || phase === 'preparing' || phase === 'stopping' || mainPlaying

  return (
    <section className={styles.preview} aria-labelledby={titleId} data-export-preview="" data-explain="export.preview" data-preview-state={phase}>
      <h3 id={titleId} className={styles.title}>
        {t.export.previewTitle}
      </h3>
      <p className={styles.help}>{t.export.previewNotEncoded}</p>
      {selectionAvailable ? (
        <div className={styles.scopes} role="group" aria-label={t.export.previewScope}>
          <button
            type="button"
            className={scope === 'project' ? styles.on : undefined}
            aria-pressed={scope === 'project'}
            onClick={() => onScope('project')}
          >
            {t.export.fullAudio}
          </button>
          <button
            type="button"
            className={scope === 'selection' ? styles.on : undefined}
            aria-pressed={scope === 'selection'}
            onClick={() => onScope('selection')}
          >
            {t.export.selection}
          </button>
        </div>
      ) : null}
      <div className={styles.row}>
        <button
          ref={playButtonRef}
          type="button"
          className={styles.play}
          data-export-preview-start=""
          disabled={playDisabled}
          aria-describedby={statusId}
          onClick={start}
        >
          {playLabel}
        </button>
        <button
          ref={stopButtonRef}
          type="button"
          data-export-preview-stop=""
          aria-label={t.export.previewStopAria}
          disabled={phase !== 'playing' && phase !== 'preparing'}
          onClick={stop}
        >
          {t.export.previewStop}
        </button>
        <select
          className={styles.duration}
          aria-label={t.export.previewDuration}
          value={durationSec}
          disabled={phase === 'preparing'}
          onChange={(event) => setDurationSec(Number(event.target.value))}
        >
          {EXPORT_PREVIEW_SECONDS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {t.export.previewSeconds(seconds)}
            </option>
          ))}
        </select>
      </div>
      {mainPlaying ? (
        <button type="button" className={styles.pause} data-export-preview-pause="" onClick={pauseMain}>
          {t.export.previewStopPlaybackAction}
        </button>
      ) : null}
      <p id={statusId} className={styles.status} role="status">
        {mainPlaying ? t.export.previewStopPlayback : message || (blocked || !plan ? t.export.previewUnavailable : '')}
      </p>
      <div className={styles.notes}>
        {plan?.playheadOutside ? <p className={styles.note}>{t.export.previewOutside}</p> : null}
        {technical && rangeText ? <p className={styles.note}>{rangeText}</p> : null}
        {normalizeOn && plan && !previewCoversExport(plan) ? <p className={styles.note}>{t.export.previewNormalize}</p> : null}
        {technical && keepTail && plan && !previewCoversExport(plan) ? <p className={styles.note}>{t.export.previewTail}</p> : null}
        {technical && speedExcluded ? <p className={styles.note}>{t.export.previewSpeed}</p> : null}
        {technical && pitchExcluded ? <p className={styles.note}>{t.export.previewPitch}</p> : null}
        {technical ? <p className={styles.note}>{t.export.previewMonitor}</p> : null}
      </div>
    </section>
  )
})
