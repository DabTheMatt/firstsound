import { useId } from 'react'
import { markWelcomeSeen } from './storage'
import { openIntro } from './session'
import { IntroDialog } from './IntroDialog'
import { useIntroCopy } from './useIntroCopy'
import styles from './Intro.module.css'

type Props = {
  onClose: () => void
}

export function WelcomePanel({ onClose }: Props) {
  const copy = useIntroCopy()
  const titleId = useId()
  const leadId = useId()

  const start = (suppress: boolean) => {
    markWelcomeSeen(suppress)
    onClose()
  }

  return (
    <IntroDialog titleId={titleId} describedBy={leadId} closeLabel={copy.start} onClose={() => start(false)}>
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title} tabIndex={-1} data-dialog-initial="">
          {copy.welcomeTitle}
        </h2>
        <p id={leadId} className={styles.lead}>
          {copy.welcomeLead}
        </p>
        {copy.welcomeBody.map((paragraph) => (
          <p key={paragraph} className={styles.copy}>
            {paragraph}
          </p>
        ))}
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.quiet} ${styles.grow}`}
          onClick={() => {
            markWelcomeSeen(false)
            openIntro('tour')
          }}
        >
          {copy.discover}
        </button>
        <button type="button" className={`${styles.primary} ${styles.grow}`} onClick={() => start(false)}>
          {copy.start}
        </button>
      </div>
      <div className={styles.dismissRow}>
        <button type="button" className={styles.dismiss} onClick={() => start(true)}>
          {copy.dismiss}
        </button>
      </div>
    </IntroDialog>
  )
}
