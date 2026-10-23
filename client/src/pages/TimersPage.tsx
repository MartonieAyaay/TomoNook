import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LAP_MAX, elapsedMs, useStopwatchStore } from '../store/stopwatchStore.ts'
import clockArt from '../assets/tomato/clock.png'
import './TimersPage.css'

const TABS = [
  { label: 'Timer', path: '/timers' },
  { label: 'Stopwatch', path: '/timers/stopwatch' },
] as const

export default function TimersPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const stopwatch = pathname.replace(/\/$/, '') === '/timers/stopwatch'
  const running = useStopwatchStore((s) => s.startedAt !== null)
  const paused = useStopwatchStore((s) => s.startedAt === null && s.banked > 0)

  const caption = !stopwatch
    ? 'No timer turned on.'
    : running
      ? 'Stopwatch running.'
      : paused
        ? 'Stopwatch paused.'
        : 'No stopwatch running.'

  return (
    <div className="clock-page">
      <div className="clock-side">
        <h1 className="page-title">Clock !!</h1>

        <div className="clock-tabs" role="tablist" aria-label="Clock mode">
          {TABS.map((t) => {
            const active = (t.label === 'Stopwatch') === stopwatch
            return (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={active}
                className={`clock-tab${active ? ' is-active' : ''}`}
                onClick={() => navigate(t.path)}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <img src={clockArt} alt="" className={`clock-art${stopwatch && running ? ' is-running' : ''}`} />
        <p className="clock-caption" aria-live="polite">
          {caption}
        </p>
      </div>

      {stopwatch && <Stopwatch />}
    </div>
  )
}

/** h:mm:ss, plus hundredths as a separate piece. */
function formatTime(ms: number) {
  const cs = Math.floor(ms / 10)
  const s = Math.floor(cs / 100)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    main: `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`,
    hundredths: pad(cs % 100),
  }
}

const formatFull = (ms: number) => {
  const t = formatTime(ms)
  return `${t.main}.${t.hundredths}`
}

/** Re-renders every frame while running. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [active])
  return active ? now : Date.now()
}

function Stopwatch() {
  const state = useStopwatchStore()
  const { start, pause, lap, stop, laps } = state
  const running = state.startedAt !== null
  const now = useNow(running)
  const elapsed = elapsedMs(state, now)
  const time = formatTime(elapsed)
  const started = running || elapsed > 0

  return (
    <section className="stopwatch-card" aria-label="Stopwatch">
      <h2 className="stopwatch-title">Stopwatch</h2>

      <p className="stopwatch-time" role="timer" aria-label={`Elapsed ${formatFull(elapsed)}`}>
        {time.main}
        <span className="stopwatch-hundredths">.{time.hundredths}</span>
      </p>

      <div className="stopwatch-controls">
        <button
          type="button"
          className="stopwatch-btn is-primary"
          onClick={running ? pause : start}
        >
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
        </button>
        <button
          type="button"
          className="stopwatch-btn is-secondary"
          onClick={lap}
          disabled={!running || laps.length >= LAP_MAX}
        >
          Lap
        </button>
        <button type="button" className="stopwatch-btn is-stop" onClick={stop} disabled={!started}>
          Stop
        </button>
      </div>

      {laps.length > 0 && (
        <ol className="stopwatch-laps" aria-label="Laps" reversed>
          {laps
            .map((total, i) => ({ n: i + 1, total, split: total - (laps[i - 1] ?? 0) }))
            .reverse()
            .map(({ n, total, split }) => (
              <li key={n} className="stopwatch-lap">
                <span className="lap-name">Lap {n}</span>
                <span className="lap-split">+{formatFull(split)}</span>
                <span className="lap-total">{formatFull(total)}</span>
              </li>
            ))}
        </ol>
      )}
    </section>
  )
}
