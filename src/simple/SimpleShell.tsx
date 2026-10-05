import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { formatSimpleClock } from '../audio/engine/formatTime'
import type { EditState } from '../app/editorState'
import type { WaveformHandle } from '../components/waveform/Waveform'
import { Waveform } from '../components/waveform/Waveform'
import { downloadBlob } from '../features/sample/files'
import { useLayoutMode } from '../app/useLayoutMode'
import { engine } from '../hooks/useEngine'
import { pushHearingAlert } from '../hearing/alerts'
import { useI18n } from '../i18n'
import { LOAD_SAMPLE_LABELS } from '../components/header/loadSampleLabels'
import { StableLabel } from '../components/header/StableLabel'
import { ThemePicker } from '../components/header/ThemePicker'
import { Wordmark } from '../components/header/Wordmark'
import { ModeSwitch } from '../modes/ModeSwitch'
import type { UiMode } from '../modes/uiMode'
import { captureDsp, writeDsp } from '../sensory/applySensory'
import type { DspSnapshot } from '../sensory/mapping/mappingEngine'
import type { EqBand } from '../audio/engine/eqBands'
import {
  applySimpleDelay,
  applySimpleDelayAmount,
  applySimpleReverb,
  applySimpleReverbAmount,
  applySimpleTone,
  disableSimpleDelay,
  disableSimpleReverb,
  resetSimpleSurface,
} from './applySimple'
import { bounceSimplePcm, encodeSimpleWav, formatSimpleSeconds, prepareSimpleExportPcm, simpleExportFilename } from './exportSimple'
import { fadeSecondsForStep, fadeStepFromSeconds, FADE_STEP_IDS, type FadeStepId } from './fadeSteps'
import {
  DEFAULT_DELAY_AMOUNT,
  DEFAULT_REVERB_AMOUNT,
  matchSimpleDelay,
  matchSimpleReverb,
  SIMPLE_DELAY_IDS,
  SIMPLE_REVERB_IDS,
  type SimpleDelayId,
  type SimpleReverbId,
} from './fxPresets'
import { bypassSimpleListen, lfoIsRouted, simpleProcessingIsAdvanced } from './simpleMonitor'
import {
  CLARITY_IDS,
  DEFAULT_TONE_AMOUNT,
  simpleToneMatchesBands,
  TONE_CHARACTER_IDS,
  clampToneAmount,
  matchSimpleTone,
  type SimpleToneId,
} from './tonePresets'
import styles from './SimpleShell.module.css'

