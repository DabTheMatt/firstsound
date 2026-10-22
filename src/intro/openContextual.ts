import { writeHelpScope } from './context'
import { getIntroState, openIntro, setIntroPinned } from './session'

/** Opens the floating contextual card. An open general card switches back. */
export function openContextualHelp(): void {
  writeHelpScope('context')
  if (getIntroState().surface !== 'help') openIntro('help')
  setIntroPinned(true)
}
