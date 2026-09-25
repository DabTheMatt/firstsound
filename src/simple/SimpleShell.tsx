import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { formatSimpleClock } from '../audio/engine/formatTime'
import type { EditState } from '../app/editorState'
import type { WaveformHandle } from '../components/waveform/Waveform'
import { Waveform } from '../components/waveform/Waveform'
import { downloadBlob } from '../features/sample/files'
import { useLayoutMode } from '../app/useLayoutMode'
import { engine } from '../hooks/useEngine'
import { useI18n } from '../i18n'
import { Wordmark } from '../components/header/Wordmark'
import { ModeSwitch } from '../modes/ModeSwitch'
import type { UiMode } from '../modes/uiMode'
import { captureDsp, writeDsp } from '../sensory/applySensory'
import { applyToneToDsp, bypassEqOnDsp } from './applyToneEq'
import { bounceSimplePcm, encodeSimpleWav, formatSimpleSeconds, prepareSimpleExportPcm, simpleExportFilename } from './exportSimple'
import { fadeSecondsForStep, fadeStepFromSeconds, FADE_STEP_IDS, type FadeStepId } from './fadeSteps'
import {
  DEFAULT_TONE_AMOUNT,
  FEATURED_TONE_IDS,
  clampToneAmount,
  matchSimpleTone,
  simpleToneMatchesBands,
  toneBandsAt,
  type SimpleToneId,
} from './tonePresets'
import styles from './SimpleShell.module.css'

