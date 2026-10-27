import { addDays, today } from '@tomonook/shared'
import { fill, pickForms } from './pronouns.ts'
import { moodStreak } from './streak.ts'
import { cachedWeather, celsius, defaultTempUnit, describeWeather, formatTemp, skyOf } from './weather.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import { useFocusStore } from '../store/focusStore.ts'
import { useGossipStore } from '../store/gossipStore.ts'
import { useMoodStore } from '../store/moodStore.ts'
import { useProfileStore } from '../store/profileStore.ts'
import { useStopwatchStore } from '../store/stopwatchStore.ts'
import { useTodoStore } from '../store/todoStore.ts'

/*
  What the gossip tomatoes say about the user. No AI: every line is written
  by hand and picked by looking at the user's own data (diary words, mood,
  tasks, timers), plus the time, a daily fortune and, if allowed, the
  weather. Everything but the weather works offline. They mention what a
  diary post is about, never quote it.
*/

/** How the line feels, so the other tomato can react to it. */
export type Tone = 'up' | 'down' | 'meh'

export interface GossipLine {
  text: string
  tone: Tone
  /** The tomatoes want to check the weather and need the user's okay. */
  askWeather?: boolean
  /** They need the user's city first; stays up until one is picked. */
  askCity?: boolean
}

/** Words that mean a post is about something, and what the tomatoes say about it. */
const TOPICS: { words: string[]; tone: Tone; lines: string[] }[] = [
  {
    words: ['school', 'class', 'exam', 'exams', 'test', 'quiz', 'study', 'studying', 'homework', 'teacher', 'professor', 'thesis'],
    tone: 'up',
    lines: ["Psst... {name} wrote about school stuff. {They're} working so hard!", "{Name} has been studying. {They're} basically a genius tomato."],
  },
  {
    words: ['work', 'job', 'shift', 'meeting', 'boss', 'office', 'deadline', 'project'],
    tone: 'meh',
    lines: ["Did you hear? {name} had a big work day. {They've} earned a snack.", '{Name} wrote about work again. Somebody give {them} a break!'],
  },
  {
    words: ['tired', 'sleepy', 'sleep', 'exhausted', 'nap', 'insomnia'],
    tone: 'down',
    lines: ["{Name} says {they're} tired. Shh, let {them} nap!", 'Word on the vine is {name} needs more sleep.'],
  },
  {
    words: ['food', 'ate', 'eat', 'lunch', 'dinner', 'breakfast', 'snack', 'pizza', 'cake', 'cookie', 'ramen', 'coffee', 'tea'],
    tone: 'up',
    lines: ['{Name} wrote about food. Do you think {they} saved us some?', 'I heard {name} had something yummy. Not fair!'],
  },
  {
    words: ['friend', 'friends', 'hangout', 'party', 'bestie'],
    tone: 'up',
    lines: ['{Name} hung out with friends! Next time {they} should bring us.', 'Ooh, {name} has a social life. Love that for {them}.'],
  },
  {
    words: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'family', 'grandma', 'grandpa', 'cousin'],
    tone: 'up',
    lines: ['{Name} wrote about family. So sweet!', "I heard {name}'s family came up in the diary. Aww."],
  },
  {
    words: ['date', 'crush', 'boyfriend', 'girlfriend', 'partner', 'love', 'kiss'],
    tone: 'up',
    lines: ['Ooh, {name} wrote about someone special... my lips are sealed!', "{Name}'s diary is getting romantic. I'm blushing redder than usual."],
  },
  {
    words: ['happy', 'great', 'fun', 'excited', 'amazing', 'awesome', 'yay', 'proud', 'best'],
    tone: 'up',
    lines: ["{Name}'s diary sounds so happy lately. {They're} glowing!", 'Have you noticed? {Name} is in a great mood this week.'],
  },
  {
    words: ['sad', 'cry', 'cried', 'lonely', 'upset', 'hurt', 'miss'],
    tone: 'down',
    lines: ["{Name} had a rough moment. Let's be extra nice to {them}.", 'Shh... {name} is having a hard time. Send good vibes.'],
  },
  {
    words: ['stress', 'stressed', 'anxious', 'anxiety', 'worried', 'overwhelmed', 'panic'],
    tone: 'down',
    lines: ["{Name} has been stressed. {They're} doing great anyway.", 'Pssst, {name} could use a hug. A tomato hug.'],
  },
  {
    words: ['gym', 'run', 'ran', 'walk', 'workout', 'exercise', 'yoga', 'swim', 'dance'],
    tone: 'up',
    lines: ["{Name} got moving! {They're} stronger than a tomato vine.", 'I saw it in the diary: {name} worked out. Impressive!'],
  },
  {
    words: ['game', 'games', 'movie', 'show', 'anime', 'music', 'song', 'book', 'read', 'drawing', 'art'],
    tone: 'up',
    lines: ["{Name} wrote about something fun. Why weren't we invited?", 'Rumor has it {name} had some me-time. Good for {them}!'],
  },
  {
    words: ['tomato', 'tomatoes'],
    tone: 'up',
    lines: ["{Name} wrote about TOMATOES. {They're} one of us!"],
  },
]

