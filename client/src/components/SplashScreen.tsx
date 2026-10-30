import { useEffect, useRef, useState, type ReactNode } from 'react'
import tomato from '../assets/tomato/tomato-no-face.png'
import tomatoFace from '../assets/tomato/tomato-face.png'
import './SplashScreen.css'

/** How fast the bar catches up with work that's done, and creeps while waiting (time constants, ms). */
const CATCH_UP_MS = 120
const CREEP_MS = 1500
/** How much of a step the bar may creep into before that step is really done. */
const CREEP_SHARE = 0.75

/**
  The "Home" frame from Figma: logo + loading bar, shown once on app open.

  The bar follows the real work (see Boot.tsx): `progress` is how far it's
  got (0 to 1), and `next` is where the step it's waiting on ends. The bar
  catches up quickly with `progress` and creeps toward `next` meanwhile, so
  it keeps moving on a slow connection without passing what's really done.
  Once it's full and `ready`, the screen leaves.

  With `children` (the login window), once the bar is full it goes away
  and the screen stays as the title page, dimmed, under them. If the work
  starts again afterwards (just logged in), the bar comes back from the start.
*/
export default function SplashScreen({
  progress,
  next = progress,
  ready,
  skipBar = false,
  onDone,
  children,
}: {
  progress: number
  next?: number
  ready: boolean
  skipBar?: boolean
  onDone: () => void
  children?: ReactNode
}) {
  const [shown, setShown] = useState(skipBar ? progress : 0)
  const target = useRef({ progress, next })
  target.current = { progress, next: Math.max(progress, next) }
  const full = progress >= 1 && shown >= 0.999
  const leaving = ready && full
  const [titlePage, setTitlePage] = useState(false)

  // The title page once the bar is full and there's a window to show; back
  // to the bar, from the start, when the window is done (just logged in).
  const hasWindow = !!children
  useEffect(() => {
    if (hasWindow && full) setTitlePage(true)
    if (!hasWindow && titlePage) {
      setTitlePage(false)
      setShown(0)
    }
  }, [hasWindow, full, titlePage])

  useEffect(() => {
    if (titlePage || full) return
    if (skipBar) {
      setShown(progress)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      setShown((s) => {
        const { progress: done, next: end } = target.current
        // Done work: catch up fast (straight away with reduced motion). Waiting: creep most of the
        // way toward the step's end, never all of it, so only finished work fills the bar.
        if (s < done) return reduced ? done : Math.min(done, s + (done - s) * (1 - Math.exp(-dt / CATCH_UP_MS)) + 0.002)
        const creepTo = done + (end - done) * CREEP_SHARE
        return s < creepTo ? s + (creepTo - s) * (1 - Math.exp(-dt / CREEP_MS)) : s
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [titlePage, full, skipBar, progress])

  // Skipped bar and already signed in: nothing to show.
  useEffect(() => {
    if (leaving && skipBar) onDone()
  }, [leaving, skipBar, onDone])

  const width = `${Math.min(shown, 1) * 100}%`
  return (
    <div
      className={`splash${leaving ? ' is-leaving' : ''}${titlePage ? ' is-title' : ''}`}
      onAnimationEnd={(e) => e.animationName === 'splash-out' && onDone()}
      role={titlePage ? undefined : 'status'}
      aria-label={titlePage ? undefined : 'Loading TomoNook'}
    >
      <div className="splash-logo">
        <div className="splash-logo-inner">
          <span className="splash-title">TomoNook</span>
        </div>
        <img className="splash-tomato splash-tomato-1" src={tomato} alt="" />
        <img className="splash-tomato splash-tomato-2" src={tomato} alt="" />
        <img className="splash-tomato splash-tomato-3" src={tomato} alt="" />
        <img className="splash-tomato splash-tomato-4" src={tomato} alt="" />
      </div>

      <div className="splash-bar" aria-hidden={titlePage}>
        <div className="splash-bar-fill" style={{ width }} />
        <img className="splash-bar-tomato" src={tomatoFace} alt="" style={{ left: width }} />
      </div>
      {titlePage && children}
    </div>
  )
}
