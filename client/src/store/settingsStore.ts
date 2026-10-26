import { create } from 'zustand'
import { load, save } from '../lib/storage.ts'

export type SoundKind = 'gossip' | 'reactions' | 'chime'
export type Chattiness = 'all' | 'big' | 'off'
export type ChimeStyle = 'chime' | 'bell' | 'soft'
export type UiSize = 'small' | 'normal' | 'large'

export interface Settings {
  // Sound
  /** 0-1, applies to every sound. */
  volume: number
  muted: boolean
  sounds: Record<SoundKind, boolean>
  // Gossip tomatoes
  gossipAutoChat: boolean
  /** The tomatoes are hidden for this day, if set. */
  gossipHiddenOn: string | null
  // Companion avatar
  companion: boolean
  companionChat: Chattiness
  // Splats and streaks
  streakSplat: boolean
  /** Days in a row that count as a streak. */
  streakDays: number
  /** Softer reactions instead of angry tomatoes and splats. */
  gentle: boolean
  // Motion and look
  reduceMotion: boolean
  uiSize: UiSize
  // Timers
  chimeStyle: ChimeStyle
  /** 0-1, on top of the main volume. */
  chimeVolume: number
  /** Start the next phase by itself, or wait for Resume. */
  timerAutoStart: boolean
}

export const STREAK_DAYS_MIN = 2
export const STREAK_DAYS_MAX = 7

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  muted: false,
  sounds: { gossip: true, reactions: true, chime: true },
  gossipAutoChat: true,
  gossipHiddenOn: null,
  companion: true,
  companionChat: 'all',
  streakSplat: true,
  streakDays: 3,
  gentle: false,
  reduceMotion: false,
  uiSize: 'normal',
  chimeStyle: 'chime',
  chimeVolume: 1,
  timerAutoStart: true,
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
  setSound: (kind: SoundKind, on: boolean) => void
}

const saved = load<Partial<Settings>>('settings', {})

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,
  ...saved,
  // Merged so a sound type added later still gets its default.
  sounds: { ...DEFAULT_SETTINGS.sounds, ...saved.sounds },
  update: (patch) => set(patch),
  setSound: (kind, on) => set((s) => ({ sounds: { ...s.sounds, [kind]: on } })),
}))

useSettingsStore.subscribe((s) => {
  const settings: Settings = {
    volume: s.volume,
    muted: s.muted,
    sounds: s.sounds,
    gossipAutoChat: s.gossipAutoChat,
    gossipHiddenOn: s.gossipHiddenOn,
    companion: s.companion,
    companionChat: s.companionChat,
    streakSplat: s.streakSplat,
    streakDays: s.streakDays,
    gentle: s.gentle,
    reduceMotion: s.reduceMotion,
    uiSize: s.uiSize,
    chimeStyle: s.chimeStyle,
    chimeVolume: s.chimeVolume,
    timerAutoStart: s.timerAutoStart,
  }
  save('settings', settings)
})

/** How loud a sound of this kind should play right now (0 = don't play). */
export function soundLevel(kind: SoundKind) {
  const s = useSettingsStore.getState()
  if (s.muted || !s.sounds[kind]) return 0
  return s.volume * (kind === 'chime' ? s.chimeVolume : 1)
}
