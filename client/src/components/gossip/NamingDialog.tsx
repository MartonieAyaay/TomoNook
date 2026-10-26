import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TOMATO_NAME_MAX, useGossipStore } from '../../store/gossipStore.ts'
import tallTomato from '../../assets/tomato/gossip-tall.png'
import roundTomato from '../../assets/tomato/gossip-round.png'
import './NamingDialog.css'

const STEPS = [
  { question: 'What’s the name of your favorite character ever?', art: tallTomato },
  {
    question: 'What’s the name of your pet?',
    hint: 'If you don’t have a pet, just any name that you like.',
    art: roundTomato,
  },
] as const

/**
  The last step of first-time setup: two questions whose answers become the
  gossip tomatoes' names. It can't be closed until both are answered.
*/
export default function NamingDialog() {
  const setNames = useGossipStore((s) => s.setNames)
  const ref = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(['', ''])
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => input.current?.focus(), [step])

  const { question, art } = STEPS[step]
  const hint = 'hint' in STEPS[step] ? STEPS[step].hint : null

  const next = (e: FormEvent) => {
    e.preventDefault()
    if (!answers[step].trim()) return setError('Type a name to keep going.')
    if (step === 0) return setStep(1)
    setNames(answers[0], answers[1])
  }

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
        <img className="naming-art" src={art} alt="" />
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
