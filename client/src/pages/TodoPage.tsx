import { useState, type CSSProperties } from 'react'
import { today, type DayKey, type TodoCategory } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import CategoryManager from '../components/CategoryManager.tsx'
import { useTodoStore } from '../store/todoStore.ts'
import grayTomato from '../assets/tomato/gray-tomato.png'
import redTomato from '../assets/tomato/tomato-no-face.png'
import './TodoPage.css'

export default function TodoPage() {
  const [selected, setSelected] = useState<DayKey>(today)
  const [managing, setManaging] = useState(false)
  const categories = useTodoStore((s) => s.categories)
  const todos = useTodoStore((s) => s.todos)

  const renderTomato = (day: DayKey) => {
    const dayTodos = todos.filter((t) => t.day === day)
    const allDone = dayTodos.length > 0 && dayTodos.every((t) => t.done)
    return <img src={allDone ? redTomato : grayTomato} alt="" />
  }

  return (
    <div className="split-page">
      <header className="split-header">
        <h1 className="page-title">To-Do List !!</h1>
        <button type="button" className="add-button" onClick={() => setManaging(true)}>
          Add +
        </button>
      </header>

      <Calendar selected={selected} onSelect={setSelected} renderTomato={renderTomato} />

      <div className="todo-categories">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} day={selected} />
        ))}
        {categories.length === 0 && (
          <button type="button" className="todo-empty" onClick={() => setManaging(true)}>
            Add a category to start your list
          </button>
        )}
      </div>

      <CategoryManager open={managing} onClose={() => setManaging(false)} />
    </div>
  )
}

function CategoryCard({ category, day }: { category: TodoCategory; day: DayKey }) {
  const [adding, setAdding] = useState(false)
  const allTodos = useTodoStore((s) => s.todos)
  const todos = allTodos.filter((t) => t.categoryId === category.id && t.day === day)
  const { addTodo, toggleTodo, deleteTodo } = useTodoStore.getState()

  return (
    <section
      className="todo-card"
      aria-label={category.name}
      style={{ '--cat-color': category.color } as CSSProperties}
    >
      <div className="todo-card-header">
        <h2 className="todo-card-title">{category.name}</h2>
        <button
          type="button"
          className="todo-card-add"
          onClick={() => setAdding(true)}
          aria-label={`Add task to ${category.name}`}
        >
          +
        </button>
      </div>

      <ul className="todo-list">
        {todos.map((t) => (
          <li key={t.id} className={`todo-item${t.done ? ' is-done' : ''}`}>
            <button
              type="button"
              className="todo-check"
              onClick={() => toggleTodo(t.id)}
              aria-pressed={t.done}
              aria-label={t.done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
            >
              <img src={t.done ? redTomato : grayTomato} alt="" />
            </button>
            <span className="todo-title">{t.title}</span>
            <button
              type="button"
              className="todo-delete"
              onClick={() => deleteTodo(t.id)}
              aria-label={`Delete "${t.title}"`}
            >
              ×
            </button>
          </li>
        ))}
        {adding && (
          <li className="todo-item">
            <img className="todo-check-img" src={grayTomato} alt="" />
            <input
              className="todo-title todo-new-input"
              placeholder="New task"
              aria-label="New task"
              autoFocus
              onBlur={() => setAdding(false)}
              onKeyDown={(e) => {
                const title = e.currentTarget.value.trim()
                if (e.key === 'Enter' && title) {
                  addTodo(category.id, day, title)
                  e.currentTarget.value = ''
                } else if (e.key === 'Escape') {
                  setAdding(false)
                }
              }}
            />
          </li>
        )}
      </ul>
    </section>
  )
}
