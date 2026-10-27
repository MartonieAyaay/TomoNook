import { load, save } from './storage.ts'
import { useSettingsStore } from '../store/settingsStore.ts'

/*
  Weather for the dashboard and the gossip tomatoes, from Open-Meteo (free,
  no account). Based on the city the user picks, and only fetched once they
  have. Kept for an hour so it isn't fetched often.
*/

/** A place from the city search. */
export interface City {
  name: string
  /** State or province, when there is one. */
  region?: string
  country: string
  lat: number
  lon: number
}

/** "Manila, Metro Manila, Philippines" */
export const cityLabel = (c: City) => [c.name, c.region, c.country].filter((x, i, all) => x && all.indexOf(x) === i).join(', ')

/** Thrown by fetchWeather() when no city has been picked yet. */
export class NoCityError extends Error {
  constructor() {
    super('No city picked yet')
  }
}

/** Up to five places matching what the user typed. */
export async function searchCities(query: string): Promise<City[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`,
  )
  if (!res.ok) throw new Error(`City search failed: ${res.status}`)
  const data = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[]
  }
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1,
    country: r.country ?? '',
    lat: r.latitude,
    lon: r.longitude,
  }))
}

export interface Weather {
  /** Now, in `unit` (always °C for new fetches; shown in the user's unit). */
  temp: number
  feelsLike: number
  /** Today's high and low. */
  high: number
  low: number
  /** The highest chance of rain in any hour left today, 0-100. */
  rainChance: number
  /** How much rain is expected over the rest of today, in mm. */
  rainMm: number
  /** WMO weather code. */
  code: number
  isDay: boolean
  unit: 'C' | 'F'
  /** The city it's for, as cityLabel() writes it. */
  place: string
  at: number
}

const FRESH_MS = 60 * 60_000

export type TempUnit = 'F' | 'C' | 'K'

/** The order the unit button steps through. */
export const TEMP_UNITS: TempUnit[] = ['F', 'C', 'K']

/** Countries that use Fahrenheit, going by the browser's language region. */
const FAHRENHEIT = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'])

/** The unit to show before the user picks one. */
export function defaultTempUnit(): TempUnit {
  const region = navigator.language.split('-')[1]?.toUpperCase()
  return region && FAHRENHEIT.has(region) ? 'F' : 'C'
}

/** The saved weather if it's still fresh and for the city picked now. */
export function cachedWeather(): Weather | null {
  const city = useSettingsStore.getState().weatherCity
  const w = load<Partial<Weather> | null>('weather', null)
  return city && w && w.place === cityLabel(city) && typeof w.rainMm === 'number' && Date.now() - (w.at ?? 0) < FRESH_MS ? (w as Weather) : null
}

/** Fetches the weather for the picked city. Throws NoCityError if there isn't one, or if it can't be reached. */
export async function fetchWeather(): Promise<Weather> {
  const city = useSettingsStore.getState().weatherCity
  if (!city) throw new NoCityError()
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${city.lat.toFixed(2)}&longitude=${city.lon.toFixed(2)}` +
    '&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation,cloud_cover' +
    '&hourly=precipitation_probability,precipitation' +
    '&daily=temperature_2m_max,temperature_2m_min' +
    '&timezone=auto&forecast_days=1'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`)
  const data = (await res.json()) as {
    current: {
      time: string
      temperature_2m: number
      apparent_temperature: number
      weather_code: number
      is_day: number
      precipitation: number
      cloud_cover: number
    }
    hourly: { time: string[]; precipitation_probability: (number | null)[]; precipitation: (number | null)[] }
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
  }
  // Kept to a tenth, so converting to another unit rounds only once.
  const tenth = (n: number) => Math.round(n * 10) / 10
  // Only the hours still to come: rain this morning doesn't help plan the afternoon.
  // (Both times are the city's local time, e.g. "2026-10-27T14:00".)
  const thisHour = data.current.time.slice(0, 13)
  const later = data.hourly.time.flatMap((t, i) => (t.slice(0, 13) >= thisHour ? [i] : []))
  const rainChance = Math.max(0, ...later.map((i) => data.hourly.precipitation_probability[i] ?? 0))
  const rainMm = later.reduce((sum, i) => sum + (data.hourly.precipitation[i] ?? 0), 0)
  const w: Weather = {
    temp: tenth(data.current.temperature_2m),
    feelsLike: tenth(data.current.apparent_temperature),
    high: tenth(data.daily.temperature_2m_max[0]),
    low: tenth(data.daily.temperature_2m_min[0]),
    rainChance,
    rainMm: tenth(rainMm),
    code: skyCode(data.current.weather_code, data.current.precipitation, data.current.cloud_cover),
    isDay: data.current.is_day === 1,
    unit: 'C',
    place: cityLabel(city),
    at: Date.now(),
  }
  save('weather', w)
  return w
}

/*
  The forecast model often calls a sunny-but-humid sky "light drizzle" or
  "light rain" with only a trace of water. Below this much rain an hour, the
  sky is described by its clouds instead, so the card doesn't say "rainy" on
  a dry day.
*/
const TRACE_MM = 0.2
const LIGHT_WET = new Set([51, 53, 55, 56, 61, 80])

function skyCode(code: number, mm: number, cloudCover: number) {
  if (!LIGHT_WET.has(code) || mm >= TRACE_MM) return code
  return cloudCover >= 85 ? 3 : cloudCover >= 40 ? 2 : cloudCover >= 15 ? 1 : 0
}

/** Worth an umbrella: a good chance of rain, and enough of it to get wet. */
export const rainLikely = (w: Weather) => w.rainChance >= 60 && w.rainMm >= 1

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

/** A temperature from this weather, rounded, in the unit asked for: "84°", "29°" or "302 K". */
export function formatTemp(w: Weather, t: number, unit: TempUnit) {
  const c = celsius(w, t)
  if (unit === 'K') return `${Math.round(c + 273.15)} K`
  return `${Math.round(unit === 'F' ? (c * 9) / 5 + 32 : c)}°`
}

/** A short tomato-flavoured tip for the weather, about "you". */
export function weatherTip(w: Weather) {
  const sky = skyOf(w.code)
  const c = celsius(w, w.temp)
  if (sky === 'storm') return 'Stormy out there. A cozy day indoors!'
  if (sky === 'rain' || rainLikely(w)) return 'Grab an umbrella if you head out!'
  if (sky === 'snow') return 'Bundle up, it’s snowy!'
  if (c >= 30) return 'It’s hot! Drink lots of water.'
  if (c <= 10) return 'Chilly today. Wear something warm!'
  if (sky === 'clear' && w.isDay) return 'Perfect tomato-ripening weather.'
  return 'A nice day to get things done.'
}
