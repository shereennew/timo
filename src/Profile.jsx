// Profile.jsx
import { useState, useEffect } from 'react'
import './App.css'

export default function Profile() {
  const [activeSubView, setActiveSubView] = useState('menu') // 'menu', 'account', or 'settings'

  // Account states
  const [name, setName] = useState(() => {
    return localStorage.getItem('timo-name') || 'Mindful User'
  })
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('timo-username') || 'mindful_planner'
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('timo-theme') || 'default'
  })

  // Notification toggles
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('timo-notifications')
    return saved !== null ? JSON.parse(saved) : true
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    localStorage.setItem('timo-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleSave(e) {
    e.preventDefault()
    localStorage.setItem('timo-name', name)
    localStorage.setItem('timo-username', username)
    localStorage.setItem('timo-notifications', JSON.stringify(notifications))
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setActiveSubView('menu')
    }, 1200)
  }

  return (
    <section className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {name ? name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h1>
            {activeSubView === 'menu'
              ? 'Profile & Preferences'
              : activeSubView === 'account'
                ? 'Account Information'
                : 'Settings'}
          </h1>
        </div>
      </div>

      {/* Main Menu Navigation */}
      {activeSubView === 'menu' && (
        <div className="profile-menu-grid">
          <button
            type="button"
            className="menu-nav-btn account-btn"
            onClick={() => setActiveSubView('account')}
          >
            <span className="menu-btn-content">
              <span className="menu-icon">👤</span>
              <span className="menu-text">
                <span className="menu-title">Account</span>
                <span className="menu-desc">Name, username & password</span>
              </span>
            </span>
            <span className="menu-arrow">➔</span>
          </button>

          <button
            type="button"
            className="menu-nav-btn settings-btn"
            onClick={() => setActiveSubView('settings')}
          >
            <span className="menu-btn-content">
              <span className="menu-icon">⚙️</span>
              <span className="menu-text">
                <span className="menu-title">Settings</span>
                <span className="menu-desc">Theme & notifications</span>
              </span>
            </span>
            <span className="menu-arrow">➔</span>
          </button>
        </div>
      )}

      {/* Account Sub-Page */}
      {activeSubView === 'account' && (
        <form className="profile-form" onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-password">Change Password</label>
            <input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="action-btn primary-action">
              Save Account
            </button>
            <button
              type="button"
              className="action-btn secondary-action"
              onClick={() => setActiveSubView('menu')}
            >
              Back
            </button>
          </div>

          {saved && <p className="helper success-message" role="status">Account updated successfully!</p>}
        </form>
      )}

      {/* Settings Sub-Page */}
      {activeSubView === 'settings' && (
        <form className="profile-form" onSubmit={handleSave}>
          <details className="settings-dropdown-section" open>
            <summary>Appearance & Theme</summary>
            <div className="dropdown-content">
              <div className="form-group">
                <label htmlFor="theme-select">Color Theme</label>
                <div className="theme-select-wrapper">
                  <select
                    id="theme-select"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="theme-dropdown"
                  >
                    <option value="default">🟣 Default Lavender</option>
                    <option value="pink">🌸 Blush Pink</option>
                    <option value="blue">🌊 Ocean Blue</option>
                    <option value="green">🌿 Sage Green</option>
                  </select>
                  <span className={`theme-color-preview theme-${theme}`}></span>
                </div>
              </div>
            </div>
          </details>

          <details className="settings-dropdown-section">
            <summary>Notifications</summary>
            <div className="dropdown-content">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                  Enable Recovery & Task Reminders
                </label>
              </div>
            </div>
          </details>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              Save Settings
            </button>
            <button
              type="button"
              className="back-button"
              onClick={() => setActiveSubView('menu')}
            >
              Back
            </button>
          </div>

          {saved && <p className="helper success-message" role="status">Settings updated successfully!</p>}
        </form>
      )}
    </section>
  )
}