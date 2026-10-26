import { useLocation } from 'react-router-dom'
import { quoteOfTheDay } from '../../lib/quotes.ts'
import { useCompanionStore, type Line } from '../../store/companionStore.ts'
import { useProfileStore } from '../../store/profileStore.ts'
import Avatar from '../avatar/Avatar.tsx'
import './Companion.css'

/** The user's avatar in the corner of every page, cheering them on. */
export default function Companion() {
  const { pathname } = useLocation()
  const avatar = useProfileStore((s) => s.avatar)
  const line = useCompanionStore((s) => s.line)
  const say = useCompanionStore((s) => s.say)

  // The profile and clock pages have the avatar in the page itself.
  if (pathname.startsWith('/profile') || pathname.startsWith('/timers')) return null

  return (
    <div className="companion">
      <CompanionBubble line={line} />
      <button
        type="button"
        className="companion-avatar"
        onClick={() => say(quoteOfTheDay(), { ms: 6000 })}
        aria-label="Your tomato. Tap for today’s quote."
        title="Today’s quote"
      >
        <Avatar avatar={avatar} blinking sparkle={line?.sparkle} />
      </button>
    </div>
  )
}

/** What the companion is saying, if anything. Also read out to screen readers. */
export function CompanionBubble({ line, className = '' }: { line: Line | null; className?: string }) {
  return (
    <>
      {line && (
        <p key={line.key} className={`companion-bubble ${className}`} aria-hidden>
          {line.text}
        </p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {line?.text}
      </p>
    </>
  )
}
