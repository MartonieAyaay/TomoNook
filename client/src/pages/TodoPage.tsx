import { useState } from 'react'
import { today, type DayKey, type TodoCategory } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import { useTodoStore } from '../store/todoStore.ts'
import grayTomato from '../assets/tomato/gray-tomato.png'
import redTomato from '../assets/tomato/tomato-no-face.png'
import './TodoPage.css'

export default function TodoPage() {
  const [selected, setSelected] = useState<DayKey>(today)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const categories = useTodoStore((s) => s.categories)
  const todos = useTodoStore((s) => s.todos)
  const addCategory = useTodoStore((s) => s.addCategory)

  const handleAddCategory = () => {
    addCategory(`Category ${categories.length + 1}`)
    setEditingCategory(useTodoStore.getState().categories.at(-1)!.id)
  }

  const renderTomato = (day: DayKey) => {
    const dayTodos = todos.filter((t) => t.day === day)
    const allDone = dayTodos.length > 0 && dayTodos.every((t) => t.done)
    return <img src={allDone ? redTomato : grayTomato} alt="" />
  }

  return (
    <div className="split-page">
      <header className="split-header">
        <h1 className="page-title">To-Do List !!</h1>
        <button type="button" className="add-button" onClick={handleAddCategory}>
          Add +
        </button>
      </header>

      <Calendar selected={selected} onSelect={setSelected} renderTomato={renderTomato} />

      <div className="todo-categories">
        {categories.map((c) => (
          <CategoryCard
            key={c.id}
            category={c}
            day={selected}
            editing={editingCategory === c.id}
            onEditDone={() => setEditingCategory(null)}
            onEditStart={() => setEditingCategory(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface CategoryCardProps {
  category: TodoCategory
  day: DayKey
  editing: boolean
  onEditStart: () => void
  onEditDone: () => void
}

function CategoryCard({ category, day, editing, onEditStart, onEditDone }: CategoryCardProps) {
  const [adding, setAdding] = useState(false)
  const allTodos = useTodoStore((s) => s.todos)
  const todos = allTodos.filter((t) => t.categoryId === category.id && t.day === day)
  const { addTodo, toggleTodo, deleteTodo, renameCategory } = useTodoStore.getState()

  return (
    <section className="todo-card" aria-label={category.name}>
      <div className="todo-card-header">
        {editing ? (
          <input
            className="todo-card-title todo-card-title-input"
            defaultValue={category.name}
            aria-label="Category name"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const name = e.currentTarget.value.trim()
              if (name) renameCategory(category.id, name)
              onEditDone()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            }}
          />
        ) : (
          <h2 className="todo-card-title">
            <button type="button" onClick={onEditStart} title="Rename category">
              {category.name}
            </button>
          </h2>
        )}
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
