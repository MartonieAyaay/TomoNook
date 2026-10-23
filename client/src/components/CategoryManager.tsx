import { useEffect, useRef, useState } from 'react'
import { CATEGORY_NAME_MAX, MAX_CATEGORIES, type TodoCategory } from '@tomonook/shared'
import { useTodoStore } from '../store/todoStore.ts'
import pencilIcon from '../assets/icons/pencil.png'
import trashIcon from '../assets/icons/trash.png'
import ColorPicker from './ColorPicker.tsx'
import './CategoryManager.css'

/** Swatches offered for categories, from the design palette. */
const SWATCHES = ['#e66b33', '#c13828', '#f5c851', '#a0bb3b', '#29512f', '#7d4f3c']

interface CategoryManagerProps {
  open: boolean
  onClose: () => void
}

export default function CategoryManager({ open, onClose }: CategoryManagerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const categories = useTodoStore((s) => s.categories)
  const addCategory = useTodoStore((s) => s.addCategory)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(SWATCHES[0])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const full = categories.length >= MAX_CATEGORIES

  const submitNew = () => {
    if (!newName.trim() || full) return
    addCategory(newName, newColor)
    setNewName('')
    setNewColor(SWATCHES[(categories.length + 1) % SWATCHES.length])
  }

  return (
    <dialog
      ref={dialogRef}
      className="cat-dialog"
      aria-labelledby="cat-dialog-title"
      onClose={onClose}
      // Clicking the grayed-out backdrop closes the popup.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cat-dialog-body">
        <header className="cat-dialog-header">
          <h2 id="cat-dialog-title">Categories</h2>
          <span className="cat-count">
            {categories.length}/{MAX_CATEGORIES}
          </span>
          <button type="button" className="cat-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <ul className="cat-list">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
          {categories.length === 0 && (
            <li className="cat-empty">No categories yet. Add your first one below.</li>
          )}
        </ul>

        <form
          className="cat-new"
          onSubmit={(e) => {
            e.preventDefault()
            submitNew()
          }}
        >
          <ColorPicker
            swatches={SWATCHES}
            value={newColor}
            onChange={setNewColor}
            label="New category color"
          />
          <label className="cat-new-field">
            <span className="visually-hidden">New category name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={CATEGORY_NAME_MAX}
              placeholder={full ? 'Category limit reached' : 'New category'}
              disabled={full}
            />
            <span className="cat-chars" aria-hidden>
              {newName.length}/{CATEGORY_NAME_MAX}
            </span>
          </label>
          <button type="submit" className="cat-add" disabled={full || !newName.trim()}>
            Add category
          </button>
        </form>
        {full && (
          <p className="cat-hint">You have {MAX_CATEGORIES} categories. Delete one to add another.</p>
        )}
      </div>
    </dialog>
  )
}

function CategoryRow({ category }: { category: TodoCategory }) {
  const updateCategory = useTodoStore((s) => s.updateCategory)
  const deleteCategory = useTodoStore((s) => s.deleteCategory)
  const taskCount = useTodoStore((s) => s.todos.filter((t) => t.categoryId === category.id).length)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(category.name)
  const [confirming, setConfirming] = useState(false)

  const saveName = () => {
    if (draft.trim()) updateCategory(category.id, { name: draft })
    else setDraft(category.name)
    setEditing(false)
  }

  if (confirming) {
    return (
      <li className="cat-row cat-row-confirm">
        <span>
          Delete “{category.name}”
          {taskCount > 0 && ` and its ${taskCount} task${taskCount === 1 ? '' : 's'}`}?
        </span>
        <button
          type="button"
          className="cat-btn cat-btn-danger"
          onClick={() => deleteCategory(category.id)}
        >
          Delete category
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
        swatches={SWATCHES}
        value={category.color}
        onChange={(color) => updateCategory(category.id, { color })}
        label={`Color for ${category.name}`}
      />
      {editing ? (
        <label className="cat-name-field">
          <span className="visually-hidden">Category name</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={CATEGORY_NAME_MAX}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') {
                // Keep Escape from also closing the whole popup.
                e.preventDefault()
                setDraft(category.name)
                setEditing(false)
              }
            }}
          />
          <span className="cat-chars" aria-hidden>
            {draft.length}/{CATEGORY_NAME_MAX}
          </span>
        </label>
      ) : (
        <span className="cat-name" style={{ color: category.color }}>
          {category.name}
        </span>
      )}
      <button
        type="button"
        className="cat-icon-btn"
        onClick={() => {
          setDraft(category.name)
          setEditing(true)
        }}
        aria-label={`Rename ${category.name}`}
        title="Rename"
      >
        <img src={pencilIcon} alt="" />
      </button>
      <button
        type="button"
        className="cat-icon-btn cat-delete"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${category.name}`}
        title="Delete"
      >
        <img src={trashIcon} alt="" />
      </button>
    </li>
  )
}
