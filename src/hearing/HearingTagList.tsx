import { engine } from '../hooks/useEngine'
import { useI18n } from '../i18n'
import { hearingUi } from '../i18n/hearingUi'
import { previewDetectedTone } from './tonePreview'
import type { Descriptor } from './descriptors'
import styles from './HearingAccessLayer.module.css'

export function HearingTagList({ tags }: { tags: Descriptor[] }) {
  const copy = hearingUi(useI18n().locale)
  return (
    <ul className={styles.chips} aria-label={copy.tagsAria}>
      {tags.map((item) => {
        const label = copy.tag(item.id, item.label)
        return (
          <li key={`${item.id}:${item.label}`} data-tag={item.id} title={copy.detail(item.detail)}>
            {item.id === 'tone' && item.hz ? (
              <button
                type="button"
                aria-label={copy.playTag(label)}
                onClick={(event) => {
                  event.stopPropagation()
                  const hz = item.hz ?? 0
                  void engine.unlock()
                  previewDetectedTone(hz, engine.getLiveContext())
                }}
              >
                {label}
              </button>
            ) : (
              label
            )}
          </li>
        )
      })}
    </ul>
  )
}
