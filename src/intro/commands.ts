export const INTRO_COMMAND_EVENT = 'field-intro-command'

export type IntroCommand = 'access' | 'keyboard' | 'manual' | 'guided'

/** Asks the app shell to open an existing surface. Does not touch audio. */
export function requestIntroCommand(command: IntroCommand): void {
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(INTRO_COMMAND_EVENT, { detail: command }))
}
