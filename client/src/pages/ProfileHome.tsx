import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { today } from '@tomonook/shared'
import Avatar from '../components/avatar/Avatar.tsx'
import TomatoFill from '../components/TomatoFill.tsx'
import { pronounTag } from '../lib/pronouns.ts'
import { quoteOfTheDay } from '../lib/quotes.ts'
import { useMoodStore } from '../store/moodStore.ts'
import { isInfoComplete, useProfileStore } from '../store/profileStore.ts'
import { useGossipStore } from '../store/gossipStore.ts'
import NamingDialog from '../components/gossip/NamingDialog.tsx'
import ProfileInfoCard from '../components/profile/ProfileInfoCard.tsx'
import TomatoReaction from '../components/profile/TomatoReaction.tsx'
import { FOOD_NAME_MAX, MAX_FOODS, imageToDataUrl, useFoodStore, type Food } from '../store/foodStore.ts'
import tomato from '../assets/tomato/tomato-no-face.png'
import thoughtBubble from '../assets/tomato/thought-bubble.png'
import buttonTomato from '../assets/tomato/button-tomato.png'
import './ProfileHome.css'

const QUOTE_MS = 6000
const YUM_MS = 2600

/** What the avatar is showing above its head. */
type Bubble = { kind: 'thought' } | { kind: 'quote'; key: number } | { kind: 'yum'; key: number }

