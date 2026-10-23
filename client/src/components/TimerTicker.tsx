import { useEffect } from 'react'
import { useTimerStore } from '../store/timerStore.ts'
import { chime } from '../lib/chime.ts'

/** Keeps the running timer moving between phases on every page, and chimes when it does. */
export default function TimerTicker() {
  const running = useTimerStore((s) => s.active?.endsAt != null)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (useTimerStore.getState().advance()) chime()
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  return null
}
