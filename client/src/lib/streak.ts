import { addDays, today, type DayKey } from '@tomonook/shared'

/** Days in a row that count as a streak: the happy tomato shows, and losing it splats. */
export const STREAK_MIN = 3

/** How many logged days in a row end on `day`. */
function runEndingOn(logged: Set<DayKey>, day: DayKey) {
  let n = 0
  while (logged.has(addDays(day, -n))) n++
  return n
}

/** The current mood streak. Not logging today doesn't break it until the day is over. */
export function moodStreak(logged: Set<DayKey>, now: DayKey = today()) {
  return runEndingOn(logged, logged.has(now) ? now : addDays(now, -1))
}

/** A streak of at least STREAK_MIN days that ended with a whole missed day, or null. */
export function brokenStreak(logged: Set<DayKey>, now: DayKey = today()) {
  if (logged.has(now) || logged.has(addDays(now, -1))) return null
  const past = [...logged].filter((d) => d < now).sort()
  const lastDay = past[past.length - 1]
  if (!lastDay) return null
  const length = runEndingOn(logged, lastDay)
  return length >= STREAK_MIN ? { lastDay, length } : null
}
