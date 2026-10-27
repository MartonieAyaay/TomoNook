import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { logIn, signUp, type Account, type AuthError } from '../../lib/auth.ts'
import TermsDialog from './TermsDialog.tsx'
import './AuthDialog.css'

/*
  The Login and Sign Up windows from Figma (frames 26 and 27), over the
  dimmed title page. Login comes first; "Sign up!" swaps to Sign Up and
  "Sign in!" swaps back. It can't be closed: TomoNook needs an account.

  The rules here (lengths, characters) only help the user early. The
  server checks everything again (api/_lib/validation.ts).
*/

type Mode = 'login' | 'signup'

export default function AuthDialog({ onSignedIn }: { onSignedIn: (account: Account) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<Mode>('login')
  const [termsOpen, setTermsOpen] = useState(false)
  // Kept when switching, so a typed username isn't lost.
  const [username, setUsername] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="auth-title"
      // Escape doesn't close it: there's nothing behind it to go back to.
      onCancel={(e) => e.preventDefault()}
    >
      {mode === 'login' ? (
        <LoginForm
          key="login"
          username={username}
          setUsername={setUsername}
          onSignedIn={onSignedIn}
          onSwitch={() => setMode('signup')}
        />
      ) : (
        <SignUpForm
          key="signup"
          username={username}
          setUsername={setUsername}
          onSignedIn={onSignedIn}
          onSwitch={() => setMode('login')}
          onShowTerms={() => setTermsOpen(true)}
        />
      )}
      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </dialog>
  )
}

interface FormProps {
  username: string
  setUsername: (u: string) => void
  onSignedIn: (account: Account) => void
  onSwitch: () => void
}

function LoginForm({ username, setUsername, onSignedIn, onSwitch }: FormProps) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await logIn(username, password))
    } catch (err) {
      setError(err as AuthError)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 id="auth-title" className="auth-title">
        Login
      </h2>
      <FormError error={error} />
      <Field label="Username" error={error?.fields.username}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            required
            autoFocus
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Password" error={error?.fields.password}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={128}
            required
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Logging in...' : 'Login'}
      </button>
      <button type="button" className="auth-switch" onClick={onSwitch}>
        Don’t have an account? Sign up!
      </button>
    </form>
  )
}

function SignUpForm({ username, setUsername, onSignedIn, onSwitch, onShowTerms }: FormProps & { onShowTerms: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const termsId = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await signUp({ email, username, password, retypePassword, acceptTerms }))
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form is-signup" onSubmit={submit} noValidate>
      <h2 id="auth-title" className="auth-title">
        Sign Up
      </h2>
      <FormError error={error} />
      <Field label="Email" error={error?.fields.email}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            autoFocus
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Username" note="3–20 letters, numbers or _" error={error?.fields.username}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            required
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Password" note="At least 8 characters" error={error?.fields.password}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Re-Type Password" error={error?.fields.retypePassword}>
        {(id, describedBy) => (
          <input
            id={id}
            className="auth-input"
            type="password"
            value={retypePassword}
            onChange={(e) => setRetypePassword(e.target.value)}
            autoComplete="new-password"
            maxLength={128}
            required
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <div className="auth-terms">
        <input
          id={termsId}
          className="auth-check"
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          aria-describedby={error?.fields.acceptTerms ? `${termsId}-error` : undefined}
        />
        <label htmlFor={termsId}>
          I have read and agree to the{' '}
          <button type="button" className="auth-terms-link" onClick={onShowTerms}>
            terms and conditions
          </button>
        </label>
      </div>
      {error?.fields.acceptTerms && (
        <p id={`${termsId}-error`} className="auth-field-error is-centered">
          {error.fields.acceptTerms}
        </p>
      )}
      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Signing up...' : 'Sign Up'}
      </button>
      <button type="button" className="auth-switch" onClick={onSwitch}>
        Already have an account? Sign in!
      </button>
    </form>
  )
}

/** A label, its input, and an optional hint and error under it. */
function Field({
  label,
  note,
  error,
  children,
}: {
  label: string
  note?: string
  error?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}) {
  const id = useId()
  const describedBy = [note && `${id}-note`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="auth-field-error">
          {error}
        </p>
      ) : (
        note && (
          <p id={`${id}-note`} className="auth-note">
            {note}
          </p>
        )
      )}
    </div>
  )
}

function FormError({ error }: { error: AuthError | null }) {
  // Field messages already say what's wrong; the summary only shows on its own.
  if (!error || Object.keys(error.fields).length > 0) return null
  return (
    <p className="auth-form-error" role="alert">
      {error.error}
    </p>
  )
}
