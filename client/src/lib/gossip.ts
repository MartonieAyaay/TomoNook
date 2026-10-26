import { addDays, today } from '@tomonook/shared'
import { fill, pickForms } from './pronouns.ts'
import { moodStreak } from './streak.ts'
import { useMoodStore } from '../store/moodStore.ts'
import { useProfileStore } from '../store/profileStore.ts'
import { useTodoStore } from '../store/todoStore.ts'

/*
  What the tomatoes on the profile page whisper about the user. No AI: the
  lines are written by hand, and picked by looking for everyday words in
  recent diary posts plus the user's moods, streak and tasks. Everything
  runs in the browser, so it works offline. They only mention topics, never
  quote the diary.
*/

/** Words that mean a post is about something, and what the tomatoes say about it. */
const TOPICS: { words: string[]; lines: string[] }[] = [
  {
    words: ['school', 'class', 'exam', 'exams', 'test', 'quiz', 'study', 'studying', 'homework', 'teacher', 'professor', 'thesis'],
    lines: ['Psst... {name} wrote about school stuff. {They\'re} working so hard!', '{Name} has been studying. {They\'re} basically a genius tomato.'],
  },
  {
    words: ['work', 'job', 'shift', 'meeting', 'boss', 'office', 'deadline', 'project'],
    lines: ['Did you hear? {name} had a big work day. {They\'ve} earned a snack.', '{Name} wrote about work again. Somebody give {them} a break!'],
  },
  {
    words: ['tired', 'sleepy', 'sleep', 'exhausted', 'nap', 'insomnia'],
    lines: ['{Name} says {they\'re} tired. Shh, let {them} nap!', 'Word on the vine is {name} needs more sleep.'],
  },
  {
    words: ['food', 'ate', 'eat', 'lunch', 'dinner', 'breakfast', 'snack', 'pizza', 'cake', 'cookie', 'ramen', 'coffee', 'tea'],
    lines: ['{Name} wrote about food. Do you think {they} saved us some?', 'I heard {name} had something yummy. Not fair!'],
  },
  {
    words: ['friend', 'friends', 'hangout', 'party', 'bestie'],
    lines: ['{Name} hung out with friends! Next time {they} should bring us.', 'Ooh, {name} has a social life. Love that for {them}.'],
  },
  {
    words: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'family', 'grandma', 'grandpa', 'cousin'],
    lines: ['{Name} wrote about family. So sweet!', 'I heard {name}\'s family came up in the diary. Aww.'],
  },
  {
    words: ['date', 'crush', 'boyfriend', 'girlfriend', 'partner', 'love', 'kiss'],
    lines: ['Ooh, {name} wrote about someone special... my lips are sealed!', '{Name}\'s diary is getting romantic. I\'m blushing redder than usual.'],
  },
  {
    words: ['happy', 'great', 'fun', 'excited', 'amazing', 'awesome', 'yay', 'proud', 'best'],
    lines: ['{Name}\'s diary sounds so happy lately. {They\'re} glowing!', 'Have you noticed? {Name} is in a great mood this week.'],
  },
  {
    words: ['sad', 'cry', 'cried', 'lonely', 'upset', 'hurt', 'miss'],
    lines: ['{Name} had a rough moment. Let\'s be extra nice to {them}.', 'Shh... {name} is having a hard time. Send good vibes.'],
  },
  {
    words: ['stress', 'stressed', 'anxious', 'anxiety', 'worried', 'overwhelmed', 'panic'],
    lines: ['{Name} has been stressed. {They\'re} doing great anyway.', 'Pssst, {name} could use a hug. A tomato hug.'],
  },
  {
    words: ['gym', 'run', 'ran', 'walk', 'workout', 'exercise', 'yoga', 'swim', 'dance'],
    lines: ['{Name} got moving! {They\'re} stronger than a tomato vine.', 'I saw it in the diary: {name} worked out. Impressive!'],
  },
  {
    words: ['game', 'games', 'movie', 'show', 'anime', 'music', 'song', 'book', 'read', 'drawing', 'art'],
    lines: ['{Name} wrote about something fun. Why weren\'t we invited?', 'Rumor has it {name} had some me-time. Good for {them}!'],
  },
  {
    words: ['tomato', 'tomatoes'],
    lines: ['{Name} wrote about TOMATOES. {They\'re} one of us!'],
  },
]

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function topicsIn(text: string) {
  const words = new Set(text.toLowerCase().match(/[a-z']+/g) ?? [])
  return TOPICS.filter((t) => t.words.some((w) => words.has(w)))
}

/** Every line the tomatoes could say right now, already filled in. */
export function gossipLines(): string[] {
  const { name: rawName, info } = useProfileStore.getState()
  const { posts, entries, moods } = useMoodStore.getState()
  const todos = useTodoStore.getState().todos
  const name = rawName || 'our human'
  const day = today()
  const lines: string[] = []

  // Diary: each topic from the last week's posts, newest first.
  const weekAgo = addDays(day, -6)
  const recent = posts.filter((p) => p.day >= weekAgo).reverse()
  const seen = new Set<(typeof TOPICS)[number]>()
  for (const p of recent) for (const t of topicsIn(p.text)) seen.add(t)
  for (const t of seen) lines.push(pick(t.lines))
  if (recent.length >= 3) lines.push(`{Name} wrote ${recent.length} diary entries this week. {They've} got a lot to say!`)
  if (posts.length === 0) lines.push("{Name} hasn't written in the diary yet. What's {their} secret?")

  // Mood and streak.
  const mood = moods.find((m) => m.id === entries.find((e) => e.day === day)?.moodId)
  if (mood) lines.push(`Pass it on: {name} is feeling ${mood.name.toLowerCase()} today.`)
  else lines.push('No mood logged today... is {name} keeping secrets?')
  const streak = moodStreak(new Set(entries.map((e) => e.day)))
  if (streak >= 3) lines.push(`{Name} logged {their} mood ${streak} days in a row! Show-off.`)

  // Tasks.
  const todays = todos.filter((t) => t.day === day)
  const done = todays.filter((t) => t.done).length
  if (todays.length > 0 && done === todays.length) lines.push('{Name} finished every task today. {They\'re} unstoppable!')
  else if (done > 0) lines.push(`{Name} already ticked off ${done} task${done === 1 ? '' : 's'} today.`)

  if (info.likesTomatoes === false) lines.push('Did you hear? {Name} said NO to tomatoes. Rude.')
  if (info.likesTomatoes) lines.push('{Name} likes tomatoes. That means {they\'re} our favorite.')

  // Each line gets its own pick of pronouns, so several pronouns take turns.
  return lines.map((l) => fill(l, name, pickForms(info.pronouns, name)))
}
