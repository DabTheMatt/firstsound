import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { announce } from '../a11y/liveRegion'
import { isTypingTarget } from '../a11y/keyboard'
import { useI18n } from '../i18n'
import { explainIdFrom } from './bind'
import { helpChrome } from './chrome'
import styles from './ExplainHost.module.css'
import { readHelpLevel, writeHelpLevel, type HelpLevel } from './level'
import { requestManual } from './manual'
import { placeExplainPanel } from './place'
import { resolveHelp } from './resolve'
import {
  closeExplain,
  getExplainSession,
  openExplain,
  rememberExplainTarget,
  rememberedExplainId,
  subscribeExplain,
} from './session'

function useSnapshot<T>(read: () => T): T {
  return useSyncExternalStore(subscribeExplain, read, () => null as T)
}

export function ExplainHost() {
  const { locale } = useI18n()
  const chrome = helpChrome(locale)
  const session = useSnapshot(getExplainSession)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [level, setLevel] = useState<HelpLevel>(() => readHelpLevel())
  const sessionId = session?.id ?? ''
  const [detailsState, setDetailsState] = useState({ sessionId, level, open: level === 'technical' })
  if (detailsState.sessionId !== sessionId || detailsState.level !== level) {
    setDetailsState({ sessionId, level, open: level === 'technical' })
  }
  const detailsOpen = detailsState.open
  const [box, setBox] = useState<ReturnType<typeof placeExplainPanel> | null>(null)
  const help = session ? resolveHelp(session.id, locale) : null

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-explain-popover], [data-explain-mark]')) return
      const found = explainIdFrom(event.target)
      if (!found) return
      if (!resolveHelp(found.id, locale)) return
      rememberExplainTarget(found.id, found.anchor)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && getExplainSession()) {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeExplain()
        return
      }
      if (event.key === 'F1') {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (event.target instanceof Element && event.target.hasAttribute('data-explain-mark')) {
          const fallback = event.target.getAttribute('data-explain-fallback')
          const scope = event.target.closest('[data-explain-scope]')
          const id = rememberedExplainId(scope) ?? fallback
          if (!id) {
            announce(helpChrome(locale).missing)
            return
          }
          openExplain(id, event.target as HTMLElement)
          return
        }
        const found = explainIdFrom(event.target)
        if (!found) {
          announce(helpChrome(locale).missing)
          return
        }
        openExplain(found.id, found.anchor)
        return
      }
      if (event.key !== 'Tab' || !getExplainSession()) return
      const pop = document.getElementById('field-explain-popover')
      const active = document.activeElement
      if (!(pop instanceof HTMLElement) || !(active instanceof HTMLElement)) return
      const items = [...pop.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary')].filter(
        (el) => !el.hasAttribute('disabled'),
      )
      const first = items[0]
      const last = items[items.length - 1]
      const current = getExplainSession()
      if (!event.shiftKey && current && (active === current.anchor || current.anchor.contains(active)) && first) {
        event.preventDefault()
        event.stopPropagation()
        first.focus()
        return
      }
      if (event.shiftKey && active === first && current) {
        event.preventDefault()
        event.stopPropagation()
        current.anchor.focus()
        return
      }
      if (!event.shiftKey && active === last && first) {
        event.preventDefault()
        event.stopPropagation()
        first.focus()
      }
    }
    document.addEventListener('focusin', onFocus)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('focusin', onFocus)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [locale])

  useEffect(() => {
    if (!session) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-explain-mark]')) return
      closeExplain()
    }
    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [session])

  useLayoutEffect(() => {
    const place = () => {
      const viewport = { width: window.innerWidth, height: window.innerHeight }
      if (session?.anchor.isConnected && panelRef.current) {
        setBox(
          placeExplainPanel(
            session.anchor.getBoundingClientRect(),
            viewport,
            panelRef.current.scrollHeight,
          ),
        )
      }
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [session, help?.summary, level, detailsOpen, locale])

  const chooseLevel = (next: HelpLevel) => {
    setLevel(next)
    writeHelpLevel(next)
    announce(chrome.levelChanged(next === 'technical' ? chrome.technical : chrome.basic))
  }

  const panel =
    session && help ? (
      <div
        ref={panelRef}
        id="field-explain-popover"
        className={box?.sheet ? `${styles.panel} ${styles.sheet}` : styles.panel}
        role="region"
        aria-labelledby={titleId}
        data-explain-popover=""
        data-help-level={level}
        style={
          box
            ? { top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }
            : { top: 8, left: 8, width: Math.min(320, window.innerWidth - 16), maxHeight: 320 }
        }
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {help.title}
          </h2>
          <button type="button" className={styles.close} onClick={() => closeExplain()}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">{chrome.close}</span>
          </button>
        </div>
        <div className={styles.levels} role="radiogroup" aria-label={chrome.level}>
          <button
            type="button"
            role="radio"
            className={styles.level}
            aria-checked={level === 'basic'}
            onClick={() => chooseLevel('basic')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                chooseLevel('technical')
              }
            }}
          >
            {level === 'basic' ? '✓ ' : ''}
            {chrome.basic}
          </button>
          <button
            type="button"
            role="radio"
            className={styles.level}
            aria-checked={level === 'technical'}
            onClick={() => chooseLevel('technical')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                chooseLevel('basic')
              }
            }}
          >
            {level === 'technical' ? '✓ ' : ''}
            {chrome.technical}
          </button>
        </div>
        <p className={styles.summary}>{level === 'technical' && help.technical ? help.technical : help.summary}</p>
        {help.practical ? (
          <p className={styles.practical}>
            <span className={styles.kicker}>{chrome.practical}</span>
            {help.practical}
          </p>
        ) : null}
        <details
          className={styles.details}
          open={detailsOpen}
          onToggle={(event) => setDetailsState((current) => ({ ...current, open: event.currentTarget.open }))}
        >
          <summary>{chrome.details}</summary>
          {help.facts.map((fact) => (
            <p key={fact.label} className={styles.fact}>
              <span className={styles.kicker}>{fact.label}</span>
              {fact.value}
            </p>
          ))}
          {level === 'basic' && help.technical ? <p className={styles.technical}>{help.technical}</p> : null}
          {level === 'technical' ? <p className={styles.technical}>{help.summary}</p> : null}
        </details>
        {help.shortcuts.length ? (
          <div>
            {help.shortcuts.map((item) => (
              <p key={item.id} className={styles.shortcut}>
                <span className={styles.kicker}>{chrome.shortcut}</span>
                {item.combo}. {item.label}
              </p>
            ))}
          </div>
        ) : null}
        {help.manualId ? (
          <button
            type="button"
            className={styles.manual}
            onClick={() => {
              const sectionId = help.manualId
              if (!sectionId) return
              closeExplain()
              requestManual(sectionId)
            }}
          >
            {chrome.manual}
          </button>
        ) : null}
      </div>
    ) : null

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}
