import { create } from 'zustand'
import {
  MAX_TIMERS,
  TIMER_NAME_MAX,
  TIMER_PHASE_MAX_MS,
  type TimerPhaseName,
  type TimerPreset,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'
import { useSettingsStore } from './settingsStore.ts'

const MIN = 60_000

/** The two cards from the design, so the page isn't empty on first visit. */
const DEFAULT_TIMERS: TimerPreset[] = [
  { id: 'pomodoro', name: 'Pomodoro', lockMs: 25 * MIN, chillMs: 5 * MIN },
  { id: 'deep-focus', name: 'Deep focus', lockMs: 45 * MIN, chillMs: 20 * MIN },
]

/** The timer that's on, if any. Only one runs at a time. */
export interface ActiveTimer {
  id: string
  phase: TimerPhaseName
  /** Lock-in rounds started so far, from 1. */
  round: number
  /** When the current phase ends (epoch ms), or null while paused. */
  endsAt: number | null
  /** Time left in the phase when it was paused. */
  remaining: number
}

interface TimerState {
  timers: TimerPreset[]
  active: ActiveTimer | null
  addTimer: (name: string, lockMs: number, chillMs: number) => void
  updateTimer: (id: string, patch: Partial<Omit<TimerPreset, 'id'>>) => void
  deleteTimer: (id: string) => void
  startTimer: (id: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  /** Jumps straight to the next phase. */
  skipPhase: () => void
  stopTimer: () => void
  /** Moves on past any phases that have ended. Returns true if the phase changed. */
  advance: (now?: number) => boolean
}

const cleanName = (name: string) => name.trim().slice(0, TIMER_NAME_MAX) || 'Timer'
const clampPhase = (ms: number) => Math.min(TIMER_PHASE_MAX_MS, Math.max(1000, Math.round(ms / 1000) * 1000))

export const phaseLength = (t: TimerPreset, phase: TimerPhaseName) => (phase === 'lock' ? t.lockMs : t.chillMs)

/** Time left in the active phase. */
export const remainingMs = (a: ActiveTimer, now = Date.now()) =>
  a.endsAt === null ? a.remaining : Math.max(0, a.endsAt - now)

function nextPhase(a: ActiveTimer, t: TimerPreset, from: number): ActiveTimer {
  const phase = a.phase === 'lock' ? 'chill' : 'lock'
  const round = phase === 'lock' ? a.round + 1 : a.round
  const length = phaseLength(t, phase)
  return { ...a, phase, round, endsAt: a.endsAt === null ? null : from + length, remaining: length }
}

const saved = load<{ timers: TimerPreset[]; active: ActiveTimer | null }>('timers', {
  timers: DEFAULT_TIMERS,
  active: null,
})

export const useTimerStore = create<TimerState>((set, get) => ({
  timers: saved.timers,
  active: saved.active,

  addTimer: (name, lockMs, chillMs) =>
    set((s) =>
      s.timers.length >= MAX_TIMERS
        ? s
        : {
            timers: [
              ...s.timers,
              { id: crypto.randomUUID(), name: cleanName(name), lockMs: clampPhase(lockMs), chillMs: clampPhase(chillMs) },
            ],
          },
    ),

  updateTimer: (id, patch) =>
    set((s) => ({
      timers: s.timers.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              ...(patch.name !== undefined && { name: cleanName(patch.name) }),
              ...(patch.lockMs !== undefined && { lockMs: clampPhase(patch.lockMs) }),
              ...(patch.chillMs !== undefined && { chillMs: clampPhase(patch.chillMs) }),
            },
      ),
    })),

  deleteTimer: (id) =>
    set((s) => ({
      timers: s.timers.filter((t) => t.id !== id),
      active: s.active?.id === id ? null : s.active,
    })),

  startTimer: (id) => {
    const t = get().timers.find((x) => x.id === id)
    if (!t) return
    set({ active: { id, phase: 'lock', round: 1, endsAt: Date.now() + t.lockMs, remaining: t.lockMs } })
  },

  pauseTimer: () => {
    const a = get().active
    if (a?.endsAt != null) set({ active: { ...a, endsAt: null, remaining: remainingMs(a) } })
  },

  resumeTimer: () => {
    const a = get().active
    if (a && a.endsAt === null) set({ active: { ...a, endsAt: Date.now() + a.remaining } })
  },

  skipPhase: () => {
    const { active: a, timers } = get()
    const t = a && timers.find((x) => x.id === a.id)
    if (a && t) set({ active: nextPhase(a, t, Date.now()) })
  },

  stopTimer: () => set({ active: null }),

  advance: (now = Date.now()) => {
    const { active, timers } = get()
    if (!active || active.endsAt === null || now < active.endsAt) return false
    const t = timers.find((x) => x.id === active.id)
    if (!t) {
      set({ active: null })
      return false
    }
    // Without auto-start, the next phase waits, paused, for Resume.
    if (!useSettingsStore.getState().timerAutoStart) {
      const next = nextPhase(active, t, now)
      set({ active: { ...next, endsAt: null, remaining: phaseLength(t, next.phase) } })
      return true
    }
    // Catch up on phases that ended while the app was closed.
    let a = active
    for (let i = 0; i < 10_000 && a.endsAt !== null && now >= a.endsAt; i++) a = nextPhase(a, t, a.endsAt)
    set({ active: a })
    return true
  },
}))

useTimerStore.subscribe((s) => {
  save('timers', { timers: s.timers, active: s.active })
})
