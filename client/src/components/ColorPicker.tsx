import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
  swatches: string[]
  /** Custom trigger content; by default the trigger is a swatch of the current color. */
  children?: ReactNode
  triggerClassName?: string
}

const POPOVER_HEIGHT = 130
const POPOVER_WIDTH = 240

export default function ColorPicker({
  value,
  onChange,
  label,
  swatches,
  children,
  triggerClassName,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)

  // Fixed positioning so a scroll area can't clip it; flip above when there
  // isn't room below, and keep it inside the window on the right.
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const below = r.bottom + 8 + POPOVER_HEIGHT <= window.innerHeight
    setPos({
      top: below ? r.bottom + 8 : r.top - 8 - POPOVER_HEIGHT,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 8 - POPOVER_WIDTH)),
    })
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: globalThis.MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div
      className="color-picker"
      ref={ref}
      onKeyDown={(e) => {
        // Escape closes just the picker, not a surrounding popup.
        if (e.key === 'Escape' && open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      {children ? (
        <button
          type="button"
          className={triggerClassName}
          onClick={toggle}
          aria-label={label}
          aria-expanded={open}
        >
          {children}
        </button>
      ) : (
        <button
          type="button"
          className={`color-swatch color-picker-toggle${triggerClassName ? ` ${triggerClassName}` : ''}`}
          style={{ background: value }}
          onClick={toggle}
          aria-label={label}
          aria-expanded={open}
        />
      )}
      {open && (
        <div className="color-popover" style={pos}>
          {swatches.map((s) => (
            <button
              key={s}
              type="button"
              className={`color-swatch${s.toLowerCase() === value.toLowerCase() ? ' is-active' : ''}`}
              style={{ background: s }}
              onClick={() => {
                onChange(s)
                setOpen(false)
              }}
              aria-label={`Use color ${s}`}
            />
          ))}
          <label className="color-custom" title="Custom color">
            <span className="visually-hidden">Custom color</span>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
