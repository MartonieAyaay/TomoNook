import { today } from '@tomonook/shared'
import { replaceAll } from './sync.ts'

/*
  Everything the app saves lives in this browser's storage under the
  "tomonook:" prefix (and in the account, see sync.ts). A backup is all of
  it in one JSON file.
*/

const PREFIX = 'tomonook:'

interface BackupFile {
  app: 'TomoNook'
  version: 1
  exportedAt: string
  data: Record<string, string>
}

function ourKeys() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) keys.push(k)
  }
  return keys
}

/** Downloads a backup file of everything saved. */
export function exportBackup() {
  const data: Record<string, string> = {}
  for (const k of ourKeys()) data[k.slice(PREFIX.length)] = localStorage.getItem(k) ?? ''
  const file: BackupFile = { app: 'TomoNook', version: 1, exportedAt: new Date().toISOString(), data }
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `tomonook-backup-${today()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Reads a backup file. Throws with a message for the user if it isn't one. */
export async function readBackup(file: File): Promise<BackupFile> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file couldn’t be read. Pick a TomoNook backup (.json).')
  }
  const b = parsed as Partial<BackupFile>
  const valid =
    b?.app === 'TomoNook' &&
    typeof b.data === 'object' &&
    b.data !== null &&
    Object.values(b.data).every((v) => typeof v === 'string')
  if (!valid) throw new Error('That file isn’t a TomoNook backup.')
  return b as BackupFile
}

/** Replaces everything with the backup (here and in the account), then reloads the app. */
export async function restoreBackup(backup: BackupFile) {
  await replaceAll(backup.data)
  location.assign('/')
}

/** Deletes everything (here and in the account) and starts over at first-time setup. */
export async function resetEverything() {
  await replaceAll({})
  location.assign('/')
}
