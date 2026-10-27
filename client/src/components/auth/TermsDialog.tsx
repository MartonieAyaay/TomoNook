import { useEffect, useRef } from 'react'
import { TERMS } from '../../lib/terms.ts'

/** The full Terms and Conditions, opened from the sign-up window. */
export default function TermsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="terms-dialog" aria-labelledby="terms-title" onClose={onClose}>
      <div className="terms-header">
        <h2 id="terms-title" className="terms-title">
          Terms and Conditions
        </h2>
        <button type="button" className="terms-close" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <div className="terms-body" tabIndex={0}>
        {TERMS.map((block, i) =>
          block[0] === 'ul' ? (
            <ul key={i}>
              {block[1].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : block[0] === 'h2' ? (
            <h3 key={i}>{block[1]}</h3>
          ) : block[0] === 'h3' ? (
            <h4 key={i}>{block[1]}</h4>
          ) : (
            <p key={i}>{block[1]}</p>
          ),
        )}
      </div>
      <div className="terms-footer">
        <button type="button" className="auth-submit" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
