import { create } from 'zustand'
import { addDays, today, type DayKey } from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'
import { useTimerStore } from './timerStore.ts'

const KEEP_DAYS = 14

interface FocusState {
  /** Lock-in minutes finished with a timer, per day. */
  minutes: Record<DayKey, number>
  addMinutes: (day: DayKey, minutes: number) => void
}

export const useFocusStore = create<FocusState>((set) => ({
  minutes: load<Record<DayKey, number>>('focusMinutes', {}),
  addMinutes: (day, minutes) =>
    set((s) => {
      const oldest = addDays(today(), -KEEP_DAYS)
      const kept = Object.fromEntries(Object.entries(s.minutes).filter(([d]) => d >= oldest))
      return { minutes: { ...kept, [day]: (kept[day] ?? 0) + minutes } }
    }),
}))

useFocusStore.subscribe((s) => save('focusMinutes', s.minutes))

/** Counts a lock-in round each time a timer moves on from it to a break. Returns a cleanup. */
export function startFocusLog() {
  return useTimerStore.subscribe((s, prev) => {
    const now = s.active
    const before = prev.active
    if (!now || !before || now.id !== before.id || before.phase !== 'lock' || now.phase !== 'chill') return
    const timer = s.timers.find((t) => t.id === now.id)
    if (timer) useFocusStore.getState().addMinutes(today(), Math.round(timer.lockMs / 60_000))
  })
}
