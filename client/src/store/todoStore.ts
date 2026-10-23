import { create } from 'zustand'
import {
  CATEGORY_NAME_MAX,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY,
  MAX_CATEGORIES,
  PRIORITY_NAME_MAX,
  type DayKey,
  type PriorityLevel,
  type PriorityStyle,
  type Todo,
  type TodoCategory,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface TodoState {
  categories: TodoCategory[]
  todos: Todo[]
  /** Name and color of each priority level, highest first. */
  priorities: PriorityStyle[]
  /** Whether the user has been through priority setup (shown before their first task). */
  prioritiesSetUp: boolean
  addCategory: (name: string, color: string) => void
  updateCategory: (id: string, patch: Partial<Omit<TodoCategory, 'id'>>) => void
  deleteCategory: (id: string) => void
  addTodo: (categoryId: string, day: DayKey, title: string, priority?: PriorityLevel) => void
  updateTodoTitle: (id: string, title: string) => void
  setTodoPriority: (id: string, priority: PriorityLevel) => void
  /** Saves new names/colors for the priority levels and marks setup as done. */
  savePriorities: (styles: PriorityStyle[]) => void
  /**
   * Move a task into a category, placed just before `beforeId`
   * (or after everything else when null). Also used for reordering.
   */
  moveTodo: (id: string, categoryId: string, beforeId: string | null) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
}

const DEFAULT_CATEGORIES: TodoCategory[] = [
  { id: 'general', name: 'To-do', color: DEFAULT_CATEGORY_COLOR },
]

const cleanName = (name: string) => name.trim().slice(0, CATEGORY_NAME_MAX)

// Categories saved before colors existed get the default color.
const storedCategories = load('categories', DEFAULT_CATEGORIES).map((c) => ({
  ...c,
  color: c.color ?? DEFAULT_CATEGORY_COLOR,
}))

export const useTodoStore = create<TodoState>((set) => ({
  categories: storedCategories,
  todos: load('todos', [] as Todo[]),
  priorities: load('priorities', DEFAULT_PRIORITIES),
  prioritiesSetUp: load('prioritiesSetUp', false),

  addCategory: (name, color) =>
    set((s) =>
      s.categories.length >= MAX_CATEGORIES || !cleanName(name)
        ? s
        : { categories: [...s.categories, { id: crypto.randomUUID(), name: cleanName(name), color }] },
    ),

  updateCategory: (id, patch) =>
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id
          ? { ...c, ...patch, name: patch.name === undefined ? c.name : cleanName(patch.name) || c.name }
          : c,
      ),
    })),

  deleteCategory: (id) =>
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      todos: s.todos.filter((t) => t.categoryId !== id),
    })),

  addTodo: (categoryId, day, title, priority = DEFAULT_PRIORITY) =>
    set((s) => ({
      todos: [...s.todos, { id: crypto.randomUUID(), categoryId, day, title, priority, done: false }],
    })),

  setTodoPriority: (id, priority) =>
    set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, priority } : t)) })),

  savePriorities: (styles) =>
    set((s) => ({
      prioritiesSetUp: true,
      priorities: s.priorities.map((p) => {
        const next = styles.find((x) => x.level === p.level)
        const name = next?.name.trim().slice(0, PRIORITY_NAME_MAX)
        return next ? { ...p, name: name || p.name, color: next.color } : p
      }),
    })),

  updateTodoTitle: (id, title) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id && title.trim() ? { ...t, title: title.trim() } : t)),
    })),

  moveTodo: (id, categoryId, beforeId) =>
    set((s) => {
      const todo = s.todos.find((t) => t.id === id)
      if (!todo || id === beforeId) return s
      const rest = s.todos.filter((t) => t.id !== id)
      const index = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1
      const moved = { ...todo, categoryId }
      if (index === -1) rest.push(moved)
      else rest.splice(index, 0, moved)
      return { todos: rest }
    }),

  toggleTodo: (id) =>
    set((s) => ({
      todos: s.todos.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: t.done ? undefined : new Date().toISOString() }
          : t,
      ),
    })),

  deleteTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
}))

useTodoStore.subscribe((s) => {
  save('categories', s.categories)
  save('todos', s.todos)
  save('priorities', s.priorities)
  save('prioritiesSetUp', s.prioritiesSetUp)
})
