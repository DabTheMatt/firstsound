/**
 * The welcome screen is offered once per page load.
 * Changing Simple, Technical, or Sensory remounts the host. That must not open the welcome again.
 */
let offered = false

export function claimStartupWelcome(): boolean {
  if (offered) return false
  offered = true
  return true
}

export function resetStartupWelcome(): void {
  offered = false
}
