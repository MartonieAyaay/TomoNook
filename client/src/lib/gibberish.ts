import g1 from '../assets/sounds/gibberish/gibberish1.mp3'
import g2 from '../assets/sounds/gibberish/gibberish2.mp3'
import g3 from '../assets/sounds/gibberish/gibberish3.mp3'
import g4 from '../assets/sounds/gibberish/gibberish4.mp3'
import g5 from '../assets/sounds/gibberish/gibberish5.mp3'
import g6 from '../assets/sounds/gibberish/gibberish6.mp3'
import g7 from '../assets/sounds/gibberish/gibberish7.mp3'
import g8 from '../assets/sounds/gibberish/gibberish8.mp3'
import g9 from '../assets/sounds/gibberish/gibberish9.mp3'
import g10 from '../assets/sounds/gibberish/gibberish10.mp3'
import g11 from '../assets/sounds/gibberish/gibberish11.mp3'
import { playSound } from './sound.ts'

/** One voice line: its file, length in seconds, and loudest point (0-1). */
interface Clip {
  src: string
  seconds: number
  peak: number
}

/*
  Each gossip tomato has its own voice, and no clip is ever used by both.
  Split by sound: the deeper clips go to the tall tomato, the brighter
  ones to the round one.
*/
const VOICES: [Clip[], Clip[]] = [
  [
    { src: g1, seconds: 2.09, peak: 0.55 },
    { src: g2, seconds: 2.53, peak: 0.37 },
    { src: g4, seconds: 2.32, peak: 0.16 },
    { src: g5, seconds: 2.98, peak: 0.27 },
    { src: g8, seconds: 3.16, peak: 0.29 },
  ],
  [
    { src: g3, seconds: 3.06, peak: 0.25 },
    { src: g6, seconds: 1.7, peak: 0.2 },
    { src: g7, seconds: 2.46, peak: 0.31 },
    { src: g9, seconds: 5.36, peak: 0.47 },
    { src: g10, seconds: 1.25, peak: 0.22 },
    { src: g11, seconds: 2.09, peak: 0.22 },
  ],
]

let playing: HTMLAudioElement | null = null
const last = [-1, -1]

/**
  Plays a random line in that tomato's voice (not the one it used last),
  cutting off whatever was playing. Returns how long it lasts, in ms.
*/
export function speak(who: 0 | 1) {
  stopSpeaking()
  const clips = VOICES[who]
  let i = Math.floor(Math.random() * clips.length)
  if (i === last[who]) i = (i + 1) % clips.length
  last[who] = i
  const clip = clips[i]
  // Evens out loud and quiet recordings.
  playing = playSound(clip.src, 'gossip', Math.min(1, 0.22 / clip.peak))
  return clip.seconds * 1000
}

export function stopSpeaking() {
  playing?.pause()
  playing = null
}