type Sheet = 'none' | 'save' | 'restore'

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
  onApplyTrim: () => void
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
  onApplyTrim,
  mode,
  onMode,
}: Props) {
  const { t, locale } = useI18n()
  const { mode: layoutMode } = useLayoutMode()
  const frame = layoutMode === 'dock-right' ? 'desktop' : layoutMode === 'dock-bottom' ? 'tablet' : 'phone'
  const [sheet, setSheet] = useState<Sheet>('none')
  const [amount, setAmount] = useState(DEFAULT_TONE_AMOUNT)
  const [activeTone, setActiveTone] = useState<SimpleToneId | 'custom'>('natural')
  const [draggingAmount, setDraggingAmount] = useState(false)
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

  const eqBypassed = Boolean(snap.chain.find((m) => m.type === 'eq')?.bypassed)
  const toneSticky =
    !listenOriginal &&
    activeTone !== 'custom' &&
    simpleToneMatchesBands(activeTone, amount, snap.eqBands)
  const tone = matchSimpleTone(
    snap.eqBands,
    listenOriginal ? false : eqBypassed,
    draggingAmount || toneSticky ? activeTone : undefined,
  )
  const sliderValue = draggingAmount || tone.id === 'custom' ? amount : tone.amount
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

  const writeTone = (id: SimpleToneId, nextAmount: number) => {
    const strength = clampToneAmount(nextAmount)
    const dsp = applyToneToDsp(captureDsp(engine), toneBandsAt(id, strength))
    writeDsp(engine, dsp)
    liveDspRef.current = dsp
    setActiveTone(id)
    setAmount(strength)
    void engine.unlock()
    return strength
  }

  const applyTone = (id: SimpleToneId, nextAmount = amount) => {
    exitOriginal()
    const strength = id === 'natural' ? nextAmount : Math.max(nextAmount, 0.45)
    writeTone(id, strength)
    onToneCommit()
  }

  const applyAmount = (nextAmount: number) => {
    if (tone.id === 'custom') return
    exitOriginal()
    writeTone(tone.id, nextAmount)
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
      className={`${styles.page} ${styles[frame]} ${dragging ? styles.drop : ''}`}
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
          <Wordmark mode={mode} compact={frame === 'phone'} />
          <button type="button" className={styles.file} onClick={onLoadSample}>
            {snap.fileName || t.simple.fileUntitled}
          </button>
          <div className={styles.modeSlot}>
            <ModeSwitch mode={mode} onChange={onMode} compact={frame === 'phone'} />
          </div>
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

        <div className={styles.main}>
        <div className={styles.stageCol}>
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
            trimHandles
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
            {t.simple.clock(formatSimpleClock(now), formatSimpleClock(regionLen || snap.duration))}
          </p>
          <div className={styles.history}>
            <button type="button" className={styles.ghost} disabled={!canUndo} onClick={onUndo}>
              {t.simple.undo}
            </button>
            <button type="button" className={styles.ghost} disabled={!canRedo} onClick={onRedo}>
              {t.simple.redo}
            </button>
          </div>
        </div>
        </div>

        <div className={styles.tools}>
          <div className={styles.toolsBody}>
          <p className={styles.status} aria-live="polite">
            {status ?? ''}
          </p>

          <section className={styles.section} aria-labelledby="simple-cut">
            <h2 id="simple-cut">{t.simple.cut}</h2>
            <button
              type="button"
              className={styles.action}
              disabled={!snap.sampleLoaded}
              onClick={onApplyTrim}
            >
              {t.simple.trim}
            </button>
            <div className={styles.trimRow}>
              <button type="button" className={styles.chip} disabled={!snap.sampleLoaded} onClick={() => setEdgeFromPlayhead('start')}>
                {t.simple.setStart}
              </button>
              <button type="button" className={styles.chip} disabled={!snap.sampleLoaded} onClick={() => setEdgeFromPlayhead('end')}>
                {t.simple.setEnd}
              </button>
            </div>
            <p className={styles.length}>{t.simple.length(formatSimpleSeconds(regionLen, locale))}</p>
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
                  disabled={!snap.sampleLoaded}
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
                  disabled={!snap.sampleLoaded}
                  onClick={() => setFade('out', step)}
                >
                  {fadeOutCopy[step]}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="simple-improve">
            <h2 id="simple-improve">{t.simple.tone}</h2>
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
                    disabled={!snap.sampleLoaded}
                    onClick={() => applyTone(id)}
                  >
                    <span>{t.simple.tones[id]?.label}</span>
                  </button>
                )
              })}
            </div>
            {tone.id === 'custom' ? <p className={styles.custom}>{t.simple.customTone}</p> : null}
            <div className={styles.utilities}>
              <button
                type="button"
                className={styles.utility}
                disabled={!snap.sampleLoaded}
                onClick={() => {
                  exitOriginal()
                  onLevelLoudness()
                  setStatus(t.simple.levelDone)
                }}
              >
                {t.simple.levelVolume}
              </button>
              <button
                type="button"
                className={styles.utility}
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
            </div>
          </section>

          <section className={styles.section} aria-labelledby="simple-strength">
            <h2 id="simple-strength">{t.simple.amount}</h2>
            <label className={styles.amount}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sliderValue}
                disabled={tone.id === 'custom' || !snap.sampleLoaded}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sliderValue * 100)}
                aria-label={t.simple.amount}
                onPointerDown={() => setDraggingAmount(true)}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  setAmount(next)
                  applyAmount(next)
                }}
                onPointerUp={() => {
                  setDraggingAmount(false)
                  onToneCommit()
                }}
                onPointerCancel={() => {
                  setDraggingAmount(false)
                  onToneCommit()
                }}
                onKeyUp={() => onToneCommit()}
              />
              <span className={styles.amountEnds}>
                <span>{t.simple.amountLess}</span>
                <span>{t.simple.amountMore}</span>
              </span>
            </label>
          </section>
          </div>

          <div className={styles.bottom}>
            <section className={styles.section} aria-labelledby="simple-compare">
              <h2 id="simple-compare">{t.simple.compare}</h2>
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
            </section>
            <button type="button" className={styles.save} disabled={!snap.sampleLoaded} onClick={() => setSheet('save')}>
              {t.simple.saveFile}
            </button>
            <button type="button" className={styles.link} onClick={() => setSheet('restore')}>
              {t.simple.restore}
            </button>
          </div>
        </div>
        </div>
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
