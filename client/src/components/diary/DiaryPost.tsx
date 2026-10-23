import { useLayoutEffect, useRef, useState } from 'react'
import { POST_MAX_CHARS, type MoodPost } from '@tomonook/shared'
import AutoTextarea from './AutoTextarea.tsx'
import pencilIcon from '../../assets/icons/pencil.png'
import trashIcon from '../../assets/icons/trash.png'

interface DiaryPostProps {
  post: MoodPost
  /** Only today's posts can be edited; older ones can only be deleted. */
  editable: boolean
  onEdit: (text: string) => void
  onDelete: () => void
}

export default function DiaryPost({ post, editable, onEdit, onDelete }: DiaryPostProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.text)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  // Show "load more" only when the clamped text is actually cut off. Glyphs can
  // poke a few px past the line box, so ignore anything under half a line.
  // Re-measures when the card resizes or the web font finishes loading.
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 0
      setOverflowing(el.scrollHeight - el.clientHeight > lineHeight / 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [post.text, expanded, editing])

  const time = new Date(post.createdAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const finishEdit = (save: boolean) => {
    if (save && draft.trim()) onEdit(draft)
    else setDraft(post.text)
    setEditing(false)
  }

  return (
    <article className="diary-card diary-post">
      <div className="diary-post-body">
        {editing ? (
          <div className="diary-edit">
            <label className="visually-hidden" htmlFor={`edit-${post.id}`}>
              Edit post
            </label>
            <AutoTextarea
              id={`edit-${post.id}`}
              className="diary-text diary-input diary-edit-input"
              value={draft}
              maxLength={POST_MAX_CHARS}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => finishEdit(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  finishEdit(true)
                }
                if (e.key === 'Escape') finishEdit(false)
              }}
            />
            <span className="diary-count">
              {draft.length}/{POST_MAX_CHARS}
            </span>
          </div>
        ) : (
          <p ref={textRef} className={`diary-text${expanded ? '' : ' is-clamped'}`}>
            {post.text}
          </p>
        )}
        {editable && !editing && (
          <button
            type="button"
            className="diary-icon-btn diary-edit-btn"
            onClick={() => {
              setDraft(post.text)
              setEditing(true)
            }}
            aria-label="Edit post"
            title="Edit"
          >
            <img src={pencilIcon} alt="" />
          </button>
        )}
      </div>

      <footer className="diary-post-footer">
        <time dateTime={post.createdAt} className="diary-time">
          {time}
        </time>
        {(overflowing || expanded) && !editing ? (
          <button
            type="button"
            className="diary-more"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
          >
            {expanded ? 'show less' : 'load more'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="diary-icon-btn diary-delete-btn"
          onClick={onDelete}
          aria-label="Delete post"
          title="Delete"
        >
          <img src={trashIcon} alt="" />
        </button>
      </footer>
    </article>
  )
}
