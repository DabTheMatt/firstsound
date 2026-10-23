import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import {
  clearFeedbackDraft,
  feedbackConfigured,
  feedbackIssues,
  readFeedbackDraft,
  readInterfaceMode,
  submitFeedback,
  writeFeedbackDraft,
  type FeedbackDraft,
  type FeedbackIssue,
  type SendResult,
} from './feedback'
import { IntroDialog } from './IntroDialog'
import { useIntroCopy } from './useIntroCopy'
import styles from './Intro.module.css'

type Props = {
  onClose: () => void
}

function issueCopy(issue: FeedbackIssue, copy: ReturnType<typeof useIntroCopy>): string {
  if (issue === 'email') return copy.errorEmail
  if (issue === 'length') return copy.errorLength
  return copy.errorEmpty
}

function failureCopy(reason: Exclude<SendResult, { ok: true }>['reason'], copy: ReturnType<typeof useIntroCopy>): string {
  if (reason === 'unconfigured') return copy.errorUnconfigured
  if (reason === 'rate') return copy.errorRate
  if (reason === 'busy') return copy.sending
  if (reason === 'activation') return copy.activationBody
  if (reason === 'rejected') return copy.errorRejected
  return copy.errorNetwork
}

export function FeedbackForm({ onClose }: Props) {
  const copy = useIntroCopy()
  const { locale } = useI18n()
  const titleId = useId()
  const leadId = useId()
  const errorId = useId()
  const impressionName = useId()
  const easeName = useId()
  const accessName = useId()
  const deviceName = useId()
  const difficultyId = useId()
  const noteId = useId()
  const ideasId = useId()
  const emailId = useId()
  const formId = useId()
  const [draft, setDraft] = useState<FeedbackDraft>(() => readFeedbackDraft())
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [activation, setActivation] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const configured = feedbackConfigured()

  useEffect(() => {
    if (done || activation) {
      if (formRef.current) formRef.current.scrollTop = 0
      titleRef.current?.focus()
    }
  }, [done, activation])

  const update = (patch: Partial<FeedbackDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch }
      writeFeedbackDraft(next)
      return next
    })
    setError(null)
  }

  const send = async () => {
    if (sending) return
    const issues = feedbackIssues(draft)
    if (issues.length) {
      setError(issues.map((issue) => issueCopy(issue, copy)).join(' '))
      return
    }
    setSending(true)
    setError(null)
    try {
      const result = await submitFeedback({
        draft,
        copy,
        locale,
        mode: readInterfaceMode(),
      })
      if (result.ok) {
        clearFeedbackDraft()
        setActivation(false)
        setDone(true)
        return
      }
      if (result.reason === 'activation') {
        setError(null)
        setActivation(true)
        return
      }
      setError(failureCopy(result.reason, copy))
    } finally {
      setSending(false)
    }
  }

  return (
    <IntroDialog titleId={titleId} describedBy={leadId} closeLabel={copy.cancel} onClose={onClose}>
      <form
        ref={formRef}
        id={formId}
        className={styles.body}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <h2 id={titleId} ref={titleRef} className={styles.title} tabIndex={-1} data-dialog-initial="">
          {done ? copy.thanksTitle : activation ? copy.activationTitle : copy.formTitle}
        </h2>
        {done ? (
          <p id={leadId} className={styles.lead} role="status" data-feedback-result="thanks">
            {copy.thanksBody}
          </p>
        ) : activation ? (
          <p id={leadId} className={styles.lead} role="status" data-feedback-result="activation">
            {copy.activationBody}
          </p>
        ) : (
          <>
            <p id={leadId} className={styles.lead}>
              {copy.formLead}
            </p>
            <p className={styles.hint}>{copy.formOptional}</p>
            {configured ? null : <p className={styles.status}>{copy.unconfiguredNote}</p>}
            <p className={styles.status}>{copy.privacyNote}</p>
            <fieldset className={styles.field}>
              <legend className={styles.legend}>{copy.qImpression}</legend>
              {copy.impressions.map((choice) => (
                <label key={choice.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={impressionName}
                    value={choice.id}
                    checked={draft.impression === choice.id}
                    onChange={() => update({ impression: choice.id })}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className={styles.field}>
              <legend className={styles.legend}>{copy.qEase}</legend>
              {copy.ease.map((choice) => (
                <label key={choice.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={easeName}
                    value={choice.id}
                    checked={draft.ease === choice.id}
                    onChange={() => update({ ease: choice.id })}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={difficultyId}>
                {copy.qDifficulty}
              </label>
              <textarea
                id={difficultyId}
                className={styles.text}
                value={draft.difficulty}
                placeholder={copy.difficultyPlaceholder}
                maxLength={500}
                onChange={(event) => update({ difficulty: event.target.value })}
              />
            </div>

            <fieldset className={styles.field}>
              <legend className={styles.legend}>{copy.qAccess}</legend>
              {copy.accessChoices.map((choice) => (
                <label key={choice.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={accessName}
                    value={choice.id}
                    checked={draft.access === choice.id}
                    onChange={() => update({ access: choice.id })}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </fieldset>

            {draft.access === 'yes' ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor={noteId}>
                  {copy.qAccessNote}
                </label>
                <textarea
                  id={noteId}
                  className={styles.text}
                  value={draft.accessNote}
                  maxLength={800}
                  onChange={(event) => update({ accessNote: event.target.value })}
                />
              </div>
            ) : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor={ideasId}>
                {copy.qIdeas}
              </label>
              <textarea
                id={ideasId}
                className={styles.text}
                value={draft.ideas}
                placeholder={copy.ideasPlaceholder}
                maxLength={1200}
                onChange={(event) => update({ ideas: event.target.value })}
              />
            </div>

            <fieldset className={styles.field}>
              <legend className={styles.legend}>{copy.qDevice}</legend>
              {copy.devices.map((choice) => (
                <label key={choice.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={deviceName}
                    value={choice.id}
                    checked={draft.device === choice.id}
                    onChange={() => update({ device: choice.id })}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={emailId}>
                {copy.email}
              </label>
              <p className={styles.hint} id={`${emailId}-hint`}>
                {copy.emailHint}
              </p>
              <input
                id={emailId}
                className={styles.mail}
                type="text"
                inputMode="email"
                autoComplete="email"
                value={draft.email}
                maxLength={200}
                aria-describedby={`${emailId}-hint`}
                onChange={(event) => update({ email: event.target.value })}
              />
            </div>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.includeTech}
                onChange={(event) => update({ includeTech: event.target.checked })}
              />
              <span>{copy.techLabel}</span>
            </label>

            <div className={styles.trap} inert>
              <label>
                Company
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={draft.company}
                  name="company"
                  onChange={(event) => update({ company: event.target.value })}
                />
              </label>
            </div>
          </>
        )}
      </form>
      <div className={styles.footer}>
        {error && !done && !activation ? (
          <p id={errorId} className={`${styles.alert} ${styles.footerAlert}`} role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <button type="button" className={`${styles.primary} ${styles.grow}`} onClick={onClose}>
            {copy.close}
          </button>
        ) : (
          <>
            <button type="submit" form={formId} className={`${styles.primary} ${styles.grow}`} disabled={sending} aria-busy={sending}>
              {sending ? copy.sending : copy.submit}
            </button>
            <button type="button" className={`${styles.quiet} ${styles.grow}`} onClick={onClose}>
              {copy.cancel}
            </button>
          </>
        )}
      </div>
    </IntroDialog>
  )
}
