import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fromDayKey, toDayKey, today, type DayKey, type Todo } from '@tomonook/shared'
import TomatoFill from '../TomatoFill.tsx'
import { priorityOf, useTodoStore } from '../../store/todoStore.ts'
import './MonthOverview.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }))
/** Years in the dropdown on each side of this year (stretched to fit any tasks). */
const YEARS_AROUND = 5
/** Chips per day before "+N more". */
const CHIPS_PER_DAY = 3

/**
  The whole month at a glance, opened from the month name on the to-do
  calendar: every day's tasks in their category colors, and the month's
  unfinished tasks grouped by priority. Picking a day goes to it.
*/
export default function MonthOverview({
  open,
  month: startMonth,
  selected,
  onPickDay,
  onClose,
}: {
  open: boolean
  /** The first of the month to show when it opens. */
  month: Date
  selected: DayKey
  onPickDay: (day: DayKey) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [month, setMonth] = useState(startMonth)
  const categories = useTodoStore((s) => s.categories)
  const todos = useTodoStore((s) => s.todos)
  const priorities = useTodoStore((s) => s.priorities)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setMonth(startMonth)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, startMonth])

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const todayKey = today()
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`

  // Whole weeks, Monday first, including the ends of the months around it.
  const first = new Date(year, monthIndex, 1)
  const start = new Date(year, monthIndex, 1 - ((first.getDay() + 6) % 7))
  const daysShown = Math.ceil(((first.getDay() + 6) % 7 + new Date(year, monthIndex + 1, 0).getDate()) / 7) * 7
  const days = Array.from({ length: daysShown }, (_, i) =>
    toDayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
  )

  const byDay = new Map<DayKey, Todo[]>()
  for (const t of todos) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t])
  const colorOf = (t: Todo) => categories.find((c) => c.id === t.categoryId)?.color

  // The side list: this month's unfinished tasks, by priority, soonest first.
  const open_ = todos
    .filter((t) => !t.done && t.day.startsWith(prefix) && categories.some((c) => c.id === t.categoryId))
    .sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? '').localeCompare(b.time ?? ''))
  const monthDone = todos.filter((t) => t.done && t.day.startsWith(prefix)).length
  const monthTotal = monthDone + open_.length

  const pick = (day: DayKey) => {
    onPickDay(day)
    onClose()
  }
  // This year ± a few, widened to include every year that has tasks.
  const thisYear = new Date().getFullYear()
  const taskYears = todos.map((t) => Number(t.day.slice(0, 4)))
  const firstYear = Math.min(thisYear - YEARS_AROUND, year, ...taskYears)
  const lastYear = Math.max(thisYear + YEARS_AROUND, year, ...taskYears)
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i)
  const shortDate = (day: DayKey) => fromDayKey(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <dialog
      ref={ref}
      className="month-overview"
      aria-labelledby="month-overview-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <header className="mo-header">
        <h2 id="month-overview-title" className="visually-hidden">
          {MONTHS[monthIndex]} {year}
        </h2>
        <div className="mo-title">
          <select
            className="mo-select"
            value={monthIndex}
            onChange={(e) => setMonth(new Date(year, Number(e.target.value), 1))}
            aria-label="Month"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="mo-select is-year"
            value={year}
            onChange={(e) => setMonth(new Date(Number(e.target.value), monthIndex, 1))}
            aria-label="Year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="mo-progress">
          {monthTotal === 0 ? 'No tasks this month yet' : `${monthDone} of ${monthTotal} tasks done`}
        </p>
        <button type="button" className="mo-close" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </header>

      <div className="mo-body">
        <div className="mo-calendar">
          <div className="mo-weekdays" aria-hidden>
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mo-grid" style={{ '--weeks': daysShown / 7 } as CSSProperties}>
            {days.map((day) => {
              const list = byDay.get(day) ?? []
              const done = list.filter((t) => t.done).length
              const d = fromDayKey(day)
              const outside = d.getMonth() !== monthIndex
              const classes = ['mo-day']
              if (outside) classes.push('is-outside')
              if (day === todayKey) classes.push('is-today')
              if (day === selected) classes.push('is-selected')
              if (d.getDay() === 0 || d.getDay() === 6) classes.push('is-weekend')
              return (
                <button
                  key={day}
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => pick(day)}
                  aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${
                    list.length ? `${done} of ${list.length} tasks done` : 'no tasks'
                  }`}
                >
                  <span className="mo-day-top">
                    {list.length > 0 && (
                      <span className="mo-day-tomato" aria-hidden>
                        <TomatoFill fraction={done / list.length} />
                      </span>
                    )}
                    <span className="mo-day-num">{d.getDate() === 1 && outside ? shortDate(day) : d.getDate()}</span>
                  </span>
                  <span className="mo-chips" aria-hidden>
                    {list.slice(0, CHIPS_PER_DAY).map((t) => (
                      <span
                        key={t.id}
                        className={`mo-chip${t.done ? ' is-done' : ''}`}
                        style={{ '--chip': colorOf(t) } as CSSProperties}
                      >
                        <span className="mo-chip-title">{t.title}</span>
                        {t.time && <span className="mo-chip-time">{t.time}</span>}
                      </span>
                    ))}
                    {list.length > CHIPS_PER_DAY && <span className="mo-more">+{list.length - CHIPS_PER_DAY} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="mo-side" aria-label="Still to do this month">
          {priorities.map((p) => {
            const list = open_.filter((t) => priorityOf(priorities, t.priority).id === p.id)
            return (
              <section key={p.id} className="mo-group" style={{ '--prio': p.color } as CSSProperties}>
                <h3 className="mo-group-title">
                  {p.name} <span>{list.length}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="mo-group-empty">Nothing here. Nice!</p>
                ) : (
                  <ul className="mo-list">
                    {list.map((t) => (
                      <li key={t.id} className="mo-item" style={{ '--chip': colorOf(t) } as CSSProperties}>
                        <input
                          type="checkbox"
                          className="mo-check"
                          checked={t.done}
                          onChange={() => toggleTodo(t.id)}
                          aria-label={`Mark “${t.title}” done`}
                        />
                        <button type="button" className="mo-item-title" onClick={() => pick(t.day)} title={t.title}>
                          {t.title}
                        </button>
                        <span className="mo-item-date">
                          {shortDate(t.day)}
                          {t.time && ` · ${t.time}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </aside>
      </div>
    </dialog>
  )
}
