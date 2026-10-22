import type { CSSProperties } from 'react'
import grayTomato from '../assets/tomato/gray-tomato.png'
import './TomatoFill.css'

interface TomatoFillProps {
  /** 0–1: how much of the tomato is filled, from the bottom up. */
  fraction: number
  /** Fill color. Defaults to tomato red; the mood tracker passes mood colors. */
  color?: string
}

/** Gray tomato silhouette that fills with color like a liquid. */
export default function TomatoFill({ fraction, color }: TomatoFillProps) {
  const empty = Math.round((1 - Math.min(1, Math.max(0, fraction))) * 100)
  const style = {
    '--tomato-mask': `url(${grayTomato})`,
    '--fill-color': color,
    clipPath: `inset(${empty}% 0 0 0)`,
  } as CSSProperties

  return (
    <span className="tomato-fill">
      <img src={grayTomato} alt="" />
      <span className="tomato-fill-color" style={style} />
    </span>
  )
}
