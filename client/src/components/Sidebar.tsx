import { NavLink } from 'react-router-dom'
import homeIcon from '../assets/icons/nav-home.png'
import todoIcon from '../assets/icons/nav-todo.png'
import moodIcon from '../assets/icons/nav-mood.png'
import timersIcon from '../assets/icons/nav-timers.png'
import profileIcon from '../assets/icons/nav-profile.png'
import { useGossipSpot } from '../lib/gossipSchedule.ts'
import { useGossipStore } from '../store/gossipStore.ts'
import gossipTomato from '../assets/tomato/gossip-round.png'
import './Sidebar.css'

const tabs = [
  { to: '/todo', label: 'To-do list', icon: todoIcon, size: 'todo' },
  { to: '/mood', label: 'Mood tracker', icon: moodIcon, size: 'mood' },
  { to: '/timers', label: 'Timers', icon: timersIcon, size: 'timers' },
]

/** `locked`: during first-time setup the tabs can't be used yet. */
export default function Sidebar({ locked = false }: { locked?: boolean }) {
  const named = useGossipStore((s) => s.names !== null)
  const spot = useGossipSpot()
  // A little tomato on the tab where the gossip tomatoes are right now.
  const badge = (path: string) =>
    named && path === `/${spot.tab}` ? (
      <>
        <img className="sidebar-gossip-badge" src={gossipTomato} alt="" />
        <span className="visually-hidden">(the gossip tomatoes are here)</span>
      </>
    ) : null

  return (
    <nav className={`sidebar${locked ? ' is-locked' : ''}`} aria-label="Main" inert={locked}>
      <NavLink to="/dashboard" className="sidebar-link sidebar-home" title="Dashboard">
        <img src={homeIcon} alt="" />
        <span className="visually-hidden">Dashboard</span>
        {badge('/dashboard')}
      </NavLink>
      <hr className="sidebar-divider" />
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={`sidebar-link sidebar-${t.size}`}
          title={t.label}
        >
          <img src={t.icon} alt="" />
          <span className="visually-hidden">{t.label}</span>
          {badge(t.to)}
        </NavLink>
      ))}
      <NavLink to="/profile" className="sidebar-link sidebar-profile" title="Profile">
        <img src={profileIcon} alt="" />
        <span className="visually-hidden">Profile</span>
        {badge('/profile')}
      </NavLink>
    </nav>
  )
}
