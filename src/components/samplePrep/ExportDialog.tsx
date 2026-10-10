import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { exportWorkingRange, selectionExportAvailable } from '../../audio/engine/exportTail'
import { DEFAULT_NORMALIZE_DBFS, exportFileName, isTrimmed, type WavBitDepth } from '../../audio/samplePrep'
import { downloadBlob } from '../../features/sample/files'
import { emitGuideEvent } from '../../guide/events'
import { guideTargetAttrs } from '../../guide/targets'
import { engine } from '../../hooks/useEngine'
import { pushHearingAlert } from '../../hearing/alerts'
import { useI18n } from '../../i18n'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import styles from './ExportDialog.module.css'

type Props = {
  snap: EngineSnapshot
  onClose: () => void
}

const RATES = [
  { value: 'original', label: 'Original' },
  { value: '44100', label: '44.1 kHz' },
  { value: '48000', label: '48 kHz' },
  { value: '88200', label: '88.2 kHz' },
  { value: '96000', label: '96 kHz' },
] as const

export function ExportDialog({ snap, onClose }: Props) {
  const { t } = useI18n()
  const prep = snap.prep
  const partial =
    isTrimmed(prep, snap.sourceDuration) ||
    prep.selectionStart > prep.windowStart + 0.001 ||
    prep.selectionEnd < prep.windowEnd - 0.001
  const [name, setName] = useState(
    exportFileName(snap.fileName || 'sample', partial, prep.clipName).replace(/\.wav$/, ''),
  )
  const [format] = useState('wav')
  const [rate, setRate] = useState<'original' | string>('original')
  const [bitDepth, setBitDepth] = useState<WavBitDepth>(24)
  const [applyFades, setApplyFades] = useState(true)
  const [applyGain, setApplyGain] = useState(prep.gainDb !== 0)
  const [applyReverse, setApplyReverse] = useState(prep.reverse)
  const [applyNormalize, setApplyNormalize] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'rendering' | 'encoding' | 'error'>('idle')
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const aliveRef = useRef(true)
  const busy = phase === 'preparing' || phase === 'rendering' || phase === 'encoding'
  const exportClock = useMemo(
    () => ({
      bufferDuration: snap.duration,
      regionStart: snap.params.start,
      regionEnd: snap.params.end,
    }),
    [snap.duration, snap.params.start, snap.params.end],
  )
  const selectionReady = selectionExportAvailable(prep, exportClock)

  const projectLength = useMemo(() => {
    const range = exportWorkingRange(prep, 'project', exportClock)
    return Math.max(0, range.end - range.start)
  }, [prep, exportClock])
  const selectionLength = useMemo(() => {
    const range = exportWorkingRange(prep, 'selection', exportClock)
    return Math.max(0, range.end - range.start)
  }, [prep, exportClock])
  const originalHz = snap.sourceSampleRate

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const phaseLabel = (idle: string) => {
    if (phase === 'preparing') return t.export.preparing
    if (phase === 'rendering') return t.export.rendering
    if (phase === 'encoding') return t.export.encoding
    return idle
  }

  const exportNow = (scope: 'project' | 'selection') => {
    if (busyRef.current) return
    if (scope === 'selection' && !selectionReady) return
    busyRef.current = true
    setError('')
    setPhase('preparing')
    void (async () => {
      let closed = false
      try {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const result = await engine.exportWav(
          {
            name,
            sampleRate: rate === 'original' ? 'original' : Number(rate),
            bitDepth,
            applyFades,
            applyGain,
            applyReverse,
            applyNormalize,
            scope,
          },
          {
            onProgress: (next) => {
              if (aliveRef.current) setPhase(next)
            },
          },
        )
        if (!aliveRef.current) return
        if (!result) {
          setPhase('error')
          setError(t.export.exportFailed)
          return
        }
        downloadBlob(result.filename, result.blob)
        emitGuideEvent('export.completed')
        pushHearingAlert({
          id: 'export',
          title: 'EXPORT COMPLETE',
          detail: result.filename,
          tone: 'info',
        })
        closed = true
        onClose()
      } catch (err) {
        if (!aliveRef.current) return
        setPhase('error')
        setError(err instanceof Error && err.message ? err.message : t.export.exportFailed)
      } finally {
        busyRef.current = false
        if (aliveRef.current && !closed) {
          setPhase((current) => (current === 'error' ? current : 'idle'))
        }
      }
    })()
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      aria-busy={busy}
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          exportNow('project')
        }}
      >
        <h2 id="export-title">{t.export.title}</h2>
        <label className={styles.field}>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          Format
          <select value={format} disabled>
            <option value="wav">WAV</option>
          </select>
        </label>
        <p className={styles.hint}>{t.export.hintCodec}</p>
        <label className={styles.field}>
          Sample rate
          <select value={rate} onChange={(e) => setRate(e.target.value)}>
            {RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value === 'original' ? `${t.export.original} (${originalHz || '—'} Hz)` : r.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Bit depth
          <select value={bitDepth} onChange={(e) => setBitDepth(Number(e.target.value) as WavBitDepth)}>
            <option value={16}>16-bit (dithered)</option>
            <option value={24}>24-bit</option>
            <option value={32}>32-bit float</option>
          </select>
        </label>
        <p className={styles.hint}>
          Channels: {snap.sourceChannels >= 2 && prep.channelMode === 'original' ? 'Stereo' : prep.channelMode === 'mono' || snap.sourceChannels < 2 ? 'Mono' : prep.channelMode}
        </p>
        <label className={styles.check}>
          <input type="checkbox" checked={applyFades} onChange={(e) => setApplyFades(e.target.checked)} />
          Apply fade in / out
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyGain} onChange={(e) => setApplyGain(e.target.checked)} />
          Apply gain
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyReverse} onChange={(e) => setApplyReverse(e.target.checked)} />
          Apply reverse
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyNormalize} onChange={(e) => setApplyNormalize(e.target.checked)} />
          Normalize to {DEFAULT_NORMALIZE_DBFS} dBFS
        </label>
        <p className={styles.hint}>{t.export.estimated(formatTimecode(projectLength))}</p>
        <p className={styles.hint}>{t.export.tailHint}</p>
        {error ? <p className={styles.hint}>{error}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectionReady || busy}
            title={selectionReady ? undefined : t.export.selectionUnavailable}
            onClick={() => exportNow('selection')}
          >
            {phaseLabel(t.export.exportSelection)}
          </button>
          <button type="submit" className={styles.export} {...guideTargetAttrs('export.confirm')} disabled={busy}>
            {phaseLabel(t.export.exportProject)}
          </button>
        </div>
        {!selectionReady ? <p className={styles.hint}>{t.export.selectionUnavailable}</p> : (
          <p className={styles.hint}>{t.export.estimated(formatTimecode(selectionLength))}</p>
        )}
      </form>
    </div>
  )
}
