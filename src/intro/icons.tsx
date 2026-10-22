type Props = {
  className?: string
}

export function EnvelopeIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3.5" y="6" width="17" height="12" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.2 7.2 12 12.6 19.8 7.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
