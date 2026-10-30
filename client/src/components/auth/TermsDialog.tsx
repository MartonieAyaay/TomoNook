import { useEffect, useRef } from 'react'
import { PRIVACY } from '../../lib/privacy.ts'
import { TERMS } from '../../lib/terms.ts'
import './AuthDialog.css'

export type LegalDoc = 'terms' | 'privacy'

const DOCS = {
  terms: { title: 'Terms and Conditions', blocks: TERMS },
  privacy: { title: 'Privacy Policy', blocks: PRIVACY },
}

/** The full Terms and Conditions or Privacy Policy, opened from the sign-up window and Settings. `doc` null: closed. */
export default function TermsDialog({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  // Kept while closing, so the text doesn't vanish before the window does.
  const shown = useRef<LegalDoc>('terms')
  if (doc) shown.current = doc
  const { title, blocks } = DOCS[shown.current]

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (doc && !dialog.open) dialog.showModal()
    if (!doc && dialog.open) dialog.close()
    // A new document starts at the top.
    if (doc) dialog.querySelector('.terms-body')?.scrollTo(0, 0)
  }, [doc])

  return (
    <dialog ref={ref} className="terms-dialog" aria-labelledby="terms-title" onClose={onClose}>
      <div className="terms-header">
        <h2 id="terms-title" className="terms-title">
          {title}
        </h2>
        <button type="button" className="terms-close" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <div className="terms-body" tabIndex={0}>
        {blocks.map((block, i) =>
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
