import { previewDetectedTone } from './tonePreview'
import type { Descriptor } from './descriptors'
import styles from './HearingAccessLayer.module.css'

export function HearingTagList({ tags }: { tags: Descriptor[] }) {
  return (
    <ul className={styles.chips} aria-label="Hearing tags">
      {tags.map((item) => (
        <li key={`${item.id}:${item.label}`} data-tag={item.id} title={item.detail}>
          {item.id === 'tone' && item.hz ? (
            <button type="button" onClick={() => previewDetectedTone(item.hz ?? 0)} aria-label={`Play ${item.label}`}>
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
