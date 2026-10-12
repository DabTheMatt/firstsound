import { useEffect, useMemo, useRef, useState } from 'react'
import { focusInitial, trapTab } from '../../a11y/dialogFocus'
import { formatTimecode } from '../../audio/engine/formatTime'
import { exportPreviewSignature, planExportPreview } from '../../audio/engine/exportPreview'
import { effectTailBudgetSec, exportWorkingRange, selectionExportAvailable } from '../../audio/engine/exportTail'
import {
  EXPORT_BIT_DEPTHS,
  EXPORT_FORMATS,
  EXPORT_SAMPLE_RATES,
  evaluateExportCheck,
  exportProcessingStamp,
  type ExportCheckMode,
} from '../../audio/samplePrep/exportCheck'
import { DEFAULT_NORMALIZE_DBFS, exportFileName, isTrimmed, type WavBitDepth } from '../../audio/samplePrep'
import { downloadBlob } from '../../features/sample/files'
import { emitGuideEvent } from '../../guide/events'
import { guideTargetAttrs } from '../../guide/targets'
import { engine } from '../../hooks/useEngine'
import { pushHearingAlert } from '../../hearing/alerts'
import { useI18n } from '../../i18n'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { ExportCheck } from './ExportCheck'
import { ExportPreview, type ExportPreviewHandle } from './ExportPreview'
import styles from './ExportDialog.module.css'

type Props = {
  snap: EngineSnapshot
  mode?: ExportCheckMode
  onClose: () => void
  onLoadAudio?: () => void
}

