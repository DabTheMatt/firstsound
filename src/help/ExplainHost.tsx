import { useEffect } from 'react'
import { announce } from '../a11y/liveRegion'
import { isTypingTarget } from '../a11y/keyboard'
import { useI18n } from '../i18n'
import { publishHelpDetail } from '../intro/context'
import { openContextualHelp } from '../intro/openContextual'
import { explainIdFrom } from './bind'
import { helpChrome } from './chrome'
import { closeExplain, getExplainSession } from './session'

/**
 * F1 used to open a separate parameter card. That text now lives in contextual help.
 * Escape still closes a card if one was left open by an older session.
 */
export function ExplainHost() {
  const { locale } = useI18n()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && getExplainSession()) {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeExplain()
        return
      }
      if (event.key !== 'F1') return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      const found = explainIdFrom(event.target)
      if (!found) {
        announce(helpChrome(locale).missing)
        return
      }
      publishHelpDetail(found.id)
      openContextualHelp()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [locale])

  return null
}
