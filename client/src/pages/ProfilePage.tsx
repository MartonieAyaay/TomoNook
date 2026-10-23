import { useState, type ReactNode } from 'react'
import {
  PROFILE_NAME_MAX,
  type AdjustablePart,
  type AvatarConfig,
  type BodyShape,
} from '@tomonook/shared'
import AdjustControls from '../components/avatar/AdjustControls.tsx'
import Avatar from '../components/avatar/Avatar.tsx'
import ColorPicker from '../components/ColorPicker.tsx'
import {
  CROPS,
  EYE_COLORS,
  HAIR_COLORS,
  OPTION_COUNT,
  SHIRT_COLORS,
  SKIN_TONES,
  type AvatarPart,
} from '../components/avatar/avatarParts.ts'
import { useProfileStore } from '../store/profileStore.ts'
import pencilIcon from '../assets/icons/pencil.png'
import './ProfilePage.css'

const TABS = ['Body', 'Eyes', 'Brows', 'Nose', 'Mouth', 'Hair'] as const
type Tab = (typeof TABS)[number]

/** The part the arrow pad moves while each tab is open. */
const TAB_PART: Record<Tab, AdjustablePart | null> = {
  Body: null,
  Eyes: 'eyes',
  Brows: 'brows',
  Nose: 'nose',
  Mouth: 'mouth',
  Hair: 'hair',
}

