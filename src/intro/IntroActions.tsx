import { useSyncExternalStore } from 'react'
import { rememberTrigger } from '../a11y/dialogFocus'
import { helpClicksOn, setHelpClicks, subscribeHelpClicks } from './helpClick'
import { EnvelopeIcon } from './icons'
import { openIntro } from './session'
import { readIntroRecord, setWelcomeAtStartup, subscribeIntroRecord } from './storage'
import { useIntroCopy } from './useIntroCopy'
import styles from './IntroActions.module.css'

type Surface = 'help' | 'feedback'

function openFromTrigger(surface: Surface): void {
  rememberTrigger('intro')
  openIntro(surface)
}

type HeaderProps = {
  labeled?: boolean
  className?: string
}

export function IntroActions({ labeled = false, className }: HeaderProps) {
  const copy = useIntroCopy()
  return (
    <div className={`${styles.slot} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.help}
        data-intro-help=""
        aria-label={copy.helpLabel}
        title={copy.helpLabel}
        onClick={() => openFromTrigger('help')}
      >
        <span className={styles.mark} aria-hidden="true">
          ?
        </span>
        {labeled ? <span>{copy.helpWord}</span> : null}
      </button>
      <button
        type="button"
        className={styles.mail}
        data-intro-feedback=""
        aria-label={copy.feedbackLabel}
        title={copy.feedbackTooltip}
        onClick={() => openFromTrigger('feedback')}
      >
        <EnvelopeIcon />
      </button>
    </div>
  )
}

type MenuProps = {
  onOpen: (surface: Surface) => void
}

type StartupProps = {
  onShow: () => void
}

export function WelcomeStartupControl({ onShow }: StartupProps) {
  const copy = useIntroCopy()
  const on = useSyncExternalStore(subscribeIntroRecord, () => !readIntroRecord().suppress, () => true)
  return (
    <label className={styles.menuCheck}>
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          const next = event.target.checked
          setWelcomeAtStartup(next)
          if (next) onShow()
        }}
      />
      <span>{copy.welcomeStartup}</span>
    </label>
  )
}

/** Settings mark. Checked while a parameter click opens help. */
export function HelpClickControl() {
  const copy = useIntroCopy()
  const on = useSyncExternalStore(subscribeHelpClicks, helpClicksOn, () => true)
  return (
    <label className={styles.menuCheck}>
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => setHelpClicks(event.target.checked)}
      />
      <span>{on ? copy.helpOn : copy.helpOff}</span>
    </label>
  )
}

export function IntroMenuButtons({ onOpen }: MenuProps) {
  const copy = useIntroCopy()
  return (
    <>
      <button type="button" className={styles.menuItem} data-intro-menu="help" onClick={() => onOpen('help')}>
        <span className={styles.mark} aria-hidden="true">
          ?
        </span>
        {copy.helpMenu}
      </button>
      <button type="button" className={styles.menuItem} data-intro-menu="feedback" onClick={() => onOpen('feedback')}>
        <EnvelopeIcon className={styles.menuIcon} />
        {copy.feedbackTooltip}
      </button>
    </>
  )
}
