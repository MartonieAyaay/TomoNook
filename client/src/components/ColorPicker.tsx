import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useColorStore } from '../store/colorStore.ts'
import { load, save } from '../lib/storage.ts'
import './ColorPicker.css'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
  /** Starter colors, shown on the Recent tab until the user has picked some. */
  swatches: string[]
  /** Custom trigger content; by default the trigger is a swatch of the current color. */
  children?: ReactNode
  triggerClassName?: string
}

type Tab = 'picker' | 'recent'

/** The tallest the window gets (the Picker tab). */
const POPOVER_HEIGHT = 330
const POPOVER_WIDTH = 264

/**
  A swatch that opens a small window with two tabs: a color picker
  (shade square, hue slider, hex box) and the recently used colors.
*/
export default function ColorPicker({
  value,
  onChange,
  label,
  swatches,
  children,
  triggerClassName,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(() => load<Tab>('colorPickerTab', 'picker'))
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const recent = useColorStore((s) => s.recent)
  const addRecent = useColorStore((s) => s.addRecent)
  // The color when the window opened, so closing can tell if it changed.
  const openedWith = useRef(value)
  const latest = useRef(value)
  latest.current = value

  const close = () => {
    setOpen(false)
    if (latest.current.toLowerCase() !== openedWith.current.toLowerCase()) addRecent(latest.current)
  }

  // Fixed positioning so a scroll area can't clip it; flip above when there
  // isn't room below, and keep it inside the window.
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    if (open) return close()
    const r = e.currentTarget.getBoundingClientRect()
    const below = r.bottom + 8 + POPOVER_HEIGHT <= window.innerHeight
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 8 - POPOVER_WIDTH))
    // Anchored by its bottom edge when above, since its height depends on the tab.
    setPos(below ? { top: r.bottom + 8, left } : { bottom: Math.max(8, window.innerHeight - r.top + 8), left })
    openedWith.current = value
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: globalThis.MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  })

  const chooseTab = (t: Tab) => {
    setTab(t)
    save('colorPickerTab', t)
  }

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next = tab === 'picker' ? 'recent' : 'picker'
    chooseTab(next)
    document.getElementById(`${id}-${next}-tab`)?.focus()
  }

  const shown = recent.length > 0 ? recent : swatches

  return (
    <div
      className="color-picker"
      ref={ref}
      onKeyDown={(e) => {
        // Escape closes just the picker, not a surrounding popup.
        if (e.key === 'Escape' && open) {
          e.preventDefault()
          e.stopPropagation()
          close()
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
        <div className="color-popover" style={pos} role="dialog" aria-label={label}>
          <div className="color-tabs" role="tablist" aria-label="Color options">
            {(['picker', 'recent'] as const).map((t) => (
              <button
                key={t}
                id={`${id}-${t}-tab`}
                type="button"
                role="tab"
                aria-selected={tab === t}
                aria-controls={`${id}-${t}`}
                tabIndex={tab === t ? 0 : -1}
                className={`color-tab${tab === t ? ' is-active' : ''}`}
                onClick={() => chooseTab(t)}
                onKeyDown={onTabKey}
              >
                {t === 'picker' ? 'Picker' : 'Recent'}
              </button>
            ))}
          </div>

          {tab === 'picker' ? (
            <div id={`${id}-picker`} role="tabpanel" aria-labelledby={`${id}-picker-tab`}>
              <ShadePicker value={value} onChange={onChange} />
            </div>
          ) : (
            <div
              id={`${id}-recent`}
              role="tabpanel"
              aria-labelledby={`${id}-recent-tab`}
              className="color-recent"
            >
              <p className="color-recent-note">
                {recent.length > 0 ? 'Recently used' : 'No recent colors yet. Try one of these:'}
              </p>
              <div className="color-recent-grid">
                {shown.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`color-swatch${s.toLowerCase() === value.toLowerCase() ? ' is-active' : ''}`}
                    style={{ background: s }}
                    onClick={() => {
                      onChange(s)
                      latest.current = s
                      close()
                    }}
                    aria-label={`Use color ${s}`}
                    title={s}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- The picker tab ----------

interface Hsv {
  h: number
  s: number
  v: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const [r, g, b] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv) {
  const f = (k: number) => {
    const x = (k + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(x, 4 - x, 1))) * 255)
  }
  return `#${[f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

const HEX = /^#?[0-9a-f]{6}$/i

/**
  Shade square + hue slider + hex box. Dragging previews in the window and
  only applies the color on release, so one drag is one change (and one undo).
*/
function ShadePicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  // Kept as HSV so the hue isn't lost while dragging through grays.
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [hexDraft, setHexDraft] = useState(value)
  const draft = hsvToHex(hsv)

  const update = (next: Hsv) => {
    setHsv(next)
    setHexDraft(hsvToHex(next))
  }
  const commit = (next = hsv) => {
    const hex = hsvToHex(next)
    if (hex !== value.toLowerCase()) onChange(hex)
  }

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const next = { ...hsv, s: clamp01((e.clientX - r.left) / r.width), v: 1 - clamp01((e.clientY - r.top) / r.height) }
    update(next)
    return next
  }

  const onSquareKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp01(hsv.s - step) },
      ArrowRight: { s: clamp01(hsv.s + step) },
      ArrowUp: { v: clamp01(hsv.v + step) },
      ArrowDown: { v: clamp01(hsv.v - step) },
    }
    if (!moves[e.key]) return
    e.preventDefault()
    const next = { ...hsv, ...moves[e.key] }
    update(next)
    commit(next)
  }

  return (
    <div className="shade-picker">
      <div
        className="shade-square"
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        tabIndex={0}
        role="slider"
        aria-label="Shade: arrows change brightness and richness"
        aria-valuetext={draft}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        onPointerUp={(e) => commit(fromPointer(e))}
        onKeyDown={onSquareKey}
      >
        <span
          className="shade-thumb"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: draft }}
        />
      </div>

      <label className="hue-field">
        <span className="visually-hidden">Hue</span>
        <input
          type="range"
          className="hue-slider"
          min={0}
          max={359}
          value={Math.round(hsv.h)}
          onChange={(e) => update({ ...hsv, h: Number(e.target.value) })}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
        />
      </label>

      <div className="shade-row">
        <span className="shade-preview" style={{ background: draft }} aria-hidden />
        <label className="shade-hex">
          <span className="visually-hidden">Hex color</span>
          <input
            value={hexDraft}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => {
              setHexDraft(e.target.value)
              if (HEX.test(e.target.value)) {
                const hex = `#${e.target.value.replace('#', '').toLowerCase()}`
                setHsv(hexToHsv(hex))
                onChange(hex)
              }
            }}
            onBlur={() => setHexDraft(draft)}
          />
        </label>
      </div>
    </div>
  )
}
