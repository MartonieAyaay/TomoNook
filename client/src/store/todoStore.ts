import { create } from 'zustand'
import type { DayKey, Todo, TodoCategory } from '@tomonook/shared'
import { load, save } from '../lib/storage.ts'

interface TodoState {
  categories: TodoCategory[]
  todos: Todo[]
  addCategory: (name: string) => void
  renameCategory: (id: string, name: string) => void
  addTodo: (categoryId: string, day: DayKey, title: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
}

const DEFAULT_CATEGORIES: TodoCategory[] = [{ id: 'general', name: 'To-do' }]

export const useTodoStore = create<TodoState>((set) => ({
  categories: load('categories', DEFAULT_CATEGORIES),
  todos: load('todos', [] as Todo[]),

  addCategory: (name) =>
    set((s) => ({ categories: [...s.categories, { id: crypto.randomUUID(), name }] })),

  renameCategory: (id, name) =>
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    })),

  addTodo: (categoryId, day, title) =>
    set((s) => ({
      todos: [...s.todos, { id: crypto.randomUUID(), categoryId, day, title, done: false }],
    })),

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
