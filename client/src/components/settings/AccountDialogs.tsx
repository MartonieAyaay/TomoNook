import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { changePassword, deleteAccount, type AuthError } from '../../lib/auth.ts'
import '../ConfirmDialog.css'
import './AccountDialogs.css'

/*
  The two account changes in Settings that ask for the password again:
  a new password, and deleting the account. They look like ConfirmDialog,
  with password boxes.
*/

function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  busy,
  error,
  submitLabel,
  danger = false,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  busy: boolean
  error: AuthError | null
  submitLabel: string
  danger?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId} onClose={onClose}>
      <form
        className="confirm-body"
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!busy) onSubmit()
        }}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        {error && Object.keys(error.fields).length === 0 && (
          <p className="account-form-error" role="alert">
            {error.error}
          </p>
        )}
        <div className="confirm-actions">
          <button type="button" className="confirm-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`confirm-btn confirm-btn-primary${danger ? ' confirm-btn-danger' : ''}`}
            disabled={busy}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={128}
        required
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="account-field-error">
          {error}
        </span>
      )}
    </div>
  )
}

/** "Change password": the current one, then the new one twice. */
export function ChangePasswordDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const close = () => {
    setCurrentPassword('')
    setPassword('')
    setRetypePassword('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const message = await changePassword({ currentPassword, password, retypePassword })
      close()
      onDone(message)
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormDialog
      open={open}
      title="Change password"
      onClose={close}
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={busy ? 'Saving...' : 'Save password'}
    >
      <PasswordField
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={error?.fields.currentPassword}
        autoComplete="current-password"
        autoFocus
      />
      <PasswordField
        label="New password (at least 8 characters)"
        value={password}
        onChange={setPassword}
        error={error?.fields.password}
        autoComplete="new-password"
      />
      <PasswordField
        label="Re-type new password"
        value={retypePassword}
        onChange={setRetypePassword}
        error={error?.fields.retypePassword}
        autoComplete="new-password"
      />
    </FormDialog>
  )
}

/** "Delete account": says what goes, and asks for the password. */
export function DeleteAccountDialog({ open, onClose, onDeleted }: { open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const close = () => {
    setCurrentPassword('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(currentPassword)
      onDeleted()
    } catch (err) {
      setError(err as AuthError)
      setBusy(false)
    }
  }

  return (
    <FormDialog
      open={open}
      title="Delete your account?"
      onClose={close}
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={busy ? 'Deleting...' : 'Delete my account'}
      danger
    >
      <p>
        Your account, profile, diary, moods, tasks, timers and settings will all be deleted for good, on every device.
        This can’t be undone. Download a backup first if you want to keep a copy.
      </p>
      <PasswordField
        label="Your password"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={error?.fields.currentPassword}
        autoComplete="current-password"
        autoFocus
      />
    </FormDialog>
  )
}
