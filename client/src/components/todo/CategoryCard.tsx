import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DayKey, Todo, TodoCategory } from '@tomonook/shared'
import { useTodoStore } from '../../store/todoStore.ts'
import PrioritySelect from './PrioritySelect.tsx'
import TaskRow from './TaskRow.tsx'
import grayTomato from '../../assets/tomato/gray-tomato.png'

/** Droppable id for a whole card, so tasks can be dropped into empty categories. */
export const cardDropId = (categoryId: string) => `cat:${categoryId}`

interface CategoryCardProps {
  category: TodoCategory
  day: DayKey
  todos: Todo[]
  isDropTarget: boolean
  /** Called instead of opening the new-task row until priorities are set up. */
  onNeedSetup: () => void
  /** Bumped by the page to open the new-task row (after setup). */
  openAddSignal?: number
}

export default function CategoryCard({
  category,
  day,
  todos,
  isDropTarget,
  onNeedSetup,
  openAddSignal,
}: CategoryCardProps) {
  const [adding, setAdding] = useState(false)
  /** Undefined means the default (lowest) level. */
  const [priority, setPriority] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const addTodo = useTodoStore((s) => s.addTodo)
  const prioritiesSetUp = useTodoStore((s) => s.prioritiesSetUp)

  useEffect(() => {
    if (openAddSignal) setAdding(true)
  }, [openAddSignal])
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
          onClick={() => (prioritiesSetUp ? setAdding(true) : onNeedSetup())}
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
            <li
              className="todo-item"
              // Stay open while focus moves between the text box and the priority pill.
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setAdding(false)
                  setPriority(undefined)
                }
              }}
            >
              <span className="todo-check">
                <img src={grayTomato} alt="" />
              </span>
              <input
                ref={inputRef}
                className="todo-title todo-text-input"
                placeholder="New task"
                aria-label="New task"
                autoFocus
                onKeyDown={(e) => {
                  const title = e.currentTarget.value.trim()
                  if (e.key === 'Enter' && title) {
                    addTodo(category.id, day, title, priority)
                    e.currentTarget.value = ''
                    // Each new task starts at the default level again.
                    setPriority(undefined)
                  } else if (e.key === 'Escape') {
                    setAdding(false)
                  }
                }}
              />
              <PrioritySelect
                value={priority}
                onChange={(id) => {
                  setPriority(id)
                  inputRef.current?.focus()
                }}
                label="Priority for the new task"
              />
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}
