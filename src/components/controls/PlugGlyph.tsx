/** Two-prong plug used as an LFO connect/disconnect affordance. */
export function PlugGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M6 2.5 v4.2 M10 2.5 v4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.2 6.6 h7.6 v3.2 a3.8 3.8 0 0 1 -7.6 0 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
