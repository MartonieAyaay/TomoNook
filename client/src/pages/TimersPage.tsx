import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MAX_TIMERS, TIMER_NAME_MAX, TIMER_PHASE_MAX_MS, type TimerPreset } from '@tomonook/shared'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import ClockBuddy from '../components/companion/ClockBuddy.tsx'
import { LAP_MAX, elapsedMs, useStopwatchStore } from '../store/stopwatchStore.ts'
import { remainingMs, useTimerStore } from '../store/timerStore.ts'
import { unlockChime } from '../lib/chime.ts'
import clockArt from '../assets/tomato/clock.png'
import pencilIcon from '../assets/icons/pencil.png'
import trashIcon from '../assets/icons/trash.png'
import './TimersPage.css'

const TABS = [
  { label: 'Timer', path: '/timers' },
  { label: 'Stopwatch', path: '/timers/stopwatch' },
] as const

const PHASE_LABEL = { lock: 'Lock in', chill: 'Chill' } as const

export default function TimersPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const stopwatch = pathname.replace(/\/$/, '') === '/timers/stopwatch'
  const swRunning = useStopwatchStore((s) => s.startedAt !== null)
  const swPaused = useStopwatchStore((s) => s.startedAt === null && s.banked > 0)
  const timerOn = useTimerStore((s) => s.active !== null)
  const timerRunning = useTimerStore((s) => s.active?.endsAt != null)
  const phase = useTimerStore((s) => s.active?.phase)
  const timerCount = useTimerStore((s) => s.timers.length)
  const [editing, setEditing] = useState<TimerPreset | 'new' | null>(null)

  const glowing = stopwatch ? swRunning : timerRunning
  const caption = stopwatch
    ? swRunning
      ? 'Stopwatch running.'
      : swPaused
        ? 'Stopwatch paused.'
        : 'No stopwatch running.'
    : 'No timer turned on.'

  return (
    <div className="clock-page">
      {!stopwatch && (
        <button
          type="button"
          className="add-button clock-add"
          onClick={() => setEditing('new')}
          disabled={timerCount >= MAX_TIMERS}
          title={timerCount >= MAX_TIMERS ? `You can have up to ${MAX_TIMERS} timers` : undefined}
        >
          Add +
        </button>
      )}

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

        <div className="clock-art-wrap">
          <img src={clockArt} alt="" className={`clock-art${glowing ? ' is-running' : ''}`} />
          <ClockBuddy state={(timerRunning && phase === 'lock') || swRunning ? 'focus' : timerRunning ? 'doze' : 'idle'} />
        </div>
        {!stopwatch && timerOn ? (
          <TimerStatus />
        ) : (
          <p className="clock-caption" aria-live="polite">
            {caption}
          </p>
        )}
      </div>

      {stopwatch ? (
        <div className="clock-main">
          <Stopwatch />
          <StopwatchHistory />
        </div>
      ) : (
        <TimerGrid onEdit={setEditing} onAdd={() => setEditing('new')} />
      )}

      <TimerDialog timer={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

// ---------- Time helpers ----------

const pad = (n: number) => String(n).padStart(2, '0')

/** hh:mm:ss, plus hundredths as a separate piece. */
function formatTime(ms: number) {
  const cs = Math.floor(ms / 10)
  const s = Math.floor(cs / 100)
  return {
    main: `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`,
    hundredths: pad(cs % 100),
  }
}

const formatFull = (ms: number) => {
  const t = formatTime(ms)
  return `${t.main}.${t.hundredths}`
}

/** hh:mm:ss, rounding up so a countdown shows 00:00:01 until it really ends. */
const formatCountdown = (ms: number) => formatTime(Math.ceil(ms / 1000) * 1000).main

/** Re-renders every frame while active. */
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

// ---------- Timer ----------

/** The running timer's countdown and controls, under the big clock. */
function TimerStatus() {
  const active = useTimerStore((s) => s.active)
  const timer = useTimerStore((s) => s.timers.find((t) => t.id === s.active?.id))
  const { pauseTimer, resumeTimer, skipPhase, stopTimer } = useTimerStore.getState()
  const now = useNow(active?.endsAt != null)
  if (!active || !timer) return null
  const running = active.endsAt !== null

  return (
    <div className="timer-status" aria-live="polite">
      <p className="timer-status-label">
        {PHASE_LABEL[active.phase]} · Round {active.round}
      </p>
      <p className="timer-status-time" role="timer">
        {formatCountdown(remainingMs(active, now))}
      </p>
      <p className="timer-status-name">{timer.name}</p>
      <div className="stopwatch-controls timer-status-controls">
        <button type="button" className="stopwatch-btn is-primary" onClick={running ? pauseTimer : resumeTimer}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className="stopwatch-btn is-secondary" onClick={skipPhase}>
          Skip
        </button>
        <button type="button" className="stopwatch-btn is-stop" onClick={stopTimer}>
          Stop
        </button>
      </div>
    </div>
  )
}

function TimerGrid({ onEdit, onAdd }: { onEdit: (t: TimerPreset) => void; onAdd: () => void }) {
  const timers = useTimerStore((s) => s.timers)
  const activeId = useTimerStore((s) => s.active?.id)
  const startTimer = useTimerStore((s) => s.startTimer)
  const deleteTimer = useTimerStore((s) => s.deleteTimer)
  const [deleting, setDeleting] = useState<TimerPreset | null>(null)

  return (
    <section className="clock-main timer-grid" aria-label="Timers">
      {timers.length === 0 && (
        <button type="button" className="todo-empty timer-empty" onClick={onAdd}>
          No timers yet. Press Add + to make one.
        </button>
      )}
      {timers.map((t) => {
        const on = t.id === activeId
        return (
          <article key={t.id} className={`timer-card${on ? ' is-on' : ''}`}>
            {/* The whole card starts the timer; the icons sit above this button. */}
            <button
              type="button"
              className="timer-card-start"
              aria-label={on ? `${t.name} is on` : `Start ${t.name}`}
              title={on ? undefined : 'Start'}
              disabled={on}
              onClick={() => {
                unlockChime()
                startTimer(t.id)
              }}
            />
            <header className="timer-card-header">
              <h2 className="timer-card-name">{t.name}</h2>
              <div className="timer-card-icons">
                <button type="button" className="timer-icon-btn" onClick={() => onEdit(t)} aria-label={`Edit ${t.name}`} title="Edit">
                  <img src={pencilIcon} alt="" className="timer-icon-pencil" />
                </button>
                <button type="button" className="timer-icon-btn" onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`} title="Delete">
                  <img src={trashIcon} alt="" />
                </button>
              </div>
            </header>
            <p className="timer-card-label">Lock in for:</p>
            <p className="timer-card-time">{formatCountdown(t.lockMs)}</p>
            <p className="timer-card-label">Chill for:</p>
            <p className="timer-card-time">{formatCountdown(t.chillMs)}</p>
            {on && <span className="timer-card-badge">On</span>}
          </article>
        )
      })}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete timer?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleting) deleteTimer(deleting.id)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      >
        “{deleting?.name}” will be removed{deleting?.id === activeId ? ' and turned off' : ''}.
      </ConfirmDialog>
    </section>
  )
}

const splitMs = (ms: number) => {
  const s = Math.round(ms / 1000)
  return { h: Math.floor(s / 3600), m: Math.floor(s / 60) % 60, s: s % 60 }
}

const MIN = 60_000

/** Add or edit a timer: a name plus how long to lock in and to chill. */
function TimerDialog({ timer, onClose }: { timer: TimerPreset | 'new' | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const addTimer = useTimerStore((s) => s.addTimer)
  const updateTimer = useTimerStore((s) => s.updateTimer)
  const [name, setName] = useState('')
  const [lock, setLock] = useState(splitMs(25 * MIN))
  const [chill, setChill] = useState(splitMs(5 * MIN))
  const open = timer !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      const t = timer === 'new' ? null : timer
      setName(t?.name ?? '')
      setLock(splitMs(t?.lockMs ?? 25 * MIN))
      setChill(splitMs(t?.chillMs ?? 5 * MIN))
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, timer])

  const toMs = (d: { h: number; m: number; s: number }) => ((d.h * 60 + d.m) * 60 + d.s) * 1000
  const lockMs = toMs(lock)
  const chillMs = toMs(chill)
  const valid = lockMs > 0 && chillMs > 0 && lockMs <= TIMER_PHASE_MAX_MS && chillMs <= TIMER_PHASE_MAX_MS

  const submit = () => {
    if (!valid || !timer) return
    if (timer === 'new') addTimer(name, lockMs, chillMs)
    else updateTimer(timer.id, { name, lockMs, chillMs })
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className="confirm-dialog timer-dialog"
      aria-labelledby="timer-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="confirm-body"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h2 id="timer-dialog-title">{timer === 'new' ? 'New timer' : 'Edit timer'}</h2>

        <label className="timer-field">
          <span className="timer-field-label">Name</span>
          <input
            className="timer-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={TIMER_NAME_MAX}
            placeholder="Timer name"
            autoFocus
          />
        </label>

        <DurationField label="Lock in for:" value={lock} onChange={setLock} />
        <DurationField label="Chill for:" value={chill} onChange={setChill} />

        {!valid && <p className="timer-error">Both times need to be at least 1 second.</p>}

        <div className="confirm-actions">
          <button type="button" className="confirm-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="confirm-btn confirm-btn-primary" disabled={!valid}>
            {timer === 'new' ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

type Duration = { h: number; m: number; s: number }

function DurationField({ label, value, onChange }: { label: string; value: Duration; onChange: (d: Duration) => void }) {
  const parts = [
    { key: 'h', name: 'hours', max: 23 },
    { key: 'm', name: 'minutes', max: 59 },
    { key: 's', name: 'seconds', max: 59 },
  ] as const

  return (
    <fieldset className="timer-field timer-duration">
      <legend className="timer-field-label">{label}</legend>
      {parts.map((p, i) => (
        <span key={p.key} className="timer-duration-part">
          {i > 0 && <span aria-hidden>:</span>}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={p.max}
            aria-label={`${label.replace(':', '')} ${p.name}`}
            value={pad(value[p.key])}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const n = Math.min(p.max, Math.max(0, Math.floor(Number(e.target.value) || 0)))
              onChange({ ...value, [p.key]: n })
            }}
          />
        </span>
      ))}
    </fieldset>
  )
}

// ---------- Stopwatch ----------

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
        <button type="button" className="stopwatch-btn is-primary" onClick={running ? pause : start}>
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

/** "Today, 3:42 PM", "Yesterday, 9:05 AM" or "Oct 21, 3:42 PM". */
function formatWhen(at: number) {
  const d = new Date(at)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`
}

/** The last few stopwatch runs, saved each time Stop is pressed. */
function StopwatchHistory() {
  const history = useStopwatchStore((s) => s.history)
  const clearHistory = useStopwatchStore((s) => s.clearHistory)

  return (
    <section className="stopwatch-card stopwatch-history" aria-labelledby="sw-history-title">
      <header className="stopwatch-history-header">
        <h2 className="stopwatch-title" id="sw-history-title">
          History
        </h2>
        {history.length > 0 && (
          <button type="button" className="stopwatch-clear" onClick={clearHistory}>
            Clear
          </button>
        )}
      </header>
      {history.length === 0 ? (
        <p className="stopwatch-history-empty">Your last 5 runs show up here after you press Stop.</p>
      ) : (
        <ol className="stopwatch-history-list">
          {history.map((run) => (
            <li key={run.endedAt} className="stopwatch-run">
              <span className="run-when">{formatWhen(run.endedAt)}</span>
              <span className="run-laps">
                {run.laps === 0 ? 'No laps' : `${run.laps} lap${run.laps === 1 ? '' : 's'}`}
              </span>
              <span className="lap-total">{formatFull(run.total)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
