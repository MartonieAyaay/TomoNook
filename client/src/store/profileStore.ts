import { create } from 'zustand'
import { DEFAULT_AVATAR, PROFILE_NAME_MAX, type AvatarConfig } from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface ProfileState {
  name: string
  avatar: AvatarConfig
  setName: (name: string) => void
  updateAvatar: (patch: Partial<AvatarConfig>) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: load('name', ''),
  // Merge so avatars saved before a new option existed still get its default.
  avatar: { ...DEFAULT_AVATAR, ...load<Partial<AvatarConfig>>('avatar', {}) },

  setName: (name) => set({ name: name.trim().slice(0, PROFILE_NAME_MAX) }),
  updateAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
}))

useProfileStore.subscribe((s) => {
  save('name', s.name)
  save('avatar', s.avatar)
})
