import { useEffect, useRef, useState } from 'react'
import { MAX_MOODS, MOOD_NAME_MAX, type Mood } from '@tomonook/shared'
import { useMoodStore } from '../../store/moodStore.ts'
import ColorPicker from '../ColorPicker.tsx'
import pencilIcon from '../../assets/icons/pencil.png'
import trashIcon from '../../assets/icons/trash.png'
// Same look as the to-do Categories popup.
import '../CategoryManager.css'

/** Colors offered for moods. Any color can still be picked. */
export const MOOD_SWATCHES = ['#F5C842', '#e66b33', '#D9382E', '#f29bb5', '#9a6a9e', '#4A7FD1', '#a0bb3b', '#6e3f39']

interface MoodManagerProps {
  open: boolean
  onClose: () => void
}

/** Popup for adding, renaming, recoloring and deleting moods. */
export default function MoodManager({ open, onClose }: MoodManagerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const moods = useMoodStore((s) => s.moods)
  const addMood = useMoodStore((s) => s.addMood)
  const [newName, setNewName] = useState('')
  const unusedColor = MOOD_SWATCHES.find((c) => !moods.some((m) => m.color.toLowerCase() === c.toLowerCase()))
  const [newColor, setNewColor] = useState(unusedColor ?? MOOD_SWATCHES[0])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const full = moods.length >= MAX_MOODS

  const submitNew = () => {
    if (!newName.trim() || full) return
    addMood(newName, newColor)
    setNewName('')
    const next = MOOD_SWATCHES.find(
      (c) => c !== newColor && !moods.some((m) => m.color.toLowerCase() === c.toLowerCase()),
    )
    if (next) setNewColor(next)
  }

  return (
    <dialog
      ref={dialogRef}
      className="cat-dialog"
      aria-labelledby="mood-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cat-dialog-body">
        <header className="cat-dialog-header">
          <h2 id="mood-dialog-title">Moods</h2>
          <span className="cat-count">
            {moods.length}/{MAX_MOODS}
          </span>
          <button type="button" className="cat-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <ul className="cat-list">
          {moods.map((m) => (
            <MoodRow key={m.id} mood={m} />
          ))}
          {moods.length === 0 && <li className="cat-empty">No moods yet. Add your first one below.</li>}
        </ul>

        <form
          className="cat-new"
          onSubmit={(e) => {
            e.preventDefault()
            submitNew()
          }}
        >
          <ColorPicker swatches={MOOD_SWATCHES} value={newColor} onChange={setNewColor} label="New mood color" />
          <label className="cat-new-field">
            <span className="visually-hidden">New mood name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={MOOD_NAME_MAX}
              placeholder={full ? 'Mood limit reached' : 'New mood'}
              disabled={full}
            />
            <span className="cat-chars" aria-hidden>
              {newName.length}/{MOOD_NAME_MAX}
            </span>
          </label>
          <button type="submit" className="cat-add" disabled={full || !newName.trim()}>
            Add mood
          </button>
        </form>
        {full && <p className="cat-hint">You have {MAX_MOODS} moods. Delete one to add another.</p>}
      </div>
    </dialog>
  )
}

function MoodRow({ mood }: { mood: Mood }) {
  const updateMood = useMoodStore((s) => s.updateMood)
  const deleteMood = useMoodStore((s) => s.deleteMood)
  const dayCount = useMoodStore((s) => s.entries.filter((e) => e.moodId === mood.id).length)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(mood.name)
  const [confirming, setConfirming] = useState(false)

  const saveName = () => {
    if (draft.trim()) updateMood(mood.id, { name: draft })
    else setDraft(mood.name)
    setEditing(false)
  }

  if (confirming) {
    return (
      <li className="cat-row cat-row-confirm">
        <span>
          Delete “{mood.name}”
          {dayCount > 0 && ` and clear it from ${dayCount} day${dayCount === 1 ? '' : 's'}`}?
        </span>
        <button type="button" className="cat-btn cat-btn-danger" onClick={() => deleteMood(mood.id)}>
          Delete mood
        </button>
        <button type="button" className="cat-btn" onClick={() => setConfirming(false)} autoFocus>
          Keep it
        </button>
      </li>
    )
  }

  return (
    <li className="cat-row">
      <ColorPicker
        swatches={MOOD_SWATCHES}
        value={mood.color}
        onChange={(color) => updateMood(mood.id, { color })}
        label={`Color for ${mood.name}`}
      />
      {editing ? (
        <label className="cat-name-field">
          <span className="visually-hidden">Mood name</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MOOD_NAME_MAX}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') {
                // Keep Escape from also closing the whole popup.
                e.preventDefault()
                setDraft(mood.name)
                setEditing(false)
              }
            }}
          />
          <span className="cat-chars" aria-hidden>
            {draft.length}/{MOOD_NAME_MAX}
          </span>
        </label>
      ) : (
        <span className="cat-name" style={{ color: mood.color }}>
          {mood.name}
        </span>
      )}
      <button
        type="button"
        className="cat-icon-btn"
        onClick={() => {
          setDraft(mood.name)
          setEditing(true)
        }}
        aria-label={`Rename ${mood.name}`}
        title="Rename"
      >
        <img src={pencilIcon} alt="" />
      </button>
      <button
        type="button"
        className="cat-icon-btn cat-delete"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${mood.name}`}
        title="Delete"
      >
        <img src={trashIcon} alt="" />
      </button>
    </li>
  )
}
