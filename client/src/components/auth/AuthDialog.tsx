import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  logIn,
  requestReset,
  resendVerification,
  resetPassword,
  signUp,
  verifyEmail,
  type Account,
  type AuthError,
} from '../../lib/auth.ts'
import TermsDialog, { type LegalDoc } from './TermsDialog.tsx'
import './AuthDialog.css'

/*
  The Login and Sign Up windows from Figma (frames 26 and 27), over the
  dimmed title page. Login comes first; "Sign up!" swaps to Sign Up and
  "Sign in!" swaps back. It can't be closed: TomoNook needs an account.
  "Forgot password?" asks for an email link; that link opens this window
  again on "Choose a new password" (with `resetToken`). Signing up sends a
  "confirm your email" link, which opens it to log in (with `verifyToken`).

  The rules here (lengths, characters) only help the user early. The
  server checks everything again (api/_lib/validation.ts).
*/

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify'

export default function AuthDialog({
  resetToken,
  verifyToken,
  onSignedIn,
}: {
  /** From a "reset your password" email link. */
  resetToken?: string
  /** From a "confirm your email" link. */
  verifyToken?: string
  onSignedIn: (account: Account) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : verifyToken ? 'verify' : 'login')
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
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
      {mode === 'verify' && verifyToken ? (
        <VerifyForm key="verify" token={verifyToken} onSignedIn={onSignedIn} onBack={() => setMode('login')} />
      ) : mode === 'reset' && resetToken ? (
        <ResetForm key="reset" token={resetToken} onSignedIn={onSignedIn} onForgot={() => setMode('forgot')} />
      ) : mode === 'forgot' ? (
        <ForgotForm key="forgot" onBack={() => setMode('login')} />
      ) : mode === 'login' ? (
        <LoginForm
          key="login"
          username={username}
          setUsername={setUsername}
          onSignedIn={onSignedIn}
          onSwitch={() => setMode('signup')}
          onForgot={() => setMode('forgot')}
        />
      ) : (
        <SignUpForm
          key="signup"
          username={username}
          setUsername={setUsername}
          onSwitch={() => setMode('login')}
          onShowDoc={setLegalDoc}
        />
      )}
      <TermsDialog doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </dialog>
  )
}

interface FormProps {
  username: string
  setUsername: (u: string) => void
  onSignedIn: (account: Account) => void
  onSwitch: () => void
}

function LoginForm({ username, setUsername, onSignedIn, onSwitch, onForgot }: FormProps & { onForgot: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [resent, setResent] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResent('')
    try {
      onSignedIn(await logIn(username, password))
    } catch (err) {
      setError(err as AuthError)
      // Kept when only the email is missing, for "Send the link again".
      if (!(err as AuthError).unverified) setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    try {
      setResent(await resendVerification(username, password))
      setError(null)
    } catch (err) {
      setError(err as AuthError)
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
      {error?.unverified && (
        <button type="button" className="auth-switch auth-resend" onClick={resend} disabled={busy}>
          Send the link again
        </button>
      )}
      {resent && (
        <p className="auth-done" role="status">
          {resent}
        </p>
      )}
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
      <button type="button" className="auth-forgot" onClick={onForgot}>
        Forgot password?
      </button>
      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Logging in...' : 'Login'}
      </button>
      <button type="button" className="auth-switch" onClick={onSwitch}>
        Don’t have an account? Sign up!
      </button>
    </form>
  )
}

function SignUpForm({
  username,
  setUsername,
  onSwitch,
  onShowDoc,
}: Omit<FormProps, 'onSignedIn'> & { onShowDoc: (doc: LegalDoc) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [sent, setSent] = useState('')
  const termsId = useId()
  const ageId = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setSent(await signUp({ email, username, password, retypePassword, acceptTerms, ageConfirmed }))
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setBusy(false)
    }
  }

  // Signed up: the account works once the emailed link is opened.
  if (sent) {
    return (
      <div className="auth-form">
        <h2 id="auth-title" className="auth-title">
          Check your inbox
        </h2>
        <p className="auth-done" role="status">
          {sent}
        </p>
        <button type="button" className="auth-switch" onClick={onSwitch}>
          Back to login
        </button>
      </div>
    )
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
          <button type="button" className="auth-terms-link" onClick={() => onShowDoc('terms')}>
            terms and conditions
          </button>{' '}
          and{' '}
          <button type="button" className="auth-terms-link" onClick={() => onShowDoc('privacy')}>
            privacy policy
          </button>
        </label>
      </div>
      {error?.fields.acceptTerms && (
        <p id={`${termsId}-error`} className="auth-field-error is-centered">
          {error.fields.acceptTerms}
        </p>
      )}
      {/* The Terms: 13 and up; under 18 only with a parent or guardian. */}
      <div className="auth-terms">
        <input
          id={ageId}
          className="auth-check"
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          aria-describedby={error?.fields.ageConfirmed ? `${ageId}-error` : undefined}
        />
        <label htmlFor={ageId}>I’m 13 or older (if I’m under 18, a parent or guardian agrees too)</label>
      </div>
      {error?.fields.ageConfirmed && (
        <p id={`${ageId}-error`} className="auth-field-error is-centered">
          {error.fields.ageConfirmed}
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

/** "Forgot password?": asks for the account's email and sends a reset link. */
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [sent, setSent] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setSent(await requestReset(email))
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 id="auth-title" className="auth-title">
        Forgot password?
      </h2>
      {sent ? (
        <p className="auth-done" role="status">
          {sent}
        </p>
      ) : (
        <>
          <p className="auth-intro">Type the email you signed up with, and we’ll send you a link to choose a new password.</p>
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
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send link'}
          </button>
        </>
      )}
      <button type="button" className="auth-switch" onClick={onBack}>
        Back to login
      </button>
    </form>
  )
}

/** Opened from the emailed link: choose a new password, then you're signed in. */
function ResetForm({ token, onSignedIn, onForgot }: { token: string; onSignedIn: (account: Account) => void; onForgot: () => void }) {
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await resetPassword(token, password, retypePassword))
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 id="auth-title" className="auth-title">
        New password
      </h2>
      <FormError error={error} />
      <Field label="New password" note="At least 8 characters" error={error?.fields.password}>
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
            autoFocus
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
      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Saving...' : 'Save'}
      </button>
      <button type="button" className="auth-switch" onClick={onForgot}>
        Link not working? Get a new one
      </button>
    </form>
  )
}

/** Opened from the "confirm your email" link: confirms it right away, and logs in. */
function VerifyForm({ token, onSignedIn, onBack }: { token: string; onSignedIn: (account: Account) => void; onBack: () => void }) {
  const [error, setError] = useState<AuthError | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // Once, even when React runs effects twice in development: the link works only once.
    if (started.current) return
    started.current = true
    verifyEmail(token).then(onSignedIn, (err: AuthError) => setError(err))
  }, [token, onSignedIn])

  return (
    <div className="auth-form">
      <h2 id="auth-title" className="auth-title">
        {error ? 'Hmm...' : 'Welcome!'}
      </h2>
      {error ? (
        <>
          <FormError error={error} />
          <button type="button" className="auth-submit" onClick={onBack}>
            Login
          </button>
        </>
      ) : (
        <p className="auth-intro" role="status">
          Confirming your email...
        </p>
      )}
    </div>
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
