// A short two-note chime for when a timer switches between lock-in and chill.
// Browsers only allow sound after a click, so unlockChime() is called from
// the first click anywhere in the app (see main.tsx) and from the timer buttons.

import { soundLevel, useSettingsStore, type ChimeStyle } from '../store/settingsStore.ts'
import { useCustomChimeStore } from './customChime.ts'

let ctx: AudioContext | null = null

export function unlockChime() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // No Web Audio; timers still work silently.
  }
}

/** The tones for each chime style: [frequency, start, length] in Hz and seconds. */
const STYLES: Record<Exclude<ChimeStyle, 'custom'>, { wave: OscillatorType; notes: [number, number, number][] }> = {
  chime: { wave: 'sine', notes: [[660, 0, 0.5], [880, 0.22, 0.5]] },
  bell: { wave: 'triangle', notes: [[784, 0, 1.2], [988, 0.18, 1.2], [1175, 0.36, 1.4]] },
  soft: { wave: 'sine', notes: [[440, 0, 0.9]] },
}

/** Plays the chosen chime, at the volume the settings allow. */
export function chime(style: ChimeStyle = useSettingsStore.getState().chimeStyle) {
  const level = soundLevel('chime')
  if (!ctx || level <= 0) return
  // A new context is still "suspended" for a moment, even right after a click.
  if (ctx.state !== 'running') {
    const c = ctx
    void c.resume().then(() => c.state === 'running' && play(c, style, level), () => {})
    return
  }
  play(ctx, style, level)
}

// The uploaded sound, decoded once and reused.
let custom: { data: string; buffer: Promise<AudioBuffer> } | null = null

async function playCustom(ctx: AudioContext, data: string, level: number) {
  if (custom?.data !== data) {
    const bytes = await (await fetch(data)).arrayBuffer()
    custom = { data, buffer: ctx.decodeAudioData(bytes) }
  }
  const source = ctx.createBufferSource()
  source.buffer = await custom.buffer
  const gain = ctx.createGain()
  gain.gain.value = level
  source.connect(gain).connect(ctx.destination)
  source.start()
}

function play(ctx: AudioContext, style: ChimeStyle, level: number) {
  if (style === 'custom') {
    const sound = useCustomChimeStore.getState().sound
    // Removed since it was picked: the plain chime instead.
    if (sound) return void playCustom(ctx, sound.data, level).catch(() => play(ctx, 'chime', level))
    style = 'chime'
  }
  const start = ctx.currentTime
  const { wave, notes } = STYLES[style]
  for (const [freq, at, length] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    const t = start + at
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.3 * level, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + length + 0.05)
  }
}
