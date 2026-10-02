/** UI hook so Random actions can push one DSP undo step without a React timer. */
let runner: ((apply: () => void) => void) | null = null

export function setRandomHistoryRunner(next: ((apply: () => void) => void) | null): void {
  runner = next
}

export function withRandomHistory(apply: () => void): void {
  if (runner) runner(apply)
  else apply()
}
