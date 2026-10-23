import { useState } from 'react'
import { today, type DayKey, type MoodPost } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import DiaryComposer from '../components/diary/DiaryComposer.tsx'
import DiaryPost from '../components/diary/DiaryPost.tsx'
import { useMoodStore } from '../store/moodStore.ts'
import './TodoPage.css'
import './MoodPage.css'

export default function MoodPage() {
  const [selected, setSelected] = useState<DayKey>(today)
  const [deleting, setDeleting] = useState<MoodPost | null>(null)
  const allPosts = useMoodStore((s) => s.posts)
  const { addPost, editPost, deletePost } = useMoodStore.getState()

  const isToday = selected === today()
  // Newest first.
  const posts = allPosts.filter((p) => p.day === selected).reverse()

  return (
    <div className="split-page mood-page">
      <header className="split-header">
        <h1 className="page-title">Mood Tracker !!</h1>
      </header>

      <Calendar selected={selected} onSelect={setSelected} />

      <section className="diary" aria-labelledby="diary-title">
        <h2 id="diary-title" className="diary-title">
          Diary
        </h2>

        {isToday ? (
          <DiaryComposer onPost={(text) => addPost(selected, text)} />
        ) : (
          <p className="diary-note">
            {selected < today() ? 'Past entries can be read and deleted.' : 'You can write here on that day.'}
          </p>
        )}

        <div className="diary-posts">
          {posts.map((p) => (
            <DiaryPost
              key={p.id}
              post={p}
              editable={isToday}
              onEdit={(text) => editPost(p.id, text)}
              onDelete={() => setDeleting(p)}
            />
          ))}
          {posts.length === 0 && (
            <p className="diary-note">{isToday ? 'Nothing written yet today.' : 'No entries this day.'}</p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete post?"
        confirmLabel="Delete post"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deletePost(deleting.id)
          setDeleting(null)
        }}
      >
        This can’t be undone.
      </ConfirmDialog>
    </div>
  )
}
