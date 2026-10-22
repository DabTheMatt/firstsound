import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { peekTrigger, restoreTrigger } from '../a11y/dialogFocus'
import { FeedbackForm } from './FeedbackForm'
import { HelpPanel } from './HelpPanel'
import { closeIntro, getIntroState, openIntro, subscribeIntro } from './session'
import { markWelcomeSeen, shouldShowWelcome } from './storage'
import { TourPanel } from './TourPanel'
import { WelcomePanel } from './WelcomePanel'

function releaseFocus(): void {
  if (peekTrigger('intro')) {
    restoreTrigger('intro', '[data-intro-help], [data-settings-toggle]')
    return
  }
  document.querySelector<HTMLElement>('[data-intro-help], [data-settings-toggle]')?.focus()
}

export function IntroHost() {
  const state = useSyncExternalStore(subscribeIntro, getIntroState, getIntroState)

  useEffect(() => {
    if (shouldShowWelcome() && getIntroState().surface === 'closed') openIntro('welcome')
  }, [])

  const close = () => {
    if (getIntroState().surface === 'welcome') markWelcomeSeen(false)
    closeIntro()
    releaseFocus()
  }

  if (state.surface === 'closed' || typeof document === 'undefined') return null

  const panel =
    state.surface === 'welcome' ? (
      <WelcomePanel onClose={close} />
    ) : state.surface === 'tour' ? (
      <TourPanel
        step={state.step}
        onClose={close}
        onDone={close}
        onFeedback={() => openIntro('feedback')}
      />
    ) : state.surface === 'help' ? (
      <HelpPanel onClose={close} />
    ) : (
      <FeedbackForm onClose={close} />
    )

  return createPortal(panel, document.body)
}
