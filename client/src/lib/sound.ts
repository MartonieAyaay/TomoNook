import { soundLevel, type SoundKind } from '../store/settingsStore.ts'

/**
  Plays a sound effect at the volume the settings allow. `volume` is the
  clip's own level (to even out loud and quiet recordings). Returns the
  audio so it can be stopped, or null when that kind of sound is off.
*/
export function playSound(src: string, kind: SoundKind, volume = 1): HTMLAudioElement | null {
  const level = soundLevel(kind) * volume
  if (level <= 0) return null
  const audio = new Audio(src)
  audio.volume = Math.min(1, level)
  // Browsers block sound until the user has clicked somewhere; then it's just silent.
  void audio.play().catch(() => {})
  return audio
}
