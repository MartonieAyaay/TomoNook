import { today, type Mood } from '@tomonook/shared'
import { useCompanionStore } from '../store/companionStore.ts'
import { useMoodStore } from '../store/moodStore.ts'
import { useTimerStore } from '../store/timerStore.ts'
import { useTodoStore } from '../store/todoStore.ts'

const CHEERS = ['Nice one!', 'One down!', 'Look at you go!', 'Yay, done!', 'Ripe work!']

const MOOD_LINES: Record<string, string> = {
  happy: 'Yay, a happy day!',
  sad: 'Aw, I’m here for you.',
  angry: 'Deep breaths. We’ve got this.',
}

const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)]

const moodLine = (mood: Mood) =>
  MOOD_LINES[mood.id] ?? `Feeling ${mood.name.toLowerCase()} today? Thanks for telling me.`

export function greeting(name: string) {
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${hello}${name ? `, ${name}` : ''}!`
}

/** Makes the companion react to what happens around the app. Returns a cleanup. */
export function startCompanionReactions() {
  const say = (text: string, options?: { ms?: number; sparkle?: boolean }) =>
    useCompanionStore.getState().say(text, options)

  const offTodos = useTodoStore.subscribe((s, prev) => {
    if (s.todos === prev.todos) return
    const done = s.todos.find((t) => t.done && prev.todos.some((p) => p.id === t.id && !p.done))
    if (!done) return
    const allDone = done.day === today() && s.todos.filter((t) => t.day === done.day).every((t) => t.done)
    if (allDone) say('All done for today!! You’re amazing.', { ms: 4500, sparkle: true })
    else say(pick(CHEERS))
  })

  const offMood = useMoodStore.subscribe((s, prev) => {
    if (s.entries === prev.entries) return
    const day = today()
    const entry = s.entries.find((e) => e.day === day)
    if (!entry || entry.moodId === prev.entries.find((e) => e.day === day)?.moodId) return
    const mood = s.moods.find((m) => m.id === entry.moodId)
    if (mood) say(moodLine(mood), { ms: 3800 })
  })

  const offTimer = useTimerStore.subscribe((s, prev) => {
    const now = s.active
    const before = prev.active
    if (now && !before) say('Let’s lock in!')
    else if (now && before && now.id === before.id && now.phase !== before.phase)
      say(now.phase === 'chill' ? 'Break time! Stretch a little.' : 'Back to it, you’ve got this!', { ms: 4500 })
  })

  return () => {
    offTodos()
    offMood()
    offTimer()
  }
}
