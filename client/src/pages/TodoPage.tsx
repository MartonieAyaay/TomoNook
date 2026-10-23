import { useState, type CSSProperties } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { today, type DayKey, type Todo } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import CategoryManager from '../components/CategoryManager.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import TomatoFill from '../components/TomatoFill.tsx'
import CategoryCard, { cardDropId } from '../components/todo/CategoryCard.tsx'
import PriorityDialog from '../components/todo/PriorityDialog.tsx'
import { TaskRowPreview } from '../components/todo/TaskRow.tsx'
import { useTodoStore } from '../store/todoStore.ts'
import './TodoPage.css'

const keyboardActivator = KeyboardSensor.activators[0]

/** Only start a keyboard drag from the row itself, not from the buttons inside it. */
class RowKeyboardSensor extends KeyboardSensor {
  static activators: typeof KeyboardSensor.activators = [
    {
      eventName: 'onKeyDown',
      handler: (event, options, context) =>
        event.target === event.currentTarget && keyboardActivator.handler(event, options, context),
    },
  ]
}

// Prefer whatever is under the pointer; fall back to nearest for keyboard drags.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : closestCenter(args)
}

interface PendingMove {
  todo: Todo
  toCategoryId: string
  beforeId: string | null
}

export default function TodoPage() {
  const [selected, setSelected] = useState<DayKey>(today)
  const [managing, setManaging] = useState(false)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overCategoryId, setOverCategoryId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [editingPriorities, setEditingPriorities] = useState(false)
  /** The card whose + was pressed before priorities were set up. */
  const [setupFor, setSetupFor] = useState<string | null>(null)
  const [openAdd, setOpenAdd] = useState<{ categoryId: string; n: number } | null>(null)
  const categories = useTodoStore((s) => s.categories)
  const todos = useTodoStore((s) => s.todos)
  const moveTodo = useTodoStore((s) => s.moveTodo)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag on touch screens, so normal swipes still scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(RowKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const dayTodos = todos.filter((t) => t.day === selected)
  const tasksIn = (categoryId: string) => dayTodos.filter((t) => t.categoryId === categoryId)
  const activeTodo = dayTodos.find((t) => t.id === activeId) ?? null

  /** Which category (and which task in it, if any) a droppable id points at. */
  const resolveTarget = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return null
    const key = String(id)
    const card = categories.find((c) => cardDropId(c.id) === key)
    if (card) return { categoryId: card.id, overTodoId: null }
    const todo = dayTodos.find((t) => t.id === key)
    return todo ? { categoryId: todo.categoryId, overTodoId: todo.id } : null
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const from = dayTodos.find((t) => t.id === active.id)
    const target = resolveTarget(over?.id)
    setOverCategoryId(target && from && target.categoryId !== from.categoryId ? target.categoryId : null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setOverCategoryId(null)
    const todo = dayTodos.find((t) => t.id === active.id)
    const target = resolveTarget(over?.id)
    if (!todo || !target) return

    if (target.categoryId === todo.categoryId) {
      if (!target.overTodoId || target.overTodoId === todo.id) return
      const ids = tasksIn(todo.categoryId).map((t) => t.id)
      const newIndex = ids.indexOf(target.overTodoId)
      const reordered = arrayMove(ids, ids.indexOf(todo.id), newIndex)
      moveTodo(todo.id, todo.categoryId, reordered[newIndex + 1] ?? null)
    } else {
      // Moving to another category needs a yes first.
      setPendingMove({ todo, toCategoryId: target.categoryId, beforeId: target.overTodoId })
    }
  }

  const renderTomato = (day: DayKey) => {
    const list = todos.filter((t) => t.day === day)
    const done = list.filter((t) => t.done).length
    return <TomatoFill fraction={list.length ? done / list.length : 0} />
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? ''
  const activeColor = categories.find((c) => c.id === activeTodo?.categoryId)?.color

  return (
    <div className="split-page">
      <header className="split-header">
        <h1 className="page-title">To-Do List !!</h1>
        <div className="split-header-actions">
          <button type="button" className="add-button add-button-alt" onClick={() => setEditingPriorities(true)}>
            Priorities
          </button>
          <button type="button" className="add-button" onClick={() => setManaging(true)}>
            Add +
          </button>
        </div>
      </header>

      <Calendar selected={selected} onSelect={setSelected} renderTomato={renderTomato} />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setOverCategoryId(null)
        }}
      >
        <div className="todo-categories">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              day={selected}
              todos={tasksIn(c.id)}
              isDropTarget={overCategoryId === c.id}
              onNeedSetup={() => setSetupFor(c.id)}
              openAddSignal={openAdd?.categoryId === c.id ? openAdd.n : undefined}
            />
          ))}
          {categories.length === 0 && (
            <button type="button" className="todo-empty" onClick={() => setManaging(true)}>
              Add a category to start your list
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTodo && (
            <ul className="todo-list" style={{ '--cat-color': activeColor } as CSSProperties}>
              <TaskRowPreview todo={activeTodo} />
            </ul>
          )}
        </DragOverlay>
      </DndContext>

      <CategoryManager open={managing} onClose={() => setManaging(false)} />

      {/* Opened from the Priorities button, or before the first task is added. */}
      <PriorityDialog
        open={editingPriorities || setupFor !== null}
        firstTime={setupFor !== null}
        onClose={() => {
          setEditingPriorities(false)
          setSetupFor(null)
        }}
        onSaved={() => setupFor && setOpenAdd((o) => ({ categoryId: setupFor, n: (o?.n ?? 0) + 1 }))}
      />

      <ConfirmDialog
        open={pendingMove !== null}
        title="Move task?"
        confirmLabel="Move task"
        onCancel={() => setPendingMove(null)}
        onConfirm={() => {
          if (pendingMove) moveTodo(pendingMove.todo.id, pendingMove.toCategoryId, pendingMove.beforeId)
          setPendingMove(null)
        }}
      >
        {pendingMove && (
          <>
            Move “{pendingMove.todo.title}” from {categoryName(pendingMove.todo.categoryId)} to{' '}
            {categoryName(pendingMove.toCategoryId)}?
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
