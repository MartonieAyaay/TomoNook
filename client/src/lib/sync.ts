/*
  Keeps the app's data with the account (api/data), so it follows you to
  any device and isn't left on a shared computer for the next person.

  The browser still holds a copy under "tomonook:" (see storage.ts), which
  the app reads and writes as before. That copy belongs to one account at a
  time (OWNER_KEY). Every save marks its key as changed (DIRTY_KEY), and the
  changes are sent to the account a moment later. On open, before the app
  loads, the copy is matched to whoever just signed in (syncOnSignIn).
*/

import type { Account } from './auth.ts'

const PREFIX = 'tomonook:'
// Outside "tomonook:", so backups and the synced data don't include them.
const OWNER_KEY = 'tomonook-sync:owner'
const DIRTY_KEY = 'tomonook-sync:dirty'
const FLUSH_DELAY_MS = 1500
/** Under the server's 3.5 million characters per request. */
const BATCH_CHARS = 2_800_000
/** Requests sent while the page closes (keepalive) must stay under 64 KB. */
const KEEPALIVE_CHARS = 60_000

export class SyncError extends Error {}

function get(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full or blocked: the account still has it.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Blocked storage: nothing to remove.
  }
}

/** The app's keys in this browser, without the prefix. */
function localKeys() {
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length))
    }
  } catch {
    // Blocked storage: nothing saved here.
  }
  return keys
}

function dirtyKeys(): Set<string> {
  try {
    return new Set(JSON.parse(get(DIRTY_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function setDirty(keys: Set<string>) {
  if (keys.size === 0) remove(DIRTY_KEY)
  else set(DIRTY_KEY, JSON.stringify([...keys]))
}

// ---------- Talking to the server ----------

async function request<T>(init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api/data', { credentials: 'same-origin', ...init })
  } catch {
    throw new SyncError('Couldn’t reach TomoNook. Check your internet and try again.')
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new SyncError(body.error ?? 'Couldn’t save your data. Please try again.')
  return body
}

function post(body: { set?: Record<string, string>; remove?: string[]; replace?: boolean }, keepalive = false) {
  return request<{ ok: true }>({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  })
}

const fetchServerData = () => request<{ data: Record<string, string> }>().then((r) => r.data)

interface Batch {
  set: Record<string, string>
  remove: string[]
  size: number
}

/** Splits changes (null = delete) into requests small enough to send. */
function batchesOf(changes: Iterable<[string, string | null]>) {
  const batches: Batch[] = [{ set: {}, remove: [], size: 0 }]
  for (const [k, v] of changes) {
    const cost = (v?.length ?? 0) + k.length + 8
    let batch = batches[batches.length - 1]!
    if (batch.size > 0 && batch.size + cost > BATCH_CHARS) batches.push((batch = { set: {}, remove: [], size: 0 }))
    if (v === null) batch.remove.push(k)
    else batch.set[k] = v
    batch.size += cost
  }
  return batches
}

// ---------- Sending changes ----------

let timer: ReturnType<typeof setTimeout> | undefined
let flushing: Promise<void> | null = null

/** Called by storage.ts on every save. */
export function markChanged(key: string) {
  if (!get(OWNER_KEY)) return
  const dirty = dirtyKeys()
  dirty.add(key)
  setDirty(dirty)
  clearTimeout(timer)
  timer = setTimeout(() => void flush().catch(() => {}), FLUSH_DELAY_MS)
}

/** Whether some changes haven't reached the account yet. */
export const hasUnsavedChanges = () => dirtyKeys().size > 0

/** Sends every changed key to the account now. Rejects if it couldn't. */
export function flush(keepalive = false): Promise<void> {
  clearTimeout(timer)
  // One at a time, so an older copy never lands after a newer one.
  const run = async (): Promise<void> => {
    const dirty = [...dirtyKeys()]
    if (dirty.length === 0) return
    const sent = new Map(dirty.map((k) => [k, get(PREFIX + k)]))
    for (const b of batchesOf(sent)) {
      await post({ set: b.set, remove: b.remove }, keepalive && b.size < KEEPALIVE_CHARS)
    }

    // Keys changed again while sending stay marked for the next round.
    const still = dirtyKeys()
    for (const [k, v] of sent) if (get(PREFIX + k) === v) still.delete(k)
    setDirty(still)
  }
  const next = (flushing ?? Promise.resolve()).catch(() => {}).then(run)
  flushing = next.finally(() => {
    if (flushing === next) flushing = null
  })
  return next
}

// Closing or hiding the tab sends what's left.
if (typeof window !== 'undefined') {
  const sendNow = () => {
    if (hasUnsavedChanges()) void flush(true).catch(() => {})
  }
  window.addEventListener('pagehide', sendNow)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && sendNow())
}

// ---------- Matching the browser's copy to the account ----------

/** Replaces this browser's copy with `data`, keeping keys in `keep`. */
function writeLocal(data: Record<string, string>, keep: Set<string> = new Set()) {
  for (const k of localKeys()) if (!(k in data) && !keep.has(k)) remove(PREFIX + k)
  for (const [k, v] of Object.entries(data)) if (!keep.has(k)) set(PREFIX + k, v)
}

let signingIn: { id: string; done: Promise<void> } | null = null

/**
  Run once someone is signed in, before the app reads anything:
  - Their own copy: unsent changes go up first, then the account's newer data comes down.
  - Someone else's copy: it's cleared and replaced by this account's data.
  - Data from before accounts kept it (no owner): it moves into this account if the account is empty.
  Rejects if the account's data couldn't be loaded, so the app never starts on the wrong data.
*/
export function syncOnSignIn(account: Account): Promise<void> {
  if (signingIn?.id === account.id) return signingIn.done
  const done = (async () => {
    const owner = get(OWNER_KEY)
    if (owner === account.id) {
      // Offline is fine here: the copy is theirs, and it's sent later.
      await flush().catch(() => {})
      const keep = dirtyKeys()
      writeLocal(await fetchServerData(), keep)
      return
    }
    const server = await fetchServerData()
    if (owner === null && Object.keys(server).length === 0 && localKeys().length > 0) {
      // Their data from before accounts saved it: it becomes this account's.
      set(OWNER_KEY, account.id)
      setDirty(new Set(localKeys()))
      await flush()
      return
    }
    remove(DIRTY_KEY)
    writeLocal(server)
    set(OWNER_KEY, account.id)
  })()
  signingIn = { id: account.id, done }
  done.catch(() => {
    if (signingIn?.done === done) signingIn = null
  })
  return done
}

/** Signed out with nothing left to send: the last person's copy is removed. */
export function forgetIfSaved() {
  if (get(OWNER_KEY) && !hasUnsavedChanges()) clearLocalData()
}

/** Removes the app's data from this browser (it stays with the account). */
export function clearLocalData() {
  clearTimeout(timer)
  for (const k of localKeys()) remove(PREFIX + k)
  remove(OWNER_KEY)
  remove(DIRTY_KEY)
}

/** Replaces everything, in the account and here (restoring a backup, or starting over). */
export async function replaceAll(data: Record<string, string>) {
  // The first request clears everything else; the rest only add.
  const [first, ...rest] = batchesOf(Object.entries(data))
  await post({ set: first!.set, replace: true })
  for (const b of rest) await post({ set: b.set })
  remove(DIRTY_KEY)
  writeLocal(data)
}
