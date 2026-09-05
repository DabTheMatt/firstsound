export type StandaloneLookup = {
  standalone?: boolean
}

export type MediaQueryListLike = {
  matches: boolean
}

export function isStandaloneDisplay(
  nav: StandaloneLookup,
  matchMedia: (query: string) => MediaQueryListLike,
): boolean {
  if (nav.standalone) return true
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: minimal-ui)').matches
  )
}