export function ExportDialog({ snap, mode = 'technical', onClose, onLoadAudio }: Props) {
  const { t } = useI18n()
  const prep = snap.prep
  const partial =
    isTrimmed(prep, snap.sourceDuration) ||
    prep.selectionStart > prep.windowStart + 0.001 ||
    prep.selectionEnd < prep.windowEnd - 0.001
  const [name, setName] = useState(
    exportFileName(snap.fileName || 'sample', partial, prep.clipName).replace(/\.wav$/, ''),
  )
  const [format] = useState<(typeof EXPORT_FORMATS)[number]>('wav')
  const [rate, setRate] = useState<'original' | string>('original')
  const [bitDepth, setBitDepth] = useState<WavBitDepth>(24)
  const [applyFades, setApplyFades] = useState(true)
  const [applyGain, setApplyGain] = useState(prep.gainDb !== 0)
  const [applyReverse, setApplyReverse] = useState(prep.reverse)
  const [applyNormalize, setApplyNormalize] = useState(false)
  const [keepTail, setKeepTail] = useState(true)
  const [previewScope, setPreviewScope] = useState<'project' | 'selection'>('project')
  const [previewPreparing, setPreviewPreparing] = useState(false)
  const previewRef = useRef<ExportPreviewHandle>(null)
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'rendering' | 'encoding' | 'error'>('idle')
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
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
  const sampleRate: number | 'original' = rate === 'original' ? 'original' : Number(rate)
  const shared = useMemo(
    () => ({
      sampleLoaded: snap.sampleLoaded,
      sourceSampleRate: snap.sourceSampleRate,
      sourceChannels: snap.sourceChannels,
      bufferDuration: snap.duration,
      regionStart: snap.params.start,
      regionEnd: snap.params.end,
      prep,
      format,
      sampleRate,
      bitDepth,
      chain: snap.chain,
      bufferRev: snap.bufferRev,
      allowedRates: EXPORT_SAMPLE_RATES,
      allowedBitDepths: EXPORT_BIT_DEPTHS,
    }),
    [
      snap.sampleLoaded,
      snap.sourceSampleRate,
      snap.sourceChannels,
      snap.duration,
      snap.params.start,
      snap.params.end,
      prep,
      format,
      sampleRate,
      bitDepth,
      snap.chain,
      snap.bufferRev,
    ],
  )
  const projectCheck = useMemo(
    () => evaluateExportCheck({ ...shared, scope: 'project', requirePartial: false }),
    [shared],
  )
  const selectionCheck = useMemo(
    () => evaluateExportCheck({ ...shared, scope: 'selection', requirePartial: true }),
    [shared],
  )
  const selectionReady = selectionExportAvailable(prep, exportClock) && selectionCheck.canExport
  const activeScope = previewScope === 'selection' && selectionReady ? 'selection' : 'project'
  const previewGate = activeScope === 'selection' ? selectionCheck : projectCheck
  const previewRange = useMemo(
    () => exportWorkingRange(prep, activeScope, exportClock),
    [prep, activeScope, exportClock],
  )
  const previewSignature = useMemo(
    () =>
      exportPreviewSignature([
        snap.bufferRev,
        activeScope,
        String(sampleRate),
        applyFades,
        applyGain,
        applyReverse && prep.reverse,
        applyNormalize,
        keepTail,
        previewGate.canExport,
        previewGate.status,
        previewRange.start,
        previewRange.end,
        exportProcessingStamp({
          chain: snap.chain,
          automation: snap.automation,
          lfos: snap.fxLfos,
          params: {
            params: snap.params,
            eq: snap.eqById,
            prep,
            delay: snap.delayType,
            reverb: snap.reverbType,
            distortion: snap.distortionType,
            master: snap.masterMix,
            layout: snap.channelLayout,
          },
        }),
      ]),
    [
      snap.bufferRev,
      snap.chain,
      snap.automation,
      snap.fxLfos,
      snap.params,
      snap.eqById,
      snap.delayType,
      snap.reverbType,
      snap.distortionType,
      snap.masterMix,
      snap.channelLayout,
      activeScope,
      sampleRate,
      applyFades,
      applyGain,
      applyReverse,
      applyNormalize,
      keepTail,
      previewGate.canExport,
      previewGate.status,
      previewRange.start,
      previewRange.end,
      prep,
    ],
  )

  const tailSec = useMemo(
    () => (keepTail ? effectTailBudgetSec(snap.chain, snap.params, snap.reverbType) : 0),
    [keepTail, snap.chain, snap.params, snap.reverbType],
  )
  const projectLength = useMemo(() => {
    const range = exportWorkingRange(prep, 'project', exportClock)
    return Math.max(0, range.end - range.start) + tailSec
  }, [prep, exportClock, tailSec])
  const selectionLength = useMemo(() => {
    const range = exportWorkingRange(prep, 'selection', exportClock)
    return Math.max(0, range.end - range.start) + tailSec
  }, [prep, exportClock, tailSec])
  const originalHz = snap.sourceSampleRate

  useEffect(() => {
    focusInitial(dialogRef.current)
  }, [])

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
    previewRef.current?.cancel()
    if (busyRef.current) return
    const gate = scope === 'selection' ? selectionCheck : projectCheck
    if (!gate.canExport) return
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
            sampleRate,
            bitDepth,
            applyFades,
            applyGain,
            applyReverse,
            applyNormalize,
            includeEffectTail: keepTail,
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
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      aria-busy={busy}
      onKeyDown={(event) => trapTab(event)}
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className={styles.panel}
        data-export-dialog=""
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          exportNow('project')
        }}
      >
        <div className={styles.body} data-export-body="">
        <h2 id="export-title" tabIndex={-1}>
          {t.export.title}
        </h2>
        <label className={styles.field}>
          {t.simple.saveName}
          <input data-dialog-initial="" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          {t.simple.saveFormat}
          <select value={format} disabled aria-describedby="export-format-help" data-explain="export.format">
            {EXPORT_FORMATS.map((id) => (
              <option key={id} value={id}>
                {t.simple.wav}
              </option>
            ))}
          </select>
        </label>
        <p id="export-format-help" className={styles.hint}>
          {t.export.hintCodec}
        </p>
        <label className={styles.field}>
          {t.simple.sampleRate}
          <select value={rate} data-explain="export.sampleRate" onChange={(e) => setRate(e.target.value)}>
            <option value="original">
              {t.export.original} ({originalHz || '—'} Hz)
            </option>
            {EXPORT_SAMPLE_RATES.map((hz) => (
              <option key={hz} value={String(hz)}>
                {hz === 44100 ? '44.1 kHz' : hz === 48000 ? '48 kHz' : hz === 88200 ? '88.2 kHz' : '96 kHz'}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {t.simple.bitDepth}
          <select
            value={bitDepth}
            data-explain="export.bitDepth"
            onChange={(e) => setBitDepth(Number(e.target.value) as WavBitDepth)}
            aria-describedby="export-depth-help"
          >
            {EXPORT_BIT_DEPTHS.map((depth) => (
              <option key={depth} value={depth}>
                {depth === 16 ? t.export.depth16 : depth === 24 ? t.export.depth24 : t.export.depth32}
              </option>
            ))}
          </select>
        </label>
        <p id="export-depth-help" className={styles.hint}>
          {bitDepth === 16 ? t.export.depthHelpDither : bitDepth === 32 ? t.export.depthHelpFloat : t.export.depthHelpPcm}
        </p>
        <label className={styles.check}>
          <input type="checkbox" checked={applyFades} onChange={(e) => setApplyFades(e.target.checked)} />
          {t.export.applyFades}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyGain} onChange={(e) => setApplyGain(e.target.checked)} />
          {t.export.applyGain}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyReverse} onChange={(e) => setApplyReverse(e.target.checked)} />
          {t.export.applyReverse}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={applyNormalize} onChange={(e) => setApplyNormalize(e.target.checked)} />
          {t.export.applyNormalize(DEFAULT_NORMALIZE_DBFS)}
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={keepTail}
            data-keep-tail=""
            onChange={(e) => setKeepTail(e.target.checked)}
          />
          {t.export.keepTail}
        </label>
        <p className={styles.hint}>{keepTail ? t.export.tailHint : t.export.tailDropped}</p>
        <p className={styles.hint}>{t.export.estimated(formatTimecode(projectLength))}</p>
        <ExportCheck result={projectCheck} mode={mode} onLoadAudio={onLoadAudio} />
        <ExportPreview
          ref={previewRef}
          mode={mode}
          mainPlaying={snap.playing}
          blocked={!previewGate.canExport}
          signature={previewSignature}
          selectionAvailable={selectionReady}
          scope={activeScope}
          onScope={setPreviewScope}
          exportStart={previewRange.start}
          exportEnd={previewRange.end}
          playhead={engine.getPlayheadSeconds()}
          reversed={applyReverse && prep.reverse}
          normalizeOn={applyNormalize}
          keepTail={keepTail}
          speedExcluded={Math.abs(snap.params.speed - 1) > 0.01}
          pitchExcluded={Math.abs(snap.params.pitch) > 0.01}
          onPauseMain={() => engine.pause()}
          onPhase={(next) => setPreviewPreparing(next === 'preparing' || next === 'stopping')}
          onRender={(durationSec, signal) => {
            const range = exportWorkingRange(prep, activeScope, exportClock)
            const next = planExportPreview({
              exportStart: range.start,
              exportEnd: range.end,
              playhead: engine.getPlayheadSeconds(),
              durationSec,
              reversed: applyReverse && prep.reverse,
            })
            if (!next || !previewGate.canExport) return Promise.resolve(null)
            return engine.renderExportPreview(
              {
                name,
                sampleRate,
                bitDepth,
                applyFades,
                applyGain,
                applyReverse,
                applyNormalize,
                includeEffectTail: keepTail,
                scope: activeScope,
              },
              next,
              { signal },
            )
          }}
        />
        {error ? (
          <p className={styles.hint} role="alert">
            {error}
          </p>
        ) : null}
        {!selectionReady ? (
          <p className={styles.hint}>{t.export.selectionUnavailable}</p>
        ) : (
          <p className={styles.hint}>{t.export.estimated(formatTimecode(selectionLength))}</p>
        )}
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onClose} disabled={busy}>
            {t.export.cancel}
          </button>
          <button
            type="button"
            disabled={!selectionReady || busy || previewPreparing}
            title={selectionReady ? undefined : t.export.selectionUnavailable}
            data-explain="export.range"
            onClick={() => exportNow('selection')}
          >
            {phaseLabel(t.export.exportSelection)}
          </button>
          <button
            type="submit"
            className={styles.export}
            {...guideTargetAttrs('export.confirm')}
            data-explain="export.range"
            disabled={!projectCheck.canExport || busy || previewPreparing}
          >
            {phaseLabel(t.export.exportProject)}
          </button>
        </div>
      </form>
    </div>
  )
}
