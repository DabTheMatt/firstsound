import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react'
import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { useEngine } from '../hooks/useEngine'
import { useI18n } from '../i18n'
import { guideChrome } from './copy'
import { subscribeGuideEvents } from './events'
import { signalFromSnapshot, type GuideContext } from './observe'
import { canAdvance, currentStep, readiness } from './session'
import { dispatchGuide, getGuideHost, getGuideState, guideEnv, noteGuideSignal, subscribeGuide } from './store'
import { AVAILABLE_CAPABILITIES, taskAvailable, taskById, tasksInCategory } from './tasks'
import { dockSlot, findGuideElement, targetHiddenInFocus } from './targets'
import { LEARNING_TOPICS, TOPIC_CATEGORIES, topicById } from './topics'
import type { GuideTargetId, GuideTask } from './types'
import styles from './GuideLayer.module.css'

type Props = {
  fadeIn: number
  fadeOut: number
  exportOpen: boolean
  focusActive: boolean
  menuOpen: boolean
}

type Counts = {
  exportOpenedCount: number
  exportCompletedCount: number
  compareCount: number
  waveformTouches: number
}

const ZERO_COUNTS: Counts = {
  exportOpenedCount: 0,
  exportCompletedCount: 0,
  compareCount: 0,
  waveformTouches: 0,
}