/** One a day, the same all day. */
const FORTUNES = [
  'a small win is hiding in your to-do list.',
  'a surprise snack is on its way.',
  'someone will smile because of you.',
  'today is good for starting something new.',
  'rest counts as progress today.',
  'a lucky color: tomato red, obviously.',
  'an old idea will finally click.',
  'you will find something you lost.',
  'a kind message is coming.',
  'your focus will be extra sharp after lunch.',
  'water your plants. And yourself. Drink water!',
  'today rewards the brave first step.',
  'a cozy evening is in the stars.',
  'you are one tomato away from greatness.',
  'something funny will happen. Watch for it.',
  'patience today, sweet harvest tomorrow.',
  'tidy one small thing and feel brand new.',
  'a good song will find you today.',
]

const REPLIES: Record<Tone, string[]> = {
  up: ['Yay!', 'That’s our {name}!', 'So proud!', 'Ripe and ready!', 'No way, amazing!'],
  down: ['Aww...', "Let's cheer {them} on.", 'Sending tomato hugs.', 'We’re here for {them}.'],
  meh: ['Interesting...', 'Hmm, noted.', 'Ooh, tell me more.', "You don't say!", 'Juicy gossip.'],
}

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/** The same pick all day, for the fortune. */
function dayPick<T>(list: T[], day: string) {
  let n = 0
  for (const c of day) n = (n * 31 + c.charCodeAt(0)) >>> 0
  return list[n % list.length]
}

