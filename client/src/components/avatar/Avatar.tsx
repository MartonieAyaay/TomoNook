import type { CSSProperties } from 'react'
import type { AvatarConfig } from '@tomonook/shared'
import { CHIN_LINE, CROPS, PART_ORDER, partLayer, type AvatarPart, type Crop } from './avatarParts.ts'
import './Avatar.css'

/** Moves/resizes a part around its own center, as set in the editor. */
function adjustStyle(part: AvatarPart, avatar: AvatarConfig): CSSProperties | undefined {
  if (part === 'body') return undefined
  const a = avatar.adjust?.[part]
  if (!a) return undefined
  const c = CROPS[part]
  return {
    transform: `translate(${a.x}%, ${a.y}%) scale(${a.scale})`,
    transformOrigin: `${(c.left + c.size / 2) * 100}% ${(c.top + c.size / 2) * 100}%`,
  }
}

interface AvatarProps {
  avatar: AvatarConfig
  /** Draw just these parts (default: all). */
  parts?: AvatarPart[]
  crop?: Crop
  className?: string
}

export default function Avatar({ avatar, parts = PART_ORDER, crop = CROPS.full, className }: AvatarProps) {
  const canvas = {
    width: `${100 / crop.size}%`,
    left: `${(-crop.left / crop.size) * 100}%`,
    top: `${(-crop.top / crop.size) * 100}%`,
  }

  // Long hair is cut at the chin: the lower piece goes under the body, the
  // upper piece stays in its usual spot above it. The cuts overlap slightly so
  // no seam shows where they meet.
  const draws: { part: AvatarPart; key: string; clip?: string }[] = []
  for (const p of PART_ORDER) {
    if (!parts.includes(p)) continue
    if (p === 'hair') {
      draws.splice(0, 0, { part: p, key: 'hair-back', clip: `inset(${CHIN_LINE * 100 - 0.1}% 0 0 0)` })
      draws.push({ part: p, key: 'hair', clip: `inset(0 0 ${100 - CHIN_LINE * 100 - 0.1}% 0)` })
    } else {
      draws.push({ part: p, key: p })
    }
  }

  return (
    <span className={`avatar${className ? ` ${className}` : ''}`}>
      <span className="avatar-canvas" style={canvas}>
        {draws.map(({ part: p, key, clip }) => {
          const l = partLayer(p, avatar)
          if (!l) return null
          const art = (
            <>
              {l.mask && (
                <span
                  className="avatar-fill"
                  style={{ '--avatar-mask': `url(${l.mask})`, background: l.color } as CSSProperties}
                />
              )}
              <img src={l.src} alt="" draggable={false} />
            </>
          )
          const spacing = p === 'body' ? 0 : (avatar.adjust?.[p]?.spacing ?? 0)
          return (
            <span key={key} className="avatar-layer" style={{ ...adjustStyle(p, avatar), clipPath: clip }}>
              {spacing === 0 ? (
                art
              ) : (
                // Paired parts are centered on the canvas, so each half can be
                // cut at the middle and pushed out (or in) on its own.
                <>
                  <span
                    className="avatar-layer"
                    style={{ clipPath: 'inset(0 50% 0 0)', transform: `translateX(${-spacing}%)` }}
                  >
                    {art}
                  </span>
                  <span
                    className="avatar-layer"
                    style={{ clipPath: 'inset(0 0 0 50%)', transform: `translateX(${spacing}%)` }}
                  >
                    {art}
                  </span>
                </>
              )}
            </span>
          )
        })}
      </span>
    </span>
  )
}
