import { FADE_CURVES, type FadeCurveId } from '../../audio/samplePrep'
import { formatTimecode, timecodeDigits } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import styles from './EditBar.module.css'

type Props = {
  snap: EngineSnapshot
  viewSpan: number
  moreOpen: boolean
  onToggleMore: () => void
  onExport: () => void
  onDone: () => void
}

function CurveIcon({ id, active }: { id: FadeCurveId; active: boolean }) {
  const d =
    id === 'linear'
      ? 'M2 14 L22 2'
      : id === 'equalPower'
        ? 'M2 14 Q12 12 22 2'
        : id === 'exponential'
          ? 'M2 14 Q16 13 22 2'
          : 'M2 14 C8 14 10 2 22 2'
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <path d={d} fill="none" stroke={active ? 'var(--accent)' : '#9aa0a3'} strokeWidth="1.6" />
    </svg>
  )
}

export function EditBar({ snap, viewSpan, moreOpen, onToggleMore, onExport, onDone }: Props) {
  const prep = snap.prep
  const digits = timecodeDigits(viewSpan)
  const len = Math.max(0, prep.selectionEnd - prep.selectionStart)
  const step = Math.max(0.0005, viewSpan / 400)

  const setFadeSec = (which: 'in' | 'out', sec: number) => {
    if (which === 'in') engine.commitPrep({ fadeInSec: Math.max(0, sec), fadeAuto: false })
    else engine.commitPrep({ fadeOutSec: Math.max(0, sec), fadeAuto: false })
  }

  return (
    <div className={styles.bar}>
      <div className={styles.times}>
        <div className={styles.time}>
          <span>Start</span>
          <div className={styles.nudge}>
            <button type="button" aria-label="Nudge start earlier" onClick={() => engine.commitPrep({ selectionStart: prep.selectionStart - step })}>
              −
            </button>
            <strong>{formatTimecode(prep.selectionStart, digits)}</strong>
            <button type="button" aria-label="Nudge start later" onClick={() => engine.commitPrep({ selectionStart: prep.selectionStart + step })}>
              +
            </button>
          </div>
        </div>
        <div className={styles.time}>
          <span>End</span>
          <div className={styles.nudge}>
            <button type="button" aria-label="Nudge end earlier" onClick={() => engine.commitPrep({ selectionEnd: prep.selectionEnd - step })}>
              −
            </button>
            <strong>{formatTimecode(prep.selectionEnd, digits)}</strong>
            <button type="button" aria-label="Nudge end later" onClick={() => engine.commitPrep({ selectionEnd: prep.selectionEnd + step })}>
              +
            </button>
          </div>
        </div>
        <div className={styles.time}>
          <span>Length</span>
          <strong>{formatTimecode(len, digits)}</strong>
        </div>
      </div>

      <div className={styles.fades}>
        <label className={styles.fade}>
          <header>
            Fade in
            <b>{Math.round(prep.fadeInSec * 1000)} ms</b>
          </header>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min={0}
              step={1}
              value={Math.round(prep.fadeInSec * 1000)}
              disabled={!prep.fadeInEnabled}
              onChange={(e) => setFadeSec('in', Number(e.target.value) / 1000)}
            />
            <button
              type="button"
              className={`${styles.tool} ${prep.fadeInEnabled ? styles.toolActive : ''}`}
              onClick={() => engine.commitPrep({ fadeInEnabled: !prep.fadeInEnabled, fadeAuto: false })}
            >
              {prep.fadeInEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </label>
        <label className={styles.fade}>
          <header>
            Fade out
            <b>{Math.round(prep.fadeOutSec * 1000)} ms</b>
          </header>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min={0}
              step={1}
              value={Math.round(prep.fadeOutSec * 1000)}
              disabled={!prep.fadeOutEnabled}
              onChange={(e) => setFadeSec('out', Number(e.target.value) / 1000)}
            />
            <button
              type="button"
              className={`${styles.tool} ${prep.fadeOutEnabled ? styles.toolActive : ''}`}
              onClick={() => engine.commitPrep({ fadeOutEnabled: !prep.fadeOutEnabled, fadeAuto: false })}
            >
              {prep.fadeOutEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </label>
      </div>

      <div className={styles.row} role="group" aria-label="Fade curve">
        {FADE_CURVES.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            className={`${styles.curve} ${prep.fadeInCurve === c.id ? styles.curveActive : ''}`}
            onClick={() => engine.commitPrep({ fadeInCurve: c.id, fadeOutCurve: c.id })}
          >
            <CurveIcon id={c.id} active={prep.fadeInCurve === c.id} />
          </button>
        ))}
        <button type="button" className={styles.tool} onClick={() => engine.commitPrep({ fadeAuto: true, fadeInEnabled: true, fadeOutEnabled: true })}>
          Auto
        </button>
      </div>
      <label className={styles.fade}>
        <header>
          Curve character
          <b>{prep.fadeInBend < 0.45 ? 'Slow start' : prep.fadeInBend > 0.55 ? 'Fast start' : 'Default'}</b>
        </header>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={prep.fadeInBend}
          onPointerDown={() => engine.beginPrepGesture()}
          onChange={(e) => {
            const bend = Number(e.target.value)
            engine.setPrepLive({ fadeInBend: bend, fadeOutBend: bend, fadeAuto: false }, true)
          }}
          onPointerUp={() => engine.endPrepGesture()}
        />
      </label>

      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.tool} ${prep.autoSnapZero ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ autoSnapZero: !prep.autoSnapZero })}
        >
          Auto snap
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.snapZero('start')}>
          Zero start
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.snapZero('end')}>
          Zero end
        </button>
      </div>
      {snap.zeroNotice ? <p className={styles.notice}>{snap.zeroNotice}</p> : null}

      <div className={styles.playRow}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => void engine.unlock().then(() => engine.toggleSelectionPlayback())}
        >
          {snap.previewPlaying ? 'Stop' : 'Play selection'}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${snap.previewLoop ? styles.toolActive : ''}`}
          onClick={() => engine.setPreviewLoop(!snap.previewLoop)}
        >
          Loop
        </button>
        <button type="button" className={styles.tool} onClick={() => void engine.playAudition('start')}>
          Start
        </button>
        <button type="button" className={styles.tool} onClick={() => void engine.playAudition('end')}>
          End
        </button>
      </div>

      <div className={styles.tools}>
        <button type="button" className={styles.tool} onClick={() => engine.trimToSelection()}>
          Trim
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.normalize ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ normalize: !prep.normalize })}
        >
          Normalize audio
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.reverse ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ reverse: !prep.reverse })}
        >
          Reverse
        </button>
        <button type="button" className={styles.tool} onClick={onExport}>
          Export
        </button>
        <button
          type="button"
          className={styles.primary}
          style={{ gridColumn: '1 / -1' }}
          onClick={() => void engine.unlock().then(() => engine.useAsSample()).then(onDone)}
        >
          Use as sample
        </button>
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.tool} disabled={!snap.canUndoPrep} onClick={() => engine.undoPrep()}>
          Undo
        </button>
        <button type="button" className={styles.tool} disabled={!snap.canRedoPrep} onClick={() => engine.redoPrep()}>
          Redo
        </button>
        <button type="button" className={`${styles.moreBtn} ${moreOpen ? styles.toolActive : ''}`} onClick={onToggleMore}>
          More tools
        </button>
      </div>

      {moreOpen ? <MoreTools snap={snap} /> : null}
    </div>
  )
}

function MoreTools({ snap }: { snap: EngineSnapshot }) {
  const prep = snap.prep
  return (
    <div className={styles.sheet}>
      <label>
        Gain
        <input
          className={styles.input}
          type="number"
          step={0.5}
          value={prep.gainDb}
          onChange={(e) => engine.commitPrep({ gainDb: Number(e.target.value) })}
        />
      </label>
      <label>
        Normalize to
        <select
          className={styles.input}
          style={{ width: 110 }}
          value={prep.normalizeTargetDbfs}
          onChange={(e) => engine.commitPrep({ normalizeTargetDbfs: Number(e.target.value) })}
        >
          <option value={-0.1}>-0.1 dBFS</option>
          <option value={-0.5}>-0.5 dBFS</option>
          <option value={-1}>-1.0 dBFS</option>
          <option value={-3}>-3.0 dBFS</option>
        </select>
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.tool} ${prep.removeDc ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ removeDc: !prep.removeDc })}
        >
          Remove DC offset
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.detectSilenceMarkers()}>
          Detect silence
        </button>
      </div>
      {snap.silenceProposal ? (
        <div className={styles.silence}>
          Trim {snap.silenceProposal.leadingSec.toFixed(2)}s lead / {snap.silenceProposal.trailingSec.toFixed(2)}s tail
          <button type="button" className={styles.tool} onClick={() => engine.applySilenceProposal()}>
            Apply
          </button>
          <button type="button" className={styles.tool} onClick={() => engine.dismissSilenceProposal()}>
            Cancel
          </button>
        </div>
      ) : null}
      <label>
        Channels
        <select
          className={styles.input}
          style={{ width: 140 }}
          value={prep.channelMode}
          onChange={(e) => engine.commitPrep({ channelMode: e.target.value as typeof prep.channelMode })}
        >
          <option value="original">Original</option>
          <option value="mono">Mono</option>
          <option value="left">Left only</option>
          <option value="right">Right only</option>
          <option value="swap">Swap L/R</option>
        </select>
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.tool} ${prep.invertL ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ invertL: !prep.invertL })}
        >
          Invert L
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.invertR ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ invertR: !prep.invertR })}
        >
          Invert R
        </button>
      </div>
      <label>
        Clip name
        <input
          className={styles.input}
          style={{ width: 160 }}
          value={prep.clipName}
          placeholder="birds_01"
          onFocus={() => engine.beginPrepGesture()}
          onChange={(e) => engine.setPrepLive({ clipName: e.target.value }, true)}
          onBlur={() => engine.endPrepGesture()}
        />
      </label>
      <button type="button" className={styles.tool} onClick={() => engine.saveVariation(prep.clipName)}>
        Save variation
      </button>
      {snap.variations.length ? (
        <div className={styles.row}>
          {snap.variations.map((clip) => (
            <button
              key={clip.id}
              type="button"
              className={`${styles.tool} ${prep.clipName === clip.name ? styles.toolActive : ''}`}
              onClick={() => engine.loadVariation(clip.id)}
            >
              {clip.name}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.notice}>Several clips can share one recording.</p>
      )}
    </div>
  )
}