/**
  Profile home (Figma 18:2): the blinking avatar with a thought bubble for
  today's mood, and Feed / Daily Quote / Edit buttons.
*/
export default function ProfileHome() {
  const name = useProfileStore((s) => s.name)
  const avatar = useProfileStore((s) => s.avatar)
  const tag = useProfileStore((s) => pronounTag(s.info.pronouns))
  const [bubble, setBubble] = useState<Bubble>({ kind: 'thought' })
  const [feeding, setFeeding] = useState(false)
  const [eating, setEating] = useState<{ food: Food | null; key: number } | null>(null)
  const timer = useRef<number>(undefined)
  const feedButton = useRef<HTMLButtonElement>(null)
  // The tomato's reaction to whether the user likes tomatoes.
  const [reaction, setReaction] = useState<{ likes: boolean; key: number } | null>(null)
  // First visit: the About me card must be filled in, then the gossip tomatoes named.
  const settingUp = useGossipStore((s) => s.names === null)
  const infoDone = useProfileStore((s) => isInfoComplete(s.name, s.info))

  // Each bubble goes back to the thought bubble after a while; pressing again restarts the wait.
  const show = (next: Exclude<Bubble, { kind: 'thought' }>, ms: number) => {
    window.clearTimeout(timer.current)
    setBubble(next)
    timer.current = window.setTimeout(() => {
      setBubble({ kind: 'thought' })
      setEating(null)
    }, ms)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const feed = (food: Food | null) => {
    setEating({ food, key: Date.now() })
    show({ kind: 'yum', key: Date.now() }, YUM_MS)
  }
  const showThought = bubble.kind === 'thought'

  return (
    <div className="profile-home">
      <h1 className="page-title">Profile !!</h1>

      <div className="profile-left" inert={settingUp}>
        <div className="profile-stage">
          <div className="profile-frame">
            <Avatar avatar={avatar} className="profile-home-avatar" blinking sparkle={eating !== null} />
            {eating && (
              <span key={eating.key} className="profile-food" aria-hidden>
                <img src={eating.food?.image ?? tomato} alt="" />
              </span>
            )}
          </div>

          <div className={`profile-bubble-spot${showThought ? '' : ' is-speaking'}`} aria-live="polite">
            {showThought ? (
              <ThoughtBubble />
            ) : (
              <p key={bubble.key} className={`speech-bubble is-${bubble.kind}`}>
                <span className="speech-text">
                  {bubble.kind === 'yum' ? 'Yum!' : quoteOfTheDay()}
                </span>
              </p>
            )}
          </div>
          <img className="profile-deco profile-deco-1" src={tomato} alt="" />
          <img className="profile-deco profile-deco-2" src={tomato} alt="" />
          <img className="profile-deco profile-deco-3" src={tomato} alt="" />
          <img className="profile-deco profile-deco-4" src={tomato} alt="" />

          <h2 className={`profile-home-name${name ? '' : ' is-placeholder'}`}>
            <span className="profile-name-text">
              {name || 'Name'}
              {tag && <span className="profile-pronoun-tag">{tag}</span>}
            </span>
          </h2>

          <div className="profile-actions">
            <button
              ref={feedButton}
              type="button"
              className="tomato-button"
              aria-expanded={feeding}
              aria-controls="feed-panel"
              onClick={() => setFeeding((f) => !f)}
            >
              <img src={buttonTomato} alt="" />
              <span>Feed</span>
            </button>
            <button type="button" className="tomato-button" onClick={() => show({ kind: 'quote', key: Date.now() }, QUOTE_MS)}>
              <img src={buttonTomato} alt="" />
              <span>
                Daily
                <br />
                Quote
              </span>
            </button>
            <Link to="/profile/edit" className="tomato-button">
              <img src={buttonTomato} alt="" />
              <span>Edit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* During setup everything but the card is dimmed and can't be used. */}
      {settingUp && <div className="setup-backdrop" aria-hidden />}
      {/* The food choices take the About me card's place until Feed or × is pressed again. */}
      {feeding && (
        <FeedPanel
          name={name}
          onFeed={feed}
          onClose={() => {
            setFeeding(false)
            feedButton.current?.focus()
          }}
        />
      )}
      {/* Hidden rather than removed, so a half-edited form survives a snack. */}
      <ProfileInfoCard
        hidden={feeding}
        settingUp={settingUp}
        onSaved={(likes) => setReaction({ likes, key: Date.now() })}
      />
      {reaction && <TomatoReaction key={reaction.key} likes={reaction.likes} onDone={() => setReaction(null)} />}
      {/* After the card (and the tomato's reaction to it), name the gossip tomatoes. */}
      {settingUp && infoDone && !reaction && <NamingDialog />}
    </div>
  )
}

/** Today's mood, or a + that goes to the mood tracker when there isn't one yet. */
function ThoughtBubble() {
  const day = today()
  const mood = useMoodStore((s) => {
    const entry = s.entries.find((e) => e.day === day)
    return s.moods.find((m) => m.id === entry?.moodId)
  })

  return (
    <div className="thought-bubble">
      <img className="thought-bubble-art" src={thoughtBubble} alt="" />
      <div className="thought-bubble-content">
        {mood ? (
          <Link to="/mood" className="thought-mood" title="Open the mood tracker">
            <span className="thought-mood-tomato">
              <TomatoFill fraction={1} color={mood.color} />
            </span>
            <span className="thought-mood-name" style={{ color: mood.color }}>
              {mood.name}
            </span>
            <span className="visually-hidden">: today’s mood</span>
          </Link>
        ) : (
          <Link to="/mood" className="thought-plus" aria-label="Log today’s mood" title="Log today’s mood">
            <span aria-hidden>+</span>
          </Link>
        )}
      </div>
    </div>
  )
}

/** The food every tomato has: a plain tomato. */
const DEFAULT_FOOD = 'Yummy Food'

function FeedPanel({ name, onFeed, onClose }: { name: string; onFeed: (food: Food | null) => void; onClose: () => void }) {
  const foods = useFoodStore((s) => s.foods)
  const deleteFood = useFoodStore((s) => s.deleteFood)
  const [adding, setAdding] = useState(false)

  return (
    <section id="feed-panel" className="profile-info feed-panel" aria-labelledby="feed-title">
      <div className="feed-header">
        <h2 id="feed-title" className="profile-info-title">
          Feed {name || 'your tomato'}
        </h2>
        <button type="button" className="feed-close" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <ul className="feed-list">
        <li>
          <button type="button" className="feed-food" onClick={() => onFeed(null)}>
            <span className="feed-food-art">
              <img src={tomato} alt="" />
            </span>
            <span className="feed-food-name">{DEFAULT_FOOD}</span>
          </button>
        </li>
        {foods.map((f) => (
          <li key={f.id} className="feed-item">
            <button type="button" className="feed-food" onClick={() => onFeed(f)}>
              <span className="feed-food-art">
                <img src={f.image} alt="" />
              </span>
              <span className="feed-food-name">{f.name}</span>
            </button>
            <button
              type="button"
              className="feed-delete"
              onClick={() => deleteFood(f.id)}
              aria-label={`Remove ${f.name}`}
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
        {foods.length < MAX_FOODS && !adding && (
          <li>
            <button type="button" className="feed-food feed-add" onClick={() => setAdding(true)}>
              <span className="feed-food-art" aria-hidden>
                +
              </span>
              <span className="feed-food-name">Add food</span>
            </button>
          </li>
        )}
      </ul>
      {adding && <AddFood onDone={() => setAdding(false)} />}
    </section>
  )
}

function AddFood({ onDone }: { onDone: () => void }) {
  const addFood = useFoodStore((s) => s.addFood)
  const [name, setName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!image) return setError('Choose a picture first.')
    if (!name.trim()) return setError('Give your food a name.')
    addFood(name, image)
    onDone()
  }

  return (
    <form className="feed-form" onSubmit={submit}>
      <label className="feed-pick">
        {image ? <img src={image} alt="" /> : <span aria-hidden>Choose picture</span>}
        <span className="visually-hidden">Food picture</span>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              setImage(await imageToDataUrl(file))
              setError('')
            } catch {
              setError('That picture couldn’t be opened. Try another one.')
            }
          }}
        />
      </label>
      <label className="feed-name">
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={FOOD_NAME_MAX}
          placeholder="Strawberry"
        />
      </label>
      <div className="feed-form-actions">
        <button type="button" className="feed-btn is-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="feed-btn">
          Add food
        </button>
      </div>
      {error && (
        <p className="feed-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