type Sheet = 'none' | 'save' | 'restore'
type Section = 'edit' | 'sound' | 'effects'

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
  onApplyTrim,
  mode,
  onMode,
}: Props) {
  const { t, locale } = useI18n()
  const { mode: layoutMode, width } = useLayoutMode()
  const frame = layoutMode === 'dock-right' ? 'desktop' : layoutMode === 'dock-bottom' ? 'tablet' : 'phone'
  const sidePanel = frame === 'desktop'
  const [section, setSection] = useState<Section>('edit')
  const [sheet, setSheet] = useState<Sheet>('none')
  const [moreEdit, setMoreEdit] = useState(false)
  const [toneAmount, setToneAmount] = useState(DEFAULT_TONE_AMOUNT)
  const [activeTone, setActiveTone] = useState<SimpleToneId | 'custom'>('natural')
  const [draggingTone, setDraggingTone] = useState(false)
  const [reverbDrag, setReverbDrag] = useState<number | null>(null)
  const [reverbHold, setReverbHold] = useState<SimpleReverbId | null>(null)
  const [delayDrag, setDelayDrag] = useState<number | null>(null)
  const [delayHold, setDelayHold] = useState<SimpleDelayId | null>(null)
  const [listenOriginal, setListenOriginal] = useState(false)
  const [listenSnapshot, setListenSnapshot] = useState<DspSnapshot | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const [saveName, setSaveName] = useState('sample-edited')
  const [moreSave, setMoreSave] = useState(false)
  const [saveRate, setSaveRate] = useState<'original' | '44100' | '48000'>('original')
  const [saveBits, setSaveBits] = useState<16 | 24>(24)
  const [saveMono, setSaveMono] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveBusyRef = useRef(false)
  const liveDspRef = useRef(captureDsp(engine))

  const captured = listenOriginal ? listenSnapshot : null
  const eqBands = (captured?.eqBands ?? snap.eqBands) as EqBand[]
  const params = captured?.params ?? snap.params
  const bypassed = (type: 'eq' | 'reverb' | 'delay' | 'grain' | 'filter' | 'midside' | 'distortion' | 'compressor' | 'limiter') => {
    if (captured) return captured.bypass[type] !== false
    return Boolean(snap.chain.find((mod) => mod.type === type)?.bypassed)
  }
  const eqBypassed = bypassed('eq')
  const toneSticky =
    !listenOriginal && activeTone !== 'custom' && simpleToneMatchesBands(activeTone, toneAmount, eqBands)
  const tone = matchSimpleTone(eqBands, eqBypassed, draggingTone || toneSticky ? activeTone : undefined)
  const toneSlider = draggingTone || tone.id === 'custom' ? toneAmount : tone.amount
  const reverbLive = matchSimpleReverb({
    bypassed: bypassed('reverb'),
    type: snap.reverbType,
    wet: params.reverbWet,
    size: params.reverbSize,
    decay: params.reverbDecay,
    predelay: params.reverbPredelay,
    correlate: params.reverbCorrelate,
  })
  const delayLive = matchSimpleDelay({
    bypassed: bypassed('delay'),
    type: snap.delayType,
    wet: params.delayWet,
    wetR: params.delayWetR,
    time: params.delayTime,
    feedback: params.delayFeedback,
    sync: params.delaySync,
    correlate: params.delayCorrelate,
  })
  const reverb = reverbDrag !== null && reverbHold ? { kind: 'preset' as const, id: reverbHold, amount: reverbDrag } : reverbLive
  const delay = delayDrag !== null && delayHold ? { kind: 'preset' as const, id: delayHold, amount: delayDrag } : delayLive
  const advanced = simpleProcessingIsAdvanced({
    chain: snap.chain,
    eqBands,
    eqBypassed,
    reverb: {
      bypassed: bypassed('reverb'),
      type: snap.reverbType,
      wet: params.reverbWet,
      size: params.reverbSize,
      decay: params.reverbDecay,
      predelay: params.reverbPredelay,
      correlate: params.reverbCorrelate,
    },
    delay: {
      bypassed: bypassed('delay'),
      type: snap.delayType,
      wet: params.delayWet,
      wetR: params.delayWetR,
      time: params.delayTime,
      feedback: params.delayFeedback,
      sync: params.delaySync,
      correlate: params.delayCorrelate,
    },
    automationLaneCount: snap.automation.lanes.length,
    lfoRouted: lfoIsRouted(captured?.fxLfos ?? snap.fxLfos),
    chaos: snap.random.chaos,
  })
  const regionLen = Math.max(0, snap.params.end - snap.params.start)
  const fadeInStep = fadeStepFromSeconds(edit.fadeIn)
  const fadeOutStep = fadeStepFromSeconds(edit.fadeOut)
  const hasSelection = snap.canClearSelection

  useEffect(() => {
    let frameId = 0
    const tick = () => {
      setNow(engine.getSourcePlayheadSeconds())
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (!status) return
    const id = window.setTimeout(() => setStatus(null), 3200)
    return () => window.clearTimeout(id)
  }, [status])

  const exitOriginal = () => {
    if (!listenOriginal) return
    writeDsp(engine, liveDspRef.current)
    engine.setRegionFades(edit.fadeIn, edit.fadeOut, edit.fadeCurve, edit.fadeInBend, edit.fadeOutBend)
    setListenSnapshot(null)
    setListenOriginal(false)
  }

  const applyTone = (id: SimpleToneId) => {
    exitOriginal()
    const strength = id === 'natural' ? 0 : toneAmount > 0.02 ? toneAmount : DEFAULT_TONE_AMOUNT
    const next = applySimpleTone(engine, id, strength)
    setActiveTone(id)
    setToneAmount(next)
    void engine.unlock()
    onToneCommit()
  }

  const applyToneAmount = (nextAmount: number) => {
    if (tone.id === 'custom' || tone.id === 'natural') return
    exitOriginal()
    const strength = clampToneAmount(nextAmount)
    applySimpleTone(engine, tone.id, strength)
    setActiveTone(tone.id)
    setToneAmount(strength)
  }

  const setFade = (side: 'in' | 'out', step: FadeStepId) => {
    exitOriginal()
    const seconds = fadeSecondsForStep(step, regionLen)
    onFades(side === 'in' ? { fadeIn: seconds, fadeAuto: false } : { fadeOut: seconds, fadeAuto: false })
    onFadesCommit()
  }

  const quickFade = (side: 'in' | 'out') => {
    setSection('edit')
    const step = side === 'in' ? fadeInStep : fadeOutStep
    setFade(side, step === 'none' ? 'medium' : step)
  }

  const setEdgeFromPlayhead = (edge: 'start' | 'end') => {
    const head = engine.getSourcePlayheadSeconds()
    if (edge === 'start') engine.setParam('start', Math.min(head, snap.params.end - 0.01))
    else engine.setParam('end', Math.max(head, snap.params.start + 0.01))
    onRegionCommit()
    setMoreEdit(false)
  }

  const clearSelection = () => {
    engine.clearSampleSelection()
    onRegionCommit()
  }

  const chooseReverb = (id: SimpleReverbId) => {
    exitOriginal()
    const amount = reverbLive.kind === 'preset' ? reverbLive.amount : DEFAULT_REVERB_AMOUNT
    applySimpleReverb(engine, id, amount)
    void engine.unlock()
    onToneCommit()
  }

  const chooseDelay = (id: SimpleDelayId) => {
    exitOriginal()
    const amount = delayLive.kind === 'preset' ? delayLive.amount : DEFAULT_DELAY_AMOUNT
    applySimpleDelay(engine, id, amount)
    void engine.unlock()
    onToneCommit()
  }

  const toggleCompare = (original: boolean) => {
    if (original === listenOriginal) return
    if (original) {
      const shot = captureDsp(engine)
      liveDspRef.current = shot
      setListenSnapshot(shot)
      writeDsp(engine, bypassSimpleListen(shot))
      engine.setRegionFades(0, 0, edit.fadeCurve, edit.fadeInBend, edit.fadeOutBend)
      setListenOriginal(true)
    } else {
      exitOriginal()
    }
  }

  const resetChanges = () => {
    resetSimpleSurface(engine)
    setListenSnapshot(null)
    setListenOriginal(false)
    setActiveTone('natural')
    setToneAmount(0)
    onRestoreOriginal()
    setSheet('none')
  }

  const saveFile = () => {
    if (saveBusyRef.current) return
    saveBusyRef.current = true
    setSaving(true)
    exitOriginal()
    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const pcm = await bounceSimplePcm(engine, edit)
        if (!pcm) return
        const prepared = prepareSimpleExportPcm(pcm, {
          name: saveName,
          format: 'wav',
          sampleRate: saveRate === 'original' ? 'original' : Number(saveRate),
          bitDepth: saveBits,
          mono: saveMono,
        })
        const blob = encodeSimpleWav(prepared, saveBits)
        const filename = simpleExportFilename(saveName, 'wav')
        downloadBlob(filename, blob)
        pushHearingAlert({
          id: 'export',
          title: 'EXPORT COMPLETE',
          detail: filename,
          tone: 'info',
        })
        setSheet('none')
      } catch (err) {
        setStatus(err instanceof Error && err.message ? err.message : t.export.exportFailed)
      } finally {
        saveBusyRef.current = false
        setSaving(false)
      }
    })()
  }

  const fadeCopy = {
    none: t.simple.fadeNone,
    short: t.simple.fadeShort,
    medium: t.simple.fadeMedium,
    long: t.simple.fadeLong,
  }
  const toneCopy = t.simple.tones

  const panel = (
    <aside className={styles.panel} aria-label={t.simple.sound}>
      <div className={styles.tabs} role="tablist" aria-label={t.simple.sound}>
        {(['edit', 'sound', 'effects'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`simple-tab-${id}`}
            aria-selected={section === id}
            aria-controls="simple-panel"
            className={section === id ? styles.tabOn : styles.tab}
            data-simple-tab={id}
            onClick={() => setSection(id)}
          >
            {id === 'edit' ? t.simple.edit : id === 'sound' ? t.simple.sound : t.simple.effects}
          </button>
        ))}
      </div>
      <div className={styles.panelBody} id="simple-panel" role="tabpanel" aria-labelledby={`simple-tab-${section}`}>
        {advanced ? (
          <p className={styles.advanced}>
            <span>{t.simple.advanced}</span>
            <button type="button" className={styles.textBtn} onClick={() => onMode('technical')}>
              {t.simple.openTechnical}
            </button>
          </p>
        ) : null}
        {status ? (
          <p className={styles.status} aria-live="polite">
            {status}
          </p>
        ) : null}

        {section === 'edit' ? (
          <div className={styles.stack}>
            <section className={styles.group} aria-labelledby="simple-trim">
              <h2 id="simple-trim">{t.simple.trim}</h2>
              <button type="button" className={styles.action} disabled={!snap.sampleLoaded || !hasSelection} onClick={onApplyTrim}>
                {t.simple.trimToSelection}
              </button>
              <p className={styles.meta}>{t.simple.length(formatSimpleSeconds(regionLen, locale))}</p>
              <button
                type="button"
                className={styles.textBtn}
                aria-expanded={moreEdit}
                aria-label={t.simple.moreEdit}
                onClick={() => setMoreEdit((open) => !open)}
              >
                ···
              </button>
              {moreEdit ? (
                <div className={styles.more}>
                  <button type="button" className={styles.chip} disabled={!snap.sampleLoaded} onClick={() => setEdgeFromPlayhead('start')}>
                    {t.simple.setStart}
                  </button>
                  <button type="button" className={styles.chip} disabled={!snap.sampleLoaded} onClick={() => setEdgeFromPlayhead('end')}>
                    {t.simple.setEnd}
                  </button>
                  <button type="button" className={styles.chip} onClick={() => setSheet('restore')}>
                    {t.simple.resetChanges}
                  </button>
                </div>
              ) : null}
            </section>
            <FadeGroup
              id="fade-in"
              label={t.simple.fadeIn}
              value={fadeInStep}
              copy={fadeCopy}
              aria={t.simple.fadeInAria}
              disabled={!snap.sampleLoaded}
              onChange={(step) => setFade('in', step)}
            />
            <FadeGroup
              id="fade-out"
              label={t.simple.fadeOut}
              value={fadeOutStep}
              copy={fadeCopy}
              aria={t.simple.fadeOutAria}
              disabled={!snap.sampleLoaded}
              onChange={(step) => setFade('out', step)}
            />
            <div className={styles.history}>
              <button type="button" className={styles.textBtn} disabled={!canUndo} onClick={onUndo}>
                {t.simple.undo}
              </button>
              <button type="button" className={styles.textBtn} disabled={!canRedo} onClick={onRedo}>
                {t.simple.redo}
              </button>
            </div>
          </div>
        ) : null}

        {section === 'sound' ? (
          <div className={styles.stack}>
            <div className={styles.group} role="radiogroup" aria-label={t.simple.sound}>
              <h2>{t.simple.toneGroup}</h2>
              <div className={styles.choices}>
                {TONE_CHARACTER_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={tone.id === id}
                    aria-label={toneCopy[id]?.aria}
                    data-simple-tone={id}
                    className={tone.id === id ? styles.choiceOn : styles.choice}
                    disabled={!snap.sampleLoaded}
                    onClick={() => applyTone(id)}
                  >
                    {toneCopy[id]?.label}
                  </button>
                ))}
              </div>
              <h2>{t.simple.clarity}</h2>
              <div className={styles.choices}>
                {CLARITY_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={tone.id === id}
                    aria-label={toneCopy[id]?.aria}
                    data-simple-tone={id}
                    className={tone.id === id ? styles.choiceOn : styles.choice}
                    disabled={!snap.sampleLoaded}
                    onClick={() => applyTone(id)}
                  >
                    {toneCopy[id]?.label}
                  </button>
                ))}
              </div>
              {tone.id === 'custom' ? <p className={styles.meta}>{t.simple.customTone}</p> : null}
            </div>
            <Amount
              label={t.simple.amount}
              hintLeft={t.simple.amountSubtle}
              hintRight={t.simple.amountStrong}
              value={tone.id === 'natural' ? 0 : toneSlider}
              disabled={tone.id === 'custom' || tone.id === 'natural' || !snap.sampleLoaded}
              onPointerDown={() => setDraggingTone(true)}
              onChange={(next) => {
                setToneAmount(next)
                applyToneAmount(next)
              }}
              onCommit={() => {
                setDraggingTone(false)
                onToneCommit()
              }}
            />
            <section className={styles.group} aria-labelledby="simple-level">
              <h2 id="simple-level">{t.simple.level}</h2>
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
                {t.simple.evenOut}
              </button>
            </section>
          </div>
        ) : null}

        {section === 'effects' ? (
          <div className={styles.stack}>
            <EffectBlock
              title={t.simple.reverb}
              hint={t.simple.reverbHint}
              state={reverb.kind === 'off' ? 'off' : reverb.kind === 'custom' ? 'custom' : 'on'}
              offLabel={t.simple.effectOff}
              onLabel={t.simple.effectOn}
              customLabel={t.simple.customEffect}
              enableLabel={t.simple.enable}
              disabled={!snap.sampleLoaded}
              onEnable={() => chooseReverb('small')}
              onDisable={() => {
                exitOriginal()
                disableSimpleReverb(engine)
                onToneCommit()
              }}
            >
              {reverb.kind !== 'off' ? (
                <>
                  <div className={styles.segments} role="radiogroup" aria-label={t.simple.reverb}>
                    {SIMPLE_REVERB_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={reverb.kind === 'preset' && reverb.id === id}
                        data-simple-reverb={id}
                        className={reverb.kind === 'preset' && reverb.id === id ? styles.segOn : ''}
                        disabled={!snap.sampleLoaded}
                        onClick={() => chooseReverb(id)}
                      >
                        {id === 'small' ? t.simple.spaceSmall : id === 'medium' ? t.simple.spaceMedium : t.simple.spaceLarge}
                      </button>
                    ))}
                  </div>
                  {reverb.kind === 'preset' ? (
                    <Amount
                      label={t.simple.amount}
                      hintLeft={t.simple.amountNone}
                      hintRight={t.simple.amountMore}
                      value={reverb.amount}
                      disabled={!snap.sampleLoaded}
                      onPointerDown={() => {
                        setReverbHold(reverb.id)
                        setReverbDrag(reverb.amount)
                      }}
                      onChange={(next) => {
                        setReverbDrag(next)
                        exitOriginal()
                        applySimpleReverbAmount(engine, next)
                      }}
                      onCommit={() => {
                        setReverbDrag(null)
                        setReverbHold(null)
                        onToneCommit()
                      }}
                    />
                  ) : null}
                </>
              ) : null}
            </EffectBlock>
            <EffectBlock
              title={t.simple.delay}
              hint={t.simple.delayHint}
              state={delay.kind === 'off' ? 'off' : delay.kind === 'custom' ? 'custom' : 'on'}
              offLabel={t.simple.effectOff}
              onLabel={t.simple.effectOn}
              customLabel={t.simple.customEffect}
              enableLabel={t.simple.enable}
              disabled={!snap.sampleLoaded}
              onEnable={() => chooseDelay('short')}
              onDisable={() => {
                exitOriginal()
                disableSimpleDelay(engine)
                onToneCommit()
              }}
            >
              {delay.kind !== 'off' ? (
                <>
                  <div className={styles.segments} role="radiogroup" aria-label={t.simple.delay}>
                    {SIMPLE_DELAY_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={delay.kind === 'preset' && delay.id === id}
                        data-simple-delay={id}
                        className={delay.kind === 'preset' && delay.id === id ? styles.segOn : ''}
                        disabled={!snap.sampleLoaded}
                        onClick={() => chooseDelay(id)}
                      >
                        {id === 'short' ? t.simple.echoShort : id === 'medium' ? t.simple.echoMedium : t.simple.echoLong}
                      </button>
                    ))}
                  </div>
                  {delay.kind === 'preset' ? (
                    <Amount
                      label={t.simple.amount}
                      hintLeft={t.simple.amountNone}
                      hintRight={t.simple.amountMore}
                      value={delay.amount}
                      disabled={!snap.sampleLoaded}
                      onPointerDown={() => {
                        setDelayHold(delay.id)
                        setDelayDrag(delay.amount)
                      }}
                      onChange={(next) => {
                        setDelayDrag(next)
                        exitOriginal()
                        applySimpleDelayAmount(engine, next)
                      }}
                      onCommit={() => {
                        setDelayDrag(null)
                        setDelayHold(null)
                        onToneCommit()
                      }}
                    />
                  ) : null}
                </>
              ) : null}
            </EffectBlock>
          </div>
        ) : null}
      </div>
    </aside>
  )

  const transport = (
    <div className={styles.transport}>
      <button
        type="button"
        className={styles.play}
        data-geometry="circle"
        disabled={!snap.sampleLoaded}
        aria-label={snap.playing ? t.simple.pause : t.simple.play}
        onClick={() => void engine.unlock().then(() => engine.togglePlay())}
      >
        {snap.playing ? '❚❚' : '▶'}
      </button>
      <p className={styles.clock} aria-live="off">
        {t.simple.clock(formatSimpleClock(now), formatSimpleClock(regionLen || snap.duration))}
      </p>
      <div className={styles.compare} role="radiogroup" aria-label={t.simple.compare}>
        <button
          type="button"
          role="radio"
          aria-checked={listenOriginal}
          className={listenOriginal ? styles.compareOn : ''}
          data-simple-compare="original"
          onClick={() => toggleCompare(true)}
        >
          {t.simple.original}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!listenOriginal}
          className={!listenOriginal ? styles.compareOn : ''}
          data-simple-compare="after"
          onClick={() => toggleCompare(false)}
        >
          {t.simple.after}
        </button>
      </div>
      {sidePanel ? (
        <button type="button" className={styles.export} data-simple-export="" disabled={!snap.sampleLoaded} onClick={() => setSheet('save')}>
          {t.transport.export}
        </button>
      ) : null}
    </div>
  )

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
          <Wordmark compact={frame === 'phone'} hideTagline={width < 960} />
          <button
            type="button"
            className={styles.file}
            title={snap.fileName || t.header.loadSample}
            aria-label={snap.fileName || t.header.loadSample}
            onClick={onLoadSample}
          >
            {snap.fileName || t.simple.fileUntitled}
          </button>
          <div className={styles.modeSlot}>
            <ModeSwitch mode={mode} onChange={onMode} compact={frame === 'phone'} />
          </div>
          <ThemePicker compact={frame === 'phone'} />
          <button type="button" className={styles.load} data-load-sample="" onClick={onLoadSample}>
            <StableLabel text={t.header.loadSample} samples={LOAD_SAMPLE_LABELS} />
          </button>
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
        <div className={styles.belowHeader}>
          <div className={styles.belowMain}>
            <div className={styles.workspace}>
              <div className={styles.stage}>
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
                {hasSelection ? (
                  <div className={styles.selection} role="region" aria-label={t.simple.selection}>
                    <span className={styles.selectionLabel}>{t.simple.selection}</span>
                    <button type="button" className={styles.chip} onClick={onApplyTrim}>
                      {t.simple.trimToSelection}
                    </button>
                    <button type="button" className={styles.chip} onClick={() => quickFade('in')}>
                      {t.simple.fadeIn}
                    </button>
                    <button type="button" className={styles.chip} onClick={() => quickFade('out')}>
                      {t.simple.fadeOut}
                    </button>
                    <button type="button" className={styles.chip} onClick={clearSelection}>
                      {t.simple.clearSelection}
                    </button>
                  </div>
                ) : null}
              </div>
              {sidePanel ? panel : null}
            </div>
            {transport}
            {sidePanel ? null : panel}
            {sidePanel ? null : (
              <button type="button" className={styles.export} data-simple-export="" disabled={!snap.sampleLoaded} onClick={() => setSheet('save')}>
                {t.transport.export}
              </button>
            )}
          </div>
          {menuOpen ? menu : null}
        </div>
      </div>

      {sheet !== 'none' ? (
        <div className={styles.sheetScrim} onClick={() => setSheet('none')}>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="simple-sheet-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.sheetGrab} data-geometry="pill" aria-label={t.simple.closeSheet} onClick={() => setSheet('none')} />
            {sheet === 'save' ? (
              <form
                className={styles.saveForm}
                onSubmit={(event) => {
                  event.preventDefault()
                  saveFile()
                }}
              >
                <h2 id="simple-sheet-title">{t.transport.export}</h2>
                <label className={styles.field}>
                  {t.simple.saveName}
                  <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
                </label>
                <p className={styles.sheetLabel}>{t.simple.saveFormat}</p>
                <p className={styles.meta}>{t.simple.wav}</p>
                <button type="button" className={styles.textBtn} onClick={() => setMoreSave((value) => !value)}>
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
                <button type="submit" className={styles.export} disabled={saving}>
                  {saving ? t.export.rendering : t.transport.export}
                </button>
              </form>
            ) : null}
            {sheet === 'restore' ? (
              <>
                <h2 id="simple-sheet-title">{t.simple.resetChanges}</h2>
                <p>{t.simple.restoreConfirm}</p>
                <div className={styles.restoreRow}>
                  <button type="button" className={styles.chip} onClick={() => setSheet('none')}>
                    {t.simple.restoreNo}
                  </button>
                  <button type="button" className={styles.export} onClick={resetChanges}>
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

function FadeGroup({
  id,
  label,
  value,
  copy,
  aria,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: FadeStepId
  copy: Record<FadeStepId, string>
  aria: (step: string) => string
  disabled: boolean
  onChange: (step: FadeStepId) => void
}) {
  return (
    <section className={styles.group}>
      <h2 id={id}>{label}</h2>
      <div className={styles.segments} role="radiogroup" aria-labelledby={id}>
        {FADE_STEP_IDS.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={value === step}
            aria-label={aria(copy[step])}
            className={value === step ? styles.segOn : ''}
            disabled={disabled}
            onClick={() => onChange(step)}
          >
            {copy[step]}
          </button>
        ))}
      </div>
    </section>
  )
}

function Amount({
  label,
  hintLeft,
  hintRight,
  value,
  disabled,
  onPointerDown,
  onChange,
  onCommit,
}: {
  label: string
  hintLeft: string
  hintRight: string
  value: number
  disabled: boolean
  onPointerDown: () => void
  onChange: (value: number) => void
  onCommit: () => void
}) {
  return (
    <label className={styles.amount}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={label}
        onPointerDown={onPointerDown}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onPointerCancel={onCommit}
        onKeyUp={onCommit}
      />
      <span className={styles.amountEnds}>
        <span>{hintLeft}</span>
        <span>{hintRight}</span>
      </span>
    </label>
  )
}

function EffectBlock({
  title,
  hint,
  state,
  offLabel,
  onLabel,
  customLabel,
  enableLabel,
  disabled,
  onEnable,
  onDisable,
  children,
}: {
  title: string
  hint: string
  state: 'off' | 'on' | 'custom'
  offLabel: string
  onLabel: string
  customLabel: string
  enableLabel: string
  disabled: boolean
  onEnable: () => void
  onDisable: () => void
  children: ReactNode
}) {
  const status = state === 'off' ? offLabel : state === 'custom' ? customLabel : onLabel
  return (
    <section className={styles.effect}>
      <div className={styles.effectHead}>
        <h2>{title}</h2>
        <span className={styles.effectState}>{status}</span>
      </div>
      {state === 'off' ? (
        <div className={styles.effectOff}>
          <p className={styles.meta}>{hint}</p>
          <button type="button" className={styles.chip} disabled={disabled} onClick={onEnable}>
            {enableLabel}
          </button>
        </div>
      ) : (
        children
      )}
      {state !== 'off' ? (
        <button type="button" className={styles.textBtn} onClick={onDisable}>
          {offLabel}
        </button>
      ) : null}
    </section>
  )
}
