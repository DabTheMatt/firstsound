import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { formatRangeClock } from '../audio/engine/formatTime'
import type { EditState } from '../app/editorState'
import type { WaveformHandle } from '../components/waveform/Waveform'
import { Waveform } from '../components/waveform/Waveform'
import { downloadBlob } from '../features/sample/files'
import { engine } from '../hooks/useEngine'
import { LanguageSwitch, useI18n } from '../i18n'
import { ModeSwitch } from '../modes/ModeSwitch'
import type { UiMode } from '../modes/uiMode'
import { captureDsp, writeDsp } from '../sensory/applySensory'
import { applyToneToDsp, bypassEqOnDsp } from './applyToneEq'
import { bounceSimplePcm, encodeSimpleWav, formatSimpleSeconds, prepareSimpleExportPcm, simpleExportFilename } from './exportSimple'
import { fadeSecondsForStep, fadeStepFromSeconds, FADE_STEP_IDS, type FadeStepId } from './fadeSteps'
import {
  DEFAULT_TONE_AMOUNT,
  FEATURED_TONE_IDS,
  SIMPLE_TONE_IDS,
  matchSimpleTone,
  toneBandsAt,
  type SimpleToneId,
} from './tonePresets'
import styles from './SimpleShell.module.css'

type Sheet = 'none' | 'fades' | 'tones' | 'save' | 'restore'

type Props = {
  snap: EngineSnapshot
  edit: EditState
  waveRef: RefObject<WaveformHandle | null>
  menuOpen: boolean
  onToggleMenu: () => void
  menu: ReactNode
  dragging: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (file: File) => void
  onLoadSample: () => void
  onLoadDemo: () => void
  onRegionCommit: () => void
  onFades: (patch: Partial<EditState>) => void
  onFadesCommit: () => void
  onToneCommit: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onRestoreOriginal: () => void
  onLevelLoudness: () => void
  onAutoFix: () => void
  mode: UiMode
  onMode: (mode: UiMode) => void
}

