import { useMemo, useState } from 'react'
import { FIELD_VERSION } from '../../version'
import { useI18n } from '../../i18n'
import { MANUAL } from '../../manual/content'
import styles from './ManualDialog.module.css'

type Props = {
  onClose: () => void
}

export function ManualDialog({ onClose }: Props) {
  const { locale } = useI18n()
  const copy = MANUAL[locale]
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(copy.sections[0]?.id ?? '')
  const needle = query.trim().toLowerCase()
  const sections = useMemo(() => {
    if (!needle) return copy.sections
    return copy.sections.filter((section) => {
      const hay = `${section.title} ${section.body.join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [copy.sections, needle])
  const current = sections.find((section) => section.id === active) ?? sections[0]

  return (
    <div className={styles.layer} role="presentation">
      <button type="button" className={styles.scrim} aria-label={copy.close} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={copy.title}>
        <header className={styles.head}>
          <h2>FIELD v{FIELD_VERSION}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close}>
            ×
          </button>
        </header>
        <input
          className={styles.search}
          value={query}
          placeholder={copy.search}
          aria-label={copy.search}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.body}>
          <nav className={styles.nav} aria-label={copy.title}>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === current?.id ? styles.navOn : undefined}
                onClick={() => setActive(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>
          <article className={styles.read}>
            {current ? (
              <>
                <h3>{current.title}</h3>
                {current.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </>
            ) : (
              <p>{copy.empty}</p>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
