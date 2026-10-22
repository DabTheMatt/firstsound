import { useEffect, useId, useSyncExternalStore } from 'react'
import { useI18n } from '../i18n'
import { paramLabel } from '../i18n/messages'
import { formatCombo, SHORTCUTS, shortcutPlatform } from '../a11y/shortcuts/registry'
import { resolveHelp } from '../help/resolve'
import { requestIntroCommand, type IntroCommand } from './commands'
import {
  getHelpDetail,
  getHelpPlace,
  helpSubject,
  helpTopic,
  readHelpScope,
  subscribeHelpDetail,
  subscribeHelpPlace,
  subscribeHelpScope,
  writeHelpScope,
  type HelpScope,
} from './context'
import { effectParamIds, moduleNoteId } from './effectHelp'
import { closeIntro, openIntro, setIntroPinned } from './session'
import { HelpRich } from './helpRich'
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
  const { t, locale } = useI18n()
  const titleId = useId()
  const scopeName = useId()
  const place = useSyncExternalStore(subscribeHelpPlace, getHelpPlace, getHelpPlace)
  const scope = useSyncExternalStore(subscribeHelpScope, readHelpScope, readHelpScope)
  const detailId = useSyncExternalStore(subscribeHelpDetail, getHelpDetail, () => null)
  const platform = shortcutPlatform()
  const shortcuts = SHORT_KEYS.flatMap((id) => {
    const item = SHORTCUTS.find((entry) => entry.id === id)
    if (!item) return []
    return [{ id, combo: formatCombo(item.combo, platform), label: t.keyboard.byId[id] ?? id }]
  })
  const topicId = helpTopic(place)
  const topic = copy.topics[topicId]
  const subject = helpSubject(place)
  const moduleNote = subject ? resolveHelp(moduleNoteId(subject), locale) : null
  const params = subject ? effectParamIds(subject) : []
  const detail = detailId ? resolveHelp(detailId, locale) : null
  const known = new Set<string>([...topic.body, ...(topic.points ?? [])])
  const extra = [moduleNote?.summary, moduleNote?.practical, moduleNote?.technical].filter(
    (paragraph): paragraph is string => typeof paragraph === 'string' && paragraph.length > 0 && !known.has(paragraph),
  )

  const choose = (next: HelpScope) => {
    writeHelpScope(next)
    setIntroPinned(next === 'context')
  }

  useEffect(() => {
    if (readHelpScope() === 'context') setIntroPinned(true)
  }, [])

  const scopeSwitch = (
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
  )

  return (
    <IntroDialog titleId={titleId} closeLabel={copy.close} wide leading={scopeSwitch} onClose={onClose}>
      <div className={`${styles.body} ${styles.helpBody}`}>
        <h2 id={titleId} className={styles.topicTitle} tabIndex={-1} data-dialog-initial="">
          {scope === 'context' ? topic.title : copy.scopeGeneral}
        </h2>
        {scope === 'context' ? (
          <section className={styles.section} aria-labelledby={titleId} data-help-topic={topicId}>
            {detail ? (
              <section className={styles.paramNote} data-help-param={detail.id} aria-labelledby="intro-help-param">
                <h3 id="intro-help-param">{detail.title}</h3>
                <p>{detail.summary}</p>
                {detail.practical ? <p>{detail.practical}</p> : null}
                {detail.technical ? <p>{detail.technical}</p> : null}
                {detail.facts.length ? (
                  <ul className={styles.points}>
                    {detail.facts.map((fact) => (
                      <li key={fact.label}>
                        {fact.label}: {fact.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : (
              <>
            {topic.body.map((paragraph) => (
              <p key={paragraph}>
                <HelpRich text={paragraph} />
              </p>
            ))}
            {topic.points ? (
              <ul className={styles.points}>
                {topic.points.map((point) => (
                  <li key={point}>
                    <HelpRich text={point} />
                  </li>
                ))}
              </ul>
            ) : null}
            {extra.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {params.length ? (
              <>
                <h3 className={styles.paramHeading}>{copy.parametersHeading}</h3>
                <ul className={styles.points}>
                  {params.map((id) => {
                    const note = resolveHelp(id, locale)
                    const line = note?.practical ?? note?.summary
                    return (
                      <li key={id}>
                        <strong>{paramLabel(locale, id)}. </strong>
                        {line}
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : null}
              </>
            )}
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
