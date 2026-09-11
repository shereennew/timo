import { dateKey, parseDate, tasksForDay } from './planning'

function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

// Overlapping tasks share horizontal space instead of covering each other.
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

export default function WeeklyTimetable({ date, today, tasks, onDate, onEdit }) {
  const monday = parseDate(date)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday); day.setDate(day.getDate() + index)
    const key = dateKey(day), dayTasks = tasksForDay(tasks, key)
    const timed = layoutDay(dayTasks)
    const timedIds = new Set(timed.map(item => item.task.id))
    return { day, key, timed, unscheduled: dayTasks.filter(task => !timedIds.has(task.id)) }
  })
  const events = days.flatMap(day => day.timed)
  const start = Math.floor(Math.min(480, ...events.map(item => item.start)) / 60) * 60
  const end = Math.ceil(Math.max(1080, ...events.map(item => item.end)) / 60) * 60
  const hours = Array.from({ length: (end - start) / 60 }, (_, index) => start + index * 60)
  const label = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:00`
  return <section className="week-planner" aria-label="Weekly timetable">
    <h2>{monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – {days[6].day.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
    <p className="helper">Scroll sideways for the whole week. Select a task to edit it.</p>
    <div className="week-scroll" tabIndex={0} role="region" aria-label="Scrollable weekly timetable">
      <div className="week-grid">
        <div className="week-heading">Time</div>
        {days.map(({ day, key }) => <button key={key} className="week-heading" aria-pressed={key === date} aria-current={key === today ? 'date' : undefined} onClick={() => onDate(key)}>
          {day.toLocaleDateString('en', { weekday: 'short' })}<br />{day.getDate()}{key === today ? ' · Today' : ''}
        </button>)}
        <div className="week-hours">{hours.map(hour => <div key={hour}>{label(hour)}</div>)}</div>
        {days.map(({ key, timed }) => <div key={key} className="week-day" style={{ height: (end - start) * 1.2 }}>
          {timed.map(({ task, start: from, end: to, lane, lanes }) => <button key={task.id} className={`week-event${task.done ? ' is-done' : ''}`}
            style={{ top: (from - start) * 1.2, height: (to - from) * 1.2, left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
            onClick={() => onEdit(task)} title={`${task.name} · ${task.startTime}–${task.endTime}${task.done ? ' · Completed' : ''}`}>
            <strong>{task.done ? '✓ ' : ''}{task.name}</strong><span>{task.startTime}–{task.endTime}</span>
          </button>)}
        </div>)}
        <div className="week-unscheduled">No time</div>
        {days.map(({ key, unscheduled }) => <div key={key} className="week-unscheduled">{unscheduled.length ? unscheduled.map(task => <button key={task.id} onClick={() => onEdit(task)}>{task.name}</button>) : '—'}</div>)}
      </div>
    </div>
  </section>
}
