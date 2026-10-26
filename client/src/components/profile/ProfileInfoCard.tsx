import { useState, type FormEvent } from 'react'
import { PROFILE_NAME_MAX } from '@tomonook/shared'
import { AGE_MAX, AGE_MIN, INFO_TEXT_MAX, useProfileStore } from '../../store/profileStore.ts'
import happyTomato from '../../assets/tomato/tomato-face.png'
import angryTomato from '../../assets/tomato/tomato-angry.png'
import './ProfileInfoCard.css'

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say']
const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they']

/** Name, age, gender, pronouns, and the important one: do they like tomatoes? */
export default function ProfileInfoCard({ onSaved }: { onSaved: (likesTomatoes: boolean) => void }) {
  const name = useProfileStore((s) => s.name)
  const info = useProfileStore((s) => s.info)
  const [editing, setEditing] = useState(info.likesTomatoes === null)

  return (
    <section className="profile-info" aria-labelledby="profile-info-title">
      <h2 id="profile-info-title" className="profile-info-title">
        About me
      </h2>
      {editing ? (
        <InfoForm
          canCancel={info.likesTomatoes !== null}
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
            <Row label="Gender" value={info.gender} />
            <Row label="Pronouns" value={info.pronouns} />
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
  const [gender, setGender] = useState(store.info.gender)
  const [pronouns, setPronouns] = useState(store.info.pronouns)
  const [likes, setLikes] = useState(store.info.likesTomatoes)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const ageNum = age.trim() === '' ? null : Number(age)
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < AGE_MIN || ageNum > AGE_MAX)) {
      return setError(`Age should be a whole number from ${AGE_MIN} to ${AGE_MAX}.`)
    }
    if (likes === null) return setError('One more: do you like tomatoes? Pick Yes or No.')
    store.setName(name)
    store.setInfo({ age: ageNum, gender, pronouns, likesTomatoes: likes })
    onSaved(likes)
  }

  // Each field clears the error as soon as it changes.
  const change = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value)
    setError('')
  }

  return (
    <form className="info-form" onSubmit={submit} noValidate>
      <label className="info-field">
        <span>Name</span>
        <input value={name} maxLength={PROFILE_NAME_MAX} onChange={change(setName)} />
      </label>
      <label className="info-field">
        <span>Age</span>
        <input type="number" inputMode="numeric" min={AGE_MIN} max={AGE_MAX} value={age} onChange={change(setAge)} />
      </label>
      <label className="info-field">
        <span>Gender</span>
        <input
          list="info-genders"
          maxLength={INFO_TEXT_MAX}
          value={gender}
          onChange={change(setGender)}
          placeholder="Pick or type"
        />
        <datalist id="info-genders">
          {GENDERS.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>
      <label className="info-field">
        <span>Pronouns</span>
        <input
          list="info-pronouns"
          maxLength={INFO_TEXT_MAX}
          value={pronouns}
          onChange={change(setPronouns)}
          placeholder="Pick or type"
        />
        <datalist id="info-pronouns">
          {PRONOUNS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>

      <fieldset className="info-tomatoes">
        <legend>Do you like tomatoes?</legend>
        <div className="info-tomato-options">
          {[
            { value: true, label: 'Yes', art: happyTomato },
            { value: false, label: 'No', art: angryTomato },
          ].map((o) => (
            <label key={o.label} className={`info-tomato${likes === o.value ? ' is-on' : ''}`}>
              <input
                type="radio"
                name="likes-tomatoes"
                checked={likes === o.value}
                onChange={() => {
                  setLikes(o.value)
                  setError('')
                }}
              />
              <img src={o.art} alt="" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
