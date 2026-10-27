import { create } from 'zustand'
import type { Account } from '../lib/auth.ts'

/*
  Who's signed in. `undefined` while checking with the server at startup,
  null when signed out. Not saved anywhere: the session cookie is the
  source of truth, and the server is asked again on each visit.
*/
interface AccountState {
  account: Account | null | undefined
  setAccount: (account: Account | null) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  account: undefined,
  setAccount: (account) => set({ account }),
}))
