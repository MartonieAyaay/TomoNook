import { useEffect, useState, type ReactNode } from 'react'
import tomato from '../assets/tomato/tomato-no-face.png'
import tomatoFace from '../assets/tomato/tomato-face.png'
import './SplashScreen.css'

const DURATION_MS = 1400

/**
  The "Home" frame from Figma: logo + loading bar, shown once on app open.
  Once the bar is full it leaves if `ready` (signed in). Otherwise the bar
  goes away and it stays as the title page, dimmed, under `children` (the
  login window) until `ready` turns true.
*/
export default function SplashScreen({
  ready,
  skipBar = false,
  onDone,
  children,
}: {
  ready: boolean
  skipBar?: boolean
  onDone: () => void
  children?: ReactNode
}) {
  const [progress, setProgress] = useState(skipBar ? 1 : 0)
  const loaded = progress >= 1
  const leaving = loaded && ready

  useEffect(() => {
    if (skipBar) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 200 : DURATION_MS
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [skipBar])

  // Skipped bar and already signed in: nothing to show.
  useEffect(() => {
    if (leaving && skipBar) onDone()
  }, [leaving, skipBar, onDone])

  const titlePage = loaded && !ready
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

      <div className="splash-bar" aria-hidden={loaded}>
        <div className="splash-bar-fill" style={{ width: `${progress * 100}%` }} />
        <img
          className="splash-bar-tomato"
          src={tomatoFace}
          alt=""
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      {titlePage && children}
    </div>
  )
}
