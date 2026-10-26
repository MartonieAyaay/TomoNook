import { create } from 'zustand'
import {
  DEFAULT_AVATAR,
  PROFILE_NAME_MAX,
  type AdjustablePart,
  type AvatarConfig,
  type PartAdjust,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

/** How far parts can move (% of the canvas), be resized and spread apart. */
export const ADJUST_LIMITS = { move: 10, minScale: 0.5, maxScale: 1.6, minSpacing: -3, maxSpacing: 6 }

/** Parts drawn as a left/right pair, so their spacing can change. */
export const SPACED_PARTS: AdjustablePart[] = ['eyes', 'brows']

export const GENDERS = ['Man', 'Woman', 'Non-Binary', 'Other', 'Prefer not to say'] as const
export const PRONOUNS = ['She', 'He', 'They', 'It'] as const
export type Gender = (typeof GENDERS)[number]
export type Pronoun = (typeof PRONOUNS)[number]

/** What the user tells us about themselves on the profile page. */
export interface ProfileInfo {
  age: number | null
  gender: Gender | null
  /** Any number, in the order of PRONOUNS. */
  pronouns: Pronoun[]
  /** null until they've answered. */
  likesTomatoes: boolean | null
}

export const AGE_MIN = 1
export const AGE_MAX = 120

const NO_INFO: ProfileInfo = { age: null, gender: null, pronouns: [], likesTomatoes: null }

/** Keeps only known answers, so older or hand-edited saves can't break the page. */
function cleanInfo(info: Partial<ProfileInfo>): ProfileInfo {
  const pronouns = Array.isArray(info.pronouns) ? info.pronouns : []
  return {
    ...NO_INFO,
    ...info,
    gender: GENDERS.find((g) => g === info.gender) ?? null,
    pronouns: PRONOUNS.filter((p) => pronouns.includes(p)),
  }
}

const HISTORY_MAX = 50
/** Nudges to the same part closer together than this undo as one step. */
const NUDGE_MERGE_MS = 800

interface ProfileState {
  name: string
  avatar: AvatarConfig
  info: ProfileInfo
  /** Earlier avatars for undo, oldest first. Not saved across reloads. */
  past: AvatarConfig[]
  future: AvatarConfig[]
  lastNudge: { part: AdjustablePart; at: number } | null
  setName: (name: string) => void
  setInfo: (info: ProfileInfo) => void
  updateAvatar: (patch: Partial<AvatarConfig>) => void
  /** Adds the given amounts to a part's position, size or spacing. */
  nudgePart: (part: AdjustablePart, delta: Partial<PartAdjust>) => void
  resetPart: (part: AdjustablePart) => void
  undo: () => void
  redo: () => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
// Keep stored numbers tidy after repeated float steps.
const round = (n: number) => Math.round(n * 100) / 100

/** Moves to `next`, remembering the current avatar for undo. */
function commit(s: ProfileState, next: AvatarConfig, merge = false): Partial<ProfileState> {
  return {
    avatar: next,
    past: merge ? s.past : [...s.past, s.avatar].slice(-HISTORY_MAX),
    future: [],
    lastNudge: null,
  }
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: load('name', ''),
  // Merge so avatars saved before a new option existed still get its default.
  avatar: { ...DEFAULT_AVATAR, ...load<Partial<AvatarConfig>>('avatar', {}) },
  info: cleanInfo(load<Partial<ProfileInfo>>('profileInfo', {})),
  past: [],
  future: [],
  lastNudge: null,

  setInfo: (info) => set({ info: cleanInfo(info) }),
  setName: (name) => set({ name: name.trim().slice(0, PROFILE_NAME_MAX) }),
  updateAvatar: (patch) => set((s) => commit(s, { ...s.avatar, ...patch })),

  nudgePart: (part, d) =>
    set((s) => {
      const cur = s.avatar.adjust[part] ?? { x: 0, y: 0, scale: 1 }
      const { move, minScale, maxScale, minSpacing, maxSpacing } = ADJUST_LIMITS
      const next: PartAdjust = {
        x: round(clamp(cur.x + (d.x ?? 0), -move, move)),
        y: round(clamp(cur.y + (d.y ?? 0), -move, move)),
        scale: round(clamp(cur.scale + (d.scale ?? 0), minScale, maxScale)),
      }
      if (SPACED_PARTS.includes(part)) {
        next.spacing = round(clamp((cur.spacing ?? 0) + (d.spacing ?? 0), minSpacing, maxSpacing))
      }
      const now = Date.now()
      const merge = s.lastNudge?.part === part && now - s.lastNudge.at < NUDGE_MERGE_MS
      return {
        ...commit(s, { ...s.avatar, adjust: { ...s.avatar.adjust, [part]: next } }, merge),
        lastNudge: { part, at: now },
      }
    }),

  resetPart: (part) =>
    set((s) => {
      if (!s.avatar.adjust[part]) return s
      const adjust = { ...s.avatar.adjust }
      delete adjust[part]
      return commit(s, { ...s.avatar, adjust })
    }),

  undo: () =>
    set((s) =>
      s.past.length
        ? {
            avatar: s.past[s.past.length - 1],
            past: s.past.slice(0, -1),
            future: [s.avatar, ...s.future],
            lastNudge: null,
          }
        : s,
    ),

  redo: () =>
    set((s) =>
      s.future.length
        ? {
            avatar: s.future[0],
            past: [...s.past, s.avatar],
            future: s.future.slice(1),
            lastNudge: null,
          }
        : s,
    ),
}))

useProfileStore.subscribe((s) => {
  save('name', s.name)
  save('avatar', s.avatar)
  save('profileInfo', s.info)
})
