export type StandaloneLookup = {
  standalone?: boolean
}

export type MediaQueryListLike = {
  matches: boolean
}

export function isStandalonePreview(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(query).get('pwa') === '1'
}

export function isStandaloneDisplay(
  nav: StandaloneLookup,
  matchMedia: (query: string) => MediaQueryListLike,
  search = '',
): boolean {
  if (isStandalonePreview(search)) return true
  if (nav.standalone) return true
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: minimal-ui)').matches
  )
}
