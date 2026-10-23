import type { AvatarConfig } from '@tomonook/shared'

/*
  Every part is drawn on the same square canvas, so layers stack with no
  offsets. Areas painted pure green in the art (hair, irises, shirt) were split
  out into "-mask.png" files at export time so they can be any color.
*/
const files = import.meta.glob<string>('../../assets/avatar/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const url = (path: string): string | undefined => files[`../../assets/avatar/${path}.png`]

export interface Layer {
  key: string
  src: string
  /** Recolorable area, if the part has one. */
  mask?: string
  color?: string
}

function layer(key: string, path: string, color?: string): Layer {
  const src = url(path)
  if (!src) throw new Error(`Missing avatar art: ${path}`)
  const mask = url(`${path}-mask`)
  return { key, src, mask, color: mask ? color : undefined }
}

export type AvatarPart = 'body' | 'hair' | 'eyes' | 'brows' | 'nose' | 'mouth'

/** Bottom to top. */
export const PART_ORDER: AvatarPart[] = ['body', 'hair', 'eyes', 'brows', 'nose', 'mouth']

/**
  Where the neck meets the jaw, as a fraction of the canvas height. Hair below
  this line is drawn behind the body, so long hair falls behind the neck and
  shoulders of either body shape instead of being drawn over them. (The hair
  art is cut to fit the slim neck; the plus neck is wider from here down.)
*/
export const CHIN_LINE = 0.621

/** Option 0 means "none": every part but the body can be left off. */
export function partLayer(part: AvatarPart, a: AvatarConfig): Layer | null {
  if (part !== 'body' && a[part] === 0) return null
  switch (part) {
    case 'body':
      return layer(part, `body/${a.body}-${a.skin}`, a.shirtColor)
    case 'hair':
      return layer(part, `hair/hair-${a.hair}`, a.hairColor)
    case 'eyes':
      return layer(part, `eyes/${a.lashes ? 'lashes' : 'plain'}-${a.eyes}`, a.eyeColor)
    case 'brows':
      return layer(part, `brows/brows-${a.brows}`)
    case 'nose':
      return layer(part, `nose/nose-${a.nose}`)
    case 'mouth':
      return layer(part, `mouth/mouth-${a.mouth}`)
  }
}

/** Tint drawn under the mouth (multiplied, so it suits every skin tone). */
export const lipstickLayer = (): Layer => layer('lipstick', 'mouth/lipstick')

export const OPTION_COUNT = { eyes: 6, brows: 8, nose: 4, mouth: 10, hair: 9 } as const

/** Sampled from the skin art, light to dark. */
export const SKIN_TONES = ['#f1ded1', '#f9cfb3', '#d7ad91', '#ae7b5a', '#865b3e', '#522f19']

export const HAIR_COLORS = ['#2b2220', '#5a3825', '#9a6a45', '#e3c06f', '#c8642b', '#c13828', '#a0bb3b']
export const EYE_COLORS = ['#5a3825', '#2b2220', '#8a6a2f', '#4a7fd1', '#5f8f3e', '#8a9aa6', '#c13828']
export const SHIRT_COLORS = ['#c13828', '#e66b33', '#f5c851', '#a0bb3b', '#29512f', '#4a7fd1', '#fff6de']

/**
  Square windows onto the canvas, as fractions of its size, used to zoom in
  on one part (e.g. option thumbnails). `full` frames the whole avatar.
*/
export interface Crop {
  left: number
  top: number
  size: number
}

export const CROPS: Record<AvatarPart | 'full', Crop> = {
  full: { left: 0.08, top: 0.14, size: 0.84 },
  body: { left: 0.1, top: 0.16, size: 0.8 },
  hair: { left: 0.14, top: 0.14, size: 0.72 },
  eyes: { left: 0.32, top: 0.28, size: 0.36 },
  brows: { left: 0.32, top: 0.2, size: 0.36 },
  nose: { left: 0.4, top: 0.41, size: 0.2 },
  mouth: { left: 0.38, top: 0.47, size: 0.24 },
}
