import { useEffect, useState } from 'react'
import TomatoReaction from '../profile/TomatoReaction.tsx'
import { useTodoStore } from '../../store/todoStore.ts'

/*
  When a check-off finishes the last open task of a day, the happy tomato
  from Profile sparkles in (with its sound), wherever it was checked off:
  the to-do list, the month overview or the dashboard. Deleting tasks or
  un-checking one never sets it off.
*/
export default function AllDoneCelebration() {
  const [key, setKey] = useState<number | null>(null)

  useEffect(
    () =>
      useTodoStore.subscribe((state, prev) => {
        const wasOpen = new Map(prev.todos.map((t) => [t.id, !t.done]))
        const justDone = state.todos.filter((t) => t.done && wasOpen.get(t.id))
        const finishedADay = justDone.some((t) => state.todos.every((o) => o.day !== t.day || o.done))
        if (finishedADay) setKey(Date.now())
      }),
    [],
  )

  if (key === null) return null
  return (
    <TomatoReaction
      key={key}
      likes
      caption="All done for the day!"
      onDone={() => setKey(null)}
    />
  )
}
