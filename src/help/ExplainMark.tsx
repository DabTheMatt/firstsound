import { useSyncExternalStore } from 'react'
import { useI18n } from '../i18n'
import styles from './ExplainHost.module.css'
import { helpChrome } from './chrome'
import { rememberedExplainId, getExplainSession, openExplain, subscribeExplain } from './session'

type Props = {
  fallback: string
}

export function ExplainMark({ fallback }: Props) {
  const { locale } = useI18n()
  const chrome = helpChrome(locale)
  const session = useSyncExternalStore(subscribeExplain, getExplainSession, () => null)
  return (
    <button
      type="button"
      className={styles.mark}
      data-explain-mark=""
      data-explain-fallback={fallback}
      aria-keyshortcuts="F1"
      aria-haspopup="true"
      aria-expanded={session?.id === fallback}
      aria-controls={session ? 'field-explain-popover' : undefined}
      aria-label={chrome.explain}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const scope = event.currentTarget.closest('[data-explain-scope]')
        const id = rememberedExplainId(scope) ?? fallback
        openExplain(id, event.currentTarget)
      }}
    >
      <span aria-hidden="true">ⓘ</span>
    </button>
  )
}
