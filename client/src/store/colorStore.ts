import { create } from 'zustand'
import { load, save } from '../lib/storage.ts'

export const RECENT_COLORS_MAX = 12

interface ColorState {
  /** Colors the user picked anywhere in the app, newest first. */
  recent: string[]
  addRecent: (color: string) => void
}

export const useColorStore = create<ColorState>((set) => ({
  recent: load('recentColors', [] as string[]),
  addRecent: (color) =>
    set((s) => {
      const c = color.toLowerCase()
      return { recent: [c, ...s.recent.filter((r) => r !== c)].slice(0, RECENT_COLORS_MAX) }
    }),
}))

useColorStore.subscribe((s) => save('recentColors', s.recent))
