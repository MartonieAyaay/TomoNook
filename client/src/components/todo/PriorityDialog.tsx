import { useEffect, useRef, useState } from 'react'
import { DEFAULT_PRIORITIES, PRIORITY_NAME_MAX, type PriorityStyle } from '@tomonook/shared'
import { useTodoStore } from '../../store/todoStore.ts'
import ColorPicker from '../ColorPicker.tsx'
import { textOn } from './PrioritySelect.tsx'
import '../CategoryManager.css'

const SWATCHES = ['#c13828', '#e66b33', '#f5c851', '#a0bb3b', '#29512f', '#4a7fd1', '#9a6a9e', '#6e3f39']

interface PriorityDialogProps {
  open: boolean
  /** Shown before the user's first task, with a short intro. */
  firstTime?: boolean
  onClose: () => void
  /** Called after saving (not after cancelling). */
  onSaved?: () => void
}

/** Rename and recolor the High / Medium / Low priority levels. */
export default function PriorityDialog({ open, firstTime = false, onClose, onSaved }: PriorityDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const priorities = useTodoStore((s) => s.priorities)
  const savePriorities = useTodoStore((s) => s.savePriorities)
  const [draft, setDraft] = useState<PriorityStyle[]>(priorities)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDraft(priorities)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, priorities])

  const update = (i: number, patch: Partial<PriorityStyle>) =>
    setDraft((d) => d.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const save = (styles: PriorityStyle[]) => {
    savePriorities(styles)
    onClose()
    onSaved?.()
  }

  return (
    <dialog
      ref={ref}
      className="cat-dialog priority-dialog"
      aria-labelledby="priority-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="cat-dialog-body"
        onSubmit={(e) => {
          e.preventDefault()
          save(draft)
        }}
      >
        <header className="cat-dialog-header">
          <h2 id="priority-dialog-title">Priorities</h2>
          <button type="button" className="cat-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="priority-intro">
          {firstTime
            ? 'Before your first task: pick a name and color for each priority level. New tasks are the lowest level unless you choose another. You can change these later from the Priorities button.'
            : 'Rename or recolor each priority level. Tasks keep their level and pick up the new look.'}
        </p>

        <ul className="cat-list">
          {draft.map((p, i) => (
            <li key={p.level} className="cat-row">
              <ColorPicker
                swatches={SWATCHES}
                value={p.color}
                onChange={(color) => update(i, { color })}
                label={`Color for ${p.name || p.level} priority`}
              />
              <label className="cat-name-field">
                <span className="visually-hidden">Name for {p.level} priority</span>
                <input
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  maxLength={PRIORITY_NAME_MAX}
                  placeholder={DEFAULT_PRIORITIES[i].name}
                />
                <span className="cat-chars" aria-hidden>
                  {p.name.length}/{PRIORITY_NAME_MAX}
                </span>
              </label>
              <span className="priority-preview" style={{ background: p.color, color: textOn(p.color) }} aria-hidden>
                {p.name.trim() || DEFAULT_PRIORITIES[i].name}
              </span>
            </li>
          ))}
        </ul>

        <div className="priority-actions">
          {firstTime && (
            <button type="button" className="cat-btn" onClick={() => save(DEFAULT_PRIORITIES)}>
              Use defaults
            </button>
          )}
          <button type="submit" className="cat-add">
            {firstTime ? 'Save & add task' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
