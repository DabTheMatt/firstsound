import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { formatTimecode } from '../audio/engine/formatTime'
import { downloadJson, parsePreset, readAudioFile, AUDIO_FILE_ACCEPT, AUDIO_IMPORT_HINT } from '../features/sample/files'
import { engine, useEngine } from '../hooks/useEngine'
import type { FadeCurve } from '../audio/engine/fades'
import { DEFAULT_EDIT, type EditState, type InspectorFocus, type MeterRange, type VizMode, type WaveTool } from './editorState'
import { commitHistory, createHistory, redoHistory, undoHistory } from './history'
import { isTypingTarget } from './keys'
import { inspectorWidth } from './layoutMode'
import { useLayoutMode } from './useLayoutMode'
import { AppHeader } from '../components/header/AppHeader'
import { SignalChain } from '../components/chain/SignalChain'
import { Inspector } from '../components/inspector/Inspector'
import { InspectorEye } from '../components/inspector/InspectorEye'
import { CompactTransport } from '../components/transport/CompactTransport'
import { MeterStrip } from '../components/meters/MeterStrip'
import { Waveform, type WaveformHandle } from '../components/waveform/Waveform'
import { WaveformToolbar } from '../components/waveform/WaveformToolbar'
import { EditBar } from '../components/samplePrep/EditBar'
import { ExportDialog } from '../components/samplePrep/ExportDialog'
import styles from './App.module.css'

type Hist = {
  start: number
  end: number
  chain: string
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
}

function histKey(
  start: number,
  end: number,
  chain: { instanceId: string }[],
  edit: Pick<EditState, 'fadeIn' | 'fadeOut' | 'fadeCurve'>,
): Hist {
  return {
    start,
    end,
    chain: chain.map((m) => m.instanceId).join(','),
    fadeIn: edit.fadeIn,
    fadeOut: edit.fadeOut,
    fadeCurve: edit.fadeCurve,
  }
}

