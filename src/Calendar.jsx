import { useState } from 'react'
import { dateKey, parseDate } from './planning'
export default function Calendar({ selectedDate, today, tasks, onSelect }) {
  const [month, setMonth] = useState(() => parseDate(selectedDate))
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12)
  const count = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()
  return <section className="calendar" aria-label="Plan by date">
    <div className="calendar-heading">
      <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1, 12))}>‹</button>
      <h2 aria-live="polite">{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h2>
      <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1, 12))}>›</button>
    </div>
    <div className="calendar-grid">
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span className="weekday" key={d}>{d}</span>)}
      {Array.from({length: (first.getDay()+6)%7}, (_, i) => <span key={`blank-${i}`} />)}
      {Array.from({length: count}, (_, i) => {
        const day = dateKey(new Date(month.getFullYear(), month.getMonth(), i+1, 12))
        const points = tasks.filter(t => t.date === day).reduce((sum,t) => sum+t.points,0)
        return <button type="button" key={day} className="calendar-day" aria-pressed={selectedDate === day} aria-current={day === today ? 'date' : undefined} aria-label={`${parseDate(day).toLocaleDateString('en', {dateStyle:'full'})}, ${points} load points`} onClick={() => onSelect(day)}><span>{i+1}</span><small>{points ? `${points}p` : '·'}</small></button>
      })}
    </div>
    <div className="calendar-footer"><span>p = planned load points</span><button type="button" onClick={() => { setMonth(parseDate(today)); onSelect(today) }}>Today</button></div>
  </section>
}
