import type { CSSProperties, Ref } from 'react'
import { priorityOf, useTodoStore } from '../../store/todoStore.ts'

/** Dark text on light colors (like yellow), cream text on dark ones. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#4a2a1a' : '#fff6de'
}

interface PrioritySelectProps {
  /** A level id; missing or unknown shows the lowest level. */
  value: string | undefined
  onChange: (id: string) => void
  label: string
  selectRef?: Ref<HTMLSelectElement>
}

/** A pill in the level's color that opens the list of levels. */
export default function PrioritySelect({ value, onChange, label, selectRef }: PrioritySelectProps) {
  const priorities = useTodoStore((s) => s.priorities)
  const current = priorityOf(priorities, value)

  return (
    <select
      ref={selectRef}
      className="priority-pill"
      aria-label={label}
      title={label}
      value={current.id}
      onChange={(e) => onChange(e.target.value)}
      // Don't start a drag when opening the list.
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ '--priority-color': current.color, color: textOn(current.color) } as CSSProperties}
    >
      {priorities.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
