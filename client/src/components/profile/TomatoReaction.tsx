import { useEffect, useRef } from 'react'
import happyTomato from '../../assets/tomato/tomato-face.png'
import angryTomato from '../../assets/tomato/tomato-angry.png'
import splatter from '../../assets/tomato/splatter.png'
import splatSound from '../../assets/sounds/splat.mp3'
import './TomatoReaction.css'

const YAY_MS = 2600
const NAY_MS = 5400
/** When the launched tomato hits the screen (matches the CSS). */
const SPLAT_AT_MS = 2600

/**
  After the info is saved. Likes tomatoes: a happy tomato sparkles in and out.
  Doesn't: an angry tomato charges up, launches at the screen and splats.
*/
export default function TomatoReaction({ likes, onDone }: { likes: boolean; onDone: () => void }) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    const t = window.setTimeout(() => done.current(), likes ? YAY_MS : NAY_MS)
    if (likes) return () => window.clearTimeout(t)
    // Loaded now so it plays right on impact.
    const sound = new Audio(splatSound)
    sound.preload = 'auto'
    const hit = window.setTimeout(() => void sound.play().catch(() => {}), SPLAT_AT_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(hit)
      sound.pause()
    }
  }, [likes])

  if (likes) {
    return (
      <div className="tomato-reaction is-yay">
        <div className="yay-tomato" aria-hidden>
          <img src={happyTomato} alt="" />
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`yay-sparkle yay-sparkle-${n}`} />
          ))}
        </div>
        <p className="reaction-caption" role="status">
          A fellow tomato lover!
        </p>
      </div>
    )
  }

  return (
    // Clicking clears the mess early.
    <div className="tomato-reaction is-nay" onClick={() => done.current()}>
      <img className="nay-tomato" src={angryTomato} alt="" />
      <div className="nay-mess">
        <img className="nay-splat nay-splat-main" src={splatter} alt="" />
        <img className="nay-splat nay-splat-2" src={splatter} alt="" />
        <img className="nay-splat nay-splat-3" src={splatter} alt="" />
        <img className="nay-splat nay-splat-4" src={splatter} alt="" />
        <p className="reaction-caption nay-caption" role="status">
          Hmph! Tomatoes are delicious.
        </p>
      </div>
    </div>
  )
}
