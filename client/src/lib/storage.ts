import { markChanged } from './sync.ts'

// All reads and writes go through here. The browser keeps a copy in
// localStorage, and every save is also sent to the account (see sync.ts).

const PREFIX = 'tomonook:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** Saves a value. Returns false if the browser had no room for it. */
export function save<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked.
    return false
  }
  markChanged(key)
  return true
}
