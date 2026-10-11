import { useEffect, useRef } from 'react'
import { FADE_CURVES, type FadeCurveId } from '../../audio/samplePrep'
import { formatTimecode, timecodeDigits } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { useI18n } from '../../i18n'
import { prepCopy, prepNotice } from '../../i18n/prepCopy'
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
      <path d={d} fill="none" stroke={active ? 'var(--accent-primary)' : 'var(--text-muted)'} strokeWidth="1.6" />
    </svg>
  )
}

export function EditBar({ snap, viewSpan, moreOpen, onToggleMore, onExport, onDone }: Props) {
  const { t, locale } = useI18n()
  const prepText = prepCopy(locale)
  const prep = snap.prep
  const digits = timecodeDigits(viewSpan)
  const len = Math.max(0, prep.selectionEnd - prep.selectionStart)
  const step = Math.max(0.0005, viewSpan / 400)
  const startReadout = useRef<HTMLElement>(null)
  const endReadout = useRef<HTMLElement>(null)
  const lenReadout = useRef<HTMLElement>(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        frame = requestAnimationFrame(tick)
        return
      }
      const live = engine.getPrep()
      const d = timecodeDigits(viewSpan)
      if (startReadout.current) startReadout.current.textContent = formatTimecode(live.selectionStart, d)
      if (endReadout.current) endReadout.current.textContent = formatTimecode(live.selectionEnd, d)
      if (lenReadout.current) {
        lenReadout.current.textContent = formatTimecode(
          Math.max(0, live.selectionEnd - live.selectionStart),
          d,
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [viewSpan])

  const setFadeSec = (which: 'in' | 'out', sec: number) => {
    if (which === 'in') engine.commitPrep({ fadeInSec: Math.max(0, sec), fadeAuto: false })
    else engine.commitPrep({ fadeOutSec: Math.max(0, sec), fadeAuto: false })
  }

  return (
    <div className={styles.bar}>
      <div className={styles.times}>
        <div className={styles.time}>
          <span>{t.inspector.start}</span>
          <div className={styles.nudge}>
            <button type="button" aria-label={prepText.nudgeStartEarlier} onClick={() => engine.commitPrep({ selectionStart: prep.selectionStart - step })}>
              −
            </button>
            <strong ref={startReadout}>{formatTimecode(prep.selectionStart, digits)}</strong>
            <button type="button" aria-label={prepText.nudgeStartLater} onClick={() => engine.commitPrep({ selectionStart: prep.selectionStart + step })}>
              +
            </button>
          </div>
        </div>
        <div className={styles.time}>
          <span>{t.inspector.end}</span>
          <div className={styles.nudge}>
            <button type="button" aria-label={prepText.nudgeEndEarlier} onClick={() => engine.commitPrep({ selectionEnd: prep.selectionEnd - step })}>
              −
            </button>
            <strong ref={endReadout}>{formatTimecode(prep.selectionEnd, digits)}</strong>
            <button type="button" aria-label={prepText.nudgeEndLater} onClick={() => engine.commitPrep({ selectionEnd: prep.selectionEnd + step })}>
              +
            </button>
          </div>
        </div>
        <div className={styles.time}>
          <span>{t.inspector.length}</span>
          <strong ref={lenReadout}>{formatTimecode(len, digits)}</strong>
        </div>
      </div>

      <div className={styles.fades}>
        <label className={styles.fade}>
          <header>
            {t.inspector.fadeIn}
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
              {prep.fadeInEnabled ? t.a11y.on : t.a11y.off}
            </button>
          </div>
        </label>
        <label className={styles.fade}>
          <header>
            {t.inspector.fadeOut}
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
              {prep.fadeOutEnabled ? t.a11y.on : t.a11y.off}
            </button>
          </div>
        </label>
      </div>

      <div className={styles.row} role="group" aria-label={prepText.fadeCurve}>
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
          {prepText.curveCharacter}
          <b>{prep.fadeInBend < 0.45 ? prepText.slowStart : prep.fadeInBend > 0.55 ? prepText.fastStart : prepText.curveDefault}</b>
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
          {prepText.autoSnap}
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.snapZero('start')}>
          {prepText.zeroStart}
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.snapZero('end')}>
          {prepText.zeroEnd}
        </button>
      </div>
      {snap.zeroNotice ? <p className={styles.notice}>{prepNotice(locale, snap.zeroNotice)}</p> : null}

      <div className={styles.playRow}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => void engine.unlock().then(() => engine.toggleSelectionPlayback())}
        >
          {snap.previewPlaying ? t.header.stop : prepText.playSelection}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${snap.previewLoop ? styles.toolActive : ''}`}
          onClick={() => engine.setPreviewLoop(!snap.previewLoop)}
        >
          {t.transport.loop}
        </button>
        <button type="button" className={styles.tool} onClick={() => void engine.playAudition('start')}>
          {t.inspector.start}
        </button>
        <button type="button" className={styles.tool} onClick={() => void engine.playAudition('end')}>
          {t.inspector.end}
        </button>
      </div>

      <div className={styles.tools}>
        <button type="button" className={styles.tool} onClick={() => engine.trimToSelection()}>
          {t.inspector.trim}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.normalize ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ normalize: !prep.normalize })}
        >
          {prepText.normalizeAudio}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.reverse ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ reverse: !prep.reverse })}
        >
          {t.inspector.reverse}
        </button>
        <button type="button" className={styles.tool} onClick={onExport}>
          {t.transport.export}
        </button>
        <button
          type="button"
          className={styles.primary}
          style={{ gridColumn: '1 / -1' }}
          onClick={() => void engine.unlock().then(() => engine.useAsSample()).then(onDone)}
        >
          {t.transport.useAsSample}
        </button>
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.tool} disabled={!snap.canUndoPrep} onClick={() => engine.undoPrep()}>
          {t.waveform.undo}
        </button>
        <button type="button" className={styles.tool} disabled={!snap.canRedoPrep} onClick={() => engine.redoPrep()}>
          {t.waveform.redo}
        </button>
        <button type="button" className={`${styles.moreBtn} ${moreOpen ? styles.toolActive : ''}`} onClick={onToggleMore}>
          {prepText.moreTools}
        </button>
      </div>

      {moreOpen ? <MoreTools snap={snap} /> : null}
    </div>
  )
}

function MoreTools({ snap }: { snap: EngineSnapshot }) {
  const { t, locale } = useI18n()
  const prepText = prepCopy(locale)
  const prep = snap.prep
  return (
    <div className={styles.sheet}>
      <label>
        {t.inspector.gain}
        <input
          className={styles.input}
          type="number"
          step={0.5}
          value={prep.gainDb}
          onChange={(e) => engine.commitPrep({ gainDb: Number(e.target.value) })}
        />
      </label>
      <label>
        {prepText.normalizeTo}
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
          {prepText.removeDc}
        </button>
        <button type="button" className={styles.tool} onClick={() => engine.detectSilenceMarkers()}>
          {prepText.detectSilence}
        </button>
      </div>
      {snap.silenceProposal ? (
        <div className={styles.silence}>
          {prepText.silenceLead(snap.silenceProposal.leadingSec.toFixed(2), snap.silenceProposal.trailingSec.toFixed(2))}
          <button type="button" className={styles.tool} onClick={() => engine.applySilenceProposal()}>
            {t.dragFree.apply}
          </button>
          <button type="button" className={styles.tool} onClick={() => engine.dismissSilenceProposal()}>
            {t.dragFree.cancel}
          </button>
        </div>
      ) : null}
      <label>
        {prepText.channels}
        <select
          className={styles.input}
          style={{ width: 140 }}
          value={prep.channelMode}
          onChange={(e) => engine.commitPrep({ channelMode: e.target.value as typeof prep.channelMode })}
        >
          <option value="original">{prepText.original}</option>
          <option value="mono">{t.header.mono}</option>
          <option value="left">{prepText.leftOnly}</option>
          <option value="right">{prepText.rightOnly}</option>
          <option value="swap">{prepText.swap}</option>
        </select>
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.tool} ${prep.invertL ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ invertL: !prep.invertL })}
        >
          {prepText.invertL}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${prep.invertR ? styles.toolActive : ''}`}
          onClick={() => engine.commitPrep({ invertR: !prep.invertR })}
        >
          {prepText.invertR}
        </button>
      </div>
      <label>
        {prepText.clipName}
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
        {prepText.saveVariation}
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
        <p className={styles.notice}>{prepText.variations}</p>
      )}
    </div>
  )
}
