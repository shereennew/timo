import { dateKey, parseDate, tasksForDay } from './planning'

export default function WeekView({ tasks, dailyCapacity, onSelectDay }) {
  return (
    <section className="task-section" style={{ maxWidth: '600px', margin: '2rem auto 0 auto' }}>
      <div className="intro" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Week Health Pulse</h1>
        <p>A 7-day outlook of your planned load and capacity.</p>
      </div>

      <div className="week-pulse-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: 7 }).map((_, index) => {
          const todayKey = dateKey(new Date())
          const targetDate = parseDate(todayKey)
          targetDate.setDate(targetDate.getDate() + index)
          const key = dateKey(targetDate)
          const dayName = targetDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
          
          const dayTasksList = tasksForDay(tasks, key)
          const dayTotalLoad = dayTasksList.reduce((sum, t) => sum + t.points, 0)
          const isOverloaded = dayTotalLoad > dailyCapacity
          const percentage = Math.min(100, (dayTotalLoad / Math.max(dailyCapacity, 1)) * 100)

          return (
            <div 
              key={key}
              onClick={() => onSelectDay(key)}
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: `2px solid ${isOverloaded ? '#feb2b2' : 'var(--border, #e2d9ed)'}`,
                borderRadius: '16px',
                padding: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{dayName}</strong>
                  {key === todayKey && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: 'var(--accent)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Today</span>}
                </div>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  color: isOverloaded ? '#c53030' : 'var(--accent-dark)',
                  background: isOverloaded ? '#fde8e8' : 'var(--accent-light, rgba(216,196,239,0.25))',
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}>
                  {dayTotalLoad} / {dailyCapacity} pts {isOverloaded ? '⚠️' : ''}
                </span>
              </div>

              <div style={{ width: '100%', background: 'var(--border, #eee)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${percentage}%`, 
                  background: isOverloaded ? '#e53e3e' : 'linear-gradient(90deg, #7c529e, #9b6fe6)', 
                  height: '100%', 
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
                <span>{dayTasksList.length} {dayTasksList.length === 1 ? 'task' : 'tasks'} planned</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-dark)' }}>Tap to manage day →</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}