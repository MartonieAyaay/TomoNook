import { create } from 'zustand'
import { load, save } from '../lib/storage.ts'

export const TOMATO_NAME_MAX = 20

/** Whether the tomatoes may use the user's location to check the weather. */
export type WeatherPermission = 'unasked' | 'allowed' | 'denied'

interface GossipState {
  /**
    The two gossip tomatoes: [named after a favorite character, named after a pet].
    null until the user names them, which is the last step of first-time setup.
  */
  names: [string, string] | null
  weather: WeatherPermission
  setNames: (character: string, pet: string) => void
  setWeather: (w: WeatherPermission) => void
}

const clean = (name: string) => name.trim().slice(0, TOMATO_NAME_MAX)

export const useGossipStore = create<GossipState>((set) => ({
  names: load<[string, string] | null>('tomatoNames', null),
  weather: load<WeatherPermission>('weatherPermission', 'unasked'),
  setNames: (character, pet) => set({ names: [clean(character), clean(pet)] }),
  setWeather: (weather) => set({ weather }),
}))

useGossipStore.subscribe((s) => {
  save('tomatoNames', s.names)
  save('weatherPermission', s.weather)
})
