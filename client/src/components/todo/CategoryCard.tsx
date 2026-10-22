import { useState, type CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DayKey, Todo, TodoCategory } from '@tomonook/shared'
import { useTodoStore } from '../../store/todoStore.ts'
import TaskRow from './TaskRow.tsx'
import grayTomato from '../../assets/tomato/gray-tomato.png'

/** Droppable id for a whole card, so tasks can be dropped into empty categories. */
export const cardDropId = (categoryId: string) => `cat:${categoryId}`

interface CategoryCardProps {
  category: TodoCategory
  day: DayKey
  todos: Todo[]
  isDropTarget: boolean
}

export default function CategoryCard({ category, day, todos, isDropTarget }: CategoryCardProps) {
  const [adding, setAdding] = useState(false)
  const addTodo = useTodoStore((s) => s.addTodo)
  const { setNodeRef } = useDroppable({ id: cardDropId(category.id) })

  return (
    <section
      ref={setNodeRef}
      className={`todo-card${isDropTarget ? ' is-drop-target' : ''}`}
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

      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="todo-list">
          {todos.map((t) => (
            <TaskRow key={t.id} todo={t} />
          ))}
          {adding && (
            <li className="todo-item">
              <span className="todo-check">
                <img src={grayTomato} alt="" />
              </span>
              <input
                className="todo-title todo-text-input"
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
      </SortableContext>
    </section>
  )
}
