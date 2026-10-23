import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Todo } from '@tomonook/shared'
import { priorityOf, useTodoStore } from '../../store/todoStore.ts'
import PrioritySelect, { textOn } from './PrioritySelect.tsx'
import grayTomato from '../../assets/tomato/gray-tomato.png'
import redTomato from '../../assets/tomato/tomato-no-face.png'

export default function TaskRow({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false)
  const { toggleTodo, deleteTodo, updateTodoTitle, setTodoPriority } = useTodoStore.getState()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: editing,
  })
  // The row is a list item with buttons inside, so don't let it claim role="button",
  // and pausing drag while editing shouldn't mark the edit box as disabled.
  const { role: _role, 'aria-disabled': _disabled, ...dragAttributes } = attributes

  const finishEdit = (value: string, save: boolean) => {
    if (save) updateTodoTitle(todo.id, value)
    setEditing(false)
  }

  return (
    <li
      ref={setNodeRef}
      className={`todo-item todo-item-draggable${todo.done ? ' is-done' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...dragAttributes}
      {...listeners}
    >
      <button
        type="button"
        className="todo-check"
        onClick={() => toggleTodo(todo.id)}
        aria-pressed={todo.done}
        aria-label={todo.done ? `Mark "${todo.title}" not done` : `Mark "${todo.title}" done`}
      >
        <img src={todo.done ? redTomato : grayTomato} alt="" />
      </button>

      {editing ? (
        <input
          className="todo-title todo-text-input"
          defaultValue={todo.title}
          aria-label="Edit task"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => finishEdit(e.currentTarget.value, true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishEdit(e.currentTarget.value, true)
            if (e.key === 'Escape') finishEdit('', false)
          }}
        />
      ) : (
        <span className="todo-title" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
          {todo.title}
        </span>
      )}

      <PrioritySelect
        value={todo.priority}
        onChange={(id) => setTodoPriority(todo.id, id)}
        label={`Priority of "${todo.title}"`}
      />

      <button
        type="button"
        className="todo-delete"
        onClick={() => deleteTodo(todo.id)}
        aria-label={`Delete "${todo.title}"`}
        title="Delete task"
      >
        ×
      </button>
    </li>
  )
}

/** Static copy of a row that follows the pointer while dragging. */
export function TaskRowPreview({ todo }: { todo: Todo }) {
  const priority = useTodoStore((s) => priorityOf(s.priorities, todo.priority))
  return (
    <li className={`todo-item todo-item-preview${todo.done ? ' is-done' : ''}`}>
      <span className="todo-check">
        <img src={todo.done ? redTomato : grayTomato} alt="" />
      </span>
      <span className="todo-title">{todo.title}</span>
      {priority && (
        <span className="priority-pill" style={{ background: priority.color, color: textOn(priority.color) }}>
          {priority.name}
        </span>
      )}
    </li>
  )
}
