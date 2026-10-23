import { create } from 'zustand'
import { load, save } from '../lib/storage.ts'

export const LAP_MAX = 99

interface StopwatchSaved {
  /** When the current run began (epoch ms), or null while stopped/paused. */
  startedAt: number | null
  /** Time from earlier runs before the last pause, in ms. */
  banked: number
  /** Total elapsed time at each lap, oldest first. */
  laps: number[]
}

interface StopwatchState extends StopwatchSaved {
  start: () => void
  pause: () => void
  lap: () => void
  /** Stops and clears back to zero. */
  stop: () => void
}

const saved = load<StopwatchSaved>('stopwatch', { startedAt: null, banked: 0, laps: [] })

/** Elapsed ms. Counts from a timestamp, so it keeps going across reloads. */
export const elapsedMs = (s: StopwatchSaved, now = Date.now()) =>
  s.banked + (s.startedAt === null ? 0 : now - s.startedAt)

export const useStopwatchStore = create<StopwatchState>((set, get) => ({
  startedAt: saved.startedAt,
  banked: saved.banked,
  laps: saved.laps,
  start: () => {
    if (get().startedAt === null) set({ startedAt: Date.now() })
  },
  pause: () => {
    const s = get()
    if (s.startedAt !== null) set({ banked: elapsedMs(s), startedAt: null })
  },
  lap: () => {
    const s = get()
    if (s.startedAt !== null && s.laps.length < LAP_MAX) set({ laps: [...s.laps, elapsedMs(s)] })
  },
  stop: () => set({ startedAt: null, banked: 0, laps: [] }),
}))

useStopwatchStore.subscribe((s) => {
  save('stopwatch', { startedAt: s.startedAt, banked: s.banked, laps: s.laps })
})
