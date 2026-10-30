import type { InputHTMLAttributes } from 'react'
import './PasswordInput.css'

/**
  A password box with an eye button that shows what's typed. Forms keep
  `shown` in one place, so the button on either box (password and
  re-type) shows or hides both at once.
*/
export default function PasswordInput({
  shown,
  onToggle,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { shown: boolean; onToggle: () => void }) {
  return (
    <div className="password-box">
      <input {...input} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="password-toggle"
        onClick={onToggle}
        aria-pressed={shown}
        aria-label="Show password"
        title={shown ? 'Hide password' : 'Show password'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}
