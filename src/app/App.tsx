import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTimecode } from '../audio/engine/formatTime'
import { downloadJson, parsePreset, readAudioFile } from '../features/sample/files'
import { engine, useEngine } from '../hooks/useEngine'
import { DEFAULT_EDIT, type EditState, type InspectorFocus, type MeterRange, type VizMode, type WaveTool } from './editorState'
import { commitHistory, createHistory, redoHistory, undoHistory } from './history'
import { useLayoutMode } from './useLayoutMode'
import { AppHeader } from '../components/header/AppHeader'
import { SignalChain } from '../components/chain/SignalChain'
import { Inspector } from '../components/inspector/Inspector'
import { CompactTransport } from '../components/transport/CompactTransport'
import { MeterStrip } from '../components/meters/MeterStrip'
import { Waveform, type WaveformHandle } from '../components/waveform/Waveform'
import { WaveformToolbar } from '../components/waveform/WaveformToolbar'
import { EditBar } from '../components/samplePrep/EditBar'
import { ExportDialog } from '../components/samplePrep/ExportDialog'
import styles from './App.module.css'

type Hist = { start: number; end: number; chain: string }

function histKey(start: number, end: number, chain: { instanceId: string }[]): Hist {
  return { start, end, chain: chain.map((m) => m.instanceId).join(',') }
}

export default function App() {
  const snap = useEngine()
  const { mode } = useLayoutMode()
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
  const [history, setHistory] = useState(() => createHistory(histKey(0, 1, [])))
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return
      if (event.code === 'Space') {
        event.preventDefault()
        void engine.unlock().then(() => engine.togglePlay())
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setHistory((h) => {
          const next = event.shiftKey ? redoHistory(h) : undoHistory(h)
          engine.setRegion(next.present.start, next.present.end)
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const sampleInput = useRef<HTMLInputElement>(null)
  const presetInput = useRef<HTMLInputElement>(null)
  const waveRef = useRef<WaveformHandle>(null)

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
    setHistory((h) =>
      commitHistory(
        h,
        histKey(engine.getSnapshot().params.start, engine.getSnapshot().params.end, engine.getSnapshot().chain),
        (a, b) => a.start === b.start && a.end === b.end && a.chain === b.chain,
      ),
    )
  }, [])

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
    // Region restore is approximate — chain undo goes through reorder by ids.
    engine.setRegion(next.present.start, next.present.end)
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
      onFine={(which, delta) => engine.setParam(which, snap.params[which] + delta)}
    />
  ) : null

  const actions = useMemo(
    () => (
      <div className={styles.moreMenu}>
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
      >
        <AppHeader
          snap={snap}
          settingsOpen={moreOpen}
          onToggleSettings={() => setMenuOpen((v) => !v)}
          onLoadSample={() => sampleInput.current?.click()}
          compact={sheet}
        />
        {moreOpen ? <div className={styles.settingsFly}>{actions}</div> : null}

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
          compact={sheet}
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
              key={snap.fileName || 'empty'}
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
              onFades={(patch) => setEdit((e) => ({ ...e, ...patch, fadeAuto: false }))}
              onRegionCommit={commit}
              onLoadDemo={() => {
                void engine.unlock().then(() => engine.loadDemoTone())
              }}
            />
          </div>
          {dockRight && inspectorOpen ? <aside className={styles.inspector}>{inspector}</aside> : null}
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

        {dockRight ? (
          <button
            type="button"
            className={styles.toggleInspector}
            onClick={() => setInspectorOpen((v) => !v)}
          >
            {inspectorOpen ? 'Hide inspector' : 'Show inspector'}
          </button>
        ) : null}

        <p className={styles.sr}>Selection {formatTimecode(snap.params.start)} to {formatTimecode(snap.params.end)}</p>

        <input
          ref={sampleInput}
          type="file"
          accept="audio/*"
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