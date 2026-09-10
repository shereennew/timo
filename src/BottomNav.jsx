export default function BottomNav({ page, navigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Today', icon: '☀️' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'companion', label: 'Companion', icon: '🤖' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]

  return (
    <nav
      aria-label="Bottom Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',

        // Match the mobile app width
        width: 'min(100%, 520px)',

        height: '68px',
        boxSizing: 'border-box',

        background: 'var(--card-bg, #ffffff)',
        borderTop: '1px solid var(--border, #d8c4ef)',

        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',

        padding: '6px 12px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',

        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
        zIndex: 1000,

        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      {navItems.map(item => {
        const isActive = page === item.id

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              width: '90px',
              height: '56px',

              background: isActive
                ? 'var(--accent, #d8c4ef)'
                : 'transparent',

              border: 'none',
              borderRadius: '16px',

              padding: '5px 8px',

              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',

              gap: '2px',

              cursor: 'pointer',

              color: isActive
                ? 'var(--accent-dark, #4a325e)'
                : 'var(--muted, #6e6278)',

              fontWeight: isActive ? 700 : 500,
              fontSize: '0.68rem',

              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <span
              style={{
                fontSize: '1.15rem',
                lineHeight: 1
              }}
            >
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