function topicsIn(text: string) {
  const words = new Set(text.toLowerCase().match(/[a-z']+/g) ?? [])
  return TOPICS.filter((t) => t.words.some((w) => words.has(w)))
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function timeLine(now: Date): GossipLine {
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const h = now.getHours()
  if (h < 5) return { text: `It's ${time}... {name} should be asleep!`, tone: 'down' }
  if (h < 11) return { text: `Good morning! It's ${time}. Fresh day, fresh tomatoes.`, tone: 'up' }
  if (h < 14) return { text: `${time} already. Is it lunch time for {name}?`, tone: 'meh' }
  if (h < 18) return { text: `It's ${time}. Afternoon slump? {Name} can push through!`, tone: 'meh' }
  if (h < 22) return { text: `${time}... time for {name} to start winding down.`, tone: 'meh' }
  return { text: `It's ${time}. Almost bedtime for {name}.`, tone: 'meh' }
}

function weatherLine(): GossipLine | null {
  const permission = useGossipStore.getState().weather
  if (permission === 'denied') return null
  // Not asked yet, or allowed before they asked for a city: ask (again).
  if (permission === 'unasked' || !useSettingsStore.getState().weatherCity) return { text: "I wonder what the weather's like outside...", tone: 'meh', askWeather: true }
  const w = cachedWeather()
  if (!w) return null
  const desc = describeWeather(w.code, w.isDay)
  const sky = skyOf(w.code)
  const c = celsius(w, w.temp)
  const tip =
    sky === 'rain' || sky === 'storm' || w.rainChance >= 60
      ? '{Name} should grab an umbrella!'
      : c >= 30
        ? 'Stay hydrated, {name}!'
        : c <= 10
          ? 'Bundle up, {name}!'
          : 'Perfect tomato-ripening weather.'
  const temp = formatTemp(w, w.temp, useSettingsStore.getState().tempUnit ?? defaultTempUnit())
  return { text: `It's ${temp} and ${desc} out there. ${tip}`, tone: 'meh' }
}

/** Every line the tomatoes could say right now, filled in with the user's name and pronouns. */
export function gossipLines(now = new Date()): GossipLine[] {
  const { name: rawName, info } = useProfileStore.getState()
  const { posts, entries, moods } = useMoodStore.getState()
  const todos = useTodoStore.getState().todos
  const focus = useFocusStore.getState().minutes
  const runs = useStopwatchStore.getState().history
  const name = rawName || 'our human'
  const day = today()
  const lines: GossipLine[] = []

  // Fortune, weather, time.
  lines.push({ text: `Today's fortune for {name}: ${dayPick(FORTUNES, day)}`, tone: 'up' })
  const weather = weatherLine()
  if (weather) lines.push(weather)
  lines.push(timeLine(now))

  // Productivity: tasks, timer and stopwatch.
  const todays = todos.filter((t) => t.day === day)
  const done = todays.filter((t) => t.done).length
  if (todays.length === 0) lines.push({ text: "{Name} hasn't planned any tasks today. A rest day?", tone: 'meh' })
  else if (done === todays.length) lines.push({ text: "{Name} finished every task today. {They're} unstoppable!", tone: 'up' })
  else if (done > 0)
    lines.push({ text: `{Name} is ${Math.round((done / todays.length) * 100)}% through today's tasks!`, tone: 'up' })
  else lines.push({ text: `{Name} has ${plural(todays.length, 'task')} waiting today.`, tone: 'meh' })

  const minutes = focus[day] ?? 0
  if (minutes > 0) lines.push({ text: `{Name} locked in for ${plural(minutes, 'minute')} with the timer today!`, tone: 'up' })
  else if (now.getHours() >= 14) lines.push({ text: 'No timer sessions today... maybe a quick Pomodoro?', tone: 'meh' })
  const runsToday = runs.filter((r) => new Date(r.endedAt).toDateString() === now.toDateString()).length
  if (runsToday > 0) lines.push({ text: `{Name} used the stopwatch ${plural(runsToday, 'time')} today.`, tone: 'meh' })

  const score = done + Math.floor(minutes / 25)
  const level = score === 0 ? 'just chilling' : score <= 2 ? 'warming up' : score <= 5 ? 'on a roll' : 'on fire'
  lines.push({ text: `Productivity check: {name} is ${level} today.`, tone: score === 0 ? 'meh' : 'up' })

  // Mood and what they logged.
  const mood = moods.find((m) => m.id === entries.find((e) => e.day === day)?.moodId)
  if (mood)
    lines.push({
      text: `Pass it on: {name} is feeling ${mood.name.toLowerCase()} today.`,
      tone: mood.id === 'sad' || mood.id === 'angry' ? 'down' : 'up',
    })
  else lines.push({ text: 'No mood logged today... is {name} keeping secrets?', tone: 'meh' })
  const streak = moodStreak(new Set(entries.map((e) => e.day)))
  if (streak >= 3) lines.push({ text: `{Name} logged {their} mood ${streak} days in a row!`, tone: 'up' })

  const weekAgo = addDays(day, -6)
  const recent = posts.filter((p) => p.day >= weekAgo).reverse()
  const seen = new Set<(typeof TOPICS)[number]>()
  for (const p of recent) for (const t of topicsIn(p.text)) seen.add(t)
  for (const t of seen) lines.push({ text: pick(t.lines), tone: t.tone })
  const postsToday = posts.filter((p) => p.day === day).length
  if (postsToday > 0)
    lines.push({ text: `{Name} wrote ${postsToday === 1 ? 'a diary entry' : `${postsToday} diary entries`} today!`, tone: 'up' })
  if (posts.length === 0) lines.push({ text: "{Name} hasn't written in the diary yet. What's {their} secret?", tone: 'meh' })

  if (info.likesTomatoes === false) lines.push({ text: 'Did you hear? {Name} said NO to tomatoes. Rude.', tone: 'down' })

  // Each line gets its own pick of pronouns, so several pronouns take turns.
  return lines.map((l) => ({ ...l, text: fill(l.text, name, pickForms(info.pronouns, name)) }))
}

/** The weather line on its own, filled in, for right after the weather arrives. */
export function currentWeatherLine(): GossipLine | null {
  const line = weatherLine()
  if (!line || line.askWeather) return null
  const { name: rawName, info } = useProfileStore.getState()
  const name = rawName || 'our human'
  return { ...line, text: fill(line.text, name, pickForms(info.pronouns, name)) }
}

/** What the other tomato says back. */
export function replyTo(line: GossipLine) {
  const { name: rawName, info } = useProfileStore.getState()
  const name = rawName || 'our human'
  if (line.askWeather) return 'Let’s peek outside! (We just need to know your city.)'
  return fill(pick(REPLIES[line.tone]), name, pickForms(info.pronouns, name))
}
