import type { ReactNode } from 'react'
import styles from './Intro.module.css'

const TOKEN = /\{(focus|plus|trash|dots|power|ear|mail)\}/g

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
        if (part === 'ear') return <EarGlyph key={index} />
        if (part === 'mail') return <MailGlyph key={index} />
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

function EarGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10 12.2c-.4-3.2.6-6.6 3.8-7.6 3.6-1.1 6.8 1.2 7 5.2.2 4-1 7-3.4 9.2-1.8 1.6-4 3-6 2-1.8-.9-1.6-3-.6-4.2-1.8-.8-2.4-2.6-1.2-4.6z M12.4 8.6c1.6-.6 3.2.4 3 2.2-.2 1.6-1.6 2.2-2.4 3.2-.6.8-.4 2 .4 2.6-1 .4-1.8-.6-1.4-1.8.4-1.2 1.6-2 1.4-3.4-.2-1.2-1-1.8-1.8-1.4-.2.6-.8 1-1.4.6.2-1 .8-1.6 1.2-2z"
      />
    </svg>
  )
}

function MailGlyph() {
  return (
    <Frame>
      <path
        d="M2.6 4.6h10.8v7.2H2.6zM2.6 4.6l5.4 4.2 5.4-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
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
