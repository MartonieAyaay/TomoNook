import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import SplashScreen from './components/SplashScreen.tsx'
import AuthDialog from './components/auth/AuthDialog.tsx'
import { fetchAccount, logOut, type Account } from './lib/auth.ts'
import { forgetIfSaved, syncOnSignIn } from './lib/sync.ts'
import { useAccountStore } from './store/accountStore.ts'

/*
  What happens on open, before the app itself: the loading screen, logging
  in, and fetching the account's data. The app is loaded only after that,
  because its stores read the saved data the moment they load, and they
  must read this account's data, not the last person's.
*/
const App = lazy(() => import('./App.tsx'))

export default function Boot() {
  // In dev, add ?nosplash to the URL to skip the loading bar.
  const [skipBar] = useState(() => import.meta.env.DEV && location.search.includes('nosplash'))
  const [showSplash, setShowSplash] = useState(true)
  // Signed in? Asked while the loading bar fills (the bar follows these steps, see `progress` below);
  // signed out keeps the title page up with the login window.
  const account = useAccountStore((s) => s.account)
  const setAccount = useAccountStore((s) => s.setAccount)
  // A "reset your password" email link: ?reset=<token>. Taken out of the
  // address bar right away so it isn't left in history or shared by accident.
  const [resetToken, setResetToken] = useState(() => {
    const token = new URLSearchParams(location.search).get('reset') ?? undefined
    if (token) history.replaceState(null, '', location.pathname)
    return token
  })
  // A "confirm your email" link: ?verify=<token>, taken out the same way.
  const [verifyToken, setVerifyToken] = useState(() => {
    const token = new URLSearchParams(location.search).get('verify') ?? undefined
    if (token) history.replaceState(null, '', location.pathname)
    return token
  })
  // An email link logs in, maybe as someone else, so the app waits for it.
  const emailLink = resetToken ?? verifyToken
  const [dataReady, setDataReady] = useState(false)
  const [appMounted, setAppMounted] = useState(false)
  const onAppMounted = useCallback(() => setAppMounted(true), [])
  const onSignedIn = useCallback(
    (a: Account) => {
      setResetToken(undefined)
      setVerifyToken(undefined)
      setAccount(a)
    },
    [setAccount],
  )
  const [syncError, setSyncError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    void fetchAccount().then((a) => {
      // Nobody signed in: the last person's data leaves this browser (it's in their account).
      if (!a) forgetIfSaved()
      setAccount(a)
    })
  }, [setAccount])

  useEffect(() => {
    if (!account || emailLink) return
    let live = true
    setSyncError('')
    syncOnSignIn(account).then(
      () => live && setDataReady(true),
      (e: Error) => live && setSyncError(e.message),
    )
    return () => {
      live = false
    }
  }, [account, emailLink, attempt])

  // The loading bar, from the real steps: asking who's signed in, loading
  // their data, then loading the app. Waiting on a window (login, an email
  // link, an error) counts as done, so the bar fills and the window shows.
  const showWindow = account === null || (!!account && !!emailLink) || !!syncError
  const [progress, next] = showWindow || appMounted
    ? [1, 1]
    : account === undefined
      ? [0, 0.4]
      : !dataReady
        ? [0.4, 0.8]
        : [0.8, 1]

  return (
    <>
      {dataReady && (
        <Suspense fallback={null}>
          <App started={!showSplash} onMounted={onAppMounted} />
        </Suspense>
      )}
      {showSplash && (
        <SplashScreen
          progress={progress}
          next={next}
          ready={dataReady && appMounted}
          skipBar={skipBar}
          onDone={() => setShowSplash(false)}
        >
          {account === null || (account && emailLink) ? (
            <AuthDialog resetToken={resetToken} verifyToken={verifyToken} onSignedIn={onSignedIn} />
          ) : (
            syncError && <SyncErrorDialog message={syncError} onRetry={() => setAttempt((n) => n + 1)} />
          )}
        </SplashScreen>
      )}
    </>
  )
}

/** The account's data couldn't be loaded: the app waits rather than start empty. */
function SyncErrorDialog({ message, onRetry }: { message: string; onRetry: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog ref={ref} className="auth-dialog" aria-labelledby="auth-title" onCancel={(e) => e.preventDefault()}>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault()
          onRetry()
        }}
      >
        <h2 id="auth-title" className="auth-title">
          Hold on!
        </h2>
        <p className="auth-intro" role="alert">
          Your TomoNook couldn’t load. {message} Your data is safe in your account.
        </p>
        <button type="submit" className="auth-submit">
          Try again
        </button>
        <button
          type="button"
          className="auth-switch"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await logOut().catch(() => {})
            window.location.assign('/')
          }}
        >
          Log out
        </button>
      </form>
    </dialog>
  )
}
