import { useEffect, useRef, useState } from 'react'
import { formatTimecode } from '../audio/engine/formatTime'
import { Knob } from '../components/controls/Knob'
import { Toggle } from '../components/controls/Toggle'
import { TransportButton } from '../components/controls/TransportButton'
import { Waveform } from '../components/waveform/Waveform'
import { downloadJson, parsePreset, readAudioFile } from '../features/sample/files'
import { engine, useEngine } from '../hooks/useEngine'
import { TAB_KNOBS, TAB_NOTES, TABS, type ModuleTab } from './tabs'
import styles from './App.module.css'

export default function App() {
  const snap = useEngine()
  const [tab, setTab] = useState<ModuleTab>('grain')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const sampleInput = useRef<HTMLInputElement>(null)
  const presetInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      event.preventDefault()
      void engine.unlock().then(() => engine.togglePlay())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadSample = async (file: File) => {
    await engine.unlock()
    const data = await readAudioFile(file)
    await engine.loadArrayBuffer(data, file.name)
  }

  const onFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void loadSample(file)
  }

  const knobs = TAB_KNOBS[tab]
  const note = TAB_NOTES[tab]

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
      <main className={`${styles.shell} ${dragging ? styles.drop : ''}`}>
        <header className={styles.header}>
          <div className={styles.fileMeta}>
            <span className={styles.wordmark}>Field</span>
            <span className={styles.fileName}>
              {snap.fileName || 'No sample loaded'}
            </span>
          </div>
          <div className={styles.duration}>
            {snap.sampleLoaded ? formatTimecode(snap.duration) : '00:00.000'}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => sampleInput.current?.click()}
            >
              Load
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => downloadJson('field-preset.json', engine.toPreset())}
            >
              Save
            </button>
            <div className={styles.menuWrap}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="More"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ···
              </button>
              {menuOpen ? (
                <div className={styles.menu}>
                  <button
                    type="button"
                    onClick={() => {
                      void engine.unlock().then(() => engine.loadDemoTone())
                      setMenuOpen(false)
                    }}
                  >
                    Load demo tone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      presetInput.current?.click()
                      setMenuOpen(false)
                    }}
                  >
                    Load preset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      engine.resetAll()
                      setMenuOpen(false)
                    }}
                  >
                    Reset all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      engine.setEngineMode(
                        snap.engineMode === 'grain' ? 'playback' : 'grain',
                      )
                      setMenuOpen(false)
                    }}
                  >
                    {snap.engineMode === 'grain' ? 'Use region player' : 'Use grain engine'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {snap.audioStatus === 'blocked' ? (
          <p className={styles.banner}>
            Audio is paused by the browser. Tap Play to resume.
          </p>
        ) : null}

        <Waveform
          duration={snap.duration}
          start={snap.params.start}
          end={snap.params.end}
          loaded={snap.sampleLoaded}
          onLoadDemo={() => {
            void engine.unlock().then(() => engine.loadDemoTone())
          }}
        />

        <div className={styles.transport}>
          <TransportButton
            playing={snap.playing}
            disabled={!snap.sampleLoaded}
            onToggle={() => {
              void engine.unlock().then(() => engine.togglePlay())
            }}
          />
          <Toggle
            pressed={snap.loop}
            label="Loop"
            onToggle={() => engine.setLoop(!snap.loop)}
          />
          <Toggle
            pressed={snap.engineMode === 'grain'}
            label="Grain"
            onToggle={() =>
              engine.setEngineMode(snap.engineMode === 'grain' ? 'playback' : 'grain')
            }
          />
          <dl className={styles.readouts}>
            <div className={styles.readout}>
              <dt>Start</dt>
              <dd>{formatTimecode(snap.params.start)}</dd>
            </div>
            <div className={styles.readout}>
              <dt>End</dt>
              <dd>{formatTimecode(snap.params.end)}</dd>
            </div>
            <div className={styles.readout}>
              <dt>Speed</dt>
              <dd>{snap.params.speed.toFixed(2)}x</dd>
            </div>
            <div className={styles.readout}>
              <dt>Pitch</dt>
              <dd>{snap.params.pitch.toFixed(0)} st</dd>
            </div>
            <div className={styles.readout}>
              <dt>Gain</dt>
              <dd>{snap.params.gain.toFixed(1)} dB</dd>
            </div>
          </dl>
        </div>

        <nav className={styles.tabs} aria-label="Modules">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {note ? <p className={styles.note}>{note}</p> : null}

        <div className={styles.knobs}>
          {knobs.map((id) => (
            <Knob key={id} id={id} value={snap.params[id]} />
          ))}
        </div>

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
    </div>
  )
}