export function GuideLayer(props: Props) {
  const snap = useEngine()
  const { locale } = useI18n()
  const chrome = guideChrome(locale)
  const state = useSyncExternalStore(subscribeGuide, getGuideState, getGuideState)
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => subscribeGuideEvents((event) => {
    setCounts((current) => {
      if (event === 'export.opened') return { ...current, exportOpenedCount: current.exportOpenedCount + 1 }
      if (event === 'export.completed') return { ...current, exportCompletedCount: current.exportCompletedCount + 1 }
      if (event === 'compare.used') return { ...current, compareCount: current.compareCount + 1 }
      return { ...current, waveformTouches: current.waveformTouches + 1 }
    })
  }), [])

  const ctx = useMemo<GuideContext>(
    () => ({
      fadeIn: props.fadeIn,
      fadeOut: props.fadeOut,
      exportOpen: props.exportOpen,
      focusActive: props.focusActive,
      uiMode: getGuideHost().uiMode,
      menuOpen: props.menuOpen,
      ...counts,
    }),
    [props.fadeIn, props.fadeOut, props.exportOpen, props.focusActive, props.menuOpen, counts],
  )
  const signal = useMemo(() => signalFromSnapshot(snap, ctx), [snap, ctx])

  useEffect(() => {
    noteGuideSignal(signal)
  }, [signal])

  useEffect(() => {
    if (snap.sampleLoaded) dispatchGuide({ type: 'sample-arrived', env: guideEnv() })
  }, [snap.sampleLoaded])

  const task = taskById(state.taskId)
  const step = currentStep(state)
  const stepKey = step?.id ?? ''

  useEffect(() => {
    if (!step?.target || state.panel === 'floating' || state.view !== 'task') return
    const place = () => {
      const el = findGuideElement(step.target!)
      const rect = el?.getBoundingClientRect() ?? null
      dispatchGuide({ type: 'set-slot', slot: dockSlot(rect, window.innerHeight, window.innerWidth) })
    }
    place()
    window.addEventListener('field-guide-revealed', place)
    return () => window.removeEventListener('field-guide-revealed', place)
  }, [stepKey, state.panel, state.view, step?.target])

  useEffect(() => {
    if (!state.autoAdvance || state.view !== 'task' || !step) return
    if (readiness(step, state, signal) !== 'done') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => dispatchGuide({ type: 'next', signal }), 1600)
    return () => window.clearTimeout(id)
  }, [state, step, signal])

  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    const id = state.view === 'task' ? step?.target : null
    if (!id || state.panel === 'minimized' || props.menuOpen) {
      setRect(null)
      return
    }
    const measure = () => {
      const el = findGuideElement(id)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const el = findGuideElement(id)
    const observer = new ResizeObserver(measure)
    if (el) observer.observe(el)
    window.addEventListener('resize', measure)
    window.addEventListener('field-guide-revealed', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('field-guide-revealed', measure)
    }
  }, [state.view, state.panel, step?.target, props.menuOpen, stepKey])

  useEffect(() => {
    if (state.view === 'closed' || state.panel === 'minimized' || props.menuOpen) return
    const node = panelRef.current?.querySelector<HTMLElement>('[data-guide-focus]')
    node?.focus()
  }, [state.view, state.panel, props.menuOpen])

  if (state.view === 'closed' || props.menuOpen) return null

  const showHighlight = rect && state.view === 'task' && state.panel !== 'minimized'
  const minimized = state.panel === 'minimized'

  return (
    <div className={styles.layer}>
      {showHighlight ? (
        <div
          className={styles.glow}
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          aria-hidden="true"
        />
      ) : null}
      {minimized ? (
        <button type="button" className={styles.pill} onClick={() => dispatchGuide({ type: 'restore' })}>
          {chrome.restore}
          {task && state.view === 'task' ? ` · ${chrome.step(state.stepIndex + 1, task.steps.length)}` : ''}
        </button>
      ) : (
        <div
          ref={panelRef}
          className={styles.panel}
          role="region"
          aria-labelledby={titleId}
          data-slot={state.slot}
          data-mode={state.panel}
          style={state.panel === 'floating' && state.float ? { left: state.float.x, top: state.float.y, bottom: 'auto' } : undefined}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              dispatchGuide({ type: 'minimize' })
            }
          }}
        >
          <header
            className={styles.header}
            onPointerDown={(event) => startDrag(event, state.panel === 'floating')}
          >
            <div>
              <p className={styles.kicker} id={titleId}>{chrome.title}</p>
              <p className={styles.subtitle}>{chrome.subtitle}</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: state.panel === 'floating' ? 'dock' : 'float' })}>
                {state.panel === 'floating' ? chrome.dock : chrome.float}
              </button>
              <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'minimize' })}>
                {chrome.minimize}
              </button>
              <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'close' })}>
                {chrome.exit}
              </button>
            </div>
          </header>
          {state.view === 'library' ? <Library chrome={chrome} locale={locale} taskId={state.taskId} snap={snap} /> : null}
          {state.view === 'learn' ? (
            <Learn
              chrome={chrome}
              locale={locale}
              query={state.learnQuery}
              topicId={state.learnTopicId}
            />
          ) : null}
          {state.view === 'need-sound' ? <NeedSound chrome={chrome} /> : null}
          {state.view === 'mode-ask' && task ? <ModeAsk chrome={chrome} locale={locale} task={task} /> : null}
          {state.view === 'focus-ask' ? <FocusAsk chrome={chrome} target={step?.target ?? null} /> : null}
          {state.view === 'done' && task ? <Done chrome={chrome} locale={locale} task={task} /> : null}
          {state.view === 'task' && task && step ? (
            <TaskBody
              key={step.id}
              chrome={chrome}
              locale={locale}
              task={task}
              step={step}
              index={state.stepIndex}
              reason={readiness(step, state, signal)}
              advance={canAdvance(step, state, signal)}
              notice={state.notice === 'back-keeps-edits'}
              autoAdvance={state.autoAdvance}
              signalReady={() => dispatchGuide({ type: 'next', signal })}
              onSkip={() => dispatchGuide({ type: 'skip', signal })}
              onBack={() => dispatchGuide({ type: 'back' })}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function startDrag(event: ReactPointerEvent<HTMLElement>, floating: boolean): void {
  if (!floating) return
  const target = event.target as HTMLElement
  if (target.closest('button')) return
  const startX = event.clientX
  const startY = event.clientY
  const host = event.currentTarget.parentElement
  if (!host) return
  const origin = host.getBoundingClientRect()
  const move = (ev: PointerEvent) => {
    dispatchGuide({
      type: 'set-float',
      float: {
        x: Math.max(8, origin.left + ev.clientX - startX),
        y: Math.max(8, origin.top + ev.clientY - startY),
      },
    })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function Library({
  chrome,
  locale,
  taskId,
  snap,
}: {
  chrome: ReturnType<typeof guideChrome>
  locale: 'en' | 'pl'
  taskId: string | null
  snap: EngineSnapshot
}) {
  const available = new Set(AVAILABLE_CAPABILITIES)
  const current = taskById(taskId)
  return (
    <div className={styles.body}>
      <div className={styles.row}>
        <button type="button" className={styles.primary} data-guide-focus="" onClick={() => dispatchGuide({ type: 'open-learn' })}>
          {chrome.learnAudio}
        </button>
        {current ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => dispatchGuide({ type: 'start', taskId: current.id, env: { sampleLoaded: snap.sampleLoaded, uiMode: getGuideHost().uiMode } })}
          >
            {chrome.continueTask}
          </button>
        ) : null}
      </div>
      {(['basic', 'improve', 'creative', 'understand'] as const).map((category) => (
        <section key={category} className={styles.group} aria-labelledby={`guide-cat-${category}`}>
          <h2 id={`guide-cat-${category}`} className={styles.cat}>{chrome.categories[category]}</h2>
          <ul className={styles.cards}>
            {tasksInCategory(category).map((task) => {
              const open = taskAvailable(task, available)
              const concepts = task.topics.map((id) => topicById(id)?.title[locale]).filter(Boolean).join(', ')
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className={styles.card}
                    disabled={!open}
                    onClick={() => dispatchGuide({ type: 'start', taskId: task.id, env: { sampleLoaded: snap.sampleLoaded, uiMode: getGuideHost().uiMode } })}
                  >
                    <span className={styles.cardTitle}>{task.title[locale]}</span>
                    <span className={styles.cardBody}>{task.description[locale]}</span>
                    <span className={styles.meta}>
                      {chrome.minutes(task.minutes)} · {chrome.difficulties[task.difficulty]}
                    </span>
                    <span className={styles.meta}>{chrome.concepts}: {concepts}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Learn({
  chrome,
  locale,
  query,
  topicId,
}: {
  chrome: ReturnType<typeof guideChrome>
  locale: 'en' | 'pl'
  query: string
  topicId: string | null
}) {
  const topic = topicById(topicId)
  const needle = query.trim().toLowerCase()
  const topics = LEARNING_TOPICS.filter((item) => {
    if (!needle) return true
    const blob = `${item.title[locale]} ${item.summary[locale]} ${item.practical[locale]}`.toLowerCase()
    return blob.includes(needle)
  })
  return (
    <div className={styles.body}>
      <button type="button" className={styles.quiet} data-guide-focus="" onClick={() => dispatchGuide({ type: 'open-library' })}>
        {chrome.library}
      </button>
      <label className={styles.search}>
        <span className={styles.sr}>{chrome.search}</span>
        <input
          value={query}
          placeholder={chrome.search}
          aria-label={chrome.search}
          onChange={(event) => dispatchGuide({ type: 'set-query', query: event.target.value })}
        />
      </label>
      {topic ? (
        <article className={styles.topic}>
          <h2>{topic.title[locale]}</h2>
          <p>{topic.summary[locale]}</p>
          <h3>{chrome.levelPractical}</h3>
          <p>{topic.practical[locale]}</p>
          <h3>{chrome.levelTechnical}</h3>
          <p>{topic.technical[locale]}</p>
          <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'open-topic', id: null })}>
            {chrome.library}
          </button>
        </article>
      ) : (
        TOPIC_CATEGORIES.map((category) => {
          const items = topics.filter((item) => item.category === category)
          if (!items.length) return null
          return (
            <section key={category}>
              <h2 className={styles.cat}>{chrome.topicCategories[category]}</h2>
              <ul className={styles.cards}>
                {items.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={styles.card} onClick={() => dispatchGuide({ type: 'open-topic', id: item.id })}>
                      <span className={styles.cardTitle}>{item.title[locale]}</span>
                      <span className={styles.cardBody}>{item.summary[locale]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
      {!topic && topics.length === 0 ? <p>{chrome.searchEmpty}</p> : null}
    </div>
  )
}

function NeedSound({ chrome }: { chrome: ReturnType<typeof guideChrome> }) {
  const host = getGuideHost()
  return (
    <div className={styles.body}>
      <h2 data-guide-focus="" tabIndex={-1}>{chrome.needTitle}</h2>
      <p>{chrome.needBody}</p>
      <div className={styles.row}>
        <button type="button" className={styles.primary} onClick={() => host.loadSample()}>{chrome.loadSample}</button>
        <button type="button" className={styles.primary} onClick={() => host.loadDemo()}>{chrome.loadDemo}</button>
      </div>
    </div>
  )
}

function ModeAsk({
  chrome,
  locale,
  task,
}: {
  chrome: ReturnType<typeof guideChrome>
  locale: 'en' | 'pl'
  task: GuideTask
}) {
  const modeName = task.preferredMode === 'technical' ? chrome.modeTechnical : chrome.modeSimple
  return (
    <div className={styles.body}>
      <h2 tabIndex={-1} data-guide-focus="">{chrome.modeTitle}</h2>
      <p>{task.modeNote?.[locale]}</p>
      <div className={styles.row}>
        <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'stay-mode' })}>
          {chrome.modeStay}
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            if (task.preferredMode === 'simple' || task.preferredMode === 'technical') {
              getGuideHost().setMode(task.preferredMode)
            }
            dispatchGuide({ type: 'confirm-mode' })
          }}
        >
          {chrome.modeSwitch(modeName)}
        </button>
      </div>
    </div>
  )
}

function FocusAsk({ chrome, target }: { chrome: ReturnType<typeof guideChrome>; target: GuideTargetId | null }) {
  return (
    <div className={styles.body}>
      <h2 tabIndex={-1} data-guide-focus="">{chrome.focusTitle}</h2>
      <p>{chrome.focusBody}</p>
      <div className={styles.row}>
        <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'cancel-focus' })}>
          {chrome.focusStay}
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            getGuideHost().exitFocus()
            dispatchGuide({ type: 'cancel-focus' })
            if (target) window.setTimeout(() => reveal(target), 80)
          }}
        >
          {chrome.focusReveal}
        </button>
      </div>
    </div>
  )
}

function Done({
  chrome,
  locale,
  task,
}: {
  chrome: ReturnType<typeof guideChrome>
  locale: 'en' | 'pl'
  task: GuideTask
}) {
  return (
    <div className={styles.body}>
      <h2 tabIndex={-1} data-guide-focus="">{chrome.doneTitle}</h2>
      <p>{task.title[locale]}</p>
      <p>{chrome.doneBody}</p>
      <div className={styles.row}>
        <button type="button" className={styles.quiet} onClick={() => dispatchGuide({ type: 'restart' })}>{chrome.restart}</button>
        <button type="button" className={styles.primary} onClick={() => dispatchGuide({ type: 'open-library' })}>{chrome.library}</button>
      </div>
    </div>
  )
}

function TaskBody({
  chrome,
  locale,
  task,
  step,
  index,
  reason,
  advance,
  notice,
  autoAdvance,
  signalReady,
  onSkip,
  onBack,
}: {
  chrome: ReturnType<typeof guideChrome>
  locale: 'en' | 'pl'
  task: GuideTask
  step: NonNullable<ReturnType<typeof currentStep>>
  index: number
  reason: ReturnType<typeof readiness>
  advance: boolean
  notice: boolean
  autoAdvance: boolean
  signalReady: () => void
  onSkip: () => void
  onBack: () => void
}) {
  const [why, setWhy] = useState(false)
  const [more, setMore] = useState(false)
  const total = task.steps.length
  const label = chrome.step(index + 1, total)
  const status = reason === 'done' ? step.success?.[locale] : reason === 'already' ? chrome.already : ''
  return (
    <div className={styles.body}>
      <p className={styles.taskName}>{task.title[locale]}</p>
      <p className={styles.stepLabel}>{label}</p>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-valuetext={label}
      >
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <h2 tabIndex={-1} data-guide-focus="">{step.title[locale]}</h2>
      <p>{step.instruction[locale]}</p>
      {step.hint ? <p className={styles.hint}>{step.hint[locale]}</p> : null}
      {status ? <p className={styles.success}>{status}</p> : null}
      <span className={styles.sr} aria-live="polite">{status ? `${label}. ${status}` : `${label}. ${step.title[locale]}`}</span>
      {step.tryThis ? (
        <p className={styles.try}><strong>{chrome.tryThis}. </strong>{step.tryThis[locale]}</p>
      ) : null}
      <div className={styles.row}>
        {step.target ? (
          <button type="button" className={styles.primary} onClick={() => reveal(step.target!)}>
            {chrome.showMe}
          </button>
        ) : null}
        {step.why ? (
          <button type="button" className={styles.quiet} aria-expanded={why} onClick={() => setWhy((value) => !value)}>
            {why ? chrome.hide : chrome.why}
          </button>
        ) : null}
        {step.more || step.topics.length ? (
          <button type="button" className={styles.quiet} aria-expanded={more} onClick={() => setMore((value) => !value)}>
            {more ? chrome.hide : chrome.learnMore}
          </button>
        ) : null}
      </div>
      {why && step.why ? <p>{step.why[locale]}</p> : null}
      {more ? (
        <div className={styles.more}>
          {step.more ? <p>{step.more[locale]}</p> : null}
          {step.advanced ? (
            <>
              <h3>{chrome.levelTechnical}</h3>
              <p>{step.advanced[locale]}</p>
            </>
          ) : null}
          {step.topics.map((id) => {
            const topic = topicById(id)
            if (!topic) return null
            return (
              <button key={id} type="button" className={styles.link} onClick={() => dispatchGuide({ type: 'open-topic', id })}>
                {topic.title[locale]}
              </button>
            )
          })}
        </div>
      ) : null}
      {notice ? <p className={styles.hint}>{chrome.backKeeps}</p> : null}
      <div className={styles.nav}>
        <button type="button" className={styles.quiet} onClick={onBack} disabled={index === 0}>
          {chrome.back}
        </button>
        {step.skippable ? (
          <button type="button" className={styles.quiet} onClick={onSkip}>{chrome.skip}</button>
        ) : <span />}
        <button type="button" className={styles.primary} onClick={signalReady} disabled={!advance}>
          {chrome.next}
        </button>
      </div>
      <p className={styles.sr}>{chrome.backKeeps}</p>
      <label className={styles.auto}>
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(event) => dispatchGuide({ type: 'set-auto', value: event.target.checked })}
        />
        {chrome.autoAdvance}
      </label>
    </div>
  )
}

function reveal(target: GuideTargetId): void {
  const host = getGuideHost()
  if (host.focusActive && targetHiddenInFocus(target)) {
    dispatchGuide({ type: 'ask-focus' })
    return
  }
  host.revealTarget(target)
  window.setTimeout(() => {
    findGuideElement(target)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    window.dispatchEvent(new Event('field-guide-revealed'))
  }, 60)
}