export default function App() {
  const snap = useEngine()
  const { mode, width: viewportWidth } = useLayoutMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [tool, setTool] = useState<WaveTool>('select')
  const [viz, setViz] = useState<VizMode>('waveform')
  const [meterRange, setMeterRange] = useState<MeterRange>('normal')
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT)
  const [normalizeView, setNormalizeView] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [sheetLevel, setSheetLevel] = useState<'collapsed' | 'medium' | 'expanded'>('medium')
  const [zoomLabel, setZoomLabel] = useState('100%')
  const [editMode, setEditMode] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [focus, setFocus] = useState<InspectorFocus>({
    kind: 'module',
    instanceId: 'gain-1',
    type: 'gain',
  })
  const [history, setHistory] = useState(() => createHistory(histKey(0, 1, [], DEFAULT_EDIT)))
  const editRef = useRef(edit)
  useEffect(() => {
    editRef.current = edit
  }, [edit])

  useEffect(() => {
    engine.setRegionFades(edit.fadeIn, edit.fadeOut, edit.fadeCurve)
  }, [edit.fadeIn, edit.fadeOut, edit.fadeCurve])

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node) return
      if (settingsRef.current?.contains(node)) return
      if (node instanceof Element && node.closest('[data-settings-toggle]')) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        void engine.unlock().then(() => engine.togglePlay())
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setHistory((h) => {
          const next = event.shiftKey ? redoHistory(h) : undoHistory(h)
          engine.setRegion(next.present.start, next.present.end)
          setEdit((e) => ({
            ...e,
            fadeIn: next.present.fadeIn,
            fadeOut: next.present.fadeOut,
            fadeCurve: next.present.fadeCurve,
          }))
          return next
        })
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [])
  const sampleInput = useRef<HTMLInputElement>(null)
  const presetInput = useRef<HTMLInputElement>(null)
  const waveRef = useRef<WaveformHandle>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const loadSample = async (file: File) => {
    await engine.unlock()
    const data = await readAudioFile(file)
    await engine.loadArrayBuffer(data, file.name)
  }

  const onFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void loadSample(file)
  }

  const commit = useCallback(() => {
    const e = editRef.current
    setHistory((h) =>
      commitHistory(
        h,
        histKey(engine.getSnapshot().params.start, engine.getSnapshot().params.end, engine.getSnapshot().chain, e),
        (a, b) =>
          a.start === b.start &&
          a.end === b.end &&
          a.chain === b.chain &&
          a.fadeIn === b.fadeIn &&
          a.fadeOut === b.fadeOut &&
          a.fadeCurve === b.fadeCurve,
      ),
    )
  }, [])

  const restorePresent = (present: Hist) => {
    engine.setRegion(present.start, present.end)
    setEdit((e) => ({
      ...e,
      fadeIn: present.fadeIn,
      fadeOut: present.fadeOut,
      fadeCurve: present.fadeCurve,
    }))
  }

  const selectModule = (instanceId: string) => {
    const mod = snap.chain.find((m) => m.instanceId === instanceId)
    if (!mod) return
    setFocus({ kind: 'module', instanceId, type: mod.type })
    if (mode === 'sheet') setSheetLevel('medium')
  }

  const selectTool = (next: WaveTool) => {
    setTool(next)
    setFocus({ kind: 'tool', tool: next })
    if (mode === 'sheet') setSheetLevel('medium')
  }

  const applyHistory = (next: typeof history) => {
    setHistory(next)
    restorePresent(next.present)
  }

  const onUseSample = () => {
    void engine.useAsSample({
      fadeIn: edit.fadeIn,
      fadeOut: edit.fadeOut,
      fadeCurve: edit.fadeCurve,
      reverse: false,
      normalize: edit.normalizeOnUse,
    })
  }

  const dockRight = mode === 'dock-right'
  const sheet = mode === 'sheet'
  const compact = mode !== 'dock-right'

  const moreOpen = menuOpen

  const inspector = inspectorOpen ? (
    <Inspector
      snap={snap}
      focus={focus}
      edit={edit}
      sheet={sheet && sheetLevel !== 'expanded'}
      onEdit={(patch) => setEdit((e) => ({ ...e, ...patch }))}
      onCommit={commit}
      onTrim={() => {
        void engine
          .useAsSample({
            fadeIn: 0,
            fadeOut: 0,
            fadeCurve: 'linear',
            reverse: false,
            normalize: false,
          })
          .then(() => {
            setEdit((e) => ({ ...e, fadeIn: 0, fadeOut: 0, fadeAuto: false }))
            waveRef.current?.fitSample()
            commit()
          })
      }}
      knobs={mode !== 'sheet'}
      onHideInspector={dockRight ? () => setInspectorOpen(false) : undefined}
      onFine={(which, delta) => engine.setParam(which, snap.params[which] + delta)}
    />
  ) : null

  const actions = useMemo(
    () => (
      <div className={styles.moreMenu}>
          <p className={styles.hint}>{AUDIO_IMPORT_HINT}</p>
          <button type="button" onClick={() => sampleInput.current?.click()}>
            Load sample
          </button>
        <button
          type="button"
          onClick={() => downloadJson('field-preset.json', engine.toPreset())}
        >
          Save preset
        </button>
        <button type="button" onClick={() => presetInput.current?.click()}>
          Load preset
        </button>
        <button
          type="button"
          onClick={() => {
            void engine.unlock().then(() => engine.loadDemoTone())
          }}
        >
          Load demo tone
        </button>
        <button
          type="button"
          onClick={() => {
            engine.enterSampleEdit()
            setEditMode(true)
            setMenuOpen(false)
          }}
        >
          Edit sample
        </button>
        <button type="button" onClick={() => engine.resetAll()}>
          Reset all
        </button>
        {snap.hasSource ? (
          <button type="button" onClick={() => engine.revertToSource()}>
            Revert to source
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            applyHistory(undoHistory(history))
          }}
        >
          Undo
        </button>
        <button type="button" onClick={() => applyHistory(redoHistory(history))}>
          Redo
        </button>
      </div>
    ),
    [history, snap.hasSource],
  )

  return (
    <div
      className={styles.page}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) void loadSample(file)
      }}
    >
      <main
        className={`${styles.shell} ${styles[mode]} ${dragging ? styles.drop : ''} ${inspectorOpen ? '' : styles.inspectorHidden}`}
        style={
          mode === 'dock-right' && inspectorOpen
            ? ({ '--inspector-col': `${inspectorWidth(mode, viewportWidth)}px` } as CSSProperties)
            : undefined
        }
      >
        <AppHeader
          snap={snap}
          settingsOpen={moreOpen}
          onToggleSettings={() => setMenuOpen((v) => !v)}
          onLoadSample={() => sampleInput.current?.click()}
          compact={sheet}
        />
        {moreOpen ? (
          <>
            <button
              type="button"
              className={styles.settingsScrim}
              aria-label="Close settings"
              onClick={() => setMenuOpen(false)}
            />
            <div className={styles.settingsFly} ref={settingsRef}>
              {actions}
            </div>
          </>
        ) : null}

        {snap.audioStatus === 'blocked' ? (
          <p className={styles.banner}>Audio is paused by the browser. Tap Play to resume.</p>
        ) : null}

        <SignalChain
          chain={snap.chain}
          selectedId={focus.kind === 'module' ? focus.instanceId : ''}
          onSelect={selectModule}
          touch={compact}
        />

        <WaveformToolbar
          tool={tool}
          onTool={selectTool}
          viz={viz}
          onViz={setViz}
          zoomLabel={zoomLabel}
          normalizeView={normalizeView}
          onZoomIn={() => waveRef.current?.zoomBy(1 / 1.4)}
          onZoomOut={() => waveRef.current?.zoomBy(1.4)}
          onView={(action) => {
            if (action === 'fit-sample') waveRef.current?.fitSample()
            if (action === 'zoom-selection') waveRef.current?.zoomSelection()
            if (action === 'fit-selection') waveRef.current?.fitSelection()
            if (action === 'normalize-view') setNormalizeView((n) => !n)
            if (action === 'reset-zoom') waveRef.current?.resetZoom()
          }}
        />

        <div className={styles.work}>
          <div className={styles.waveCol}>
            <Waveform
              ref={waveRef}
              key={`${snap.fileName || 'empty'}:${snap.duration.toFixed(6)}`}
              duration={snap.duration}
              start={snap.params.start}
              end={snap.params.end}
              loaded={snap.sampleLoaded}
              tool={tool}
              viz={viz}
              fadeIn={edit.fadeIn}
              fadeOut={edit.fadeOut}
              fadeCurve={edit.fadeCurve}
              autoSnap={edit.autoSnap}
              normalizeView={normalizeView}
              onNormalizeView={setNormalizeView}
              onZoomLabel={setZoomLabel}
              contentRev={snap.bufferRev}
              onFades={(patch) => setEdit((e) => ({ ...e, ...patch, fadeAuto: false }))}
              onFadesCommit={commit}
              onRegionCommit={commit}
              fxMode={focus.kind === 'module' && (focus.type === 'delay' || focus.type === 'reverb') ? focus.type : null}
              onLoadDemo={() => {
                void engine.unlock().then(() => engine.loadDemoTone())
              }}
            />
          </div>
          {dockRight && inspectorOpen ? <aside className={styles.inspector}>{inspector}</aside> : null}
          {dockRight && !inspectorOpen ? (
            <div className={styles.inspectorReveal}>
              <InspectorEye open={false} onClick={() => setInspectorOpen(true)} />
            </div>
          ) : null}
          {dockRight ? (
            <MeterStrip channels={snap.channelCount} range={meterRange} onRange={setMeterRange} />
          ) : null}
        </div>

        <CompactTransport
          playing={snap.playing}
          loop={snap.loop}
          start={snap.params.start}
          end={snap.params.end}
          disabled={!snap.sampleLoaded}
          compact={compact}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={() => applyHistory(undoHistory(history))}
          onRedo={() => applyHistory(redoHistory(history))}
          onExport={() => setExportOpen(true)}
          onUseSample={onUseSample}
        />

        {editMode && snap.sampleLoaded ? (
          <EditBar
            snap={snap}
            viewSpan={Math.max(0.001, snap.prep.windowEnd - snap.prep.windowStart)}
            moreOpen={false}
            onToggleMore={() => undefined}
            onExport={() => setExportOpen(true)}
            onDone={() => {
              engine.stopPreview()
              setEditMode(false)
              setExportOpen(false)
            }}
          />
        ) : null}

        {!dockRight && inspectorOpen ? (
          <div className={`${styles.bottom} ${styles[sheetLevel]}`}>
            {sheet ? (
              <button
                type="button"
                className={styles.sheetHandle}
                onClick={() =>
                  setSheetLevel((s) =>
                    s === 'collapsed' ? 'medium' : s === 'medium' ? 'expanded' : 'collapsed',
                  )
                }
              >
                Inspector
              </button>
            ) : null}
            {sheetLevel !== 'collapsed' || !sheet ? inspector : null}
          </div>
        ) : null}

        <p className={styles.sr}>Selection {formatTimecode(snap.params.start)} to {formatTimecode(snap.params.end)}</p>

        <input
          ref={sampleInput}
          type="file"
          accept={AUDIO_FILE_ACCEPT}
          hidden
          onChange={(event) => {
            onFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <input
          ref={presetInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            const text = await file.text()
            const preset = parsePreset(JSON.parse(text) as unknown)
            if (preset) engine.applyPreset(preset)
          }}
        />
      </main>
      {exportOpen ? <ExportDialog snap={snap} onClose={() => setExportOpen(false)} /> : null}
    </div>
  )
}