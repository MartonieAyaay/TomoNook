import type { Sky } from '../lib/weather.ts'

const OUTLINE = '#871d10'
const SUN = '#f5c851'
const CLOUD = '#fff6de'
const RAIN = '#4a7fd1'

/** A small hand-drawn-style picture of the sky, in the app's colors. */
export default function WeatherIcon({ sky, isDay }: { sky: Sky; isDay: boolean }) {
  return (
    <svg className="weather-icon" viewBox="0 0 64 64" aria-hidden>
      {sky === 'clear' && (isDay ? <Sun cx={32} cy={32} r={14} /> : <Moon />)}
      {sky === 'cloudy' && (
        <>
          {isDay ? <Sun cx={22} cy={22} r={10} /> : <Moon small />}
          <Cloud y={6} />
        </>
      )}
      {sky === 'fog' && (
        <>
          <Cloud y={-2} />
          <g stroke={OUTLINE} strokeWidth="3" strokeLinecap="round">
            <path d="M14 50h30M22 57h28" />
          </g>
        </>
      )}
      {sky === 'rain' && (
        <>
          <Cloud y={-4} />
          <g stroke={RAIN} strokeWidth="3.5" strokeLinecap="round">
            <path d="M22 50l-3 7M33 50l-3 7M44 50l-3 7" />
          </g>
        </>
      )}
      {sky === 'snow' && (
        <>
          <Cloud y={-4} />
          <g fill={CLOUD} stroke={OUTLINE} strokeWidth="2">
            <circle cx="21" cy="54" r="3" />
            <circle cx="32" cy="57" r="3" />
            <circle cx="43" cy="54" r="3" />
          </g>
        </>
      )}
      {sky === 'storm' && (
        <>
          <Cloud y={-4} />
          <path d="M34 44l-7 10h6l-4 9 11-13h-6l4-6z" fill={SUN} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

function Sun({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  return (
    <g stroke={OUTLINE} strokeWidth="3" strokeLinecap="round">
      {rays.map((a) => (
        <line
          key={a}
          x1={cx + Math.cos(a) * (r + 4)}
          y1={cy + Math.sin(a) * (r + 4)}
          x2={cx + Math.cos(a) * (r + 9)}
          y2={cy + Math.sin(a) * (r + 9)}
          stroke={SUN}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  )
}

function Moon({ small = false }: { small?: boolean }) {
  return small ? (
    <path d="M24 10a11 11 0 1 0 10 15 9 9 0 0 1-10-15z" fill={SUN} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
  ) : (
    <path d="M30 12a20 20 0 1 0 22 26 16 16 0 0 1-22-26z" fill={SUN} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
  )
}

function Cloud({ y }: { y: number }) {
  return (
    <path
      transform={`translate(0 ${y})`}
      d="M18 46a10 10 0 0 1 0-20 13 13 0 0 1 25-3 11 11 0 0 1 3 23z"
      fill={CLOUD}
      stroke={OUTLINE}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  )
}
