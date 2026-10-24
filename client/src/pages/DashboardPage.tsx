import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { today } from '@tomonook/shared'
import Avatar from '../components/avatar/Avatar.tsx'
import MoodPicker from '../components/mood/MoodPicker.tsx'
import { textOn } from '../components/todo/PrioritySelect.tsx'
import { unlockChime } from '../lib/chime.ts'
import { useProfileStore } from '../store/profileStore.ts'
import { remainingMs, useTimerStore } from '../store/timerStore.ts'
import { priorityOf, useTodoStore } from '../store/todoStore.ts'
import grayTomato from '../assets/tomato/gray-tomato.png'
import redTomato from '../assets/tomato/tomato-no-face.png'
import './DashboardPage.css'

/** A quick look at today: tasks, mood and the clock, each linking to its page. */
export default function DashboardPage() {
  const name = useProfileStore((s) => s.name)
  const avatar = useProfileStore((s) => s.avatar)
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link to="/profile" className="dashboard-avatar" title="Edit your avatar">
          <Avatar avatar={avatar} className="dashboard-avatar-img" />
          <span className="visually-hidden">Profile</span>
        </Link>
        <div>
          <h1 className="page-title dashboard-title">Hi{name ? `, ${name}` : ''} !!</h1>
          <p className="dashboard-date">{dateLabel}</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <TodayTasks />
        <div className="dashboard-side">
          <MoodPicker day={today()} />
          <ClockCard />
        </div>
      </div>
    </div>
  )
}

function Card({ title, link, linkLabel, children }: { title: string; link: string; linkLabel: string; children: ReactNode }) {
  return (
    <section className="dash-card" aria-label={title}>
      <header className="dash-card-header">
        <h2 className="dash-card-title">{title}</h2>
        <Link to={link} className="dash-card-link">
          {linkLabel} →
        </Link>
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
