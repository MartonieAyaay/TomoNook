import { useState, type ReactNode } from 'react'
import { today } from '@tomonook/shared'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { exportBackup, readBackup, resetEverything, restoreBackup } from '../lib/backup.ts'
import { chime, unlockChime } from '../lib/chime.ts'
import { cityLabel, fetchWeather, type City } from '../lib/weather.ts'
import CityPicker from '../components/CityPicker.tsx'
import { TOMATO_NAME_MAX, useGossipStore } from '../store/gossipStore.ts'
import {
  useSettingsStore,
  type Chattiness,
  type ChimeStyle,
  type UiSize,
} from '../store/settingsStore.ts'
import tallTomato from '../assets/tomato/gossip-tall.png'
import roundTomato from '../assets/tomato/gossip-round.png'
import './SettingsPage.css'

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1 className="page-title">Settings !!</h1>
      {/* Two columns that stack their cards independently, so every gap is the same. */}
      <div className="settings-grid">
        <div className="settings-column">
          <SoundSettings />
          <CompanionSettings />
          <LookSettings />
          <DataSettings />
        </div>
        <div className="settings-column">
          <GossipSettings />
          <StreakSettings />
          <TimerSettings />
        </div>
      </div>
    </div>
  )
}

// ---------- Building blocks ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section className="settings-card" aria-labelledby={id}>
      <h2 id={id} className="settings-card-title">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** One setting: a label (and an optional note) on the left, its control on the right. */
function Row({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className="settings-label">{label}</span>
        {note && <span className="settings-note">{note}</span>}
      </div>
      <div className="settings-control">{children}</div>
    </div>
  )
}

function Switch({
  label,
  note,
  on,
  onChange,
  disabled,
}: {
  label: string
  note?: ReactNode
  on: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  return (
    <Row label={label} note={note}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`settings-switch${on ? ' is-on' : ''}`}
        onClick={() => onChange(!on)}
        disabled={disabled}
      >
        <span className="settings-switch-knob" />
      </button>
    </Row>
  )
}

