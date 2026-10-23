import { create } from 'zustand'
import {
  DEFAULT_MOODS,
  MAX_MOODS,
  MOOD_NAME_MAX,
  POST_MAX_CHARS,
  type DayKey,
  type Mood,
  type MoodEntry,
  type MoodPost,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface MoodState {
  posts: MoodPost[]
  /** The user's moods (up to MAX_MOODS), each with its own color. */
  moods: Mood[]
  /** At most one mood per day. */
  entries: MoodEntry[]
  addPost: (day: DayKey, text: string) => void
  editPost: (id: string, text: string) => void
  deletePost: (id: string) => void
  /** Sets the day's mood, or clears it with null. */
  setDayMood: (day: DayKey, moodId: string | null) => void
  addMood: (name: string, color: string) => void
  updateMood: (id: string, patch: Partial<Omit<Mood, 'id'>>) => void
  /** Removes the mood and clears it from any days it was logged on. */
  deleteMood: (id: string) => void
}

const clean = (text: string) => text.trim().slice(0, POST_MAX_CHARS)
const cleanName = (name: string) => name.trim().slice(0, MOOD_NAME_MAX)

export const useMoodStore = create<MoodState>((set) => ({
  posts: load('posts', [] as MoodPost[]),
  moods: load('moods', DEFAULT_MOODS),
  entries: load('moodEntries', [] as MoodEntry[]),

  addPost: (day, text) =>
    set((s) =>
      clean(text)
        ? {
            posts: [
              ...s.posts,
              { id: crypto.randomUUID(), day, text: clean(text), createdAt: new Date().toISOString() },
            ],
          }
        : s,
    ),

  editPost: (id, text) =>
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id && clean(text) ? { ...p, text: clean(text) } : p)),
    })),

  deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

  setDayMood: (day, moodId) =>
    set((s) => {
      const others = s.entries.filter((e) => e.day !== day)
      return {
        entries: moodId === null ? others : [...others, { day, moodId, loggedAt: new Date().toISOString() }],
      }
    }),

  addMood: (name, color) =>
    set((s) =>
      s.moods.length >= MAX_MOODS || !cleanName(name)
        ? s
        : { moods: [...s.moods, { id: crypto.randomUUID(), name: cleanName(name), color }] },
    ),

  updateMood: (id, patch) =>
    set((s) => ({
      moods: s.moods.map((m) =>
        m.id !== id
          ? m
          : {
              ...m,
              ...(patch.color !== undefined && { color: patch.color }),
              ...(patch.name !== undefined && cleanName(patch.name) && { name: cleanName(patch.name) }),
            },
      ),
    })),

  deleteMood: (id) =>
    set((s) => ({
      moods: s.moods.filter((m) => m.id !== id),
      entries: s.entries.filter((e) => e.moodId !== id),
    })),
}))

useMoodStore.subscribe((s) => {
  save('posts', s.posts)
  save('moods', s.moods)
  save('moodEntries', s.entries)
})
