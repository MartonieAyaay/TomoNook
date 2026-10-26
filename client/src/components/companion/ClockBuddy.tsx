import { useCompanionStore } from '../../store/companionStore.ts'
import { useProfileStore } from '../../store/profileStore.ts'
import Avatar from '../avatar/Avatar.tsx'
import { CompanionBubble } from './Companion.tsx'
import './Companion.css'

export type BuddyState = 'idle' | 'focus' | 'doze'

/** The avatar beside the big clock: focused while working, dozing on breaks. */
export default function ClockBuddy({ state }: { state: BuddyState }) {
  const avatar = useProfileStore((s) => s.avatar)
  const line = useCompanionStore((s) => s.line)

  return (
    <div className={`clock-buddy is-${state}`}>
      <CompanionBubble line={line} />
      <Avatar avatar={avatar} blinking sparkle={line?.sparkle} />
      {state === 'doze' && (
        <span className="clock-buddy-z" aria-hidden>
          <span>z</span>
          <span>z</span>
          <span>Z</span>
        </span>
      )}
    </div>
  )
}