export function SimpleShell({
  snap,
  edit,
  waveRef,
  menuOpen,
  onToggleMenu,
  menu,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onLoadSample,
  onLoadDemo,
  onRegionCommit,
  onFades,
  onFadesCommit,
  onToneCommit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRestoreOriginal,
  onLevelLoudness,
  onAutoFix,
  mode,
  onMode,
}: Props) {
  const { t, locale } = useI18n()
  const [sheet, setSheet] = useState<Sheet>('none')
  const [trimOn, setTrimOn] = useState(false)
  const [amount, setAmount] = useState(DEFAULT_TONE_AMOUNT)
  const [listenOriginal, setListenOriginal] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const [saveName, setSaveName] = useState('sample-edited')
  const [saveFormat, setSaveFormat] = useState<'wav' | 'mp3'>('wav')
  const [moreSave, setMoreSave] = useState(false)
  const [saveRate, setSaveRate] = useState<'original' | '44100' | '48000'>('original')
  const [saveBits, setSaveBits] = useState<16 | 24>(24)
  const [saveMono, setSaveMono] = useState(false)
  const liveDspRef = useRef(captureDsp(engine))

  const tone = matchSimpleTone(snap.eqBands, Boolean(snap.chain.find((m) => m.type === 'eq')?.bypassed))
  const regionLen = Math.max(0, snap.params.end - snap.params.start)
  const fadeInStep = fadeStepFromSeconds(edit.fadeIn)
  const fadeOutStep = fadeStepFromSeconds(edit.fadeOut)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      setNow(engine.getPlayheadSeconds())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!status) return
    const id = window.setTimeout(() => setStatus(null), 3200)
    return () => window.clearTimeout(id)
  }, [status])

  const visibleTones = FEATURED_TONE_IDS

  const exitOriginal = () => {
    if (!listenOriginal) return
    writeDsp(engine, liveDspRef.current)
    setListenOriginal(false)
  }

  const applyTone = (id: SimpleToneId, nextAmount = amount) => {
    exitOriginal()
    const dsp = applyToneToDsp(captureDsp(engine), toneBandsAt(id, nextAmount))
    writeDsp(engine, dsp)
    liveDspRef.current = dsp
    setAmount(nextAmount)
    onToneCommit()
  }

  const setFade = (side: 'in' | 'out', step: FadeStepId) => {
    const seconds = fadeSecondsForStep(step, regionLen)
    onFades(side === 'in' ? { fadeIn: seconds, fadeAuto: false } : { fadeOut: seconds, fadeAuto: false })
    onFadesCommit()
  }

  const setEdgeFromPlayhead = (edge: 'start' | 'end') => {
    const head = engine.getPlayheadSeconds()
    if (edge === 'start') engine.setParam('start', Math.min(head, snap.params.end - 0.01))
    else engine.setParam('end', Math.max(head, snap.params.start + 0.01))
    onRegionCommit()
  }

  const toggleCompare = (original: boolean) => {
    if (original === listenOriginal) return
    if (original) {
      liveDspRef.current = captureDsp(engine)
      writeDsp(engine, bypassEqOnDsp(liveDspRef.current))
      setListenOriginal(true)
    } else {
      writeDsp(engine, liveDspRef.current)
      setListenOriginal(false)
    }
  }

  const saveFile = () => {
    exitOriginal()
    const pcm = bounceSimplePcm(engine, edit)
    if (!pcm) return
    const prepared = prepareSimpleExportPcm(pcm, {
      name: saveName,
      format: saveFormat,
      sampleRate: saveRate === 'original' ? 'original' : Number(saveRate),
      bitDepth: saveBits,
      mono: saveMono,
    })
    const blob = encodeSimpleWav(prepared, saveFormat === 'mp3' ? 16 : saveBits)
    downloadBlob(simpleExportFilename(saveName, saveFormat === 'mp3' ? 'wav' : 'wav'), blob)
    setSheet('none')
  }

  const fadeInCopy = {
    none: t.simple.fadeInNone,
    short: t.simple.fadeInShort,
    medium: t.simple.fadeInMedium,
    long: t.simple.fadeInLong,
  }
  const fadeOutCopy = {
    none: t.simple.fadeOutNone,
    short: t.simple.fadeOutShort,
    medium: t.simple.fadeOutMedium,
    long: t.simple.fadeOutLong,
  }

  return (
    <div
      className={`${styles.page} ${dragging ? styles.drop : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) onDrop(file)
      }}
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <button type="button" className={styles.file} onClick={onLoadSample}>
            {snap.fileName || t.simple.fileUntitled}
          </button>
          <ModeSwitch mode={mode} onChange={onMode} compact />
          <LanguageSwitch variant="editorial" />
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={t.header.settings}
            aria-expanded={menuOpen}
            data-settings-toggle=""
            onClick={onToggleMenu}
          >
            ···
          </button>
        </header>
        {menuOpen ? menu : null}

        <div className={styles.wave}>
          <Waveform
            ref={waveRef}
            key={`${snap.fileName || 'empty'}:${snap.duration.toFixed(6)}`}
            duration={snap.duration}
            start={snap.params.start}
            end={snap.params.end}
            loaded={snap.sampleLoaded}
            tool="select"
            viz="waveform"
            fadeIn={edit.fadeIn}
            fadeOut={edit.fadeOut}
            fadeCurve={edit.fadeCurve}
            fadeInBend={edit.fadeInBend}
            fadeOutBend={edit.fadeOutBend}
            autoSnap={false}
            normalizeView={false}
            onNormalizeView={() => undefined}
            onZoomLabel={() => undefined}
            contentRev={snap.bufferRev}
            onFades={(patch) => onFades({ ...patch, fadeAuto: false })}
            onFadesCommit={onFadesCommit}
            onRegionCommit={onRegionCommit}
            appearance="simple"
            trimHandles={trimOn}
            emptyLabel={t.simple.loadSample}
            onLoadDemo={onLoadDemo}
          />
        </div>

        <div className={styles.transport}>
          <button
            type="button"
            className={styles.play}
            disabled={!snap.sampleLoaded}
            aria-label={snap.playing ? t.simple.pause : t.simple.play}
            onClick={() => void engine.unlock().then(() => engine.togglePlay())}
          >
            {snap.playing ? '❚❚' : '▶'}
          </button>
          <p className={styles.clock} aria-live="off">
            {t.simple.clock(formatRangeClock(now), formatRangeClock(regionLen || snap.duration))}
          </p>
          <button type="button" className={styles.ghost} disabled={!canUndo} onClick={onUndo}>
            {t.simple.undo}
          </button>
          <button type="button" className={styles.ghost} disabled={!canRedo} onClick={onRedo}>
            {t.simple.redo}
          </button>
        </div>

        {status ? <p className={styles.status}>{status}</p> : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.action} ${trimOn ? styles.actionOn : ''}`}
            aria-pressed={trimOn}
            disabled={!snap.sampleLoaded}
            onClick={() => setTrimOn((v) => !v)}
          >
            {t.simple.trim}
          </button>
          <button type="button" className={styles.action} disabled={!snap.sampleLoaded} onClick={() => setSheet('fades')}>
            {t.simple.startEnd}
          </button>
          <button
            type="button"
            className={styles.action}
            disabled={!snap.sampleLoaded}
            onClick={() => {
              exitOriginal()
              onLevelLoudness()
              setStatus(t.simple.levelDone)
            }}
          >
            {t.simple.levelVolume}
          </button>
        </div>
        {trimOn ? (
          <div className={styles.trimRow}>
            <button type="button" className={styles.chip} onClick={() => setEdgeFromPlayhead('start')}>
              {t.simple.setStart}
            </button>
            <button type="button" className={styles.chip} onClick={() => setEdgeFromPlayhead('end')}>
              {t.simple.setEnd}
            </button>
            <p className={styles.length}>{t.simple.length(formatSimpleSeconds(regionLen, locale))}</p>
          </div>
        ) : null}
        <p className={styles.hint}>{t.simple.levelHint}</p>

        <section className={styles.tones} aria-label={t.simple.tone}>
          <div className={styles.toneHead}>
            <h2>{t.simple.tone}</h2>
            <button type="button" className={styles.link} onClick={() => setSheet('tones')}>
              {t.simple.moreTones}
            </button>
          </div>
          <div className={styles.tiles}>
            {visibleTones.map((id) => {
              const on = tone.id === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.tile} ${on ? styles.tileOn : ''}`}
                  aria-pressed={on}
                  aria-label={t.simple.tones[id]?.aria}
                  onClick={() => applyTone(id)}
                >
                  <span>{t.simple.tones[id]?.label}</span>
                  <small>{t.simple.tones[id]?.hint}</small>
                </button>
              )
            })}
          </div>
          {tone.id === 'custom' ? <p className={styles.custom}>{t.simple.customTone}</p> : null}
          {tone.id !== 'custom' ? (
            <label className={styles.amount}>
              <span>{t.simple.amount}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={amount}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(amount * 100)}
                aria-label={t.simple.amount}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  setAmount(next)
                  if (tone.id !== 'custom') {
                    exitOriginal()
                    const dsp = applyToneToDsp(captureDsp(engine), toneBandsAt(tone.id, next))
                    writeDsp(engine, dsp)
                    liveDspRef.current = dsp
                  }
                }}
                onPointerUp={() => onToneCommit()}
                onKeyUp={() => onToneCommit()}
              />
              <span className={styles.amountEnds}>
                <span>{t.simple.amountLess}</span>
                <span>{t.simple.amountMore}</span>
              </span>
            </label>
          ) : null}
          <button
            type="button"
            className={styles.auto}
            disabled={!snap.sampleLoaded}
            onClick={() => {
              exitOriginal()
              applyTone('clean', 0.55)
              onAutoFix()
              setStatus(t.simple.autoDone)
            }}
          >
            {t.simple.autoFix}
          </button>
        </section>

        <div className={styles.bottom}>
          <div className={styles.ab} role="radiogroup" aria-label={t.simple.compare}>
            <button
              type="button"
              role="radio"
              aria-checked={listenOriginal}
              className={listenOriginal ? styles.abOn : ''}
              onClick={() => toggleCompare(true)}
            >
              {t.simple.original}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!listenOriginal}
              className={!listenOriginal ? styles.abOn : ''}
              onClick={() => toggleCompare(false)}
            >
              {t.simple.after}
            </button>
          </div>
          <button type="button" className={styles.save} disabled={!snap.sampleLoaded} onClick={() => setSheet('save')}>
            {t.simple.save}
          </button>
        </div>
        <button type="button" className={styles.restore} onClick={() => setSheet('restore')}>
          {t.simple.restore}
        </button>
      </div>

      {sheet !== 'none' ? (
        <div className={styles.sheetScrim} onClick={() => setSheet('none')}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className={styles.sheetGrab} aria-label={t.simple.closeSheet} onClick={() => setSheet('none')} />
            {sheet === 'fades' ? (
              <>
                <h2>{t.simple.startEnd}</h2>
                <p className={styles.sheetLabel} id="fade-in-label">
                  {t.simple.fadeIn}
                </p>
                <div className={styles.segments} role="radiogroup" aria-labelledby="fade-in-label">
                  {FADE_STEP_IDS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      role="radio"
                      aria-checked={fadeInStep === step}
                      aria-label={t.simple.fadeInAria(fadeInCopy[step])}
                      className={fadeInStep === step ? styles.segOn : ''}
                      onClick={() => setFade('in', step)}
                    >
                      {fadeInCopy[step]}
                    </button>
                  ))}
                </div>
                <p className={styles.sheetLabel} id="fade-out-label">
                  {t.simple.fadeOut}
                </p>
                <div className={styles.segments} role="radiogroup" aria-labelledby="fade-out-label">
                  {FADE_STEP_IDS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      role="radio"
                      aria-checked={fadeOutStep === step}
                      aria-label={t.simple.fadeOutAria(fadeOutCopy[step])}
                      className={fadeOutStep === step ? styles.segOn : ''}
                      onClick={() => setFade('out', step)}
                    >
                      {fadeOutCopy[step]}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {sheet === 'tones' ? (
              <>
                <h2>{t.simple.tone}</h2>
                <div className={styles.tiles}>
                  {SIMPLE_TONE_IDS.map((id) => {
                    const on = tone.id === id
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`${styles.tile} ${on ? styles.tileOn : ''}`}
                        aria-pressed={on}
                        aria-label={t.simple.tones[id]?.aria}
                        onClick={() => {
                          applyTone(id)
                          setSheet('none')
                        }}
                      >
                        <span>{t.simple.tones[id]?.label}</span>
                        <small>{t.simple.tones[id]?.hint}</small>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}
            {sheet === 'save' ? (
              <form
                className={styles.saveForm}
                onSubmit={(event) => {
                  event.preventDefault()
                  saveFile()
                }}
              >
                <h2>{t.simple.saveTitle}</h2>
                <label className={styles.field}>
                  {t.simple.saveName}
                  <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
                </label>
                <p className={styles.sheetLabel}>{t.simple.saveFormat}</p>
                <div className={styles.segments} role="radiogroup" aria-label={t.simple.saveFormat}>
                  <button type="button" role="radio" aria-checked={saveFormat === 'wav'} className={saveFormat === 'wav' ? styles.segOn : ''} onClick={() => setSaveFormat('wav')}>
                    {t.simple.wav}
                  </button>
                  <button type="button" role="radio" aria-checked={saveFormat === 'mp3'} className={saveFormat === 'mp3' ? styles.segOn : ''} onClick={() => setSaveFormat('mp3')}>
                    {t.simple.mp3}
                  </button>
                </div>
                <button type="button" className={styles.link} onClick={() => setMoreSave((v) => !v)}>
                  {moreSave ? t.simple.hideSettings : t.simple.moreSettings}
                </button>
                {moreSave ? (
                  <>
                    <label className={styles.field}>
                      {t.simple.sampleRate}
                      <select value={saveRate} onChange={(event) => setSaveRate(event.target.value as typeof saveRate)}>
                        <option value="original">{t.export.original}</option>
                        <option value="44100">44.1 kHz</option>
                        <option value="48000">48 kHz</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      {t.simple.bitDepth}
                      <select value={saveBits} onChange={(event) => setSaveBits(Number(event.target.value) as 16 | 24)}>
                        <option value={16}>16-bit</option>
                        <option value={24}>24-bit</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      {t.simple.channels}
                      <select value={saveMono ? 'mono' : 'stereo'} onChange={(event) => setSaveMono(event.target.value === 'mono')}>
                        <option value="stereo">{t.simple.stereo}</option>
                        <option value="mono">{t.simple.mono}</option>
                      </select>
                    </label>
                  </>
                ) : null}
                <button type="submit" className={styles.saveFile}>
                  {t.simple.saveFile}
                </button>
              </form>
            ) : null}
            {sheet === 'restore' ? (
              <>
                <h2>{t.simple.restore}</h2>
                <p>{t.simple.restoreConfirm}</p>
                <div className={styles.restoreRow}>
                  <button type="button" className={styles.chip} onClick={() => setSheet('none')}>
                    {t.simple.restoreNo}
                  </button>
                  <button
                    type="button"
                    className={styles.save}
                    onClick={() => {
                      onRestoreOriginal()
                      setListenOriginal(false)
                      setSheet('none')
                    }}
                  >
                    {t.simple.restoreYes}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
