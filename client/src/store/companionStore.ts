import { create } from 'zustand'

/** Something the companion avatar is saying right now. */
export interface Line {
  text: string
  key: number
  sparkle?: boolean
}

interface CompanionState {
  line: Line | null
  /** Shows a speech bubble for a while; a new one replaces the old. */
  say: (text: string, options?: { ms?: number; sparkle?: boolean }) => void
}

let timer: number | undefined

export const useCompanionStore = create<CompanionState>((set) => ({
  line: null,
  say: (text, { ms = 3200, sparkle = false } = {}) => {
    window.clearTimeout(timer)
    set({ line: { text, key: Date.now(), sparkle } })
    timer = window.setTimeout(() => set({ line: null }), ms)
  },
}))
