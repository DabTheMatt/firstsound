import { engine } from '../hooks/useEngine'
import { previewDetectedTone } from './tonePreview'
import type { Descriptor } from './descriptors'
import styles from './HearingAccessLayer.module.css'

export function HearingTagList({ tags }: { tags: Descriptor[] }) {
  return (
    <ul className={styles.chips} aria-label="Hearing tags">
      {tags.map((item) => (
        <li key={`${item.id}:${item.label}`} data-tag={item.id} title={item.detail}>
          {item.id === 'tone' && item.hz ? (
            <button
              type="button"
              aria-label={`Play ${item.label}`}
              onClick={(event) => {
                event.stopPropagation()
                const hz = item.hz ?? 0
                void engine.unlock()
                previewDetectedTone(hz, engine.getLiveContext())
              }}
            >
              {item.label}
            </button>
          ) : (
            item.label
          )}
        </li>
      ))}
    </ul>
  )
}
