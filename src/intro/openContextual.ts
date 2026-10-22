import { helpClicksOn } from './helpClick'
import { writeHelpScope } from './context'
import { getIntroState, openIntro, setIntroPinned } from './session'

/** Opens the floating contextual card. An open general card switches back. */
export function openContextualHelp(): void {
  writeHelpScope('context')
  if (getIntroState().surface !== 'help') openIntro('help')
  setIntroPinned(true)
}

export const HELP_AFFORDANCE = 'field-help-affordance'

/** Asks the app to open contextual help for an LFO or random icon. */
export function openAffordanceHelp(id: string): void {
  if (!helpClicksOn()) return
  document.dispatchEvent(new CustomEvent(HELP_AFFORDANCE, { detail: id }))
}
