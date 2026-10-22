import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { useI18n } from '../i18n'
import { formatCombo, SHORTCUTS, shortcutPlatform } from '../a11y/shortcuts/registry'
import { requestIntroCommand, type IntroCommand } from './commands'
import { getHelpPlace, helpTopic, readHelpScope, subscribeHelpPlace, writeHelpScope, type HelpScope } from './context'
import { closeIntro, openIntro, setIntroPinned } from './session'
import { IntroDialog } from './IntroDialog'
import { useIntroCopy } from './useIntroCopy'
import styles from './Intro.module.css'

const SHORT_KEYS = ['transport.play', 'transport.stop', 'transport.loop', 'edit.undo', 'help.explain', 'nav.help'] as const

type Props = {
  onClose: () => void
}

function handoff(command: IntroCommand): void {
  closeIntro()
  requestIntroCommand(command)
}

export function HelpPanel({ onClose }: Props) {
  const copy = useIntroCopy()
  const { t } = useI18n()
  const titleId = useId()
  const scopeName = useId()
  const place = useSyncExternalStore(subscribeHelpPlace, getHelpPlace, getHelpPlace)
  const [scope, setScope] = useState<HelpScope>(() => readHelpScope())
  const platform = shortcutPlatform()
  const shortcuts = SHORT_KEYS.flatMap((id) => {
    const item = SHORTCUTS.find((entry) => entry.id === id)
    if (!item) return []
    return [{ id, combo: formatCombo(item.combo, platform), label: t.keyboard.byId[id] ?? id }]
  })
  const topic = copy.topics[helpTopic(place)]

  const choose = (next: HelpScope) => {
    setScope(next)
    writeHelpScope(next)
    setIntroPinned(next === 'context')
  }

  useEffect(() => {
    if (readHelpScope() === 'context') setIntroPinned(true)
  }, [])

  return (
    <IntroDialog titleId={titleId} closeLabel={copy.close} wide onClose={onClose}>
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title} tabIndex={-1} data-dialog-initial="">
          {copy.helpTitle}
        </h2>
        <div className={styles.scope} role="radiogroup" aria-label={copy.scopeLabel}>
          <label className={styles.scopeOption}>
            <input type="radio" name={scopeName} checked={scope === 'context'} onChange={() => choose('context')} />
            <span>{copy.scopeContext}</span>
          </label>
          <label className={styles.scopeOption}>
            <input type="radio" name={scopeName} checked={scope === 'general'} onChange={() => choose('general')} />
            <span>{copy.scopeGeneral}</span>
          </label>
        </div>
        {scope === 'context' ? (
          <section className={styles.section} aria-labelledby="intro-help-topic" data-help-topic={helpTopic(place)}>
            <h3 id="intro-help-topic">{topic.title}</h3>
            {topic.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {topic.points ? (
              <ul className={styles.points}>
                {topic.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        {scope === 'general' ? <div className={styles.sections}>
          {copy.helpSections.map((section) => (
            <section key={section.id} className={styles.section} aria-labelledby={`intro-help-${section.id}`}>
              <h3 id={`intro-help-${section.id}`}>{section.title}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.id === 'intro' ? (
                <div className={styles.sectionActions}>
                  <button type="button" className={styles.quiet} onClick={() => openIntro('welcome')}>
                    {copy.replayWelcome}
                  </button>
                </div>
              ) : null}
              {section.id === 'guide' ? (
                <div className={styles.sectionActions}>
                  <button type="button" className={styles.quiet} onClick={() => openIntro('tour')}>
                    {copy.replayTour}
                  </button>
                  <button type="button" className={styles.quiet} onClick={() => handoff('guided')}>
                    {copy.openGuided}
                  </button>
                  <button type="button" className={styles.quiet} onClick={() => handoff('manual')}>
                    {copy.openManual}
                  </button>
                </div>
              ) : null}
              {section.id === 'access' ? (
                <div className={styles.sectionActions}>
                  <button type="button" className={styles.quiet} onClick={() => handoff('access')}>
                    {copy.openAccess}
                  </button>
                </div>
              ) : null}
              {section.id === 'keys' ? (
                <>
                  <ul className={styles.keys}>
                    {shortcuts.map((item) => (
                      <li key={item.id}>
                        <span>{item.label}</span>
                        <kbd>{item.combo}</kbd>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.sectionActions}>
                    <button type="button" className={styles.quiet} onClick={() => handoff('keyboard')}>
                      {copy.openKeys}
                    </button>
                  </div>
                </>
              ) : null}
              {section.id === 'status' ? (
                <div className={styles.sectionActions}>
                  <button type="button" className={styles.quiet} onClick={() => openIntro('feedback')}>
                    {copy.sendFeedback}
                  </button>
                </div>
              ) : null}
            </section>
          ))}
        </div> : null}
      </div>
      <div className={styles.footer}>
        <button type="button" className={`${styles.primary} ${styles.grow}`} onClick={onClose}>
          {copy.close}
        </button>
      </div>
    </IntroDialog>
  )
}
