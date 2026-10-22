import { useEffect, useState } from 'react'
import tomato from '../assets/tomato/tomato-no-face.png'
import tomatoFace from '../assets/tomato/tomato-face.png'
import './SplashScreen.css'

const DURATION_MS = 1400

/** The "Home" frame from Figma: logo + loading bar, shown once on app open. */
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 200 : DURATION_MS
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(tick)
      else setLeaving(true)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={`splash${leaving ? ' is-leaving' : ''}`}
      onAnimationEnd={(e) => e.animationName === 'splash-out' && onDone()}
      role="status"
      aria-label="Loading TomoNook"
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

      <div className="splash-bar">
        <div className="splash-bar-fill" style={{ width: `${progress * 100}%` }} />
        <img
          className="splash-bar-tomato"
          src={tomatoFace}
          alt=""
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
