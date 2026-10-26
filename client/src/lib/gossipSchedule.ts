import { useEffect, useState } from 'react'
import { toDayKey } from '@tomonook/shared'

/** The tabs the gossip tomatoes can visit, by the first part of their path. */
export const GOSSIP_TABS = ['dashboard', 'todo', 'mood', 'timers', 'profile'] as const

/** They move every 4 hours: 12am, 4am, 8am, 12pm, 4pm and 8pm. */
const SLOTS_PER_DAY = 6
const SLOT_MINUTES = (24 * 60) / SLOTS_PER_DAY

/** A small stable hash, so the same day and slot always give the same spot. */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface GossipSpot {
  tab: (typeof GOSSIP_TABS)[number]
  /** 0-1 across the bottom of the page. */
  x: number
  /** Changes whenever they move. */
  key: string
}

/** Where the tomatoes are now, updated when they move. */
export function useGossipSpot() {
  const [spot, setSpot] = useState(() => gossipSpot())
  useEffect(() => {
    const id = window.setInterval(() => setSpot((s) => (gossipSpot().key === s.key ? s : gossipSpot())), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return spot
}

/** Where the tomatoes are right now. Same answer on every reload; never the same tab twice in a row. */
export function gossipSpot(now = new Date()): GossipSpot {
  const day = toDayKey(now)
  const slot = Math.min(SLOTS_PER_DAY - 1, Math.floor((now.getHours() * 60 + now.getMinutes()) / SLOT_MINUTES))
  let tab = -1
  let x = 0
  for (let i = 0; i <= slot; i++) {
    const h = hash(`${day}:${i}`)
    let next = h % GOSSIP_TABS.length
    if (next === tab) next = (next + 1 + ((h >>> 8) % (GOSSIP_TABS.length - 1))) % GOSSIP_TABS.length
    tab = next
    x = ((h >>> 16) % 1000) / 1000
  }
  return { tab: GOSSIP_TABS[tab], x, key: `${day}:${slot}` }
}
