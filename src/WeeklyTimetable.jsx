import { dateKey, parseDate, tasksForDay } from './planning'

function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

function layoutDay(tasks) {
  const timed = tasks.map(task => ({ task, start: minutes(task.startTime), end: minutes(task.endTime) }))
    .filter(item => item.start !== null && item.end !== null && item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const groups = []
  for (const item of timed) {
    let group = groups.at(-1)
    if (!group || item.start >= group.end) { group = { end: item.end, items: [], lanes: [] }; groups.push(group) }
    let lane = group.lanes.findIndex(end => end <= item.start)
    if (lane < 0) lane = group.lanes.length
    group.lanes[lane] = item.end
    group.end = Math.max(group.end, item.end)
    group.items.push({ ...item, lane })
  }
  return groups.flatMap(group => group.items.map(item => ({ ...item, lanes: group.lanes.length })))
}

export default function WeeklyTimetable({ date, today, tasks, onDate, onEdit, view, onViewChange }) {
  const monday = parseDate(date)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday); day.setDate(day.getDate() + index)
    const key = dateKey(day), dayTasks = tasksForDay(tasks, key)
    const timed = layoutDay(dayTasks)
    const timedIds = new Set(timed.map(item => item.task.id))
    return { day, key, timed, unscheduled: dayTasks.filter(task => !timedIds.has(task.id)) }
  })

  // When view is 'daily', show only the selected single day. When 'week', show all 7 days.
  const displayedDays = view === 'daily' 
    ? days.filter(d => d.key === date) 
    : days

  const events = days.flatMap(day => day.timed)
  const start = Math.floor(Math.min(480, ...events.map(item => item.start)) / 60) * 60
  const end = Math.ceil(Math.max(1080, ...events.map(item => item.end)) / 60) * 60
  const hours = Array.from({ length: (end - start) / 60 }, (_, index) => start + index * 60)
  const label = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:00`

  return (
    <section className="week-planner" aria-label="Weekly timetable" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* Header controls & Mobile View Switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', margin: 0 }}>
          {monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – {days[6].day.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: '2px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => onViewChange('daily')}
            style={{
              background: view === 'daily' ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: view === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Day View
          </button>
          <button
            type="button"
            onClick={() => onViewChange('week')}
            style={{
              background: view === 'week' ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: view === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Full Week ↔
          </button>
        </div>
      </div>

      <div className="week-scroll" tabIndex={0} role="region" aria-label="Scrollable weekly timetable" style={{ width: '100%', overflowX: 'auto', maxHeight: '500px' }}>
        <div 
          className="week-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `50px repeat(${displayedDays.length}, minmax(${view === 'daily' ? '1fr' : '100px'}, 1fr))` 
          }}
        >
          <div className="week-heading" style={{ padding: '0.4rem', fontSize: '0.75rem' }}>Time</div>
          {displayedDays.map(({ day, key }) => (
            <button key={key} className="week-heading" aria-pressed={key === date} aria-current={key === today ? 'date' : undefined} onClick={() => onDate(key)} style={{ padding: '0.4rem', fontSize: '0.75rem' }}>
              {day.toLocaleDateString('en', { weekday: 'short' })}<br />{day.getDate()}{key === today ? ' · Today' : ''}
            </button>
          ))}

          <div className="week-hours">{hours.map(hour => <div key={hour} style={{ height: '50px', fontSize: '0.7rem', lineHeight: '50px' }}>{label(hour)}</div>)}</div>
          
          {displayedDays.map(({ key, timed }) => (
            <div key={key} className="week-day" style={{ height: (end - start) * 0.8, position: 'relative' }}>
              {hours.map(hour => <div key={hour} style={{ height: '50px', borderBottom: '1px solid rgba(0,0,0,0.04)' }} />)}
              {timed.map(({ task, start: from, end: to, lane, lanes }) => (
                <button 
                  key={task.id} 
                  className={`week-event${task.done ? ' is-done' : ''}`}
                  style={{ 
                    top: ((from - start) / 60) * 50, 
                    height: Math.max(30, ((to - from) / 60) * 50), 
                    left: `calc(${lane / lanes * 100}% + 2px)`, 
                    width: `calc(${100 / lanes}% - 4px)`, 
                    position: 'absolute',
                    padding: '2px 4px',
                    overflow: 'hidden'
                  }}
                  onClick={() => onEdit(task)} 
                  title={`${task.name} · ${task.startTime}–${task.endTime}${task.done ? ' · Completed' : ''}`}
                >
                  <strong style={{ fontSize: '0.7rem', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {task.done ? '✓ ' : ''}{task.name}
                  </strong>
                  <span style={{ fontSize: '0.6rem', display: 'block' }}>{task.startTime}–{task.endTime}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="week-unscheduled" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>No time</div>
          {displayedDays.map(({ key, unscheduled }) => (
            <div key={key} className="week-unscheduled" style={{ padding: '0.4rem' }}>
              {unscheduled.length ? unscheduled.map(task => <button key={task.id} onClick={() => onEdit(task)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', margin: '2px 0', display: 'block', width: '100%' }}>{task.name}</button>) : '—'}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}