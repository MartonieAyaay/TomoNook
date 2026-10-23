import type { CSSProperties } from 'react'
import type { AvatarConfig } from '@tomonook/shared'
import { CROPS, PART_ORDER, partLayer, type AvatarPart, type Crop } from './avatarParts.ts'
import './Avatar.css'

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
          return (
            <span key={l.key} className="avatar-layer">
              {l.mask && (
                <span
                  className="avatar-fill"
                  style={{ '--avatar-mask': `url(${l.mask})`, background: l.color } as CSSProperties}
                />
              )}
              <img src={l.src} alt="" draggable={false} />
            </span>
          )
        })}
      </span>
    </span>
  )
}
