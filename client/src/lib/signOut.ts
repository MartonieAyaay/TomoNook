import { logOut } from './auth.ts'
import { clearLocalData, flush } from './sync.ts'

/** Some changes couldn't reach the account; logging out now would lose them. */
export class UnsavedChangesError extends Error {}

/**
  Logs out on this browser: sends what's left, ends the session, removes
  the data from this browser for the next person, and starts over at the
  login window. `force` skips sending (the user agreed to lose changes).
  Throws UnsavedChangesError, or an AuthError if the server can't be reached.
*/
export async function signOut(force = false) {
  if (!force) {
    try {
      await flush()
    } catch {
      throw new UnsavedChangesError()
    }
  }
  await logOut()
  clearLocalData()
  window.location.assign('/')
}
