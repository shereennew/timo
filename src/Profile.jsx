import { useState } from 'react'
import './App.css'
//import { getToken } from 'firebase/messaging'
//import { messaging } from './firebase'

function read(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

export default function Profile({ theme, setTheme, background, setBackground }) {
  const [view, setView] = useState('menu')
  const [name, setName] = useState(() => read('timo-name', 'Mindful User'))
  const [username, setUsername] = useState(() => read('timo-username', 'mindful_planner'))
  const [message, setMessage] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  /*async function enableNotifications() {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE_CONSOLE'
        })
        if (token) {
          setNotificationsEnabled(true)
          setMessage('Notifications enabled successfully!')
          // You can save this token to localStorage or your backend database here
          localStorage.setItem('timo-fcm-token', token)
        } else {
          setMessage('Failed to generate notification token.')
        }
      } else {
        setMessage('Notification permission denied.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Error enabling notifications.')
    }
  }*/

  function save(e) {
    e.preventDefault()
    try {
      localStorage.setItem('timo-name', name)
      localStorage.setItem('timo-username', username)
      setMessage('Profile saved in this browser.')
    } catch {
      setMessage('Could not save. Browser storage may be unavailable.')
    }
  }

  return (
    <section className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase() || 'U'}
        </div>

        <div className="profile-name-block">
          <h1 className="profile-name">{name}</h1>
          <p className="profile-username">@{username}</p>
        </div>
      </div>

      {view === 'menu' ? (
        <div className="profile-menu-grid">
          <button
            type="button"
            className="menu-nav-btn account-btn"
            onClick={() => setView('account')}
          >
            <span className="menu-btn-content">
              <span className="menu-icon">👤</span>
              <span className="menu-text">
                <span className="menu-title">Profile details</span>
                <span className="menu-desc">Name and username</span>
              </span>
            </span>
            <span className="menu-arrow">›</span>
          </button>

          <button
            type="button"
            className="menu-nav-btn settings-btn"
            onClick={() => setView('settings')}
          >
            <span className="menu-btn-content">
              <span className="menu-icon">⚙️</span>
              <span className="menu-text">
                <span className="menu-title">Appearance & Notifications</span>
                <span className="menu-desc">Theme, background & push alerts</span>
              </span>
            </span>
            <span className="menu-arrow">›</span>
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="back-button"
            onClick={() => { setView('menu'); setMessage('') }}
          >
            ← Back
          </button>

          {view === 'account' ? (
            <form className="profile-form" onSubmit={save}>
              <p className="helper">
                Local profile only. Sign-in, passwords and cross-device syncing are not connected.
              </p>

              <div className="form-group">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  maxLength={40}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  type="text"
                  required
                  maxLength={40}
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                />
              </div>

              <button className="primary-button" type="submit">
                Save profile
              </button>

              <p role="status">{message}</p>
            </form>
          ) : (
            <div className="profile-form">
              <div className="form-group">
                <label htmlFor="theme-select">Colour theme</label>
                <select
                  id="theme-select"
                  className="theme-dropdown"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                >
                  <option value="purple">Lavender</option>
                  <option value="pink">Blush pink</option>
                  <option value="blue">Pastel blue</option>
                  <option value="green">Pastel green</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="background-select">Background</label>
                <select
                  id="background-select"
                  className="theme-dropdown"
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                >
                  <option value="warm">Warm white</option>
                  <option value="lilac">Lilac</option>
                  <option value="white">White</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Task Reminders</label>
                <p className="helper" style={{ marginBottom: '0.75rem' }}>
                  Enable push notifications to get reminders for your planned tasks.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={enableNotifications}
                  style={{ width: '100%' }}
                >
                  {notificationsEnabled ? '🔔 Notifications Active' : 'Enable Push Notifications'}
                </button>
              </div>

              <p className="helper" role="status" style={{ marginTop: '0.75rem' }}>
                {message || 'Theme changes apply immediately.'}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}