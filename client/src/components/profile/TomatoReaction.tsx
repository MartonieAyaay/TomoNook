import { useEffect, useRef, useState } from 'react'
import happyTomato from '../../assets/tomato/tomato-face.png'
import angryTomato from '../../assets/tomato/tomato-angry.png'
import splatter from '../../assets/tomato/splatter.png'
import chargeSound from '../../assets/sounds/charging-up.mp3'
import splatSound from '../../assets/sounds/splat.mp3'
import sadSound from '../../assets/sounds/sad.mp3'
import sparkleSound from '../../assets/sounds/sparkle.mp3'
import { playSound } from '../../lib/sound.ts'
import { useSettingsStore } from '../../store/settingsStore.ts'
import './TomatoReaction.css'

const YAY_MS = 2600
const NAY_MS = 5400
const GENTLE_MS = 2800
/** Sound effects for each reaction: when they start (ms, matching the CSS) and how loud. */
const SOUNDS = {
  yay: [{ src: sparkleSound, at: 0, volume: 1 }],
  nay: [
    // While it shakes and swells.
    { src: chargeSound, at: 300, volume: 0.5 },
    // It hits the screen.
    { src: splatSound, at: 2600, volume: 1 },
    // Once the splat has died down.
    { src: sadSound, at: 3300, volume: 1 },
  ],
  gentle: [{ src: sadSound, at: 300, volume: 1 }],
}

/**
  After the info is saved. Likes tomatoes: a happy tomato sparkles in and out.
  Doesn't: an angry tomato charges up, launches at the screen and splats
  (or, in gentle mode, just pouts and fades away).
*/
export default function TomatoReaction({ likes, onDone }: { likes: boolean; onDone: () => void }) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  // Read once, so changing settings mid-reaction doesn't swap it halfway.
  const [gentle] = useState(() => useSettingsStore.getState().gentle)
  const kind = likes ? 'yay' : gentle ? 'gentle' : 'nay'

  useEffect(() => {
    const t = window.setTimeout(() => done.current(), kind === 'yay' ? YAY_MS : kind === 'gentle' ? GENTLE_MS : NAY_MS)
    const playing: HTMLAudioElement[] = []
    const timers = SOUNDS[kind].map(({ src, at, volume }) => {
      // Fetched now so it plays right on its moment.
      new Audio(src).preload = 'auto'
      return window.setTimeout(() => {
        const audio = playSound(src, 'reactions', volume)
        if (audio) playing.push(audio)
      }, at)
    })
    return () => {
      window.clearTimeout(t)
      timers.forEach((x) => window.clearTimeout(x))
      playing.forEach((a) => a.pause())
    }
  }, [kind])

  if (kind === 'gentle') {
    return (
      <div className="tomato-reaction is-gentle">
        <img className="gentle-tomato" src={angryTomato} alt="" />
        <p className="reaction-caption" role="status">
          Aw... more tomatoes for us, then.
        </p>
      </div>
    )
  }

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
