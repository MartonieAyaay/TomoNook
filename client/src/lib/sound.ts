import { soundLevel, type SoundKind } from '../store/settingsStore.ts'

let ctx: AudioContext | null = null

/**
  An <audio> element can't go above volume 1, so louder-than-recorded sounds
  are routed through a Web Audio gain instead.
*/
function amplify(audio: HTMLAudioElement, gain: number) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const g = ctx.createGain()
    g.gain.value = gain
    ctx.createMediaElementSource(audio).connect(g).connect(ctx.destination)
    audio.volume = 1
  } catch {
    // No Web Audio: play at full volume instead.
    audio.volume = 1
  }
}

/**
  Plays a sound effect at the volume the settings allow. `volume` is the
  clip's own level (to even out loud and quiet recordings; above 1 makes it
  louder than recorded). Returns the audio so it can be stopped, or null
  when that kind of sound is off.
*/
export function playSound(src: string, kind: SoundKind, volume = 1): HTMLAudioElement | null {
  const level = soundLevel(kind) * volume
  if (level <= 0) return null
  const audio = new Audio(src)
  if (level > 1) amplify(audio, level)
  else audio.volume = level
  // Browsers block sound until the user has clicked somewhere; then it's just silent.
  void audio.play().catch((err: Error) => {
    if (err.name !== 'AbortError') console.warn(`Couldn't play ${src}:`, err.name, err.message)
  })
  return audio
}
