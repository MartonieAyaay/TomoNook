import { useEffect, useRef, type ReactNode } from 'react'
import type { AdjustablePart, PartAdjust } from '@tomonook/shared'
import { SPACED_PARTS, useProfileStore } from '../../store/profileStore.ts'
import './AdjustControls.css'

const MOVE_STEP = 0.5
const SCALE_STEP = 0.05
const SPACING_STEP = 0.25

interface AdjustControlsProps {
  /** The part the pad moves; null when the open tab has nothing to move. */
  part: AdjustablePart | null
}

/** Arrow pad for moving the current part, with size and history buttons. */
export default function AdjustControls({ part }: AdjustControlsProps) {
  const nudgePart = useProfileStore((s) => s.nudgePart)
  const resetPart = useProfileStore((s) => s.resetPart)
  const undo = useProfileStore((s) => s.undo)
  const redo = useProfileStore((s) => s.redo)
  const canUndo = useProfileStore((s) => s.past.length > 0)
  const canRedo = useProfileStore((s) => s.future.length > 0)
  const adjusted = useProfileStore((s) => part !== null && s.avatar.adjust[part] !== undefined)

  const name = part ?? ''
  const spaced = part !== null && SPACED_PARTS.includes(part)
  const nudge = (delta: Partial<PartAdjust>) => () => {
    if (part) nudgePart(part, delta)
  }

  return (
    <div className="adjust-pad" role="group" aria-label={part ? `Move and resize ${name}` : 'Move and resize'}>
      <HoldButton className="pad-up" label={`Move ${name} up`} onStep={nudge({ y: -MOVE_STEP })} disabled={!part}>
        <Arrow rotate={0} />
      </HoldButton>
      <HoldButton className="pad-left" label={`Move ${name} left`} onStep={nudge({ x: -MOVE_STEP })} disabled={!part}>
        <Arrow rotate={-90} />
      </HoldButton>
      <span className="pad-center" aria-hidden>
        {part ? part[0].toUpperCase() + part.slice(1) : '—'}
      </span>
      <HoldButton className="pad-right" label={`Move ${name} right`} onStep={nudge({ x: MOVE_STEP })} disabled={!part}>
        <Arrow rotate={90} />
      </HoldButton>
      <HoldButton className="pad-down" label={`Move ${name} down`} onStep={nudge({ y: MOVE_STEP })} disabled={!part}>
        <Arrow rotate={180} />
      </HoldButton>

      <div className="pad-spacing">
        <HoldButton
          label={`Move ${name} closer together`}
          onStep={nudge({ spacing: -SPACING_STEP })}
          disabled={!spaced}
        >
          <Icon d="M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3M12 5v14" />
        </HoldButton>
        <HoldButton
          label={`Move ${name} further apart`}
          onStep={nudge({ spacing: SPACING_STEP })}
          disabled={!spaced}
        >
          <Icon d="M10 12H3M6 9l-3 3 3 3M14 12h7M18 9l3 3-3 3M12 5v14" />
        </HoldButton>
      </div>

      <div className="pad-scale">
        <HoldButton label={`Make ${name} smaller`} onStep={nudge({ scale: -SCALE_STEP })} disabled={!part}>
          <Icon d="M6 12h12" />
        </HoldButton>
        <HoldButton label={`Make ${name} bigger`} onStep={nudge({ scale: SCALE_STEP })} disabled={!part}>
          <Icon d="M6 12h12M12 6v12" />
        </HoldButton>
      </div>

      <div className="pad-history">
        <button type="button" className="adjust-btn adjust-btn-alt" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo">
          <Icon d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </button>
        <button type="button" className="adjust-btn adjust-btn-alt" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo">
          <Icon d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </button>
        <button
          type="button"
          className="adjust-btn adjust-btn-alt"
          onClick={() => part && resetPart(part)}
          disabled={!adjusted}
          aria-label={`Reset ${name} position and size`}
          title="Reset position and size"
        >
          <Icon d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
        </button>
      </div>
    </div>
  )
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d={d} />
    </svg>
  )
}

function Arrow({ rotate }: { rotate: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ rotate: `${rotate}deg` }}>
      <path d="M12 6 5 15h14z" className="adjust-arrow" />
    </svg>
  )
}

/** Steps once on press, then keeps stepping while held. */
function HoldButton({
  label,
  onStep,
  disabled,
  className,
  children,
}: {
  label: string
  onStep: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const timer = useRef<number | undefined>(undefined)
  // Read the latest step on each tick so a held button follows tab changes.
  const step = useRef(onStep)
  step.current = onStep

  const stop = () => {
    window.clearTimeout(timer.current)
    window.clearInterval(timer.current)
    timer.current = undefined
  }

  useEffect(() => stop, [])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])

  return (
    <button
      type="button"
      className={`adjust-btn${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        step.current()
        stop()
        timer.current = window.setTimeout(() => {
          timer.current = window.setInterval(() => step.current(), 60)
        }, 350)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Pointer presses are handled above; this covers Enter/Space.
      onClick={(e) => e.detail === 0 && step.current()}
    >
      {children}
    </button>
  )
}
