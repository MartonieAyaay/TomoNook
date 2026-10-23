import type { CSSProperties } from 'react'
import type { AvatarConfig } from '@tomonook/shared'
import { CROPS, PART_ORDER, partLayer, type AvatarPart, type Crop } from './avatarParts.ts'
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

  return (
    <span className={`avatar${className ? ` ${className}` : ''}`}>
      <span className="avatar-canvas" style={canvas}>
        {PART_ORDER.filter((p) => parts.includes(p)).map((p) => {
          const l = partLayer(p, avatar)
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
            <span key={l.key} className="avatar-layer" style={adjustStyle(p, avatar)}>
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
