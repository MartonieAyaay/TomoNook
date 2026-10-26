import { load, save } from './storage.ts'

/*
  Weather for the dashboard and the gossip tomatoes, from Open-Meteo (free,
  no account). Only used after the user allows it, since it needs their
  location and the internet. Kept for an hour so it isn't fetched often.
*/

export interface Weather {
  /** Now, in `unit`. */
  temp: number
  feelsLike: number
  /** Today's high and low. */
  high: number
  low: number
  /** Today's highest chance of rain, 0-100. */
  rainChance: number
  /** WMO weather code. */
  code: number
  isDay: boolean
  unit: 'C' | 'F'
  at: number
}

const FRESH_MS = 60 * 60_000

/** Countries that use Fahrenheit, going by the browser's language region. */
const FAHRENHEIT = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'])

function preferredUnit(): 'C' | 'F' {
  const region = navigator.language.split('-')[1]?.toUpperCase()
  return region && FAHRENHEIT.has(region) ? 'F' : 'C'
}

/** The saved weather if it's still fresh (and from this version of the app). */
export function cachedWeather(): Weather | null {
  const w = load<Partial<Weather> | null>('weather', null)
  return w && typeof w.high === 'number' && Date.now() - (w.at ?? 0) < FRESH_MS ? (w as Weather) : null
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000, maximumAge: 3 * 60 * 60_000 }),
  )
}

/** True when the error means the user (or browser) said no to location. */
export const isLocationDenied = (e: unknown) =>
  e instanceof GeolocationPositionError && e.code === e.PERMISSION_DENIED

/** Asks for the location if needed, then fetches. Throws if the user says no or it can't be reached. */
export async function fetchWeather(): Promise<Weather> {
  const { coords } = await position()
  const unit = preferredUnit()
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}` +
    '&current=temperature_2m,apparent_temperature,weather_code,is_day' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=1' +
    (unit === 'F' ? '&temperature_unit=fahrenheit' : '')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`)
  const data = (await res.json()) as {
    current: { temperature_2m: number; apparent_temperature: number; weather_code: number; is_day: number }
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] }
  }
  const w: Weather = {
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    rainChance: data.daily.precipitation_probability_max[0] ?? 0,
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    unit,
    at: Date.now(),
  }
  save('weather', w)
  return w
}

export type Sky = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

/** The kind of sky for a WMO code. */
export function skyOf(code: number): Sky {
  if (code === 0) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'
  if (code <= 77 || code === 85 || code === 86) return 'snow'
  return 'storm'
}

/** A few words for a WMO code, e.g. "rainy". */
export function describeWeather(code: number, isDay = true) {
  if (code === 0) return isDay ? 'sunny and clear' : 'clear'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'cloudy'
  if (code <= 48) return 'foggy'
  if (code <= 57) return 'drizzly'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'showery'
  if (code <= 86) return 'snowy'
  return 'stormy'
}

/** The temperature in °C, whatever unit it was fetched in. */
export const celsius = (w: Weather, t: number) => (w.unit === 'F' ? ((t - 32) * 5) / 9 : t)

/** A short tomato-flavoured tip for the weather, about "you". */
export function weatherTip(w: Weather) {
  const sky = skyOf(w.code)
  const c = celsius(w, w.temp)
  if (sky === 'storm') return 'Stormy out there. A cozy day indoors!'
  if (sky === 'rain' || w.rainChance >= 60) return 'Grab an umbrella if you head out!'
  if (sky === 'snow') return 'Bundle up, it’s snowy!'
  if (c >= 30) return 'It’s hot! Drink lots of water.'
  if (c <= 10) return 'Chilly today. Wear something warm!'
  if (sky === 'clear' && w.isDay) return 'Perfect tomato-ripening weather.'
  return 'A nice day to get things done.'
}
