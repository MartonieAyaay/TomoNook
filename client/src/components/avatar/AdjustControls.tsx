import { useEffect, useRef } from 'react'
import type { AdjustablePart } from '@tomonook/shared'
import { useProfileStore } from '../../store/profileStore.ts'
import './AdjustControls.css'

const MOVE_STEP = 0.5
const SCALE_STEP = 0.05

interface AdjustControlsProps {
  part: AdjustablePart
  /** Shown in button labels, e.g. "eyes". */
  name: string
}

export default function AdjustControls({ part, name }: AdjustControlsProps) {
  const nudgePart = useProfileStore((s) => s.nudgePart)
  const resetPart = useProfileStore((s) => s.resetPart)
  const adjusted = useProfileStore((s) => s.avatar.adjust[part] !== undefined)

  const buttons = [
    { label: `Move ${name} left`, text: '←', step: () => nudgePart(part, -MOVE_STEP, 0, 0) },
    { label: `Move ${name} up`, text: '↑', step: () => nudgePart(part, 0, -MOVE_STEP, 0) },
    { label: `Move ${name} down`, text: '↓', step: () => nudgePart(part, 0, MOVE_STEP, 0) },
    { label: `Move ${name} right`, text: '→', step: () => nudgePart(part, MOVE_STEP, 0, 0) },
    { label: `Make ${name} smaller`, text: '−', step: () => nudgePart(part, 0, 0, -SCALE_STEP) },
    { label: `Make ${name} bigger`, text: '+', step: () => nudgePart(part, 0, 0, SCALE_STEP) },
  ]

  return (
    <div className="adjust-controls" role="group" aria-label={`Move and resize ${name}`}>
      {buttons.map((b) => (
        <HoldButton key={b.label} label={b.label} onStep={b.step}>
          {b.text}
        </HoldButton>
      ))}
      <button
        type="button"
        className="adjust-btn adjust-reset"
        onClick={() => resetPart(part)}
        disabled={!adjusted}
        aria-label={`Reset ${name} position and size`}
        title="Reset"
      >
        ↺
      </button>
    </div>
  )
}

/** Steps once on press, then keeps stepping while held. */
function HoldButton({
  label,
  onStep,
  children,
}: {
  label: string
  onStep: () => void
  children: string
}) {
  const timer = useRef<number | undefined>(undefined)

  const stop = () => {
    window.clearTimeout(timer.current)
    window.clearInterval(timer.current)
    timer.current = undefined
  }

  useEffect(() => stop, [])

  return (
    <button
      type="button"
      className="adjust-btn"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        onStep()
        stop()
        timer.current = window.setTimeout(() => {
          timer.current = window.setInterval(onStep, 60)
        }, 350)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Pointer presses are handled above; this covers Enter/Space.
      onClick={(e) => e.detail === 0 && onStep()}
    >
      {children}
    </button>
  )
}
