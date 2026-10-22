import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { TOUR_IDS } from './copy'
import { requestIntroCommand } from './commands'
import { closeIntro, setIntroStep } from './session'
import { findSpotlight, spotlightRect, TOUR_SPOTLIGHT, type SpotlightRect } from './spotlight'
import { HelpRich } from './helpRich'
import { IntroDialog } from './IntroDialog'
import { useIntroCopy } from './useIntroCopy'
import styles from './Intro.module.css'

type Props = {
  step: number
  onClose: () => void
  onDone: () => void
  onFeedback: () => void
}

export function TourPanel({ step, onClose, onDone, onFeedback }: Props) {
  const copy = useIntroCopy()
  const total = TOUR_IDS.length
  const index = Math.min(Math.max(step, 0), total - 1)
  const current = copy.tour[index]
  const titleId = useId()
  const bodyId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const selector = current ? TOUR_SPOTLIGHT[current.id] : null
  const [ring, setRing] = useState<SpotlightRect | null>(null)
  const last = index === total - 1

  useEffect(() => {
    titleRef.current?.focus()
  }, [current?.id])

  useLayoutEffect(() => {
    const measure = () => {
      const node = findSpotlight(selector)
      setRing(node ? spotlightRect(node.getBoundingClientRect()) : null)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [selector])

  if (!current) return null

  return (
    <IntroDialog
      titleId={titleId}
      describedBy={bodyId}
      closeLabel={copy.skip}
      onClose={onClose}
      overlay={
        ring ? (
          <div
            className={styles.ring}
            aria-hidden="true"
            style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }}
          />
        ) : null
      }
    >
      <div className={styles.body}>
        <p className={styles.kicker}>{copy.step(index + 1, total)}</p>
        <h2 id={titleId} ref={titleRef} className={styles.title} tabIndex={-1} data-dialog-initial="">
          {current.title}
        </h2>
        <div id={bodyId}>
          {current.body.map((paragraph) => (
            <p key={paragraph} className={styles.copy}>
              <HelpRich text={paragraph} />
            </p>
          ))}
          {current.points?.length ? (
            <ul className={styles.points}>
              {current.points.map((point) => (
                <li key={point}>
                  <HelpRich text={point} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.quiet} onClick={() => setIntroStep(index - 1)} disabled={index === 0}>
          {copy.back}
        </button>
        {current.id === 'access' ? (
          <button
            type="button"
            className={`${styles.quiet} ${styles.grow}`}
            onClick={() => {
              closeIntro()
              requestIntroCommand('access')
            }}
          >
            {copy.showAccess}
          </button>
        ) : null}
        {last ? (
          <>
            <button type="button" className={`${styles.primary} ${styles.grow}`} onClick={onDone}>
              {copy.start}
            </button>
            <button type="button" className={`${styles.quiet} ${styles.grow}`} onClick={onFeedback}>
              {copy.sendFeedback}
            </button>
          </>
        ) : (
          <button type="button" className={`${styles.primary} ${styles.grow}`} onClick={() => setIntroStep(index + 1)}>
            {copy.next}
          </button>
        )}
        <button type="button" className={styles.ghost} onClick={onClose}>
          {copy.skip}
        </button>
      </div>
    </IntroDialog>
  )
}
