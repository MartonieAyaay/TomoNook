import { create } from 'zustand'
import {
  CATEGORY_NAME_MAX,
  DEFAULT_CATEGORY_COLOR,
  MAX_CATEGORIES,
  type DayKey,
  type Todo,
  type TodoCategory,
} from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface TodoState {
  categories: TodoCategory[]
  todos: Todo[]
  addCategory: (name: string, color: string) => void
  updateCategory: (id: string, patch: Partial<Omit<TodoCategory, 'id'>>) => void
  deleteCategory: (id: string) => void
  addTodo: (categoryId: string, day: DayKey, title: string) => void
  updateTodoTitle: (id: string, title: string) => void
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

  addTodo: (categoryId, day, title) =>
    set((s) => ({
      todos: [...s.todos, { id: crypto.randomUUID(), categoryId, day, title, done: false }],
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
})
