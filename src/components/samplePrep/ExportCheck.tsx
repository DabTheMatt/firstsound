import { useEffect, useId, useRef } from 'react'
import { announce } from '../../a11y/liveRegion'
import {
  exportCheckAnnouncement,
  formatExportSampleRate,
  visibleExportFields,
  visibleExportIssues,
  type ExportCheckMode,
  type ExportCheckResult,
} from '../../audio/samplePrep/exportCheck'
import { formatTimecode } from '../../audio/engine/formatTime'
import { useI18n } from '../../i18n'
import type { ModuleType } from '../../audio/chain/chain'
import styles from './ExportCheck.module.css'

type Props = {
  result: ExportCheckResult
  mode: ExportCheckMode
  onLoadAudio?: () => void
}

export function ExportCheck({ result, mode, onLoadAudio }: Props) {
  const { locale, t } = useI18n()
  const titleId = useId()
  const statusId = useId()
  const fields = visibleExportFields(mode)
  const issues = visibleExportIssues(mode, result.issues)
  const previous = useRef<string | null>(null)
  const names = result.activeEffects.map((type) => t.modules[type]).join(', ')

  useEffect(() => {
    const next = exportCheckAnnouncement(previous.current, result.status, issues)
    previous.current = next.signature
    if (next.announce === 'problems') {
      const line = issues
        .filter((issue) => issue.severity === 'error' || issue.severity === 'warning')
        .map((issue) => `${severityLabel(t, issue.severity)}. ${issueText(t, issue.id, names)}`)
        .join(' ')
      announce(line)
      return
    }
    if (next.announce === 'recovered') announce(t.export.settingsValid)
  }, [issues, names, result.status, t])

  const noAudio = issues.some((issue) => issue.id === 'no-audio')

  return (
    <section className={styles.check} aria-labelledby={titleId} data-export-check="" data-explain="export.check" data-export-status={result.status}>
      <h3 id={titleId} className={styles.title}>
        {t.export.checkTitle}
      </h3>
      <p className={styles.help}>{t.export.help}</p>
      <dl className={styles.rows}>
        {fields.map((field) => {
          const row = rowContent(field, result, t, locale, names)
          const helpId = `${titleId}-${field}`
          return (
            <div key={field} className={styles.row} tabIndex={0} data-explain={fieldExplainId(field)}>
              <dt id={`${helpId}-label`}>{row.label}</dt>
              <dd aria-labelledby={`${helpId}-label`} aria-describedby={helpId}>
                <span>{row.value}</span>
                <span id={helpId} className="sr-only">
                  {row.help}
                  {field === 'range' ? ` ${formatTimecode(Math.max(0, result.rangeStart))} – ${formatTimecode(Math.max(0, result.rangeEnd))}.` : ''}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
      <h4 id={statusId} className={styles.status}>
        {t.export.status}
      </h4>
      <ul className={styles.issues} aria-labelledby={statusId}>
        {result.status === 'valid' ? (
          <li className={styles.valid}>
            <span className={styles.mark} aria-hidden="true">
              ✓
            </span>
            <span>{t.export.settingsValid}</span>
          </li>
        ) : null}
        {issues.map((issue) => (
          <li key={issue.id} className={styles.issue} data-severity={issue.severity}>
            <span className={styles.sev}>{severityLabel(t, issue.severity)}</span>
            <span className={styles.text}>{issueText(t, issue.id, names)}</span>
          </li>
        ))}
      </ul>
      {noAudio ? (
        <>
          <p className={styles.help}>{t.export.noAudioAction}</p>
          {onLoadAudio ? (
            <button type="button" className={styles.recover} onClick={onLoadAudio}>
              {t.export.loadAudio}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function severityLabel(
  t: ReturnType<typeof useI18n>['t'],
  severity: 'error' | 'warning' | 'info',
): string {
  if (severity === 'error') return t.export.error
  if (severity === 'warning') return t.export.warning
  return t.export.info
}

function issueText(t: ReturnType<typeof useI18n>['t'], id: ExportCheckResult['issues'][number]['id'], names: string): string {
  switch (id) {
    case 'no-audio':
      return t.export.noAudio
    case 'invalid-range':
      return t.export.invalidRange
    case 'zero-length':
      return t.export.zeroLength
    case 'range-outside':
      return t.export.outsideRange
    case 'unsupported-format':
      return t.export.unsupportedFormat
    case 'unsupported-rate':
      return t.export.unsupportedRate
    case 'unsupported-depth':
      return t.export.unsupportedDepth
    case 'selection-not-partial':
      return t.export.selectionUnavailable
    case 'effects-included':
      return t.export.effectsIncluded(names)
    case 'clip-unmeasured':
      return t.export.clipUnknown
    case 'clip-detected':
      return t.export.clipDetected
    case 'clip-within':
      return t.export.clipWithin
    case 'resample':
      return t.export.resampleNote
    case 'swap-without-pair':
      return t.export.swapNeedsStereo
    default:
      return t.export.info
  }
}

function fieldExplainId(field: 'format' | 'rate' | 'depth' | 'channels' | 'range' | 'effects'): string {
  if (field === 'format') return 'export.format'
  if (field === 'rate') return 'export.sampleRate'
  if (field === 'depth') return 'export.bitDepth'
  if (field === 'channels') return 'export.channels'
  if (field === 'range') return 'export.range'
  return 'export.check'
}

function rowContent(
  field: 'format' | 'rate' | 'depth' | 'channels' | 'range' | 'effects',
  result: ExportCheckResult,
  t: ReturnType<typeof useI18n>['t'],
  locale: 'en' | 'pl',
  names: string,
): { label: string; value: string; help: string } {
  if (field === 'format') {
    return { label: t.simple.saveFormat, value: result.format === 'wav' ? t.simple.wav : '—', help: t.export.formatHelp }
  }
  if (field === 'rate') {
    const value = result.sampleRateHz == null ? '—' : formatExportSampleRate(result.sampleRateHz, locale)
    return {
      label: t.simple.sampleRate,
      value,
      help: result.rateIsOriginal ? `${t.export.rateHelp} ${t.export.fileRate}` : t.export.rateHelp,
    }
  }
  if (field === 'depth') {
    const value =
      result.bitDepth === 16 ? '16-bit' : result.bitDepth === 24 ? '24-bit' : result.bitDepth === 32 ? t.export.depth32 : '—'
    const help = result.dither ? t.export.depthHelpDither : result.bitDepthKind === 'float' ? t.export.depthHelpFloat : t.export.depthHelpPcm
    return { label: t.simple.bitDepth, value, help }
  }
  if (field === 'channels') {
    return { label: t.simple.channels, value: channelLabel(result, t), help: t.export.channelHelp }
  }
  if (field === 'effects') {
    return {
      label: t.export.effectsLabel,
      value: result.effectsIncluded ? names : t.export.effectsNone,
      help: result.effectsIncluded ? t.export.effectsIncluded(names) : t.export.effectsNone,
    }
  }
  const kind = result.rangeKind === 'selection' ? t.export.selection : t.export.fullAudio
  const times =
    result.rangeValid ? '' : ` ${formatTimecode(Math.max(0, result.rangeStart))}–${formatTimecode(Math.max(0, result.rangeEnd))}`
  return { label: t.export.checkRange, value: `${kind}${times}`, help: t.export.rangeHelp }
}

function channelLabel(result: ExportCheckResult, t: ReturnType<typeof useI18n>['t']): string {
  if (result.channels === 'stereo') return t.simple.stereo
  if (result.channels === 'left') return t.mix.left
  if (result.channels === 'right') return t.mix.right
  if (result.channels === 'swap') return t.export.swap
  return t.simple.mono
}

export type { ModuleType }
