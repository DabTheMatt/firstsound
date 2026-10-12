export const OPEN_MANUAL_EVENT = 'field-open-manual'

export function requestManual(sectionId: string): void {
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(OPEN_MANUAL_EVENT, { detail: { sectionId } }))
}
