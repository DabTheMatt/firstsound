export function DiceIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5" cy="5" r="1" fill="currentColor" />
      <circle cx="11" cy="5" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="5" cy="11" r="1" fill="currentColor" />
      <circle cx="11" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}

/** Cog. The previous mark was a sun and read as a sparkle, not settings. */
export function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        d="M6.15 1.55h3.7l.4 1.45.95.4 1.2-1.05 1.85 1.85-1.05 1.2.4.95 1.45.4v3.7l-1.45.4-.4.95 1.05 1.2-1.85 1.85-1.2-1.05-.95.4-.4 1.45h-3.7l-.4-1.45-.95-.4-1.2 1.05-1.85-1.85 1.05-1.2-.4-.95-1.45-.4v-3.7l1.45-.4.4-.95-1.05-1.2 1.85-1.85 1.2 1.05.95-.4.4-1.45Z"
      />
      <circle cx="8" cy="8" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
