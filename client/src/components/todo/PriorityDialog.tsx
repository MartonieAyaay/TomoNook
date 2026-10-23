import { useEffect, useRef, useState } from 'react'
import { DEFAULT_PRIORITIES, MAX_PRIORITIES, PRIORITY_NAME_MAX, type PriorityStyle } from '@tomonook/shared'
import { useTodoStore } from '../../store/todoStore.ts'
import ColorPicker from '../ColorPicker.tsx'
import { textOn } from './PrioritySelect.tsx'
import trashIcon from '../../assets/icons/trash.png'
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

/** Add, remove, rename, recolor and reorder priority levels (highest first). */
export default function PriorityDialog({ open, firstTime = false, onClose, onSaved }: PriorityDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const priorities = useTodoStore((s) => s.priorities)
  const todos = useTodoStore((s) => s.todos)
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

  const move = (i: number, delta: number) =>
    setDraft((d) => {
      const next = [...d]
      const [item] = next.splice(i, 1)
      next.splice(i + delta, 0, item)
      return next
    })

  const remove = (i: number) => setDraft((d) => d.filter((_, j) => j !== i))

  const addLevel = () =>
    setDraft((d) => {
      const unused = SWATCHES.find((c) => !d.some((p) => p.color.toLowerCase() === c.toLowerCase()))
      // New levels go just above the lowest, so the default stays the same.
      const next = [...d]
      next.splice(Math.max(0, d.length - 1), 0, { id: crypto.randomUUID(), name: '', color: unused ?? SWATCHES[0] })
      return next
    })

  // Tasks on levels being removed will drop to the lowest remaining one.
  const keptIds = new Set(draft.map((p) => p.id))
  const orphaned = todos.filter((t) => t.priority && !keptIds.has(t.priority)).length
  const lowestName = draft[draft.length - 1]?.name.trim() || 'the lowest level'

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
          if (draft.length > 0) save(draft)
        }}
      >
        <header className="cat-dialog-header">
          <h2 id="priority-dialog-title">Priorities</h2>
          <span className="cat-count">
            {draft.length}/{MAX_PRIORITIES}
          </span>
          <button type="button" className="cat-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="priority-intro">
          {firstTime
            ? 'Before your first task: set up your priority levels, highest at the top. New tasks get the bottom level unless you pick another. You can change these later from the Priorities button.'
            : 'Highest at the top. New tasks get the bottom level unless you pick another.'}
        </p>

        <ol className="cat-list priority-list">
          {draft.map((p, i) => {
            const label = p.name.trim() || `level ${i + 1}`
            return (
              <li key={p.id} className="cat-row">
                <ColorPicker
                  swatches={SWATCHES}
                  value={p.color}
                  onChange={(color) => update(i, { color })}
                  label={`Color for ${label}`}
                />
                <label className="cat-name-field">
                  <span className="visually-hidden">Name for priority {i + 1}</span>
                  <input
                    value={p.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    maxLength={PRIORITY_NAME_MAX}
                    placeholder={`Level ${i + 1}`}
                    autoFocus={p.name === '' && i === draft.length - 2}
                  />
                  <span className="cat-chars" aria-hidden>
                    {p.name.length}/{PRIORITY_NAME_MAX}
                  </span>
                </label>
                <span
                  className="priority-preview"
                  style={{ background: p.color, color: textOn(p.color) }}
                  aria-hidden
                >
                  {p.name.trim() || `Level ${i + 1}`}
                </span>
                <div className="priority-row-tools">
                  <button
                    type="button"
                    className="cat-icon-btn priority-move"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${label} up`}
                    title="Move up"
                  >
                    <Chevron up />
                  </button>
                  <button
                    type="button"
                    className="cat-icon-btn priority-move"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.length - 1}
                    aria-label={`Move ${label} down`}
                    title="Move down"
                  >
                    <Chevron />
                  </button>
                  <button
                    type="button"
                    className="cat-icon-btn"
                    onClick={() => remove(i)}
                    disabled={draft.length === 1}
                    aria-label={`Remove ${label}`}
                    title={draft.length === 1 ? 'You need at least one level' : 'Remove'}
                  >
                    <img src={trashIcon} alt="" />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>

        <button
          type="button"
          className="cat-btn priority-add"
          onClick={addLevel}
          disabled={draft.length >= MAX_PRIORITIES}
        >
          + Add level
        </button>
        {draft.length >= MAX_PRIORITIES && (
          <p className="cat-hint">You have {MAX_PRIORITIES} levels. Remove one to add another.</p>
        )}
        {orphaned > 0 && (
          <p className="priority-warning" role="status">
            {orphaned} task{orphaned === 1 ? '' : 's'} on removed levels will move to “{lowestName}”.
          </p>
        )}

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

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ rotate: up ? '180deg' : undefined }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
