import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { currentWeatherLine, gossipLines, replyTo, type GossipLine } from '../../lib/gossip.ts'
import { speak, stopSpeaking } from '../../lib/gibberish.ts'
import { useGossipSpot } from '../../lib/gossipSchedule.ts'
import { load, save } from '../../lib/storage.ts'
import { cachedWeather, fetchWeather, type City } from '../../lib/weather.ts'
import CityPicker from '../CityPicker.tsx'
import { useGossipStore } from '../../store/gossipStore.ts'
import { useSettingsStore } from '../../store/settingsStore.ts'
import { today } from '@tomonook/shared'
import tallTomato from '../../assets/tomato/gossip-tall.png'
import roundTomato from '../../assets/tomato/gossip-round.png'
import './GossipTomatoes.css'

/** The answer waits for the first voice line to finish, within these limits. */
const REPLY_MIN_MS = 1500
const REPLY_MAX_MS = 3500
/** How long the answer stays up. */
const TALK_MS = 5000
/** Longer when they're waiting for a yes/no about the weather. */
const ASK_MS = 15000

type Who = 0 | 1

interface Talk {
  key: number
  first: Who
  line: GossipLine
  reply: string
  replied: boolean
}

/**
  The two named gossip tomatoes. They sit together on one tab, move to
  another every 4 hours, and whisper about the user when tapped (and once
  on their own each time they move).
*/
export default function GossipTomatoes() {
  const names = useGossipStore((s) => s.names)
  const permission = useGossipStore((s) => s.weather)
  const setPermission = useGossipStore((s) => s.setWeather)
  const section = useLocation().pathname.split('/')[1]
  const autoChat = useSettingsStore((s) => s.gossipAutoChat)
  const updateSettings = useSettingsStore((s) => s.update)
  const hiddenToday = useSettingsStore((s) => s.gossipHiddenOn === today())
  const spot = useGossipSpot()
  const [talk, setTalk] = useState<Talk | null>(null)
  const timers = useRef<number[]>([])
  const lastText = useRef('')

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  // Leaving the tab (or the tomatoes moving away) hushes them.
  useEffect(
    () => () => {
      clearTimers()
      stopSpeaking()
    },
    [],
  )

  // Weather is allowed but stale: refresh quietly so it's ready when they talk.
  useEffect(() => {
    if (permission === 'allowed' && !cachedWeather()) fetchWeather().catch(() => {})
  }, [permission, spot.key])

  /** One tomato says a line, the other answers a moment later. */
  const say = useCallback((first: Who, line: GossipLine, reply: string) => {
    clearTimers()
    lastText.current = line.text
    setTalk({ key: Date.now(), first, line, reply, replied: false })
    const replyAt = Math.min(REPLY_MAX_MS, Math.max(REPLY_MIN_MS, speak(first) + 200))
    timers.current.push(
      window.setTimeout(() => {
        setTalk((t) => t && { ...t, replied: true })
        if (reply) speak(first === 0 ? 1 : 0)
      }, replyAt),
    )
    // Asking for the city: stays up until one is picked (or they're tapped).
    if (!line.askCity) {
      timers.current.push(window.setTimeout(() => setTalk(null), line.askWeather ? ASK_MS : replyAt + TALK_MS))
    }
  }, [])

  const chat = useCallback(
    (first: Who) => {
      const lines = gossipLines()
      const fresh = lines.filter((l) => l.text !== lastText.current)
      const line = (fresh.length ? fresh : lines)[Math.floor(Math.random() * (fresh.length || lines.length))]
      say(first, line, replyTo(line))
    },
    [say],
  )

  const here = names !== null && !hiddenToday && section === spot.tab

  // Switching to another tab, or the tomatoes moving away, hushes them mid-sentence.
  useEffect(() => {
    if (here) return
    clearTimers()
    stopSpeaking()
  }, [here])

  // The first time they're seen after moving, they start chatting by themselves.
  useEffect(() => {
    if (!here || !autoChat || load('gossipHeard', '') === spot.key) return
    const t = window.setTimeout(() => {
      save('gossipHeard', spot.key)
      chat(Math.random() < 0.5 ? 0 : 1)
    }, 1200)
    return () => window.clearTimeout(t)
  }, [here, autoChat, spot.key, chat])

  if (!here || !names) return null

  const answerWeather = async (allow: boolean) => {
    const first = talk?.first ?? 0
    if (!allow) {
      setPermission('denied')
      say(first, { text: "Okay, no peeking. We'll stick to gossip!", tone: 'meh' }, 'Our lips are sealed.')
      return
    }
    // The weather is for the user's city, so ask for it first.
    if (!useSettingsStore.getState().weatherCity) {
      say(first, { text: 'Ooh, where do you live? We’ll peek at the sky there!', tone: 'meh', askCity: true }, '')
      return
    }
    await checkSky(first)
  }

  const pickCity = (city: City) => {
    updateSettings({ weatherCity: city })
    void checkSky(talk?.first ?? 0)
  }

  const checkSky = async (first: Who) => {
    say(first, { text: 'Checking the sky...', tone: 'meh' }, '')
    try {
      await fetchWeather()
      setPermission('allowed')
      const line = currentWeatherLine()
      if (line) say(first, line, replyTo(line))
    } catch {
      // Offline, most likely: try another day.
      say(first, { text: "Hmm, I can't see the sky right now.", tone: 'meh' }, 'Maybe later!')
    }
  }

  const second: Who = talk?.first === 0 ? 1 : 0
  const art = [tallTomato, roundTomato]
  const side = ['tall', 'round']

  return (
    <div className="gossip-pair" style={{ '--gossip-x': spot.x } as CSSProperties}>
      <div className="gossip-talk" aria-live="polite">
        {talk && (
          <p key={`${talk.key}a`} className={`gossip-say from-${side[talk.first]}`}>
            <strong>{names[talk.first]}:</strong> {talk.line.text}
            {talk.line.askWeather && talk.replied && (
              <span className="gossip-ask">
                <button type="button" onClick={() => answerWeather(true)}>
                  Let them check
                </button>
                <button type="button" className="is-secondary" onClick={() => answerWeather(false)}>
                  No thanks
                </button>
              </span>
            )}
          </p>
        )}
        {talk?.line.askCity && (
          <div key={`${talk.key}c`} className="gossip-city">
            <CityPicker compact onPick={pickCity} />
          </div>
        )}
        {talk?.replied && talk.reply && (
          <p key={`${talk.key}b`} className={`gossip-say from-${side[second]}`}>
            <strong>{names[second]}:</strong> {talk.reply}
          </p>
        )}
      </div>
      <div className="gossip-tomatoes">
        {([0, 1] as const).map((who) => (
          <button
            key={who}
            type="button"
            className={`gossip-tom is-${side[who]}${talk && (talk.replied ? second : talk.first) === who ? ' is-talking' : ''}`}
            onClick={() => chat(who)}
            aria-label={`${names[who]}, a gossip tomato. Tap to hear the gossip.`}
            title={names[who]}
          >
            <img src={art[who]} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}