const BODIES: BodyShape[] = ['skinny', 'plus']

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('Body')
  const avatar = useProfileStore((s) => s.avatar)
  const updateAvatar = useProfileStore((s) => s.updateAvatar)
  // Nothing to move when the open tab's part is set to "none".
  const padPart = TAB_PART[tab]
  const shownPart = padPart && avatar[padPart] !== 0 ? padPart : null

  return (
    <div className="profile-page">
      <h1 className="page-title profile-title">Profile !!</h1>

      <section className="profile-card" aria-label="Your avatar">
        <div className="profile-avatar-frame">
          <Avatar avatar={avatar} className="profile-avatar" />
        </div>
        <ProfileName />
        <AdjustControls part={shownPart} />
      </section>

      <section className="avatar-editor" aria-label="Edit avatar">
        <div className="avatar-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`avatar-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="avatar-panel"
              className={`avatar-tab${tab === t ? ' is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          className="avatar-panel"
          id="avatar-panel"
          role="tabpanel"
          aria-labelledby={`avatar-tab-${tab}`}
        >
          {tab === 'Body' && <BodyPanel avatar={avatar} update={updateAvatar} />}

          {tab === 'Eyes' && (
            <>
              <OptionGrid label="Eye shapes">
                <NoneTile label="No eyes" selected={avatar.eyes === 0} onSelect={() => updateAvatar({ eyes: 0 })} />
                {range(OPTION_COUNT.eyes).map((n) => (
                  <OptionTile
                    key={n}
                    label={`Eyes ${n}`}
                    selected={avatar.eyes === n}
                    onSelect={() => updateAvatar({ eyes: n })}
                    avatar={{ ...avatar, eyes: n }}
                    part="eyes"
                  />
                ))}
              </OptionGrid>
              <div className="avatar-panel-footer">
                <div className="avatar-panel-links">
                  <button
                    type="button"
                    className={`avatar-link${avatar.lashes ? '' : ' is-off'}`}
                    aria-pressed={avatar.lashes}
                    onClick={() => updateAvatar({ lashes: !avatar.lashes })}
                  >
                    Lashes
                  </button>
                  <ColorPicker
                    swatches={EYE_COLORS}
                    value={avatar.eyeColor}
                    onChange={(eyeColor) => updateAvatar({ eyeColor })}
                    label="Eye color"
                    triggerClassName="avatar-link"
                  >
                    Eye Color
                  </ColorPicker>
                </div>
              </div>
            </>
          )}

          {(tab === 'Brows' || tab === 'Nose') && (
            <PartGrid part={TAB_PART[tab] as 'brows' | 'nose'} avatar={avatar} update={updateAvatar} />
          )}

          {tab === 'Mouth' && (
            <>
              <PartGrid part="mouth" avatar={avatar} update={updateAvatar} />
              <div className="avatar-panel-footer">
                <div className="avatar-panel-links">
                  <button
                    type="button"
                    className={`avatar-link${avatar.lipstick ? '' : ' is-off'}`}
                    aria-pressed={avatar.lipstick}
                    onClick={() => updateAvatar({ lipstick: !avatar.lipstick })}
                  >
                    Lipstick
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'Hair' && (
            <>
              <PartGrid part="hair" avatar={avatar} update={updateAvatar} />
              <div className="avatar-panel-footer">
                <div className="avatar-panel-links">
                  <ColorPicker
                    swatches={HAIR_COLORS}
                    value={avatar.hairColor}
                    onChange={(hairColor) => updateAvatar({ hairColor })}
                    label="Hair color"
                    triggerClassName="avatar-link"
                  >
                    Hair Color
                  </ColorPicker>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

interface PanelProps {
  avatar: AvatarConfig
  update: (patch: Partial<AvatarConfig>) => void
}

function BodyPanel({ avatar, update }: PanelProps) {
  return (
    <div className="body-panel">
      <OptionGrid label="Body shape">
        {BODIES.map((b) => (
          <OptionTile
            key={b}
            label={b === 'skinny' ? 'Slim body' : 'Plus body'}
            selected={avatar.body === b}
            onSelect={() => update({ body: b })}
            avatar={{ ...avatar, body: b }}
            part="body"
          />
        ))}
      </OptionGrid>

      <div className="body-colors">
        <div className="body-color-group">
          <h3 className="avatar-label" id="skin-label">
            Skin Color
          </h3>
          <div className="skin-swatches" role="radiogroup" aria-labelledby="skin-label">
            {SKIN_TONES.map((tone, i) => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={avatar.skin === i + 1}
                aria-label={`Skin tone ${i + 1}`}
                className={`avatar-swatch${avatar.skin === i + 1 ? ' is-active' : ''}`}
                style={{ background: tone }}
                onClick={() => update({ skin: i + 1 })}
              />
            ))}
          </div>
        </div>
        <div className="body-color-group body-color-shirt">
          <h3 className="avatar-label">Shirt Color</h3>
          <ColorPicker
            swatches={SHIRT_COLORS}
            value={avatar.shirtColor}
            onChange={(shirtColor) => update({ shirtColor })}
            label="Shirt color"
            triggerClassName="avatar-swatch"
          />
        </div>
      </div>
    </div>
  )
}

function PartGrid({ part, avatar, update }: PanelProps & { part: 'brows' | 'nose' | 'mouth' | 'hair' }) {
  const name = part[0].toUpperCase() + part.slice(1)
  return (
    <OptionGrid label={`${name} styles`}>
      <NoneTile label={`No ${part}`} selected={avatar[part] === 0} onSelect={() => update({ [part]: 0 })} />
      {range(OPTION_COUNT[part]).map((n) => (
        <OptionTile
          key={n}
          label={`${name} ${n}`}
          selected={avatar[part] === n}
          onSelect={() => update({ [part]: n })}
          avatar={{ ...avatar, [part]: n }}
          part={part}
        />
      ))}
    </OptionGrid>
  )
}

function OptionGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="option-scroll">
      <div className="option-grid" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

interface OptionTileProps {
  label: string
  selected: boolean
  onSelect: () => void
  avatar: AvatarConfig
  part: AvatarPart
}

function OptionTile({ label, selected, onSelect, avatar, part }: OptionTileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      className={`option-tile${selected ? ' is-active' : ''}`}
      onClick={onSelect}
    >
      {/* Thumbnails show each option in its default spot. */}
      <Avatar avatar={{ ...avatar, adjust: {} }} parts={[part]} crop={CROPS[part]} className="option-art" />
    </button>
  )
}

function NoneTile({ label, selected, onSelect }: Omit<OptionTileProps, 'avatar' | 'part'>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      className={`option-tile option-none${selected ? ' is-active' : ''}`}
      onClick={onSelect}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="m6.5 17.5 11-11" />
      </svg>
      <span>None</span>
    </button>
  )
}

function ProfileName() {
  const name = useProfileStore((s) => s.name)
  const setName = useProfileStore((s) => s.setName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const save = () => {
    setName(draft)
    setEditing(false)
  }

  return (
    <div className="profile-name-row">
      {editing ? (
        <label className="profile-name-field">
          <span className="visually-hidden">Your name</span>
          <input
            className="profile-name profile-name-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={PROFILE_NAME_MAX}
            placeholder="Name"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') {
                setDraft(name)
                setEditing(false)
              }
            }}
          />
        </label>
      ) : (
        <h2 className={`profile-name${name ? '' : ' is-placeholder'}`}>{name || 'Name'}</h2>
      )}
      {!editing && (
        <button
          type="button"
          className="profile-name-edit"
          onClick={() => {
            setDraft(name)
            setEditing(true)
          }}
          aria-label="Edit name"
          title="Edit name"
        >
          <img src={pencilIcon} alt="" />
        </button>
      )}
    </div>
  )
}
