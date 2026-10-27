import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { today } from '@tomonook/shared'
import MoodPicker from '../components/mood/MoodPicker.tsx'
import WeatherIcon from '../components/WeatherIcon.tsx'
import CityPicker from '../components/CityPicker.tsx'
import {
  TEMP_UNITS,
  cachedWeather,
  defaultTempUnit,
  describeWeather,
  fetchWeather,
  formatTemp,
  cityLabel,
  skyOf,
  weatherTip,
  type City,
  type Weather,
} from '../lib/weather.ts'
import { useGossipStore } from '../store/gossipStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import { textOn } from '../components/todo/PrioritySelect.tsx'
import { unlockChime } from '../lib/chime.ts'
import { useProfileStore } from '../store/profileStore.ts'
import { remainingMs, useTimerStore } from '../store/timerStore.ts'
import { priorityOf, useTodoStore } from '../store/todoStore.ts'
import grayTomato from '../assets/tomato/gray-tomato.png'
import redTomato from '../assets/tomato/tomato-no-face.png'
import './DashboardPage.css'

/** A quick look at today: tasks, weather, mood and the clock. */
export default function DashboardPage() {
  const name = useProfileStore((s) => s.name)
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="page-title dashboard-title">Hi{name ? `, ${name}` : ''} !!</h1>
          <p className="dashboard-date">{dateLabel}</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-side">
          <TodayTasks />
          <WeatherCard />
        </div>
        <div className="dashboard-side">
          <MoodPicker day={today()} compact />
          <ClockCard />
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  link,
  linkLabel,
  action,
  children,
}: {
  title: string
  link?: string
  linkLabel?: string
  /** Something else for the header's right side, like a refresh button. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="dash-card" aria-label={title}>
      <header className="dash-card-header">
        <h2 className="dash-card-title">{title}</h2>
        {link && (
          <Link to={link} className="dash-card-link">
            {linkLabel} →
          </Link>
        )}
        {action}
      </header>
      {children}
    </section>
  )
}

function TodayTasks() {
  const day = today()
  const allTodos = useTodoStore((s) => s.todos)
  const priorities = useTodoStore((s) => s.priorities)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const todos = allTodos.filter((t) => t.day === day)
  const done = todos.filter((t) => t.done).length
  // Unfinished first, then by priority (highest first).
  const rank = (id: string | undefined) => priorities.indexOf(priorityOf(priorities, id))
  const sorted = [...todos].sort((a, b) => Number(a.done) - Number(b.done) || rank(a.priority) - rank(b.priority))

  return (
    <Card title="Today’s tasks" link="/todo" linkLabel="To-do list">
      {todos.length === 0 ? (
        <p className="dash-empty">
          Nothing planned today. <Link to="/todo">Add a task</Link>
        </p>
      ) : (
        <>
          <div className="dash-progress" aria-label={`${done} of ${todos.length} tasks done`}>
            <div className="dash-progress-bar">
              <span style={{ width: `${(done / todos.length) * 100}%` }} />
            </div>
            <span className="dash-progress-count" aria-hidden>
              {done}/{todos.length}
            </span>
          </div>
          <ul className="dash-tasks">
            {sorted.map((t) => {
              const p = priorityOf(priorities, t.priority)
              return (
                <li key={t.id} className={`dash-task${t.done ? ' is-done' : ''}`}>
                  <button
                    type="button"
                    className="dash-task-check"
                    onClick={() => toggleTodo(t.id)}
                    aria-pressed={t.done}
                    aria-label={t.done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                  >
                    <img src={t.done ? redTomato : grayTomato} alt="" />
                  </button>
                  <span className="dash-task-title">{t.title}</span>
                  <span className="dash-task-pill" style={{ background: p.color, color: textOn(p.color) }}>
                    {p.name}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatCountdown = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

function ClockCard() {
  const timers = useTimerStore((s) => s.timers)
  const active = useTimerStore((s) => s.active)
  const { startTimer, pauseTimer, resumeTimer } = useTimerStore.getState()
  const navigate = useNavigate()
  const timer = timers.find((t) => t.id === active?.id)
  const running = active?.endsAt != null
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  return (
    <Card title="Clock" link="/timers" linkLabel="Timers">
      {active && timer ? (
        <div className="dash-timer">
          <div>
            <p className="dash-timer-phase">
              {active.phase === 'lock' ? 'Lock in' : 'Chill'} · {timer.name}
            </p>
            <p className="dash-timer-time" role="timer">
              {formatCountdown(remainingMs(active, now))}
            </p>
          </div>
          <button type="button" className="dash-btn" onClick={running ? pauseTimer : resumeTimer}>
            {running ? 'Pause' : 'Resume'}
          </button>
        </div>
      ) : timers.length === 0 ? (
        <p className="dash-empty">
          No timers yet. <Link to="/timers">Make one</Link>
        </p>
      ) : (
        <>
          <p className="dash-empty">No timer running. Start one:</p>
          <div className="dash-timer-starts">
            {timers.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                className="dash-btn"
                onClick={() => {
                  unlockChime()
                  startTimer(t.id)
                  navigate('/timers')
                }}
              >
                ▶ {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

/**
  Today's weather where the user is. It needs their location and the
  internet, so it waits for them to ask; the same permission lets the
  gossip tomatoes talk about the weather (and can be changed in Settings).
*/
function WeatherCard() {
  const permission = useGossipStore((s) => s.weather)
  const setPermission = useGossipStore((s) => s.setWeather)
  const [weather, setWeather] = useState<Weather | null>(cachedWeather)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  // °F → °C → K, remembered until changed.
  const unit = useSettingsStore((s) => s.tempUnit) ?? defaultTempUnit()
  const update = useSettingsStore((s) => s.update)
  const city = useSettingsStore((s) => s.weatherCity)
  const [changingCity, setChangingCity] = useState(false)
  const nextUnit = TEMP_UNITS[(TEMP_UNITS.indexOf(unit) + 1) % TEMP_UNITS.length]
  const unitLabel = (u: string) => (u === 'K' ? 'K' : `°${u}`)

  const check = useCallback(async () => {
    setLoading(true)
    setNote('')
    try {
      setWeather(await fetchWeather())
      setPermission('allowed')
    } catch {
      setNote('Couldn’t reach the weather right now. Check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }, [setPermission])

  // Already allowed: refresh quietly when what's saved is over an hour old.
  useEffect(() => {
    if (permission === 'allowed' && city && !cachedWeather()) void check()
  }, [permission, city, check])

  const pickCity = (c: City) => {
    update({ weatherCity: c })
    setChangingCity(false)
    setWeather(null)
    void check()
  }

  const shown = permission === 'allowed' && city && !changingCity && weather?.place === cityLabel(city) ? weather : null
  const desc = shown ? describeWeather(shown.code, shown.isDay) : ''

  return (
    <Card
      title="Weather"
      action={
        shown && (
          <>
            <button
              type="button"
              className="weather-unit"
              onClick={() => update({ tempUnit: nextUnit })}
              aria-label={`Showing ${unitLabel(unit)}. Switch to ${unitLabel(nextUnit)}`}
              title={`Switch to ${unitLabel(nextUnit)}`}
            >
              {unitLabel(unit)}
            </button>
            <button
              type="button"
              className="weather-refresh"
              onClick={check}
              disabled={loading}
              aria-label="Refresh the weather"
              title="Refresh"
            >
              ↻
            </button>
          </>
        )
      }
    >
      {shown ? (
        <div className={`weather${loading ? ' is-loading' : ''}`}>
          <div className="weather-now">
            <WeatherIcon sky={skyOf(shown.code)} isDay={shown.isDay} />
            <div>
              <p className="weather-temp">
                {formatTemp(shown, shown.temp, unit)}
                {unit !== 'K' && unit}
              </p>
              <p className="weather-desc">{desc[0].toUpperCase() + desc.slice(1)}</p>
            </div>
          </div>
          <ul className="weather-facts">
            <li>Feels like {formatTemp(shown, shown.feelsLike, unit)}</li>
            <li>
              High {formatTemp(shown, shown.high, unit)} · Low {formatTemp(shown, shown.low, unit)}
            </li>
            <li>{shown.rainChance}% chance of rain later today</li>
          </ul>
          <p className="weather-tip">{weatherTip(shown)}</p>
          <p className="weather-updated">
            {shown.place} · Updated {new Date(shown.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {' · '}
            <button type="button" className="weather-change" onClick={() => setChangingCity(true)}>
              Change city
            </button>
          </p>
        </div>
      ) : loading ? (
        <p className="dash-empty">Checking the sky...</p>
      ) : !city || changingCity ? (
        <div className="weather-ask">
          {!changingCity && <p className="dash-empty">Tell us your city and we’ll show today’s weather there.</p>}
          <CityPicker onPick={pickCity} onCancel={changingCity ? () => setChangingCity(false) : undefined} />
        </div>
      ) : (
        <div className="weather-ask">
          <p className="dash-empty">See today’s weather in {cityLabel(city)}.</p>
          <button
            type="button"
            className="dash-btn"
            onClick={() => {
              setPermission('allowed')
              void check()
            }}
          >
            {permission === 'allowed' ? 'Try again' : 'Show the weather'}
          </button>
        </div>
      )}
      {note && (
        <p className="weather-note" role="alert">
          {note}
        </p>
      )}
    </Card>
  )
}
