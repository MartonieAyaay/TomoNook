import { useState } from 'react'
import { today, type DayKey, type MoodPost } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import DiaryComposer from '../components/diary/DiaryComposer.tsx'
import DiaryPost from '../components/diary/DiaryPost.tsx'
import MoodPicker from '../components/mood/MoodPicker.tsx'
import TomatoFill from '../components/TomatoFill.tsx'
import { useMoodStore } from '../store/moodStore.ts'
import smilingTomato from '../assets/tomato/tomato-face.png'
import grayTomato from '../assets/tomato/gray-tomato.png'
import './TodoPage.css'
import './MoodPage.css'

export default function MoodPage() {
  const [selected, setSelected] = useState<DayKey>(today)
  const [deleting, setDeleting] = useState<MoodPost | null>(null)
  const allPosts = useMoodStore((s) => s.posts)
  const { addPost, editPost, deletePost } = useMoodStore.getState()
  const moods = useMoodStore((s) => s.moods)
  const entries = useMoodStore((s) => s.entries)
  // Each logged day's tomato fills with its mood's color.
  const moodColor = new Map(
    entries.flatMap((e) => {
      const mood = moods.find((m) => m.id === e.moodId)
      return mood ? [[e.day, mood.color] as const] : []
    }),
  )

  const isToday = selected === today()
  // Newest first.
  const posts = allPosts.filter((p) => p.day === selected).reverse()

  return (
    <div className="split-page mood-page">
      <header className="split-header">
        <h1 className="page-title">Mood Tracker !!</h1>
      </header>

      <div className="mood-left">
        <Calendar
          selected={selected}
          onSelect={setSelected}
          renderTomato={(day) => {
            const color = moodColor.get(day)
            return color ? <TomatoFill fraction={1} color={color} /> : <img src={grayTomato} alt="" />
          }}
        />
        <MoodPicker day={selected} />
      </div>

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
            <div className="diary-empty">
              <img src={smilingTomato} alt="" />
              <p>{isToday ? 'Tell me what you’re feeling...' : 'No entries this day.'}</p>
            </div>
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
