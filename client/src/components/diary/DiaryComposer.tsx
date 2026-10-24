import { useState } from 'react'
import { POST_MAX_CHARS } from '@tomonook/shared'
import AutoTextarea from './AutoTextarea.tsx'

/** The "What's up?" box. Enter posts, Shift+Enter adds a new line. */
export default function DiaryComposer({ onPost, autoFocus = false }: { onPost: (text: string) => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return
    onPost(text)
    setText('')
  }

  return (
    <form
      className="diary-card diary-composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label className="visually-hidden" htmlFor="diary-new">
        New diary post
      </label>
      <AutoTextarea
        id="diary-new"
        autoFocus={autoFocus}
        className="diary-text diary-input"
        value={text}
        placeholder="What’s up?"
        maxLength={POST_MAX_CHARS}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <div className="diary-composer-footer">
        {text.trim() && (
          <button type="submit" className="diary-post-button">
            Post
          </button>
        )}
        <span className="diary-count">
          {text.length}/{POST_MAX_CHARS}
        </span>
      </div>
    </form>
  )
}
