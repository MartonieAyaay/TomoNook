import { create } from 'zustand'
import { POST_MAX_CHARS, type DayKey, type MoodPost } from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface MoodState {
  posts: MoodPost[]
  addPost: (day: DayKey, text: string) => void
  editPost: (id: string, text: string) => void
  deletePost: (id: string) => void
}

const clean = (text: string) => text.trim().slice(0, POST_MAX_CHARS)

export const useMoodStore = create<MoodState>((set) => ({
  posts: load('posts', [] as MoodPost[]),

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
}))

useMoodStore.subscribe((s) => save('posts', s.posts))
