import type { ReactNode } from 'react'
import styles from './Intro.module.css'

const TOKEN = /\{(focus|plus|trash|dots|power)\}/g

/** Inline picture of a control the sentence names. Decorative: the words stay around it. */
export function HelpRich({ text }: { text: string }) {
  const parts = text.split(TOKEN)
  return (
    <>
      {parts.map((part, index) => {
        if (part === 'focus') return <FocusGlyph key={index} />
        if (part === 'plus') return <PlusGlyph key={index} />
        if (part === 'trash') return <TrashGlyph key={index} />
        if (part === 'dots') return <DotsGlyph key={index} />
        if (part === 'power') return <PowerGlyph key={index} />
        return part
      })}
    </>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true">
      {children}
    </svg>
  )
}

function FocusGlyph() {
  return (
    <Frame>
      <path
        d="M3 6.5V3.5H6M10 3.5h3V6.5M13 9.5v3H10M6 12.5H3V9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

function PlusGlyph() {
  return (
    <Frame>
      <path d="M8 3.2v9.6M3.2 8h9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Frame>
  )
}

function TrashGlyph() {
  return (
    <Frame>
      <path
        d="M3.2 4.5h9.6M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.2h6l.6-8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Frame>
  )
}

function PowerGlyph() {
  return (
    <Frame>
      <path d="M8 2.5v5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.15 4.35a4.2 4.2 0 1 0 5.7 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Frame>
  )
}

function DotsGlyph() {
  return (
    <Frame>
      <circle cx="3.2" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="12.8" cy="8" r="1.15" fill="currentColor" />
    </Frame>
  )
}
