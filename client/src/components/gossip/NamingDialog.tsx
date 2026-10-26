import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TOMATO_NAME_MAX, useGossipStore } from '../../store/gossipStore.ts'
import tallTomato from '../../assets/tomato/gossip-tall.png'
import roundTomato from '../../assets/tomato/gossip-round.png'
import './NamingDialog.css'

// The questions don't say what the names are for; the reveal at the end does.
const STEPS = [
  { question: 'What’s the name of your favorite character ever?' },
  {
    question: 'What’s the name of your pet?',
    hint: 'If you don’t have a pet, just any name that you like.',
  },
] as const

/**
  The last step of first-time setup: two questions whose answers secretly
  become the gossip tomatoes' names, then a reveal. It can't be closed until
  both are answered.
*/
export default function NamingDialog() {
  const setNames = useGossipStore((s) => s.setNames)
  const ref = useRef<HTMLDialogElement>(null)
  // 0 and 1 are the questions, 2 is the reveal.
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(['', ''])
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => input.current?.focus(), [step])

  const next = (e: FormEvent) => {
    e.preventDefault()
    if (!answers[step].trim()) return setError('Type a name to keep going.')
    setStep(step + 1)
  }

  if (step === 2) {
    return (
      <dialog ref={ref} className="naming-dialog" aria-labelledby="naming-reveal" onCancel={(e) => e.preventDefault()}>
        <div className="naming-body">
          <div className="naming-reveal-tomatoes">
            {[
              { art: tallTomato, name: answers[0] },
              { art: roundTomato, name: answers[1] },
            ].map((t, i) => (
              <figure key={i} className="naming-tomato">
                <img src={t.art} alt="" />
                <figcaption>{t.name.trim()}</figcaption>
              </figure>
            ))}
          </div>
          <p id="naming-reveal" className="naming-question">
            These are now the names of the tomatoes that will gossip about you!!! (≧∇≦)
          </p>
          <div className="naming-actions">
            <button type="button" className="naming-btn" autoFocus onClick={() => setNames(answers[0], answers[1])}>
              Yay!
            </button>
          </div>
        </div>
      </dialog>
    )
  }

  const { question } = STEPS[step]
  const hint = 'hint' in STEPS[step] ? STEPS[step].hint : null

  return (
    <dialog
      ref={ref}
      className="naming-dialog"
      aria-labelledby="naming-question"
      // Escape can't skip this; both names are needed.
      onCancel={(e) => e.preventDefault()}
    >
      <form key={step} className="naming-body" onSubmit={next} noValidate>
        <p className="naming-step">Question {step + 1} of 2</p>
        <label className="naming-field">
          <span id="naming-question" className="naming-question">
            {question}
          </span>
          {hint && <span className="naming-hint">({hint})</span>}
          <input
            ref={input}
            value={answers[step]}
            maxLength={TOMATO_NAME_MAX}
            onChange={(e) => {
              const value = e.target.value
              setAnswers((a) => a.map((x, i) => (i === step ? value : x)))
              setError('')
            }}
          />
        </label>
        {error && (
          <p className="naming-error" role="alert">
            {error}
          </p>
        )}
        <div className="naming-actions">
          {step === 1 && (
            <button type="button" className="naming-btn is-secondary" onClick={() => setStep(0)}>
              Back
            </button>
          )}
          <button type="submit" className="naming-btn">
            {step === 0 ? 'Next' : 'Done'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