/** A row of choices; picking one sets it. */
function Choices<T extends string | number>({
  label,
  note,
  value,
  options,
  onChange,
}: {
  label: string
  note?: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Row label={label} note={note}>
      <div className="settings-choices" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`settings-choice${value === o.value ? ' is-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  )
}

function Slider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <Row label={label} note={`${Math.round(value * 100)}%`}>
      <input
        type="range"
        className="settings-slider"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={label}
        disabled={disabled}
      />
    </Row>
  )
}

// ---------- Sections ----------

function SoundSettings() {
  const s = useSettingsStore()
  return (
    <Section title="Sound">
      <Switch label="Mute everything" on={s.muted} onChange={(muted) => s.update({ muted })} />
      <Slider label="Volume" value={s.volume} onChange={(volume) => s.update({ volume })} disabled={s.muted} />
      <Switch label="Gossip tomato voices" on={s.sounds.gossip} onChange={(on) => s.setSound('gossip', on)} disabled={s.muted} />
      <Switch
        label="Reaction sounds (sparkle, splat...)"
        on={s.sounds.reactions}
        onChange={(on) => s.setSound('reactions', on)}
        disabled={s.muted}
      />
      <Switch label="Timer chime" on={s.sounds.chime} onChange={(on) => s.setSound('chime', on)} disabled={s.muted} />
    </Section>
  )
}

function GossipSettings() {
  const names = useGossipStore((s) => s.names)
  const setNames = useGossipStore((s) => s.setNames)
  const weather = useGossipStore((s) => s.weather)
  const setWeather = useGossipStore((s) => s.setWeather)
  const s = useSettingsStore()
  const [draft, setDraft] = useState<[string, string]>(names ?? ['', ''])
  const [nameNote, setNameNote] = useState('')
  const [weatherNote, setWeatherNote] = useState('')
  const [checking, setChecking] = useState(false)
  const [pickingCity, setPickingCity] = useState(false)
  const changed = names !== null && (draft[0].trim() !== names[0] || draft[1].trim() !== names[1])

  const toggleWeather = async (on: boolean) => {
    setWeatherNote('')
    if (!on) return setWeather('denied')
    // The weather is for the user's city, so that comes first.
    if (!s.weatherCity) return setPickingCity(true)
    setChecking(true)
    try {
      await fetchWeather()
      setWeather('allowed')
    } catch {
      setWeatherNote('Couldn’t reach the weather right now. Check your internet and try again.')
    } finally {
      setChecking(false)
    }
  }

  const pickCity = (weatherCity: City) => {
    s.update({ weatherCity })
    setPickingCity(false)
    void toggleWeather(true)
  }

  return (
    <Section title="Gossip tomatoes">
      {names && (
        <form
          className="settings-names"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft[0].trim() || !draft[1].trim()) return setNameNote('Both tomatoes need a name.')
            setNames(draft[0], draft[1])
            setNameNote('Saved!')
          }}
        >
          {[tallTomato, roundTomato].map((art, i) => (
            <label key={i} className="settings-name">
              <img src={art} alt="" />
              <span className="visually-hidden">{i === 0 ? 'Tall tomato’s name' : 'Round tomato’s name'}</span>
              <input
                value={draft[i]}
                maxLength={TOMATO_NAME_MAX}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (i === 0 ? [v, d[1]] : [d[0], v]))
                  setNameNote('')
                }}
              />
            </label>
          ))}
          <div className="settings-names-actions">
            <button type="submit" className="settings-btn" disabled={!changed}>
              Rename
            </button>
            {nameNote && (
              <span className="settings-note" role="status">
                {nameNote}
              </span>
            )}
          </div>
        </form>
      )}
      <Switch label="Chat on their own when you find them" on={s.gossipAutoChat} onChange={(gossipAutoChat) => s.update({ gossipAutoChat })} />
      <Switch
        label="Talk about the weather"
        note={weatherNote || 'Uses your city and the internet.'}
        on={weather === 'allowed'}
        onChange={toggleWeather}
        disabled={checking}
      />
      <Row label="Weather city" note={s.weatherCity ? cityLabel(s.weatherCity) : 'Not picked yet'}>
        {!pickingCity && (
          <button type="button" className="settings-btn is-secondary" onClick={() => setPickingCity(true)}>
            {s.weatherCity ? 'Change' : 'Pick city'}
          </button>
        )}
      </Row>
      {pickingCity && (
        <div className="settings-city">
          <CityPicker onPick={pickCity} onCancel={() => setPickingCity(false)} />
        </div>
      )}
      <Switch
        label="Hide them for today"
        on={s.gossipHiddenOn === today()}
        onChange={(on) => s.update({ gossipHiddenOn: on ? today() : null })}
      />
    </Section>
  )
}

function CompanionSettings() {
  const s = useSettingsStore()
  return (
    <Section title="Corner avatar">
      <Switch label="Show the avatar in the corner" on={s.companion} onChange={(companion) => s.update({ companion })} />
      <Choices<Chattiness>
        label="How chatty"
        note="Big moments: finishing every task, timer breaks."
        value={s.companionChat}
        options={[
          { value: 'all', label: 'Everything' },
          { value: 'big', label: 'Big moments' },
          { value: 'off', label: 'Quiet' },
        ]}
        onChange={(companionChat) => s.update({ companionChat })}
      />
    </Section>
  )
}

function StreakSettings() {
  const s = useSettingsStore()
  return (
    <Section title="Splats & streaks">
      <Switch label="Splat when a mood streak breaks" on={s.streakSplat} onChange={(streakSplat) => s.update({ streakSplat })} />
      <Switch
        label="Gentle mode"
        note="No angry tomatoes or splats, just a soft welcome back."
        on={s.gentle}
        onChange={(gentle) => s.update({ gentle })}
      />
    </Section>
  )
}

function LookSettings() {
  const s = useSettingsStore()
  return (
    <Section title="Motion & size">
      <Switch
        label="Reduce animations"
        note="Your device’s reduce-motion setting is always followed too."
        on={s.reduceMotion}
        onChange={(reduceMotion) => s.update({ reduceMotion })}
      />
      <Choices<UiSize>
        label="Text and button size"
        value={s.uiSize}
        options={[
          { value: 'small', label: 'Small' },
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Large' },
        ]}
        onChange={(uiSize) => s.update({ uiSize })}
      />
    </Section>
  )
}

function TimerSettings() {
  const s = useSettingsStore()
  return (
    <Section title="Timers">
      <Choices<ChimeStyle>
        label="Chime sound"
        value={s.chimeStyle}
        options={[
          { value: 'chime', label: 'Chime' },
          { value: 'bell', label: 'Bell' },
          { value: 'soft', label: 'Soft' },
        ]}
        onChange={(chimeStyle) => {
          s.update({ chimeStyle })
          unlockChime()
          chime(chimeStyle)
        }}
      />
      <Slider label="Chime volume" value={s.chimeVolume} onChange={(chimeVolume) => s.update({ chimeVolume })} />
      <div className="settings-row settings-row-end">
        <button
          type="button"
          className="settings-btn is-secondary"
          onClick={() => {
            unlockChime()
            chime()
          }}
        >
          Play the chime
        </button>
      </div>
      <Switch
        label="Start the next phase by itself"
        note="When off, the timer waits for you to press Resume."
        on={s.timerAutoStart}
        onChange={(timerAutoStart) => s.update({ timerAutoStart })}
      />
    </Section>
  )
}

function DataSettings() {
  const [importing, setImporting] = useState<Awaited<ReturnType<typeof readBackup>> | null>(null)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')

  return (
    <Section title="Your data">
      <p className="settings-text">
        Everything is saved only in this browser. Download a backup now and then, so clearing the browser doesn’t lose
        your diary, moods and tasks.
      </p>
      <div className="settings-buttons">
        <button type="button" className="settings-btn" onClick={exportBackup}>
          Download backup
        </button>
        <label className="settings-btn is-secondary settings-file">
          Restore a backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setError('')
              try {
                setImporting(await readBackup(file))
              } catch (err) {
                setError((err as Error).message)
              }
            }}
          />
        </label>
        <button type="button" className="settings-btn is-danger" onClick={() => setResetting(true)}>
          Reset everything
        </button>
      </div>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={importing !== null}
        title="Restore this backup?"
        confirmLabel="Replace with backup"
        danger
        onCancel={() => setImporting(null)}
        onConfirm={() => importing && restoreBackup(importing)}
      >
        Everything in the app now will be replaced by the backup
        {importing ? ` from ${new Date(importing.exportedAt).toLocaleDateString()}` : ''}. This can’t be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={resetting}
        title="Reset everything?"
        confirmLabel="Delete everything"
        danger
        onCancel={() => setResetting(false)}
        onConfirm={resetEverything}
      >
        Your profile, diary, moods, tasks, timers and settings will all be deleted, and you’ll start from the
        beginning. This can’t be undone.
      </ConfirmDialog>
    </Section>
  )
}
