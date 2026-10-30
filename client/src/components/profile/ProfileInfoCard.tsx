import { useState, type FormEvent } from 'react'
import { PROFILE_NAME_MAX } from '@tomonook/shared'
import {
  AGE_MAX,
  AGE_MIN,
  GENDERS,
  PRONOUNS,
  useProfileStore,
  isInfoComplete,
  type Gender,
  type Pronoun,
} from '../../store/profileStore.ts'
import './ProfileInfoCard.css'
import { signOut } from '../../lib/signOut.ts'

/** Name, age, gender, pronouns, and the important one: do they like tomatoes? */
export default function ProfileInfoCard({
  hidden = false,
  settingUp,
  onSaved,
}: {
  /** The feed panel is showing in its place. */
  hidden?: boolean
  /** First visit: the card is the only thing on the page that can be used. */
  settingUp: boolean
  onSaved: (likesTomatoes: boolean) => void
}) {
  const name = useProfileStore((s) => s.name)
  const info = useProfileStore((s) => s.info)
  const complete = isInfoComplete(name, info)
  const [editing, setEditing] = useState(!complete)

  return (
    <section className={`profile-info${settingUp ? ' is-setup' : ''}`} hidden={hidden} aria-labelledby="profile-info-title">
      <h2 id="profile-info-title" className="profile-info-title">
        {settingUp ? 'Welcome to TomoNook!' : 'About me'}
      </h2>
      {settingUp && !complete && (
        <p className="info-welcome">
          Tell us about yourself to get started.{' '}
          {/* Settings can't be opened yet, so logging out is here (a shared computer, the wrong account). */}
          <button type="button" className="info-logout" onClick={() => void signOut().catch(() => signOut(true)).catch(() => {})}>
            Not you? Log out
          </button>
        </p>
      )}
      {editing || !complete ? (
        <InfoForm
          canCancel={complete}
          onCancel={() => setEditing(false)}
          onSaved={(likes) => {
            setEditing(false)
            onSaved(likes)
          }}
        />
      ) : (
        <>
          <dl className="profile-info-list">
            <Row label="Name" value={name} />
            <Row label="Age" value={info.age === null ? '' : String(info.age)} />
            <Row label="Gender" value={info.gender ?? ''} />
            <Row label="Pronouns" value={info.pronouns.join('/')} />
            <Row label="Likes tomatoes" value={info.likesTomatoes ? 'Yes!' : 'No...'} />
          </dl>
          <div className="info-actions">
            <button type="button" className="info-btn" onClick={() => setEditing(true)}>
              Edit info
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-info-row">
      <dt>{label}</dt>
      <dd className={value ? undefined : 'is-empty'}>{value || 'Not set'}</dd>
    </div>
  )
}

/** A row of pill-shaped choices backed by real radios or checkboxes. */
function Chips<T extends string | boolean>({
  legend,
  hint,
  type,
  name,
  options,
  isOn,
  onToggle,
}: {
  legend: string
  hint?: string
  type: 'radio' | 'checkbox'
  name: string
  options: { value: T; label: string }[]
  isOn: (value: T) => boolean
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="info-group">
      <legend>
        {legend}
        {hint && <span className="info-hint"> {hint}</span>}
      </legend>
      <div className="info-chips">
        {options.map((o) => (
          <label key={o.label} className={`info-chip${isOn(o.value) ? ' is-on' : ''}`}>
            <input type={type} name={name} checked={isOn(o.value)} onChange={() => onToggle(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function InfoForm({
  canCancel,
  onCancel,
  onSaved,
}: {
  canCancel: boolean
  onCancel: () => void
  onSaved: (likes: boolean) => void
}) {
  const store = useProfileStore.getState()
  const [name, setName] = useState(store.name)
  const [age, setAge] = useState(store.info.age === null ? '' : String(store.info.age))
  const [gender, setGender] = useState<Gender | null>(store.info.gender)
  const [pronouns, setPronouns] = useState<Pronoun[]>(store.info.pronouns)
  const [likes, setLikes] = useState(store.info.likesTomatoes)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = [
      !name.trim() && 'Name',
      !age.trim() && 'Age',
      !gender && 'Gender',
      pronouns.length === 0 && 'Pronouns',
      likes === null && 'Do you like tomatoes?',
    ].filter(Boolean)
    if (missing.length) return setError(`Please fill in: ${missing.join(', ')}`)
    const ageNum = Number(age)
    if (!Number.isInteger(ageNum) || ageNum < AGE_MIN || ageNum > AGE_MAX) {
      return setError(`Age should be a whole number from ${AGE_MIN} to ${AGE_MAX}.`)
    }
    if (likes === null) return
    store.setName(name)
    store.setInfo({ age: ageNum, gender, pronouns, likesTomatoes: likes })
    onSaved(likes)
  }

  // Every change clears the error.
  const changed = () => setError('')

  return (
    <form className="info-form" onSubmit={submit} noValidate>
      <div className="info-fields">
        <label className="info-field">
          <span>Name</span>
          <input
            value={name}
            maxLength={PROFILE_NAME_MAX}
            onChange={(e) => {
              setName(e.target.value)
              changed()
            }}
          />
        </label>
        <label className="info-field">
          <span>Age</span>
          <input
            type="number"
            inputMode="numeric"
            min={AGE_MIN}
            max={AGE_MAX}
            value={age}
            onChange={(e) => {
              setAge(e.target.value)
              changed()
            }}
          />
        </label>
      </div>

      <Chips
        legend="Gender"
        type="radio"
        name="gender"
        options={GENDERS.map((g) => ({ value: g, label: g }))}
        isOn={(g) => gender === g}
        onToggle={(g) => {
          setGender(g)
          changed()
        }}
      />

      <Chips
        legend="Pronouns"
        hint="(pick all that fit)"
        type="checkbox"
        name="pronouns"
        options={PRONOUNS.map((p) => ({ value: p, label: p }))}
        isOn={(p) => pronouns.includes(p)}
        onToggle={(p) => {
          // Kept in the listed order, so they read as She/They, not They/She.
          setPronouns((cur) => PRONOUNS.filter((x) => (x === p ? !cur.includes(p) : cur.includes(x))))
          changed()
        }}
      />

      <Chips
        legend="Do you like tomatoes?"
        type="radio"
        name="likes-tomatoes"
        options={[
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ]}
        isOn={(v) => likes === v}
        onToggle={(v) => {
          setLikes(v)
          changed()
        }}
      />

      {error && (
        <p className="info-error" role="alert">
          {error}
        </p>
      )}

      <div className="info-actions">
        {canCancel && (
          <button type="button" className="info-btn is-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="info-btn">
          Save info
        </button>
      </div>
    </form>
  )
}
