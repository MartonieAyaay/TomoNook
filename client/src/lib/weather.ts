import { load, save } from './storage.ts'

/*
  Weather for the gossip tomatoes, from Open-Meteo (free, no account). Only
  used after the user says the tomatoes may check, since it needs their
  location and the internet. Kept for an hour so it isn't fetched often.
*/

export interface Weather {
  /** °C */
  temp: number
  /** WMO weather code. */
  code: number
  at: number
}

const FRESH_MS = 60 * 60_000

export function cachedWeather(): Weather | null {
  const w = load<Weather | null>('weather', null)
  return w && Date.now() - w.at < FRESH_MS ? w : null
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000, maximumAge: 3 * 60 * 60_000 }),
  )
}

/** Asks for the location if needed, then fetches. Throws if the user says no or it can't be reached. */
export async function fetchWeather(): Promise<Weather> {
  const { coords } = await position()
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}` +
    '&current=temperature_2m,weather_code'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`)
  const data = (await res.json()) as { current: { temperature_2m: number; weather_code: number } }
  const w = { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, at: Date.now() }
  save('weather', w)
  return w
}

/** A few words for a WMO code, e.g. "rainy". */
export function describeWeather(code: number) {
  if (code === 0) return 'sunny and clear'
  if (code <= 3) return 'a bit cloudy'
  if (code <= 48) return 'foggy'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'showery'
  return 'stormy'
}
