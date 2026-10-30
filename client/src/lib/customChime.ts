import { create } from 'zustand'
import { load, save } from './storage.ts'

/*
  The user's own alarm sound for the timers. It's kept in the browser as a
  data URL (so it's in backups and the account too), separate from the other settings so
  that changing a setting doesn't rewrite the whole clip each time.
*/

/** Clips must be shorter than this. */
export const CUSTOM_CHIME_MAX_SECONDS = 10
/** Browser storage is small (about 5 MB for everything), so clips are capped. */
export const CUSTOM_CHIME_MAX_BYTES = 1024 * 1024

export interface CustomChime {
  name: string
  /** The sound file as a data: URL. */
  data: string
  seconds: number
}

interface CustomChimeState {
  sound: CustomChime | null
  /** Throws if there's no room left to save it. */
  setSound: (sound: CustomChime) => void
  removeSound: () => void
}

export const useCustomChimeStore = create<CustomChimeState>((set) => ({
  sound: load<CustomChime | null>('customChime', null),
  setSound: (sound) => {
    if (!save('customChime', sound)) {
      throw new Error('There’s not enough room to save that sound. Try a shorter or smaller clip.')
    }
    set({ sound })
  },
  removeSound: () => {
    save('customChime', null)
    set({ sound: null })
  },
}))

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Checks an uploaded file and returns it ready to save. Throws a message the user can read. */
export async function readCustomChime(file: File): Promise<CustomChime> {
  if (!file.type.startsWith('audio/')) throw new Error('That isn’t a sound file. Try an MP3, WAV or OGG.')
  if (file.size > CUSTOM_CHIME_MAX_BYTES) throw new Error('That file is over 1 MB. Try a shorter or smaller clip.')

  let seconds: number
  try {
    // An offline context decodes without needing a click or making any sound.
    const ctx = new OfflineAudioContext(1, 1, 44100)
    seconds = (await ctx.decodeAudioData(await file.arrayBuffer())).duration
  } catch {
    throw new Error('That sound couldn’t be opened. Try another file.')
  }
  if (seconds >= CUSTOM_CHIME_MAX_SECONDS) {
    throw new Error(`That sound is ${seconds.toFixed(1)} seconds long. It needs to be under ${CUSTOM_CHIME_MAX_SECONDS} seconds.`)
  }
  return { name: file.name, data: await readAsDataUrl(file), seconds }
}
