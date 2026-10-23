import { create } from 'zustand'
import {
  DEFAULT_AVATAR,
  PROFILE_NAME_MAX,
  type AdjustablePart,
  type AvatarConfig,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

/** How far parts can move (% of the canvas) and be resized. */
export const ADJUST_LIMITS = { move: 10, minScale: 0.5, maxScale: 1.6 }

interface ProfileState {
  name: string
  avatar: AvatarConfig
  setName: (name: string) => void
  updateAvatar: (patch: Partial<AvatarConfig>) => void
  nudgePart: (part: AdjustablePart, dx: number, dy: number, dScale: number) => void
  resetPart: (part: AdjustablePart) => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
// Keep stored numbers tidy after repeated float steps.
const round = (n: number) => Math.round(n * 100) / 100

export const useProfileStore = create<ProfileState>((set) => ({
  name: load('name', ''),
  // Merge so avatars saved before a new option existed still get its default.
  avatar: { ...DEFAULT_AVATAR, ...load<Partial<AvatarConfig>>('avatar', {}) },

  setName: (name) => set({ name: name.trim().slice(0, PROFILE_NAME_MAX) }),
  updateAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),

  nudgePart: (part, dx, dy, dScale) =>
    set((s) => {
      const cur = s.avatar.adjust[part] ?? { x: 0, y: 0, scale: 1 }
      const { move, minScale, maxScale } = ADJUST_LIMITS
      const next = {
        x: round(clamp(cur.x + dx, -move, move)),
        y: round(clamp(cur.y + dy, -move, move)),
        scale: round(clamp(cur.scale + dScale, minScale, maxScale)),
      }
      return { avatar: { ...s.avatar, adjust: { ...s.avatar.adjust, [part]: next } } }
    }),

  resetPart: (part) =>
    set((s) => {
      const adjust = { ...s.avatar.adjust }
      delete adjust[part]
      return { avatar: { ...s.avatar, adjust } }
    }),
}))

useProfileStore.subscribe((s) => {
  save('name', s.name)
  save('avatar', s.avatar)
})
