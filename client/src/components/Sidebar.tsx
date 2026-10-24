import { NavLink } from 'react-router-dom'
import homeIcon from '../assets/icons/nav-home.png'
import todoIcon from '../assets/icons/nav-todo.png'
import moodIcon from '../assets/icons/nav-mood.png'
import timersIcon from '../assets/icons/nav-timers.png'
import profileIcon from '../assets/icons/avatar-overlay.png'
import './Sidebar.css'

const tabs = [
  { to: '/todo', label: 'To-do list', icon: todoIcon, size: 'todo' },
  { to: '/mood', label: 'Mood tracker', icon: moodIcon, size: 'mood' },
  { to: '/timers', label: 'Timers', icon: timersIcon, size: 'timers' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main">
      <NavLink to="/dashboard" className="sidebar-link sidebar-home" title="Dashboard">
        <img src={homeIcon} alt="" />
        <span className="visually-hidden">Dashboard</span>
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
        </NavLink>
      ))}
      <NavLink to="/profile" className="sidebar-link sidebar-profile" title="Profile">
        <img src={profileIcon} alt="" />
        <span className="visually-hidden">Profile</span>
      </NavLink>
    </nav>
  )
}
