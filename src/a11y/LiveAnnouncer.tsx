import { useEffect, useRef, useState } from 'react'
import { subscribeAnnounce } from './liveRegion'

export function LiveAnnouncer() {
  const [message, setMessage] = useState('')
  const timer = useRef<number | null>(null)
  useEffect(() => {
    return subscribeAnnounce((next) => {
      setMessage('')
      requestAnimationFrame(() => setMessage(next))
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMessage(''), 4000)
    })
  }, [])
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
