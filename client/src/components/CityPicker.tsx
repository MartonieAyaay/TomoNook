import { useId, useState, type FormEvent } from 'react'
import { cityLabel, searchCities, type City } from '../lib/weather.ts'
import './CityPicker.css'

/**
  "What city are you in?": the user types a city, searches, and taps the
  right one from the matches. The weather is based on the city picked.
*/
export default function CityPicker({
  onPick,
  onCancel,
  compact = false,
}: {
  onPick: (city: City) => void
  /** Shows a Cancel button (e.g. when changing a city that's already set). */
  onCancel?: () => void
  /** Smaller, for the gossip tomatoes' speech bubble. */
  compact?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<City[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return setError('Type the name of your city.')
    setSearching(true)
    setError('')
    try {
      const found = await searchCities(query)
      setResults(found)
      if (found.length === 0) setError('No city by that name. Check the spelling, or try a bigger city nearby.')
    } catch {
      setResults(null)
      setError('Couldn’t search right now. Check your internet and try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={`city-picker${compact ? ' is-compact' : ''}`}>
      <form className="city-form" onSubmit={search}>
        <label className="city-label" htmlFor={id}>
          What city are you in?
        </label>
        <div className="city-row">
          <input
            id={id}
            className="city-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (error) setError('')
            }}
            autoComplete="address-level2"
            maxLength={80}
          />
          <button type="submit" className="city-btn" disabled={searching}>
            {searching ? 'Searching...' : 'Find city'}
          </button>
          {onCancel && (
            <button type="button" className="city-btn is-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="city-error" role="alert">
          {error}
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="city-results" aria-label="Pick your city">
          {results.map((c) => (
            <li key={`${c.lat},${c.lon}`}>
              <button type="button" className="city-result" onClick={() => onPick(c)}>
                {cityLabel(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
