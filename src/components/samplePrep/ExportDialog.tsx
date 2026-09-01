import { useMemo, useState } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { DEFAULT_NORMALIZE_DBFS, exportFileName, isTrimmed, type WavBitDepth } from '../../audio/samplePrep'
import { downloadBlob } from '../../features/sample/files'
import { engine } from '../../hooks/useEngine'
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
  const prep = snap.prep
  const partial =
    isTrimmed(prep, snap.sourceDuration) ||
    prep.selectionStart > prep.windowStart + 0.001 ||
    prep.selectionEnd < prep.windowEnd - 0.001
  const [name, setName] = useState(exportFileName(snap.fileName || 'sample', partial).replace(/\.wav$/, ''))
  const [format] = useState('wav')
  const [rate, setRate] = useState<'original' | string>('original')
  const [bitDepth, setBitDepth] = useState<WavBitDepth>(24)
  const [applyFades, setApplyFades] = useState(true)
  const [applyGain, setApplyGain] = useState(prep.gainDb !== 0)
  const [applyReverse, setApplyReverse] = useState(prep.reverse)
  const [applyNormalize, setApplyNormalize] = useState(false)

  const estimated = useMemo(() => Math.max(0, prep.selectionEnd - prep.selectionStart), [prep])
  const originalHz = snap.sourceSampleRate

  const exportNow = () => {
    const result = engine.exportWav({
      name,
      sampleRate: rate === 'original' ? 'original' : Number(rate),
      bitDepth,
      applyFades,
      applyGain,
      applyReverse,
      applyNormalize,
    })
    if (!result) return
    downloadBlob(result.filename, result.blob)
    onClose()
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-labelledby="export-title" onClick={onClose}>
      <form
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          exportNow()
        }}
      >
        <h2 id="export-title">Export sample</h2>
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
        <p className={styles.hint}>FLAC and AIFF are listed only when this build can encode them.</p>
        <label className={styles.field}>
          Sample rate
          <select value={rate} onChange={(e) => setRate(e.target.value)}>
            {RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value === 'original' ? `Original (${originalHz || '—'} Hz)` : r.label}
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
        <p className={styles.hint}>Estimated duration {formatTimecode(estimated)}</p>
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.export}>
            Export
          </button>
        </div>
      </form>
    </div>
  )
}
